"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authenticateWallet, getClientLucid } from "../lib/wallet";

interface UserProfile {
  id: string;
  username: string;
  walletAddress: string;
}

interface WalletContextType {
  walletAddress: string | null;
  isConnected: boolean;
  walletName: string | null;
  balance: string;
  user: UserProfile | null;
  token: string | null;
  isConnecting: boolean;
  error: string | null;
  connect: (walletName: string) => Promise<void>;
  disconnect: () => void;
  updateBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>("0.00");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Restore wallet session on page mount
  useEffect(() => {
    const savedToken = localStorage.getItem("fs_token");
    const savedUser = localStorage.getItem("fs_user");
    const savedWallet = localStorage.getItem("fs_wallet_name");

    if (savedToken && savedUser && savedWallet) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      setWalletName(savedWallet);
      setWalletAddress(JSON.parse(savedUser).walletAddress);
      
      // Auto reconnect wallet API to fetch current balance
      reconnectWallet(savedWallet);
    }
  }, []);

  const reconnectWallet = async (name: string) => {
    try {
      const cardano = (window as any).cardano;
      if (cardano && cardano[name]) {
        const api = await cardano[name].enable();
        const lucid = await getClientLucid(api);
        
        if (lucid) {
          const utxos = await lucid.wallet().getUtxos();
          const totalLovelace = utxos.reduce((acc, utxo) => acc + utxo.assets.lovelace, 0n);
          setBalance((Number(totalLovelace) / 1000000).toFixed(2));
        } else {
          // Fallback balance for Mock mode
          setBalance("420.00");
        }
      }
    } catch (err) {
      console.warn("Failed to auto-reconnect wallet balance:", err);
    }
  };

  const connect = async (name: string) => {
    setIsConnecting(true);
    setError(null);
    try {
      // 1. Authenticate with backend using CIP-30 signature challenge
      const { token: jwtToken, user: userProfile } = await authenticateWallet(name, BACKEND_URL);

      // 2. Set State
      setToken(jwtToken);
      setUser(userProfile);
      setWalletName(name);
      setWalletAddress(userProfile.walletAddress);

      // 3. Save to localStorage
      localStorage.setItem("fs_token", jwtToken);
      localStorage.setItem("fs_user", JSON.stringify(userProfile));
      localStorage.setItem("fs_wallet_name", name);

      // 4. Retrieve wallet balance
      await reconnectWallet(name);
      console.log(`Successfully connected and logged in via ${name}`);
    } catch (err: any) {
      setError(err.message || "Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    // Clear state
    setToken(null);
    setUser(null);
    setWalletName(null);
    setWalletAddress(null);
    setBalance("0.00");
    setError(null);

    // Clear localStorage
    localStorage.removeItem("fs_token");
    localStorage.removeItem("fs_user");
    localStorage.removeItem("fs_wallet_name");
    
    console.log("Logged out and disconnected wallet.");
  };

  const updateBalance = async () => {
    if (walletName) {
      await reconnectWallet(walletName);
    }
  };

  const isConnected = !!token && !!walletAddress;

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        isConnected,
        walletName,
        balance,
        user,
        token,
        isConnecting,
        error,
        connect,
        disconnect,
        updateBalance,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};
