import { Lucid, Blockfrost, Data, getAddressDetails, validatorToAddress, Constr, scriptFromNative, mintingPolicyToId } from "@lucid-evolution/lucid";
import type { LucidEvolution, UTxO } from "@lucid-evolution/lucid";
// @ts-ignore
import verifyDataSignature from "@cardano-foundation/cardano-verify-datasignature";
import dotenv from "dotenv";
import plutusJson from "../../../contracts/plutus.json";

dotenv.config();

// Escrow Datum schema corresponding to the Aiken contract
export const EscrowDatumSchema = Data.Object({
  contest_id: Data.Bytes(),
  player: Data.Bytes(),
  deadline: Data.Integer(), // POSIX timestamp in milliseconds
});

export type EscrowDatum = Data.Static<typeof EscrowDatumSchema>;

let lucidInstance: LucidEvolution | null = null;

/**
 * Initializes and returns a Lucid instance.
 * Falls back to null if no Blockfrost ID is configured, allowing mock mode.
 */
export async function getLucid(): Promise<LucidEvolution | null> {
  if (lucidInstance) return lucidInstance;

  const projectId = process.env.BLOCKFROST_PROJECT_ID;
  if (!projectId || projectId.startsWith("preprodYour")) {
    console.warn("BLOCKFROST_PROJECT_ID is not set or is using placeholder. Cardano services running in offline/mock mode.");
    return null;
  }

  try {
    // Instantiation in newer Lucid Evolution is: await Lucid(provider, network)
    lucidInstance = await Lucid(
      new Blockfrost("https://cardano-preprod.blockfrost.io/api/v0", projectId),
      "Preprod"
    );

    const seed = process.env.ORACLE_SEED_PHRASE;
    if (seed && seed !== "test test test test test test test test test test test test") {
      lucidInstance.selectWallet.fromSeed(seed);
      const addr = await lucidInstance.wallet().address();
      console.log(`Lucid initialized. Admin/Oracle Address: ${addr}`);
    } else {
      console.warn("Oracle wallet seed phrase is not configured. Transactions cannot be signed by Admin.");
    }

    return lucidInstance;
  } catch (error) {
    console.error("Failed to initialize Lucid:", error);
    return null;
  }
}

/**
 * Verifies a wallet signature using CIP-30 message signing.
 */
export async function verifyWalletSignature(
  address: string,
  nonce: string,
  key: string,
  signature: string
): Promise<boolean> {
  try {
    // verifyDataSignature takes signature, key, textMessage, and optional address
    const isValid = verifyDataSignature(signature, key, nonce, address);
    return isValid;
  } catch (error) {
    console.error("Signature verification failed:", error);
    return false;
  }
}

/**
 * Returns the compiled escrow validator script.
 */
export function getEscrowValidator() {
  const validator = plutusJson.validators.find((v) => v.title === "escrow.escrow");
  if (!validator) {
    throw new Error("Escrow validator not found in blueprint");
  }
  return {
    type: "PlutusV2" as const,
    script: validator.compiledCode,
  };
}

/**
 * Resolves the bech32 address of the escrow smart contract.
 */
export async function getEscrowAddress(lucid: LucidEvolution): Promise<string> {
  const validator = getEscrowValidator();
  return validatorToAddress("Preprod", validator);
}

/**
 * Spends all UTXOs at the escrow contract matching the contest_id
 * and distributes the total pot to the winners and admin fee.
 */
export async function settleContest(
  contestId: string,
  winner1Addr: string,
  winner2Addr: string,
  winner3Addr: string,
  adminFeeAddr: string
): Promise<string> {
  const lucid = await getLucid();
  if (!lucid) {
    console.log("[MOCK] settleContest tx submitted.");
    return "mock_tx_hash_settlement_" + Math.random().toString(36).substring(7);
  }

  const scriptValidator = getEscrowValidator();
  const scriptAddr = validatorToAddress("Preprod", scriptValidator);

  // Fetch all UTXOs at the script address
  const utxos = await lucid.utxosAt(scriptAddr);
  const contestHex = Buffer.from(contestId, "utf-8").toString("hex");

  // Filter UTXOs that match our contest ID in the datum
  const matchingUtxos = utxos.filter((utxo: UTxO) => {
    if (!utxo.datum) return false;
    try {
      const datum = Data.from(utxo.datum, EscrowDatumSchema);
      return datum.contest_id === contestHex;
    } catch {
      return false;
    }
  });

  if (matchingUtxos.length === 0) {
    throw new Error(`No escrow UTXOs found for contest ${contestId}`);
  }

  // Calculate total pot
  let totalPot = 0n;
  for (const utxo of matchingUtxos) {
    totalPot += utxo.assets.lovelace;
  }

  console.log(`Settling contest ${contestId}. Total UTXOs: ${matchingUtxos.length}, Pot: ${totalPot} Lovelaces`);

  // Payout proportions: 60% Winner 1, 25% Winner 2, 10% Winner 3, 5% Admin Fee
  const w1Amount = (totalPot * 60n) / 100n;
  const w2Amount = (totalPot * 25n) / 100n;
  const w3Amount = (totalPot * 10n) / 100n;
  const feeAmount = totalPot - w1Amount - w2Amount - w3Amount; // Remaining goes to fee to avoid rounding dust

  // Convert winner addresses to PKHs for the redeemer
  const w1Pkh = getAddressDetails(winner1Addr).paymentCredential?.hash || "";
  const w2Pkh = getAddressDetails(winner2Addr).paymentCredential?.hash || "";
  const w3Pkh = getAddressDetails(winner3Addr).paymentCredential?.hash || "";
  const feePkh = getAddressDetails(adminFeeAddr).paymentCredential?.hash || "";

  // Build the Settle redeemer using standard Plutus Constr
  // Constr index 0 represents Settle, Constr index 1 represents Refund
  const redeemer = Data.to(new Constr(0, [w1Pkh, w2Pkh, w3Pkh, feePkh]));

  // Build transaction
  const tx = await lucid
    .newTx()
    .collectFrom(matchingUtxos, redeemer)
    .attach.SpendingValidator(scriptValidator)
    .pay.ToAddress(winner1Addr, { lovelace: w1Amount })
    .pay.ToAddress(winner2Addr, { lovelace: w2Amount })
    .pay.ToAddress(winner3Addr, { lovelace: w3Amount })
    .pay.ToAddress(adminFeeAddr, { lovelace: feeAmount })
    .complete();

  const signedTx = await tx.sign.withWallet().complete();
  const txHash = await signedTx.submit();
  console.log(`Settlement transaction submitted: ${txHash}`);
  return txHash;
}

/**
 * Mints an NFT as a reward for a contest placement.
 * Uses a basic Native Signature policy for the oracle wallet.
 */
export async function mintRewardNFT(
  recipientAddress: string,
  contestId: string,
  rewardType: "WINNER_NFT" | "PARTICIPATION_NFT" | "CHAMPION_NFT"
): Promise<{ txHash: string; assetId: string }> {
  const lucid = await getLucid();
  if (!lucid) {
    console.log(`[MOCK] Minted ${rewardType} to ${recipientAddress}`);
    return {
      txHash: "mock_tx_hash_nft_" + Math.random().toString(36).substring(7),
      assetId: "mock_policy_id_asset_name_hex",
    };
  }

  // Get the payment credential of the admin wallet to construct a native signature minting policy
  const adminAddress = await lucid.wallet().address();
  const adminPkh = getAddressDetails(adminAddress).paymentCredential?.hash || "";

  // The policy requires the admin signature, built via scriptFromNative
  const mintingPolicy = scriptFromNative({
    type: "sig",
    keyHash: adminPkh,
  });

  const policyId = mintingPolicyToId(mintingPolicy);

  // Define asset name based on reward type and contest suffix
  const assetNameString = `${rewardType.substring(0, 10)}_${contestId.substring(0, 4)}`;
  const assetNameHex = Buffer.from(assetNameString, "utf-8").toString("hex");
  const unit = policyId + assetNameHex;

  console.log(`Minting NFT: ${assetNameString} (${unit}) to ${recipientAddress}`);

  // Build the minting transaction
  const tx = await lucid
    .newTx()
    .mintAssets({ [unit]: 1n })
    .attach.MintingPolicy(mintingPolicy)
    .pay.ToAddress(recipientAddress, { lovelace: 1500000n, [unit]: 1n }) // 1.5 ADA minimum + NFT
    .complete();

  const signedTx = await tx.sign.withWallet().complete();
  const txHash = await signedTx.submit();
  console.log(`NFT Minting transaction submitted: ${txHash}`);

  return {
    txHash,
    assetId: unit,
  };
}
