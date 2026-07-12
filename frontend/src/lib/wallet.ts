import type { LucidEvolution } from "@lucid-evolution/lucid";
import plutusJson from "../../../contracts/plutus.json";

// Pure JS Hex converter to avoid Buffer polyfill issues in browser/SSR
export function stringToHex(str: string): string {
  let hex = "";
  for (let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16).padStart(2, "0");
  }
  return hex;
}

// Cardano Preprod Explorer Link Helper
export function getExplorerLink(txHash: string): string {
  return `https://preprod.cardanoscan.io/transaction/${txHash}`;
}

/**
 * Initializes Lucid on the client side using dynamic imports.
 * Returns null if running in Mock/Offline mode.
 */
export async function getClientLucid(walletApi?: any): Promise<LucidEvolution | null> {
  const projectId = process.env.NEXT_PUBLIC_BLOCKFROST_PROJECT_ID;
  if (!projectId || projectId.startsWith("preprodYour")) {
    console.warn("Client running in mock/offline mode (no Blockfrost ID).");
    return null;
  }

  try {
    const { Lucid, Blockfrost } = await import("@lucid-evolution/lucid");
    const lucid = await Lucid(
      new Blockfrost("https://cardano-preprod.blockfrost.io/api/v0", projectId),
      "Preprod"
    );
    if (walletApi) {
      lucid.selectWallet.fromAPI(walletApi);
    }
    return lucid;
  } catch (error) {
    console.error("Failed to initialize client Lucid:", error);
    return null;
  }
}

/**
 * CIP-30 signData message flow to authenticate a wallet with the backend.
 * Returns the auth details and the wallet API context instance.
 */
export async function authenticateWallet(
  walletName: string,
  backendUrl: string
): Promise<{ token: string; user: any; api: any }> {
  // If the wallet is mock, authenticate via the backend mock signature bypass
  if (walletName === "mock") {
    console.log("[MOCK] Authenticating mock user session via backend...");
    const mockUserAddress = "addr_test1qru_mock_user_address_cardano_preprod_faucet_funded";
    
    const loginRes = await fetch(`${backendUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: mockUserAddress,
        nonce: "Sign this message to log in to FairStake: mock-nonce",
        key: "mock_key_hex",
        signature: "mock_signature_hex",
      }),
    });

    if (!loginRes.ok) {
      let errorMsgText = "Mock authentication failed";
      try {
        const errorMsg = await loginRes.json();
        errorMsgText = errorMsg.error || JSON.stringify(errorMsg);
      } catch (e) {
        errorMsgText = await loginRes.text();
      }
      throw new Error(`Mock authentication failed: ${loginRes.status} ${errorMsgText}`);
    }

    const authData = await loginRes.json();
    return { ...authData, api: null };
  }

  // 1. Enable the wallet
  const cardano = (window as any).cardano;
  if (!cardano || !cardano[walletName]) {
    throw new Error(`Wallet ${walletName} is not installed in the browser.`);
  }

  let api: any;
  try {
    api = await cardano[walletName].enable();
  } catch (err: any) {
    if (err.code === -3 || (err.info && err.info.includes("user canceled"))) {
      console.log("User cancelled wallet connection.");
      throw new Error("Wallet connection cancelled by user.");
    }
    console.error(`Error enabling wallet ${walletName}:`, err);
    throw new Error(`Could not connect to wallet ${walletName}. Please try again.`);
  }

  // 2. Initialize Lucid with the connected wallet
  const lucid = await getClientLucid(api);
  let bech32Address = "";

  if (!lucid) {
    console.warn("Lucid initialization failed or running in mock mode. Fallback to API change address.");
    // CIP-30 returns the change address directly.
    bech32Address = await api.getChangeAddress();
  } else {
    bech32Address = await lucid.wallet().address();
  }

  // Problem 3 Safety Guard: Ensure user isn't serving a Mainnet address on Preprod
  if (bech32Address.startsWith("addr1")) {
    throw new Error("Mainnet address detected! Please switch your wallet network configuration to Preprod and try again.");
  }

  console.log("Authenticating address:", bech32Address);

  // 3. Request challenge nonce from backend
  const nonceRes = await fetch(`${backendUrl}/api/auth/nonce?address=${encodeURIComponent(bech32Address)}`);
  if (!nonceRes.ok) {
    throw new Error("Failed to fetch login nonce challenge from backend.");
  }
  const { nonce } = await nonceRes.json();

  // 4. Request wallet signature
  const hexPayload = stringToHex(nonce);
  const dataSignature = await api.signData(bech32Address, hexPayload);

  // 5. Submit signature to backend
  const loginRes = await fetch(`${backendUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      address: bech32Address,
      nonce,
      key: dataSignature.key,
      signature: dataSignature.signature,
    }),
  });

  if (!loginRes.ok) {
    let errorMsgText = "Authentication failed";
    try {
      const errorMsg = await loginRes.json();
      errorMsgText = errorMsg.error || JSON.stringify(errorMsg);
    } catch (e) {
      errorMsgText = await loginRes.text();
    }
    throw new Error(`Authentication failed: ${loginRes.status} ${errorMsgText}`);
  }

  const result = await loginRes.json();
  return { ...result, api }; // Pass the enabled API instance back out to your context layer
}

/**
 * Builds and submits a transaction locking entry fee ADA in the escrow script.
 * Accepts the pre-enabled wallet API instance to prevent repeated popups.
 */
export async function lockEntryFee(
  api: any,
  contestId: string,
  entryFeeLovelace: string,
  deadlineMs: number
): Promise<string> {
  // Handle Mock/Offline transaction fallback safely
  if (!api) {
    console.log("[MOCK] Building and submitting escrow lock transaction...");
    await new Promise((resolve) => setTimeout(resolve, 1500)); 
    return "mock_deposit_tx_hash_" + Math.random().toString(36).substring(2, 12);
  }

  const lucid = await getClientLucid(api);
  if (!lucid) {
    console.log("[MOCK] Lucid failed or mock blockfrost configured. Bypassing on-chain transaction.");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return "mock_deposit_tx_hash_" + Math.random().toString(36).substring(2, 12);
  }

  const { Data, getAddressDetails, validatorToAddress } = await import("@lucid-evolution/lucid");

  // Load validator and compute script address
  const escrowValidator = plutusJson.validators.find((v) => v.title === "escrow.escrow");
  if (!escrowValidator) {
    throw new Error("Validator script missing from Plutus blueprint");
  }
  const script = {
    type: "PlutusV2" as const,
    script: escrowValidator.compiledCode,
  };
  const scriptAddress = validatorToAddress("Preprod", script);

  // Get user details
  const userAddress = await lucid.wallet().address();
  const userPkh = getAddressDetails(userAddress).paymentCredential?.hash || "";

  // Define Schema dynamically
  const EscrowDatumSchema = Data.Object({
    contest_id: Data.Bytes(),
    player: Data.Bytes(),
    deadline: Data.Integer(),
  });

  // Encode the Datum
  const datum = Data.to(
    {
      contest_id: stringToHex(contestId),
      player: userPkh,
      deadline: BigInt(deadlineMs || Date.now()),
    } as any,
    EscrowDatumSchema
  );

  console.log(`Locking entry fee ${entryFeeLovelace} Lovelaces in escrow ${scriptAddress}`);

  // Build, sign, and submit transaction
  const tx = await lucid
    .newTx()
    .pay.ToContract(
      scriptAddress,
      { kind: "inline", value: datum },
      { lovelace: BigInt(entryFeeLovelace || "10000000") }
    )
    .complete();

  const signedTx = await tx.sign.withWallet().complete();
  const txHash = await signedTx.submit();
  
  console.log(`Deposit transaction submitted: ${txHash}`);
  return txHash;
}