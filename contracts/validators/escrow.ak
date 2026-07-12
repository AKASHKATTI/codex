use aiken/interval.{Finite}
use aiken/list
use aiken/transaction/credential.{VerificationKeyCredential}
use aiken/transaction/value
use aiken/transaction.{ScriptContext, Spend}

pub type EscrowDatum {
  contest_id: ByteArray,
  player: ByteArray, // Verification Key Hash of the player
  deadline: Int, // POSIX millisecond timestamp after which refunds are allowed
}

pub type EscrowRedeemer {
  Settle {
    winner1: ByteArray,
    winner2: ByteArray,
    winner3: ByteArray,
    fee_address: ByteArray,
  }
  Refund
}

validator(oracle_pkh: ByteArray) {
  fn escrow(
    datum: EscrowDatum,
    redeemer: EscrowRedeemer,
    context: ScriptContext,
  ) -> Bool {
    let tx = context.transaction

    // Helper to check if a signature exists
    let signed_by =
      fn(pkh) { list.any(tx.extra_signatories, fn(signatory) { signatory == pkh }) }

    // Helper to verify time deadline
    let is_after_deadline =
      fn() {
        let lower_bound = tx.validity_range.lower_bound
        when lower_bound.bound_type is {
          Finite(time) -> time >= datum.deadline
          _ -> false
        }
      }

    when redeemer is {
      Refund -> signed_by(datum.player) && is_after_deadline()
      Settle { winner1, winner2, winner3, fee_address } -> {
        // 1. Must be signed by the Oracle
        let is_signed_by_oracle = signed_by(oracle_pkh)

        // 2. Determine our own script address to find related inputs
        expect Spend(out_ref) = context.purpose
        expect Some(own_input) =
          list.find(tx.inputs, fn(input) { input.output_reference == out_ref })
        let script_address = own_input.output.address

        // 3. Sum total Lovelace for the specific contest
        let total_pot =
          list.foldl(
            tx.inputs,
            0,
            fn(input, acc) {
              if input.output.address == script_address {
                when input.output.datum is {
                  transaction.InlineDatum(raw_data) -> {
                    expect input_datum: EscrowDatum = raw_data
                    if input_datum.contest_id == datum.contest_id {
                      acc + value.lovelace_of(input.output.value)
                    } else {
                      acc
                    }
                  }
                  _ -> acc
                }
              } else {
                acc
              }
            },
          )

        // 4. Calculate expected payout values (60% / 25% / 10% / 5%)
        let req_w1 = total_pot * 60 / 100
        let req_w2 = total_pot * 25 / 100
        let req_w3 = total_pot * 10 / 100
        let req_fee = total_pot * 5 / 100

        // Helper to verify an output payment
        let check_payout =
          fn(recipient_pkh, required_amount) {
            list.any(
              tx.outputs,
              fn(output) {
                when output.address.payment_credential is {
                  VerificationKeyCredential(pkh) ->
                    pkh == recipient_pkh && value.lovelace_of(output.value) >= required_amount
                  _ -> false
                }
              },
            )
          }

        let pay_w1 = check_payout(winner1, req_w1)
        let pay_w2 = check_payout(winner2, req_w2)
        let pay_w3 = check_payout(winner3, req_w3)
        let pay_fee = check_payout(fee_address, req_fee)

        is_signed_by_oracle && pay_w1 && pay_w2 && pay_w3 && pay_fee
      }
    }
  }
}
