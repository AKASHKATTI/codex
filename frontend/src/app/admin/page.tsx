"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "../../components/Navbar";
import { Footer } from "../../components/Footer";
import { useWallet } from "../../hooks/useWallet";
import { getExplorerLink } from "../../lib/wallet";
import { Shield, Coins, PlusCircle, Play, CheckCircle2, Info, Terminal, AlertCircle } from "lucide-react";
import confetti from "canvas-confetti";

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  status: string;
  matchDate: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const MOCK_PLAYERS = ["Virat Kohli", "Rohit Sharma", "Steve Smith", "Glenn Maxwell", "Jasprit Bumrah", "Mitchell Starc"];

export default function Admin() {
  const { isConnected } = useWallet();
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<string>("");
  const [scores, setScores] = useState<Record<string, string>>({
    "Virat Kohli": "95",
    "Rohit Sharma": "40",
    "Steve Smith": "115",
    "Glenn Maxwell": "50",
    "Jasprit Bumrah": "75",
    "Mitchell Starc": "30"
  });

  // Form states
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [matchDate, setMatchDate] = useState("");
  
  const [contestTitle, setContestTitle] = useState("");
  const [contestFee, setContestFee] = useState("");
  const [contestMaxPlayers, setContestMaxPlayers] = useState("");
  const [contestMatchId, setContestMatchId] = useState("");
  const [contestEscrow, setContestEscrow] = useState("addr_test1wpfairstake_escrow_address_here");

  // Loading/Terminal states
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [isOracleTriggering, setIsOracleTriggering] = useState(false);
  const [isCreatingMatch, setIsCreatingMatch] = useState(false);
  const [isCreatingContest, setIsCreatingContest] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<string[]>(["Oracle panel initialized. Ready for simulation..."]);

  const log = (msg: string) => {
    setConsoleLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const loadMatches = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/matches`);
      if (res.ok) {
        const data = await res.json();
        setMatches(data);
        const scheduled = data.filter((m: any) => m.status === "SCHEDULED");
        if (scheduled.length > 0) {
          setSelectedMatch(scheduled[0].id);
          setContestMatchId(scheduled[0].id);
        }
      }
    } catch (err) {
      console.warn("Could not load matches from backend.");
      setMatches([
        { id: "match-1", homeTeam: "India", awayTeam: "Australia", status: "SCHEDULED", matchDate: new Date().toISOString() }
      ]);
      setSelectedMatch("match-1");
      setContestMatchId("match-1");
    } finally {
      setLoadingMatches(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  const handleScoreChange = (player: string, val: string) => {
    setScores((prev) => ({ ...prev, [player]: val }));
  };

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeTeam || !awayTeam || !matchDate) return;
    setIsCreatingMatch(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/matches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeTeam, awayTeam, matchDate }),
      });
      if (res.ok) {
        log(`Created Match: ${homeTeam} vs ${awayTeam}`);
        setHomeTeam("");
        setAwayTeam("");
        setMatchDate("");
        await loadMatches();
      }
    } catch (err) {
      log("Error creating match.");
    } finally {
      setIsCreatingMatch(false);
    }
  };

  const handleCreateContest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contestTitle || !contestFee || !contestMaxPlayers || !contestMatchId || !contestEscrow) return;
    setIsCreatingContest(true);
    
    // Calculate a deadline equal to match start time or now + 1 day
    const matchObj = matches.find(m => m.id === contestMatchId);
    const deadline = matchObj ? matchObj.matchDate : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/contests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: contestTitle,
          description: `Roster pool cricket contest for ${matchObj?.homeTeam} vs ${matchObj?.awayTeam}`,
          entryFee: (Number(contestFee) * 1000000).toString(), // convert ADA to Lovelaces
          maxPlayers: contestMaxPlayers,
          matchId: contestMatchId,
          escrowAddress: contestEscrow,
          deadline,
        }),
      });
      if (res.ok) {
        log(`Created Contest: ${contestTitle}`);
        setContestTitle("");
        setContestFee("");
        setContestMaxPlayers("");
      }
    } catch (err) {
      log("Error creating contest.");
    } finally {
      setIsCreatingContest(false);
    }
  };

  const triggerOracle = async () => {
    if (!selectedMatch) return;
    setIsOracleTriggering(true);
    log(`Triggering oracle score submission for match ${selectedMatch}...`);
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/oracle/finalize-match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: selectedMatch,
          playerScores: scores,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        log("Oracle finalized successfully!");
        
        data.results.forEach((resItem: any) => {
          log(`Resolved Contest: ${resItem.title}`);
          log(`Payout Transaction: ${resItem.payoutTxHash}`);
          log(`🥇 1st Place: ${resItem.winners.first.username} (${resItem.winners.first.score} pts)`);
          log(`🥈 2nd Place: ${resItem.winners.second.username} (${resItem.winners.second.score} pts)`);
          log(`🥉 3rd Place: ${resItem.winners.third.username} (${resItem.winners.third.score} pts)`);
          
          resItem.nfts.forEach((nft: any) => {
            log(`Minted NFT (${nft.type}) in tx: ${nft.txHash}`);
          });
        });

        confetti({
          particleCount: 200,
          spread: 100,
          origin: { y: 0.5 }
        });

        await loadMatches();
      } else {
        const errData = await res.json();
        log(`Oracle Error: ${errData.error || "Execution failed"}`);
      }
    } catch (err) {
      log("Network connection error to Oracle service.");
    } finally {
      setIsOracleTriggering(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow max-w-7xl mx-auto w-full px-6 py-12">
        
        {/* Header */}
        <div className="flex items-center space-x-3 mb-10">
          <div className="w-12 h-12 bg-blue-600/10 border border-blue-500/20 flex items-center justify-center rounded-2xl glow-blue">
            <Shield className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Oracle Hub</h1>
            <p className="text-slate-400 text-sm mt-0.5">Simulate cricket oracle feeds, finalise match stats, and test automated smart contract distributions.</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          
          {/* Left Column (Match/Contest Registration & Oracle Trigger) */}
          <div className="lg:col-span-2 space-y-12">
            
            {/* Oracle Trigger Panel */}
            <div className="glass-card rounded-[28px] p-8 border border-white/5 space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-xl text-white">Trigger Mock Oracle</h3>
                  <p className="text-slate-400 text-xs mt-0.5">Select a scheduled match, input performance metrics, and trigger resolving.</p>
                </div>
                <Play className="w-5 h-5 text-blue-400 animate-pulse-subtle" />
              </div>

              {loadingMatches ? (
                <div className="text-xs text-slate-500">Loading matches...</div>
              ) : matches.filter(m => m.status === "SCHEDULED").length === 0 ? (
                <div className="p-4 bg-slate-950/40 rounded-2xl border border-white/5 text-xs text-slate-500 text-center">
                  No active scheduled matches available to resolve. Create a match below first.
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Select Target Match</label>
                    <select 
                      value={selectedMatch}
                      onChange={(e) => setSelectedMatch(e.target.value)}
                      className="w-full bg-slate-950/60 border border-white/10 rounded-xl p-3 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50"
                    >
                      {matches
                        .filter(m => m.status === "SCHEDULED")
                        .map((m) => (
                          <option key={m.id} value={m.id}>{m.homeTeam} vs {m.awayTeam} ({new Date(m.matchDate).toLocaleDateString()})</option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Mock Player Score Weights (Fantasy Pts)</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {MOCK_PLAYERS.map((p) => (
                        <div key={p} className="bg-slate-950/40 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                          <span className="text-xs text-slate-400 font-semibold">{p}</span>
                          <input 
                            type="number"
                            value={scores[p]}
                            onChange={(e) => handleScoreChange(p, e.target.value)}
                            className="w-12 bg-slate-900 border border-white/10 rounded px-1.5 py-0.5 text-center text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={triggerOracle}
                    disabled={isOracleTriggering || !selectedMatch}
                    className={`w-full py-4 rounded-xl font-bold transition-all text-xs flex items-center justify-center space-x-2 border shadow-lg ${
                      !isOracleTriggering && selectedMatch
                        ? "bg-blue-600 hover:bg-blue-500 border-blue-400/20 text-white glow-blue cursor-pointer"
                        : "bg-slate-900 border-white/5 text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    <Coins className="w-4 h-4" />
                    <span>{isOracleTriggering ? "Finalising Standings & Dispersing Escrow..." : "Trigger Oracle & Distribute Prize Pool"}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Creation Panels Grid */}
            <div className="grid md:grid-cols-2 gap-8">
              
              {/* Match Creation */}
              <form onSubmit={handleCreateMatch} className="glass-card rounded-[24px] p-6 border border-white/5 space-y-4">
                <h4 className="font-extrabold text-base text-white">Register Cricket Match</h4>
                <div className="space-y-3">
                  <input 
                    type="text" 
                    placeholder="Home Team (e.g. India)"
                    value={homeTeam}
                    onChange={(e) => setHomeTeam(e.target.value)}
                    className="w-full bg-slate-950/60 border border-white/5 rounded-xl p-3 text-xs text-slate-300 focus:outline-none focus:border-blue-500/50"
                    required
                  />
                  <input 
                    type="text" 
                    placeholder="Away Team (e.g. Australia)"
                    value={awayTeam}
                    onChange={(e) => setAwayTeam(e.target.value)}
                    className="w-full bg-slate-950/60 border border-white/5 rounded-xl p-3 text-xs text-slate-300 focus:outline-none focus:border-blue-500/50"
                    required
                  />
                  <input 
                    type="datetime-local"
                    value={matchDate}
                    onChange={(e) => setMatchDate(e.target.value)}
                    className="w-full bg-slate-950/60 border border-white/5 rounded-xl p-3 text-xs text-slate-300 focus:outline-none focus:border-blue-500/50"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isCreatingMatch}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-900/60 rounded-xl text-slate-300 font-bold border border-white/5 hover:border-white/10 text-xs flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Register Match</span>
                </button>
              </form>

              {/* Contest Creation */}
              <form onSubmit={handleCreateContest} className="glass-card rounded-[24px] p-6 border border-white/5 space-y-4">
                <h4 className="font-extrabold text-base text-white">Create Fantasy Contest</h4>
                <div className="space-y-3">
                  <input 
                    type="text" 
                    placeholder="Contest Title"
                    value={contestTitle}
                    onChange={(e) => setContestTitle(e.target.value)}
                    className="w-full bg-slate-950/60 border border-white/5 rounded-xl p-3 text-xs text-slate-300 focus:outline-none focus:border-blue-500/50"
                    required
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      type="number" 
                      placeholder="Entry Fee (ADA)"
                      value={contestFee}
                      onChange={(e) => setContestFee(e.target.value)}
                      className="w-full bg-slate-950/60 border border-white/5 rounded-xl p-3 text-xs text-slate-300 focus:outline-none focus:border-blue-500/50"
                      required
                    />
                    <input 
                      type="number" 
                      placeholder="Max Players"
                      value={contestMaxPlayers}
                      onChange={(e) => setContestMaxPlayers(e.target.value)}
                      className="w-full bg-slate-950/60 border border-white/5 rounded-xl p-3 text-xs text-slate-300 focus:outline-none focus:border-blue-500/50"
                      required
                    />
                  </div>
                  <select 
                    value={contestMatchId}
                    onChange={(e) => setContestMatchId(e.target.value)}
                    className="w-full bg-slate-950/60 border border-white/5 rounded-xl p-3 text-xs text-slate-300 focus:outline-none focus:border-blue-500/50"
                    required
                  >
                    <option value="" disabled>Select Match</option>
                    {matches.map((m) => (
                      <option key={m.id} value={m.id}>{m.homeTeam} vs {m.awayTeam}</option>
                    ))}
                  </select>
                  <input 
                    type="text" 
                    placeholder="Escrow Address"
                    value={contestEscrow}
                    onChange={(e) => setContestEscrow(e.target.value)}
                    className="w-full bg-slate-950/60 border border-white/5 rounded-xl p-3 text-xs text-slate-300 focus:outline-none focus:border-blue-500/50"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isCreatingContest}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-900/60 rounded-xl text-slate-300 font-bold border border-white/5 hover:border-white/10 text-xs flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Spawn Contest</span>
                </button>
              </form>

            </div>

          </div>

          {/* Right Column (Live Terminal Console Output) */}
          <div className="glass-card rounded-[28px] p-6 border border-white/5 flex flex-col h-[580px]">
            <div className="flex items-center space-x-2 pb-4 border-b border-white/5">
              <Terminal className="w-4 h-4 text-blue-400" />
              <h3 className="font-extrabold text-sm text-white">Live Execution Terminal</h3>
            </div>
            
            <div className="flex-grow bg-black/60 rounded-2xl p-4 font-mono text-[10px] text-green-400 overflow-y-auto space-y-2 mt-4 text-left leading-relaxed">
              {consoleLogs.map((logStr, idx) => (
                <div key={idx} className="whitespace-pre-wrap break-all">
                  {logStr}
                </div>
              ))}
            </div>

            <div className="mt-4 p-4 rounded-xl bg-blue-600/5 border border-blue-500/10 text-[10px] text-slate-400 flex items-start space-x-2">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span>
                To run a full demo, first join a contest using your wallet, and then click the trigger button in the Oracle Trigger panel to disperse prizes!
              </span>
            </div>
          </div>

        </div>

      </main>

      <Footer />
    </div>
  );
}
