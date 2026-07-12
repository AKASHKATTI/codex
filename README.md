<<<<<<< HEAD
# FairStake - Transparent On-Chain Fantasy Sports Escrow 🏆

> **Cardano Hackathon Submission**
> A decentralized, trustless fantasy sports platform built on the Cardano blockchain utilizing Aiken smart contracts and Lucid Evolution.

---

## 📖 Introduction

FairStake addresses trust issues in sports wagering and fantasy pools. Traditional sportsbooks hold player deposits in centralized bank accounts, exposing users to exit scams, arbitrary account bans, and payout delays.

FairStake is a **fully decentralized fantasy sports escrow protocol**. Users deposit entry fees directly into a Plutus V2 smart contract script address. Payouts are computed based on match scorecards and distributed automatically by a sport statistics oracle, bypassing any human intermediaries or custody.

---

## ⚡ Technical Highlights

### 1. Extended UTXO (EUTXO) Concurrency Optimization
On accounts-based blockchains (like Ethereum), users interact with a single state address, causing lockups and gas fee wars. On Cardano, trying to register multiple users in a single global UTXO causes transactions to fail due to UTXO contention.
*   **FairStake Architecture:** We implement a **distributed UTXO design**. When a player enters a contest, their ADA is locked in a *unique transaction output (UTXO)* at the script address containing an inline datum with their team selection and wallet details.
*   **Resolution:** When the match completes, the oracle executes a single transaction that collects all participant UTXOs for that contest, aggregates the pool, and disperses payouts to the winners' addresses in one block. This allows hundreds of players to register concurrently without bottlenecks.

### 2. Standard CIP-30 Wallet Authentication (No C++ Bindings)
Instead of using heavy, unstable native bindings (like `cardano-serialization-lib` C++ binaries) which frequently break during development and deployment, FairStake uses `@cardano-foundation/cardano-verify-datasignature` (pure TypeScript/JavaScript) to authenticate browser wallet signatures securely on the server.

### 3. Native Asset Reward NFTs
Upon contract settlement, the backend mints commemorative **Participation NFTs** and **Winner NFTs** dynamically on the Cardano Preprod testnet, delivering proof-of-achievement directly to the player's wallet.

---

## 📁 Repository Structure

```text
├── contracts/               # Aiken Smart Contract & Plutus Blueprint
│   ├── validators/          # Aiken validator code (escrow.ak)
│   └── plutus.json          # Pre-compiled Plutus V2 bytecode
│
├── backend/                 # Express.js & TypeScript API Server
│   ├── prisma/              # Prisma schema & SQLite dev.db
│   └── src/
│       ├── controllers/     # Auth, Contests, Teams, and Oracle controllers
│       ├── services/        # Cardano Lucid evolution & Blockfrost services
│       └── index.ts         # Server entrypoint
│
└── frontend/                # Next.js 15 App Router Frontend
    ├── src/
    │   ├── app/             # Lobby, Contest Roster, Profile, and Oracle pages
    │   ├── components/      # UI components & styling
    │   └── lib/             # Wallet helper & dynamic import wrapper
```

---

## 🛠️ Setup & Installation

### Prerequisites
*   Node.js (v18 or higher)
*   npm (v9 or higher)

### 1. Backend Server Setup
1.  Navigate to the backend:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure `.env` variables:
    ```env
    PORT=5000
    DATABASE_URL="file:./prisma/dev.db"
    JWT_SECRET="fairstake_super_secure_jwt_secret_key_1337"
    BLOCKFROST_PROJECT_ID="preprodYourBlockfrostIdHere"
    ORACLE_SEED_PHRASE="your twelve word mnemonic seed phrase here..."
    ```
    *Note: If no Blockfrost ID is specified, the server automatically defaults to **Mock/Offline mode** allowing instant demo verification.*
4.  Initialize the SQLite database and seed initial contests:
    ```bash
    npx prisma db push
    npx ts-node prisma/seed.ts
    ```
5.  Start the API server:
    ```bash
    npm run dev
    ```

### 2. Frontend Client Setup
1.  Navigate to the frontend:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure `.env.local`:
    ```env
    NEXT_PUBLIC_API_URL="http://localhost:5000"
    NEXT_PUBLIC_BLOCKFROST_PROJECT_ID="preprodYourBlockfrostIdHere"
    ```
4.  Start the Next.js dev server:
    ```bash
    npm run dev
    ```
    *Open [http://localhost:3000](http://localhost:3000) in your browser.*

---

## 🚀 Cardano Preprod Hackathon Demo Guide

### Option A: Testing via the Mock Demo Wallet (Recommended & Instant)
If you don't have browser extensions installed, use the built-in mock mode:
1.  Open the App dashboard: [http://localhost:3000](http://localhost:3000).
2.  Click **Connect Wallet** and select **Mock Demo Wallet**.
3.  Navigate to **Contests**, select the *India vs Australia Mega Contest*, pick a roster of 4 players, and click **Deposit 10 ADA & Join**.
4.  Navigate to the **Oracle Hub** (`/admin`), update cricketer scores, and click **Trigger Oracle**.
5.  Watch the live terminal log standing recalculations, smart contract settlement dispersal, and NFT minting logs!

### Option B: Testing with a Real Cardano Preprod Wallet
1.  Install the **Eternl** or **Lace** wallet extension.
2.  Set the network inside the wallet to **Preprod Testnet**.
3.  Fund the wallet by entering your address at the [Cardano Testnet Faucet](https://docs.cardano.org/cardano-testnet/faucet/).
4.  Enter the contest, select a roster, and sign the transaction popup. The dApp will lock your ADA on-chain.
5.  Confirm the transaction hash on the [CardanoScan Preprod Explorer](https://preprod.cardanoscan.io/).
=======
# codex
>>>>>>> a393b169fc70f5bf19e4ba96806582fbfe79d08a
