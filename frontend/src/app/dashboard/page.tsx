"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "../../components/Navbar";
import { Footer } from "../../components/Footer";
import { useWallet } from "../../hooks/useWallet";
import { Coins, Users, Calendar, ArrowUpRight, Trophy, Zap, AlertCircle } from "lucide-react";

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  status: string;
  matchDate: string;
  homeScore: number;
  awayScore: number;
}

interface Contest {
  id: string;
  title: string;
  description: string;
  entryFee: string; // Lovelaces (string)
  maxPlayers: number;
  matchId: string;
  status: string;
  prizePool: string;
  escrowAddress: string;
  deadline: string;
  _count?: {
    teams: number;
  };
  match: Match;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Standard mock data for offline/unseeded fallback
const MOCK_MATCHES: Match[] = [
  {
    id: "match-1",
    homeTeam: "India",
    awayTeam: "Australia",
    status: "SCHEDULED",
    matchDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    homeScore: 0,
    awayScore: 0
  },
  {
    id: "match-2",
    homeTeam: "England",
    awayTeam: "South Africa",
    status: "COMPLETED",
    matchDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    homeScore: 285,
    awayScore: 282
  }
];

const MOCK_CONTESTS: Contest[] = [
  {
    id: "contest-1",
    title: "India vs Australia Mega Contest",
    description: "Build your ultimate fantasy squad. Top 3 scorers share the prize pool locked in our Aiken contract.",
    entryFee: "10000000", // 10 ADA
    maxPlayers: 10,
    matchId: "match-1",
    status: "UPCOMING",
    prizePool: "80000000", // 80 ADA
    escrowAddress: "addr_test1wpfairstake_escrow_address_here",
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    _count: { teams: 8 },
    match: MOCK_MATCHES[0]
  },
  {
    id: "contest-2",
    title: "India vs Australia Head-to-Head",
    description: "Winner takes all double-up. Safe escrow contract, legal skill-based sports betting alternative.",
    entryFee: "25000000", // 25 ADA
    maxPlayers: 2,
    matchId: "match-1",
    status: "UPCOMING",
    prizePool: "25000000", // 25 ADA
    escrowAddress: "addr_test1wpfairstake_escrow_address_here",
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    _count: { teams: 1 },
    match: MOCK_MATCHES[0]
  },
  {
    id: "contest-3",
    title: "England vs South Africa Champions Cup",
    description: "Resolved contest. Payouts complete. Placement NFTs successfully minted on Preprod.",
    entryFee: "5000000", // 5 ADA
    maxPlayers: 20,
    matchId: "match-2",
    status: "RESOLVED",
    prizePool: "95000000", // 95 ADA
    escrowAddress: "addr_test1wpfairstake_escrow_address_here",
    deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    _count: { teams: 20 },
    match: MOCK_MATCHES[1]
  }
];

export default function Dashboard() {
  const { isConnected, walletName } = useWallet();
  const [contests, setContests] = useState<Contest[]>(MOCK_CONTESTS);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL"); // ALL, UPCOMING, RESOLVED

  useEffect(() => {
    const loadContests = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/contests`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            setContests(data);
          }
        }
      } catch (err) {
        console.warn("Using mock contests due to connection failure with backend API");
      } finally {
        setLoading(false);
      }
    };
    loadContests();
  }, []);

  const filteredContests = contests.filter((c) => {
    if (filter === "ALL") return true;
    return c.status === filter;
  });

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow max-w-7xl mx-auto w-full px-6 py-12">
        
        {/* Banner Alert if wallet is not connected */}
        {!isConnected && (
          <div className="mb-10 flex items-center justify-between p-5 glass rounded-2xl border border-amber-500/20 bg-amber-500/5 text-amber-300">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-sm">Wallet Disconnected</h4>
                <p className="text-xs text-slate-400 mt-0.5">Please connect your browser wallet (Lace, Eternl) to join contests, enter the escrow pools, and view your profile.</p>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-12">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Sports Contest Lobby</h1>
            <p className="text-slate-400 text-sm mt-1">Browse skill-based fantasy contests, select sport matches, and lock your entry on-chain.</p>
          </div>

          {/* Filtering Tabs */}
          <div className="flex bg-slate-900/60 p-1 rounded-xl border border-white/5 self-start">
            {["ALL", "UPCOMING", "RESOLVED"].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filter === tab
                    ? "bg-blue-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tab === "ALL" ? "All Contests" : tab === "UPCOMING" ? "Open Pools" : "Completed"}
              </button>
            ))}
          </div>
        </div>

        {/* Contests Grid */}
        {loading ? (
          <div className="text-center py-20 text-slate-500 text-sm">Loading contests...</div>
        ) : filteredContests.length === 0 ? (
          <div className="text-center py-20 glass rounded-3xl border border-white/5 text-slate-500 text-sm">
            No contests found matching this category.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredContests.map((contest) => {
              const feeADA = Number(contest.entryFee) / 1000000;
              const potADA = Number(contest.prizePool) / 1000000;
              const joinedCount = contest._count?.teams || 0;
              const percentFilled = Math.min((joinedCount / contest.maxPlayers) * 100, 100);
              
              const isResolved = contest.status === "RESOLVED";

              return (
                <div 
                  key={contest.id}
                  className="glass-card rounded-3xl border border-white/5 p-6 flex flex-col justify-between hover:border-white/10 transition-all duration-300 relative group"
                >
                  
                  {/* Status Tag */}
                  <div className="absolute top-6 right-6">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                      isResolved 
                        ? "bg-slate-800 text-slate-400 border border-white/5" 
                        : "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                    }`}>
                      {contest.status}
                    </span>
                  </div>

                  <div>
                    {/* Match Info */}
                    <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 mb-3">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{contest.match.homeTeam} vs {contest.match.awayTeam}</span>
                      <span>•</span>
                      <span>{new Date(contest.match.matchDate).toLocaleDateString()}</span>
                    </div>

                    {/* Title */}
                    <h3 className="font-extrabold text-xl text-white mb-2 group-hover:text-blue-400 transition-colors">
                      {contest.title}
                    </h3>
                    
                    {/* Description */}
                    <p className="text-slate-400 text-xs leading-relaxed mb-6 font-medium">
                      {contest.description}
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 bg-slate-950/40 p-4 rounded-2xl border border-white/5 mb-6">
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Entry Fee</span>
                        <div className="flex items-center space-x-1 mt-0.5">
                          <Coins className="w-3.5 h-3.5 text-blue-400" />
                          <span className="font-bold text-white text-sm">{feeADA} ADA</span>
                        </div>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Prize Pool</span>
                        <div className="flex items-center space-x-1 mt-0.5">
                          <Trophy className="w-3.5 h-3.5 text-amber-400" />
                          <span className="font-bold text-white text-sm">{potADA} ADA</span>
                        </div>
                      </div>
                    </div>

                    {/* Roster Progress Bar */}
                    <div className="mb-6">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                        <span>Participants</span>
                        <span className="text-slate-300">{joinedCount} / {contest.maxPlayers}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                        <div 
                          className="h-full bg-blue-500 rounded-full glow-blue"
                          style={{ width: `${percentFilled}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {isResolved ? (
                    <Link
                      href={`/contests/${contest.id}`}
                      className="w-full py-3 bg-slate-900/60 hover:bg-slate-900 text-slate-300 font-bold rounded-xl border border-white/5 hover:border-white/10 text-center text-xs flex items-center justify-center space-x-1.5 transition-all"
                    >
                      <span>View Results</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <Link
                      href={`/contests/${contest.id}`}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-center text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md group-hover:glow-blue cursor-pointer"
                    >
                      <span>Select Roster & Join</span>
                      <Zap className="w-3.5 h-3.5" />
                    </Link>
                  )}

                </div>
              );
            })}
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}
