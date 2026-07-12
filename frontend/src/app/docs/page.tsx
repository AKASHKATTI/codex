"use client";

import React from "react";
import { Navbar } from "../../components/Navbar";
import { Footer } from "../../components/Footer";
import { Shield, BookOpen, Key, Coins, Play, Info } from "lucide-react";

export default function Docs() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow max-w-4xl mx-auto w-full px-6 py-12 text-left">
        
        {/* Header */}
        <div className="flex items-center space-x-3 mb-10 pb-6 border-b border-white/5">
          <BookOpen className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Smart Contract Documentation</h1>
            <p className="text-slate-400 text-sm mt-0.5">Understanding Aiken, distributed UTXO design, and transaction safety on Cardano.</p>
          </div>
        </div>

        {/* Content sections */}
        <div className="space-y-12 text-sm text-slate-300 leading-relaxed font-medium">
          
          {/* Section 1: Intro */}
          <section className="space-y-4">
            <h2 className="text-xl font-extrabold text-white flex items-center space-x-2">
              <Shield className="w-5 h-5 text-blue-400" />
              <span>Escrow Safety Architecture</span>
            </h2>
            <p>
              FairStake operates on a **decentralized escrow architecture** where user entry fees are completely isolated inside a Cardano Plutus V2 script address. 
              No administrator, owner, or bookie can arbitrarily withdraw ADA. Funds are locked strictly according to the validator rules compiles using **Aiken**.
            </p>
          </section>

          {/* Section 2: Concurrency & Distributed UTXO */}
          <section className="space-y-4">
            <h2 className="text-xl font-extrabold text-white flex items-center space-x-2">
              <Coins className="w-5 h-5 text-emerald-400" />
              <span>Distributed UTXO Design</span>
            </h2>
            <p>
              Unlike traditional accounts-based blockchains (like Ethereum) where a single smart contract state variable is modified, Cardano uses the **Extended UTXO (EUTXO)** model. 
              Modifying a single contract UTXO creates a concurrency bottleneck where multiple transactions competing to spend the same UTXO will fail.
            </p>
            <p className="bg-slate-950/40 p-5 rounded-2xl border border-white/5 text-xs">
              <strong>FairStake Solution:</strong> When a player joins a contest, the frontend creates a **separate UTXO** locked at the validator address containing that player's entry fee and an inline datum. 
              This allows 100+ players to register for a contest simultaneously without any contention! When the match ends, the settlement script spends these UTXOs in a single transaction (or batches) to disperse payouts.
            </p>
          </section>

          {/* Section 3: Aiken Validator Logic */}
          <section className="space-y-4">
            <h2 className="text-xl font-extrabold text-white flex items-center space-x-2">
              <Key className="w-5 h-5 text-amber-400" />
              <span>Aiken Script Validators</span>
            </h2>
            <p>
              Our validator accepts two inputs (Datum and Redeemer) and evaluates conditions based on the current transaction structure:
            </p>
            
            <ul className="list-disc list-inside pl-4 space-y-2 text-xs text-slate-400">
              <li>
                <strong className="text-slate-200">Settle:</strong> Requires the transaction to be signed by the trusted Oracle verification key hash. Checks that the total Lovelace values of inputs are correctly distributed: 1st Place (60%), 2nd Place (25%), 3rd Place (10%), and Platform Fee (5%).
              </li>
              <li>
                <strong className="text-slate-200">Refund:</strong> Allows a player to claim their locked fee if the contest deadline has passed and the oracle has not finalized the scores. Requires the transaction to be signed by the player's payment credential.
              </li>
            </ul>
          </section>

          {/* Section 4: Source code reference */}
          <section className="space-y-4">
            <h2 className="text-xl font-extrabold text-white flex items-center space-x-2">
              <Play className="w-5 h-5 text-indigo-400" />
              <span>Aiken Source Reference</span>
            </h2>
            
            <pre className="bg-black/60 p-5 rounded-2xl border border-white/5 font-mono text-[10px] text-slate-300 overflow-x-auto text-left leading-relaxed">
{`validator(oracle_pkh: ByteArray) {
  fn escrow(datum: EscrowDatum, redeemer: EscrowRedeemer, context: ScriptContext) -> Bool {
    let tx = context.transaction
    
    when redeemer is {
      Refund -> signed_by(datum.player) && is_after_deadline()
      Settle { winner1, winner2, winner3, fee_address } -> {
        let is_signed_by_oracle = signed_by(oracle_pkh)
        
        let total_pot = sum_inputs_for_contest(tx.inputs, datum.contest_id)
        
        let pay_w1 = check_payout(winner1, total_pot * 60 / 100)
        let pay_w2 = check_payout(winner2, total_pot * 25 / 100)
        let pay_w3 = check_payout(winner3, total_pot * 10 / 100)
        let pay_fee = check_payout(fee_address, total_pot * 5 / 100)
        
        is_signed_by_oracle && pay_w1 && pay_w2 && pay_w3 && pay_fee
      }
    }
  }
}`}
            </pre>
          </section>

          {/* Alert Info box */}
          <div className="p-5 rounded-2xl bg-blue-600/5 border border-blue-500/10 flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-extrabold text-white text-xs">Pre-compiled blueprint</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                The validator bytecode has been compiled and saved as `plutus.json` at the project contracts directory. Lucid loads the compiled hex automatically to calculate the script address and spend transaction structures on Cardano Preprod Testnet.
              </p>
            </div>
          </div>

        </div>

      </main>

      <Footer />
    </div>
  );
}
