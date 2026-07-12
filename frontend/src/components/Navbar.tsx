"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "../hooks/useWallet";
import { Wallet, LogOut, CheckCircle, Trophy, LayoutDashboard, Shield, BookOpen, User, Sparkles, AlertCircle } from "lucide-react";

export const Navbar: React.FC = () => {
  const { walletAddress, isConnected, balance, connect, disconnect, isConnecting, user, error } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const handleConnect = async (walletName: string) => {
    await connect(walletName);
    if (localStorage.getItem("fs_token")) {
      setIsOpen(false);
    }
  };

  const activeLink = (path: string) => pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full px-6 py-4">
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3 glass rounded-2xl shadow-lg border border-white/10 backdrop-blur-md">
        
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center glow-blue shadow-lg border border-blue-400/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-white">Fair<span className="text-blue-500">Stake</span></span>
            <span className="block text-[9px] uppercase tracking-widest text-slate-400 font-semibold leading-none">Cardano Escrow</span>
          </div>
        </Link>

        {/* Desktop Nav Items */}
        <div className="hidden md:flex items-center space-x-8">
          <Link 
            href="/dashboard" 
            className={`flex items-center space-x-1.5 text-sm font-semibold transition-all duration-200 ${
              activeLink("/dashboard") ? "text-blue-400" : "text-slate-300 hover:text-white"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Contests</span>
          </Link>
          
          <Link 
            href="/leaderboard" 
            className={`flex items-center space-x-1.5 text-sm font-semibold transition-all duration-200 ${
              activeLink("/leaderboard") ? "text-blue-400" : "text-slate-300 hover:text-white"
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Leaderboard</span>
          </Link>

          <Link 
            href="/profile" 
            className={`flex items-center space-x-1.5 text-sm font-semibold transition-all duration-200 ${
              activeLink("/profile") ? "text-blue-400" : "text-slate-300 hover:text-white"
            }`}
          >
            <User className="w-4 h-4" />
            <span>Rewards</span>
          </Link>

          <Link 
            href="/admin" 
            className={`flex items-center space-x-1.5 text-sm font-semibold transition-all duration-200 ${
              activeLink("/admin") ? "text-blue-400" : "text-slate-300 hover:text-white"
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Oracle Hub</span>
          </Link>

          <Link 
            href="/docs" 
            className={`flex items-center space-x-1.5 text-sm font-semibold transition-all duration-200 ${
              activeLink("/docs") ? "text-blue-400" : "text-slate-300 hover:text-white"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Contracts Docs</span>
          </Link>
        </div>

        {/* Right Action Button */}
        <div className="flex items-center space-x-4">
          {isConnected ? (
            <div className="flex items-center space-x-3 bg-slate-900/60 rounded-xl p-1.5 pr-3 border border-white/5 shadow-inner">
              <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 px-3 py-1.5 rounded-lg border border-blue-500/10 text-xs font-bold text-blue-400">
                {balance} ADA
              </div>
              <span className="text-xs font-semibold text-slate-300">
                {walletAddress?.substring(0, 8)}...{walletAddress?.substring(walletAddress.length - 6)}
              </span>
              <button 
                onClick={disconnect}
                className="p-1.5 text-slate-400 hover:text-red-400 bg-slate-950/40 rounded-lg border border-white/5 hover:border-red-500/20 hover:bg-red-500/10 transition-all cursor-pointer"
                title="Disconnect"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsOpen(true)}
              className="relative px-6 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 glow-blue transition-all duration-200 shadow-md cursor-pointer flex items-center space-x-2 border border-blue-400/20"
            >
              <Wallet className="w-4 h-4" />
              <span>Connect Wallet</span>
            </button>
          )}
        </div>
      </nav>

      {/* Connection Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md p-8 glass rounded-3xl shadow-2xl border border-white/10 glow-blue relative animate-in fade-in-50 zoom-in-95 duration-200">
            <h3 className="font-extrabold text-2xl text-white tracking-tight">Connect Wallet</h3>
            <p className="text-slate-400 text-sm mt-2 mb-6">Select a CIP-30 Cardano Preprod wallet to sign the authentication nonce.</p>
            
            {error && (
              <div className="mb-4 p-4 rounded-xl bg-red-600/15 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            <div className="space-y-3">
              {[
                { name: "mock", displayName: "Mock Demo Wallet", desc: "Test the dApp instantly (No extension needed)" },
                { name: "lace", displayName: "Lace Wallet", desc: "IOG Cardano Wallet" },
                { name: "eternl", displayName: "Eternl", desc: "Power-user Cardano Wallet" },
                { name: "nami", displayName: "Nami", desc: "Simple interface browser wallet" }
              ].map((w) => (
                <button
                  key={w.name}
                  onClick={() => handleConnect(w.name)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all group cursor-pointer ${
                    w.name === "mock"
                      ? "bg-blue-600/10 border-blue-500/30 hover:bg-blue-600/25"
                      : "bg-slate-900/40 hover:bg-slate-900/80 border-white/5 hover:border-blue-500/30"
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-white group-hover:text-blue-400 transition-colors">{w.displayName}</h4>
                    <span className="text-xs text-slate-400">{w.desc}</span>
                  </div>
                  <CheckCircle className="w-5 h-5 text-slate-500 group-hover:text-blue-500 transition-colors" />
                </button>
              ))}
            </div>

            <button 
              onClick={() => setIsOpen(false)}
              className="mt-6 w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-300 py-2 cursor-pointer transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
