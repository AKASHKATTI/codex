"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { Navbar } from "../../../components/Navbar";
import { Footer } from "../../../components/Footer";
import { useWallet } from "../../../hooks/useWallet";
import { lockEntryFee, getExplorerLink } from "../../../lib/wallet";
import { Coins, Trophy, Calendar, Users, Shield, ArrowLeft, Check, CheckCircle2, Info, ExternalLink } from "lucide-react";
import confetti from "canvas-confetti";

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  status: string;
  matchDate: string;
}

interface TeamEntry {
  id: string;
  user: {
    username: string;
    walletAddress: string;
  };
  players: any; // JSON
  score: number;
  rank?: number;
}

interface Contest {
  id: string;
  title: string;
  description: string;
  entryFee: string;
  maxPlayers: number;
  status: string;
  prizePool: string;
  escrowAddress: string;
  deadline: string;
  match: Match;
  teams: TeamEntry[];
  winner1Id?: string;
  winner2Id?: string;
  winner3Id?: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Roster Selection Pool
const PLAYERS_POOL = [
  { id: "p1", name: "Virat Kohli", role: "Batsman", team: "IND" },
  { id: "p2", name: "Rohit Sharma", role: "Batsman", team: "IND" },
  { id: "p3", name: "Steve Smith", role: "Batsman", team: "AUS" },
  { id: "p4", name: "Glenn Maxwell", role: "All-Rounder", team: "AUS" },
  { id: "p5", name: "Jasprit Bumrah", role: "Bowler", team: "IND" },
  { id: "p6", name: "Mitchell Starc", role: "Bowler", team: "AUS" }
];

export default function ContestDetails({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = use(paramsPromise);
  const { id: contestId } = params;
  const { isConnected, walletName, token } = useWallet();

  const [contest, setContest] = useState<Contest | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch contest details from backend
  const loadContest = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/contests/${contestId}`);
      if (res.ok) {
        const data = await res.json();
        setContest(data);
      } else {
        // Fallback to mock data if offline
        setContest({
          id: contestId,
          title: "India vs Australia Mega Contest",
          description: "Build your ultimate fantasy squad. Top 3 scorers share the prize pool locked in our Aiken contract.",
          entryFee: "10000000",
          maxPlayers: 10,
          status: "UPCOMING",
          prizePool: "80000000",
          escrowAddress: "addr_test1wpfairstake_escrow_address_here",
          deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          match: {
            id: "match-1",
            homeTeam: "India",
            awayTeam: "Australia",
            status: "SCHEDULED",
            matchDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
          },
          teams: [
            { id: "t1", user: { username: "FS_PreprodPlayer1", walletAddress: "addr_test1v..." }, players: ["Virat Kohli", "Jasprit Bumrah"], score: 0 },
            { id: "t2", user: { username: "FS_PreprodPlayer2", walletAddress: "addr_test1v..." }, players: ["Steve Smith", "Mitchell Starc"], score: 0 }
          ]
        });
      }
    } catch (err) {
      console.warn("Could not reach backend API, loading mock contest data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContest();
  }, [contestId]);

  const handlePlayerToggle = (playerName: string) => {
    if (selectedPlayers.includes(playerName)) {
      setSelectedPlayers(selectedPlayers.filter((p) => p !== playerName));
    } else {
      if (selectedPlayers.length >= 4) {
        return; // Max 4 players in fantasy squad
      }
      setSelectedPlayers([...selectedPlayers, playerName]);
    }
  };

  const handleJoinContest = async () => {
    if (!isConnected || !walletName) {
      setErrorMessage("Please connect your wallet first.");
      return;
    }
    if (selectedPlayers.length !== 4) {
      setErrorMessage("You must select exactly 4 players for your squad.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Lock entry fee ADA in the Aiken smart contract on-chain
      const feeLovelace = contest?.entryFee || "10000000";
      const deadlineTimestamp = new Date(contest?.deadline || Date.now()).getTime();
      
      console.log(`Requesting smart contract lock for ${contestId}...`);
      const txHash = await lockEntryFee(walletName, contestId, feeLovelace, deadlineTimestamp);
      console.log(`On-chain deposit complete. Tx Hash: ${txHash}`);

      // 2. Submit team selection and transaction hash to backend
      const res = await fetch(`${BACKEND_URL}/api/contests/${contestId}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          players: selectedPlayers,
          txHash,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to log team selection with API");
      }

      const result = await res.json();
      setJoinSuccess(result);

      // Trigger celebration confetti
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });

      // Reload contest stats
      await loadContest();

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "An error occurred while joining the contest.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-grow flex items-center justify-center text-slate-400">Loading details...</div>
        <Footer />
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-grow flex items-center justify-center text-slate-400">Contest not found.</div>
        <Footer />
      </div>
    );
  }

  const feeADA = Number(contest.entryFee) / 1000000;
  const potADA = Number(contest.prizePool) / 1000000;
  const isResolved = contest.status === "RESOLVED";

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow max-w-7xl mx-auto w-full px-6 py-12">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center space-x-2 text-xs font-bold text-slate-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Contests</span>
        </Link>

        <div className="grid lg:grid-cols-3 gap-12">
          
          {/* Main Content (Roster Builder / Overview) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Header info */}
            <div>
              <div className="inline-flex items-center space-x-2 text-xs font-bold text-blue-400 mb-3 bg-blue-600/10 px-3 py-1 rounded-lg border border-blue-500/20">
                <Calendar className="w-3.5 h-3.5" />
                <span>{contest.match.homeTeam} vs {contest.match.awayTeam} ({new Date(contest.match.matchDate).toLocaleDateString()})</span>
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">{contest.title}</h1>
              <p className="text-slate-400 text-sm mt-2 leading-relaxed">{contest.description}</p>
            </div>

            {joinSuccess ? (
              /* Success Board */
              <div className="glass-card rounded-3xl p-8 border border-emerald-500/20 bg-emerald-500/5 glow-blue text-center">
                <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4 animate-bounce" />
                <h2 className="font-extrabold text-2xl text-white">Entry Locked In Smart Contract!</h2>
                <p className="text-slate-400 text-xs mt-2 max-w-md mx-auto">
                  Your entry fee was successfully locked inside the Aiken smart contract escrow address. Your fantasy squad is registered.
                </p>

                <div className="mt-8 bg-slate-950/60 p-4 rounded-2xl border border-white/5 inline-flex items-center space-x-3 text-left">
                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold">LOCKED ADA</span>
                    <span className="font-bold text-emerald-400 text-sm">{feeADA} ADA</span>
                  </div>
                  <div className="h-6 w-[1px] bg-white/5" />
                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold">Transaction Hash</span>
                    <span className="font-mono text-xs text-slate-300 block max-w-[200px] truncate">{joinSuccess.transaction?.txHash || "Pending"}</span>
                  </div>
                </div>

                <div className="mt-6 flex justify-center space-x-4">
                  <a 
                    href={getExplorerLink(joinSuccess.transaction?.txHash || "")}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center space-x-1 text-xs text-blue-400 font-bold hover:text-blue-300 transition-colors"
                  >
                    <span>View on Cardano Explorer</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ) : isResolved ? (
              /* Contest Resolved results board */
              <div className="glass-card rounded-3xl p-8 border border-white/5">
                <h2 className="font-extrabold text-2xl text-white mb-6">Contest Standings & Results</h2>
                <div className="space-y-4">
                  {contest.teams
                    .sort((a, b) => b.score - a.score)
                    .map((team, idx) => {
                      const isWinner = idx < 3;
                      const medals = ["🥇 1st Place", "🥈 2nd Place", "🥉 3rd Place"];
                      return (
                        <div 
                          key={team.id}
                          className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${
                            idx === 0 
                              ? "bg-amber-500/5 border-amber-500/20 text-amber-300"
                              : idx === 1
                              ? "bg-slate-300/5 border-slate-300/20 text-slate-300"
                              : idx === 2
                              ? "bg-amber-700/5 border-amber-700/20 text-amber-600"
                              : "bg-slate-900/40 border-white/5 text-slate-400"
                          }`}
                        >
                          <div className="flex items-center space-x-4">
                            <span className="font-black text-lg w-6">{idx + 1}</span>
                            <div>
                              <h4 className="font-bold text-white text-sm">{team.user.username}</h4>
                              <span className="text-[10px] text-slate-400 block mt-0.5">Roster: {Array.isArray(team.players) ? team.players.join(", ") : JSON.parse(team.players).join(", ")}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            {isWinner && (
                              <span className="block text-[10px] uppercase font-black mb-1">{medals[idx]}</span>
                            )}
                            <span className="font-bold text-sm">{team.score.toFixed(1)} pts</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              /* Squad Builder */
              <div className="glass-card rounded-3xl p-8 border border-white/5">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="font-extrabold text-xl text-white">Select Roster (Pick 4)</h2>
                    <p className="text-slate-400 text-xs mt-0.5">Assemble a balance of batsmen, bowlers, and all-rounders.</p>
                  </div>
                  <span className="px-3 py-1 bg-slate-900 rounded-lg text-xs font-bold text-blue-400 border border-white/5">
                    {selectedPlayers.length} / 4 Chosen
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-8">
                  {PLAYERS_POOL.map((p) => {
                    const isSelected = selectedPlayers.includes(p.name);
                    return (
                      <button
                        key={p.id}
                        onClick={() => handlePlayerToggle(p.name)}
                        className={`flex items-center justify-between p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected 
                            ? "bg-blue-600/10 border-blue-500/50 shadow" 
                            : "bg-slate-900/30 border-white/5 hover:border-white/10"
                        }`}
                      >
                        <div>
                          <h4 className="font-bold text-white text-sm">{p.name}</h4>
                          <span className="text-[10px] text-slate-500">{p.role} • {p.team}</span>
                        </div>
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                          isSelected ? "bg-blue-600 border-blue-400 text-white" : "border-white/10 bg-slate-950"
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {errorMessage && (
                  <div className="mb-6 p-4 rounded-xl bg-red-600/10 border border-red-500/20 text-red-400 text-xs font-semibold flex items-center space-x-2">
                    <Info className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button
                  onClick={handleJoinContest}
                  disabled={isSubmitting || selectedPlayers.length !== 4}
                  className={`w-full py-4 rounded-2xl font-bold transition-all text-sm flex items-center justify-center space-x-2 border shadow-lg ${
                    selectedPlayers.length === 4 && !isSubmitting
                      ? "bg-blue-600 hover:bg-blue-500 border-blue-400/20 text-white glow-blue cursor-pointer"
                      : "bg-slate-900 border-white/5 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>{isSubmitting ? "Locking On-Chain..." : `Deposit ${feeADA} ADA & Join Contest`}</span>
                </button>
              </div>
            )}

          </div>

          {/* Sidebar (Pool Details / Leaderboard) */}
          <div className="space-y-8">
            
            {/* Contest Info Widget */}
            <div className="glass-card rounded-3xl p-6 border border-white/5 space-y-6">
              <h3 className="font-extrabold text-lg text-white">Escrow Pool Details</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs pb-3 border-b border-white/5">
                  <span className="text-slate-400 font-semibold">Entry Fee</span>
                  <span className="font-bold text-white">{feeADA} ADA</span>
                </div>
                <div className="flex items-center justify-between text-xs pb-3 border-b border-white/5">
                  <span className="text-slate-400 font-semibold">Total Prize Pool</span>
                  <span className="font-bold text-white text-gradient">{potADA} ADA</span>
                </div>
                <div className="flex items-center justify-between text-xs pb-3 border-b border-white/5">
                  <span className="text-slate-400 font-semibold">Smart Contract Address</span>
                  <span 
                    className="font-mono text-[9px] text-slate-300 truncate max-w-[150px] cursor-pointer hover:text-blue-400"
                    title={contest.escrowAddress}
                    onClick={() => navigator.clipboard.writeText(contest.escrowAddress)}
                  >
                    {contest.escrowAddress}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold">Current Players</span>
                  <span className="font-bold text-white">{contest.teams.length} / {contest.maxPlayers}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-blue-600/5 border border-blue-500/10 text-[10px] text-slate-400 leading-relaxed flex items-start space-x-2">
                <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <span>
                  Admin has <strong>no control</strong> over this escrow pool. Funds are locked inside the script on Preprod. Payouts are computed automatically by winner verification logic.
                </span>
              </div>
            </div>

            {/* Live Participants List */}
            <div className="glass-card rounded-3xl p-6 border border-white/5 space-y-6">
              <h3 className="font-extrabold text-lg text-white">Participants</h3>
              <div className="space-y-4 max-h-[300px] overflow-y-auto">
                {contest.teams.map((t, idx) => (
                  <div key={t.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center text-[10px] text-slate-500 font-semibold">
                        {idx + 1}
                      </div>
                      <span className="font-bold text-white">{t.user.username}</span>
                    </div>
                    <span className="text-slate-400 font-mono text-[10px]">
                      {t.user.walletAddress.substring(0, 6)}...{t.user.walletAddress.substring(t.user.walletAddress.length - 4)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
