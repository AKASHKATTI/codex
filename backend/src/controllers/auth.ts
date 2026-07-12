import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { verifyWalletSignature } from "../services/cardano";

const prisma = new PrismaClient();
const nonces = new Map<string, { nonce: string; expires: number }>();

/**
 * GET /api/auth/nonce
 * Generates a challenge nonce for wallet authentication.
 */
export async function getNonce(req: Request, res: Response) {
  try {
    const { address } = req.query;
    if (!address || typeof address !== "string") {
      return res.status(400).json({ error: "wallet address is required" });
    }

    const nonce = `Sign this message to log in to FairStake: ${Math.random().toString(36).substring(2, 15)}-${Date.now()}`;
    const expires = Date.now() + 5 * 60 * 1000; // 5 minutes expiration

    nonces.set(address.toLowerCase(), { nonce, expires });

    res.json({ nonce });
  } catch (error) {
    console.error("Error in getNonce:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * POST /api/auth/login
 * Validates wallet signature, creates/fetches user, and returns a JWT.
 */
export async function loginWithWallet(req: Request, res: Response) {
  try {
    const { address, nonce, key, signature } = req.body;

    if (!address || !nonce || !key || !signature) {
      return res.status(400).json({ error: "Missing required parameters (address, nonce, key, signature)" });
    }

    const isMock = signature === "mock_signature_hex";

    if (!isMock) {
      const cached = nonces.get(address.toLowerCase());

      if (!cached) {
        return res.status(400).json({ error: "Nonce not found for this address. Request a new nonce first." });
      }

      if (cached.nonce !== nonce) {
        return res.status(400).json({ error: "Invalid nonce" });
      }

      if (Date.now() > cached.expires) {
        nonces.delete(address.toLowerCase());
        return res.status(400).json({ error: "Nonce expired. Request a new one." });
      }

      // Signature verified, delete nonce
      nonces.delete(address.toLowerCase());
    }

    // Verify signature (with mock bypass support for demo)
    let isValid = false;
    if (isMock) {
      isValid = true;
      console.log(`[MOCK] Signature bypass granted for: ${address}`);
    } else {
      isValid = await verifyWalletSignature(address, nonce, key, signature);
    }

    if (!isValid) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    // Check if user exists, if not create
    let user = await prisma.user.findUnique({
      where: { walletAddress: address },
    });

    if (!user) {
      const username = `FS_${address.substring(0, 8)}_${Math.floor(1000 + Math.random() * 9000)}`;
      user = await prisma.user.create({
        data: {
          walletAddress: address,
          username,
        },
      });
    }

    // Create JWT
    const jwtSecret = process.env.JWT_SECRET || "fairstake_super_secure_jwt_secret_key_1337";
    const token = jwt.sign(
      {
        id: user.id,
        walletAddress: user.walletAddress,
        username: user.username,
      },
      jwtSecret,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        walletAddress: user.walletAddress,
      },
    });
  } catch (error) {
    console.error("Error in loginWithWallet:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * GET /api/auth/me
 * Retrieves current user info. Secured by authenticateJWT.
 */
export async function getMe(req: any, res: Response) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Error in getMe:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
