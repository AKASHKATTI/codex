"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "../../components/Navbar";
import { Footer } from "../../components/Footer";
import { Trophy, Award, User, Coins } from "lucide-react";

interface LeaderboardEntry {
  userId: string;
  username: string;
  walletAddress: string;
  totalScore: number;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { userId: "u1", username: "FS_PreprodCricketChamp", walletAddress: "addr_test1qr...", totalScore: 345.5 },
  { userId: "u2", username: "FS_PreprodCenturyMaker", walletAddress: "addr_test1qp...", totalScore: 310.0 },
  { userId: "u3", username: "FS_PreprodGooglyMaster", walletAddress: "addr_test1qy...", totalScore: 295.2 },
  { userId: "u4", username: "FS_PreprodSeamerSwing", walletAddress: "addr_test1qx...", totalScore: 250.0 },
  { userId: "u5", username: "FS_PreprodCardanoWicket", walletAddress: "addr_test1qv...", totalScore: 198.5 }
];

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(MOCK_LEADERBOARD);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/leaderboard`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            setLeaderboard(data);
          }
        }
      } catch (err) {
        console.warn("Using mock standings for overall leaderboard.");
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow max-w-4xl mx-auto w-full px-6 py-12">
        
        {/* Header */}
        <div className="text-center mb-16">
          <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-4 animate-bounce" />
          <h1 className="text-4xl font-extrabold text-white tracking-tight">Hall of Champions</h1>
          <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto">
            Overall platform leaderboards based on aggregate fantasy performance points. Can you take the crown?
          </p>
        </div>

        {/* Leaderboard Board */}
        <div className="glass-card rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
          
          <div className="p-6 bg-slate-900/60 border-b border-white/5 flex items-center justify-between">
            <span className="text-xs uppercase font-extrabold text-slate-400 tracking-wider">Top Performers</span>
            <span className="text-xs text-blue-400 font-bold">Updated real-time on resolution</span>
          </div>

          {loading ? (
            <div className="text-center py-10 text-slate-500 text-sm">Loading leaderboard...</div>
          ) : (
            <div className="divide-y divide-white/5">
              {leaderboard.map((entry, idx) => {
                const isPodium = idx < 3;
                const podiumBadges = ["🥇", "🥈", "🥉"];
                return (
                  <div 
                    key={entry.userId}
                    className="flex items-center justify-between p-6 hover:bg-slate-900/10 transition-colors"
                  >
                    <div className="flex items-center space-x-5">
                      {/* Rank Indicator */}
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                        idx === 0 
                          ? "bg-amber-400/10 text-amber-400 border border-amber-500/20"
                          : idx === 1
                          ? "bg-slate-300/10 text-slate-300 border border-slate-300/20"
                          : idx === 2
                          ? "bg-amber-700/10 text-amber-600 border border-amber-700/20"
                          : "bg-slate-950/40 text-slate-500 border border-white/5"
                      }`}>
                        {isPodium ? podiumBadges[idx] : idx + 1}
                      </span>

                      <div>
                        <h3 className="font-extrabold text-white text-base flex items-center space-x-1.5">
                          <span>{entry.username}</span>
                        </h3>
                        <span className="font-mono text-[9px] text-slate-500 mt-0.5 block">
                          {entry.walletAddress.substring(0, 10)}...{entry.walletAddress.substring(entry.walletAddress.length - 8)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <span className="block font-black text-white text-base">{entry.totalScore.toFixed(1)}</span>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Fantasy Points</span>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>

      </main>

      <Footer />
    </div>
  );
}
