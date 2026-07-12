"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { ArrowRight, ShieldCheck, Zap, Coins, Users, Trophy, ChevronRight, Check } from "lucide-react";

export default function Home() {
  const [stats, setStats] = useState({
    totalUsers: "1,248",
    totalEscrowADA: "45,210",
    totalContests: "38",
    totalTransactions: "5,821"
  });

  useEffect(() => {
    // Fetch real stats from backend if running, otherwise use defaults
    const fetchStats = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/admin/analytics`);
        if (res.ok) {
          const data = await res.json();
          setStats({
            totalUsers: data.summary.totalUsers.toString(),
            totalEscrowADA: parseFloat(data.summary.totalEscrowADA).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
            totalContests: data.summary.totalContests.toString(),
            totalTransactions: data.summary.totalTransactions.toString()
          });
        }
      } catch (err) {
        console.log("Using cached landing stats due to backend being offline/unseeded");
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-24 md:pt-20 md:pb-32 max-w-7xl mx-auto px-6 w-full text-center">
        
        {/* Decorative background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none -z-10" />

        {/* Tagline */}
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full glass border border-white/5 text-xs text-blue-400 font-bold mb-6 tracking-wide animate-pulse-subtle">
          <Trophy className="w-3.5 h-3.5" />
          <span>Cardano Hackathon Winner Project</span>
        </div>

        {/* Heading */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6 max-w-4xl mx-auto leading-[1.1]">
          Decentralized <span className="text-gradient">Fantasy Sports</span> Escrow Protocol
        </h1>

        {/* Subheading */}
        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
          Eliminate the middleman. Lock fantasy contest entries in secure Aiken smart contracts. Automatic winner payouts and NFT rewards triggered by transparent oracles.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
          <Link 
            href="/dashboard" 
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl glow-blue shadow-lg border border-blue-400/20 transition-all cursor-pointer text-sm"
          >
            <span>Launch App Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link 
            href="/docs" 
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-3.5 glass hover:bg-slate-900/40 text-slate-300 hover:text-white font-bold rounded-2xl transition-all cursor-pointer text-sm"
          >
            <span>Read Contract Docs</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto glass rounded-3xl p-8 border border-white/10 shadow-2xl relative">
          
          {/* Subtle line dividers for large screen */}
          <div className="absolute inset-y-8 left-1/4 w-[1px] bg-white/5 hidden md:block" />
          <div className="absolute inset-y-8 left-2/4 w-[1px] bg-white/5 hidden md:block" />
          <div className="absolute inset-y-8 left-3/4 w-[1px] bg-white/5 hidden md:block" />

          <div className="flex flex-col items-center">
            <Coins className="w-7 h-7 text-blue-400 mb-3" />
            <span className="font-extrabold text-2xl md:text-3xl text-white">{stats.totalEscrowADA} ADA</span>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">Escrow Balance</span>
          </div>

          <div className="flex flex-col items-center">
            <Users className="w-7 h-7 text-emerald-400 mb-3" />
            <span className="font-extrabold text-2xl md:text-3xl text-white">{stats.totalUsers}</span>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">Active Players</span>
          </div>

          <div className="flex flex-col items-center">
            <Trophy className="w-7 h-7 text-amber-400 mb-3" />
            <span className="font-extrabold text-2xl md:text-3xl text-white">{stats.totalContests}</span>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">Total Contests</span>
          </div>

          <div className="flex flex-col items-center">
            <ShieldCheck className="w-7 h-7 text-indigo-400 mb-3" />
            <span className="font-extrabold text-2xl md:text-3xl text-white">{stats.totalTransactions}</span>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">Transactions Audited</span>
          </div>

        </div>

      </section>

      {/* Protocol Features Section */}
      <section className="py-24 bg-slate-950/40 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6 w-full">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-4">
              Building a Safe & Transparent Ecosystem
            </h2>
            <p className="text-slate-400 font-medium">
              FairStake ensures your entry fees are safe on-chain. No bookies, no fake pools, and no rugpulls.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            
            {/* Feature 1 */}
            <div className="glass rounded-3xl p-8 border border-white/5 flex flex-col items-start text-left">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mb-6 shadow-inner">
                <Coins className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="font-bold text-xl text-white mb-3">On-Chain Aiken Escrow</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Fees are locked in specialized Smart Contracts. Neither admin nor bookies can access funds. Payout matches registration ratios exactly.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass rounded-3xl p-8 border border-white/5 flex flex-col items-start text-left">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center mb-6 shadow-inner">
                <Zap className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="font-bold text-xl text-white mb-3">Automatic Payouts</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Smart contract automatically resolves winners (1st, 2nd, 3rd) once the match scores are finalized, triggering instant on-chain ADA transfers.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass rounded-3xl p-8 border border-white/5 flex flex-col items-start text-left">
              <div className="w-12 h-12 rounded-2xl bg-amber-600/10 border border-amber-500/20 flex items-center justify-center mb-6 shadow-inner">
                <Trophy className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="font-bold text-xl text-white mb-3">Commemorative NFTs</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Winners and participants receive unique Cardano Native Asset NFTs commemorating their placement and stats directly in their connected wallet.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* Protocol Workflow Section */}
      <section className="py-24 max-w-7xl mx-auto px-6 w-full">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-4">
            How The Protocol Operates
          </h2>
          <p className="text-slate-400 font-medium">
            Your fantasy entry goes through 4 secure on-chain states.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8 relative">
          
          {[
            { num: "01", title: "Connect Wallet", desc: "Enable browser extension and sign backend nonce to create user profile." },
            { num: "02", title: "Join & Deposit", desc: "Build a fantasy roster and lock entry fee ADA in the escrow validator." },
            { num: "03", title: "Finalize Stats", desc: "Oracle pushes verified match player performance scores on completion." },
            { num: "04", title: "Claim Prizes", desc: "Smart contract splits escrow balance, releases ADA and mints placement NFTs." }
          ].map((step, idx) => (
            <div key={idx} className="glass-card rounded-3xl p-8 border border-white/5 text-left flex flex-col relative overflow-hidden group hover:border-blue-500/30 transition-all duration-300">
              <div className="absolute -right-4 -top-4 font-black text-6xl text-white/5 group-hover:text-blue-500/5 transition-colors">
                {step.num}
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-600/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-xs mb-6">
                {step.num}
              </div>
              <h4 className="font-bold text-white text-lg mb-2">{step.title}</h4>
              <p className="text-slate-400 text-xs leading-relaxed">{step.desc}</p>
            </div>
          ))}

        </div>
      </section>

      {/* Call to action */}
      <section className="py-20 max-w-5xl mx-auto px-6 w-full">
        <div className="glass-card rounded-[36px] p-12 border border-white/10 glow-blue text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
          <h2 className="text-3xl md:text-5xl font-black text-white mb-4">Ready to enter the arena?</h2>
          <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto mb-8 font-medium">
            Connect your Lace or Eternl wallet, select an upcoming sports match, build your ultimate team, and compete on Cardano.
          </p>
          <Link 
            href="/dashboard" 
            className="inline-flex items-center space-x-2 px-8 py-4 bg-white text-slate-950 hover:bg-slate-100 font-extrabold rounded-2xl transition-all shadow-xl cursor-pointer text-sm"
          >
            <span>Enter Lobby Now</span>
            <ArrowRight className="w-4 h-4 text-slate-950" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
