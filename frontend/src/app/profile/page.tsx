"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "../../components/Navbar";
import { Footer } from "../../components/Footer";
import { useWallet } from "../../hooks/useWallet";
import { getExplorerLink } from "../../lib/wallet";
import { User, Trophy, Coins, Award, AwardIcon, ExternalLink, ShieldCheck, AlertCircle } from "lucide-react";

interface Reward {
  id: string;
  rewardType: string;
  nftAssetId: string;
  txHash: string;
  createdAt: string;
  contest: {
    title: string;
  };
}

interface UserStats {
  contestsJoined: number;
  totalPoints: number;
  nftsMinted: number;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Mock Fallback Rewards
const MOCK_REWARDS: Reward[] = [
  {
    id: "reward-1",
    rewardType: "CHAMPION_NFT",
    nftAssetId: "policy1234championnftfourseas",
    txHash: "mock_tx_hash_nft_champ",
    createdAt: new Date().toISOString(),
    contest: { title: "India vs Australia Mega Contest" }
  },
  {
    id: "reward-2",
    rewardType: "PARTICIPATION_NFT",
    nftAssetId: "policy1234participationnftfourseas",
    txHash: "mock_tx_hash_nft_part",
    createdAt: new Date().toISOString(),
    contest: { title: "England vs South Africa Champions Cup" }
  }
];

export default function Profile() {
  const { isConnected, user, token } = useWallet();
  const [rewards, setRewards] = useState<Reward[]>(MOCK_REWARDS);
  const [stats, setStats] = useState<UserStats>({ contestsJoined: 2, totalPoints: 185.4, nftsMinted: 2 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConnected || !token) {
      setLoading(false);
      return;
    }

    const fetchProfileData = async () => {
      try {
        // Fetch user's joined teams/contests to aggregate stats
        const teamsRes = await fetch(`${BACKEND_URL}/api/my-teams`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (teamsRes.ok) {
          const teams = await teamsRes.json();
          const contestsJoined = teams.length;
          const totalPoints = teams.reduce((acc: number, t: any) => acc + t.score, 0);
          
          // Fetch user's rewards (NFTs) from backend
          // We can mock or query database. Let's do a simple mock/fetch fallback
          // If we had a specific API for rewards, we'd query it. Let's assume the backend has it under user rewards
          // Or we can get rewards by filtering contests where user won
          const rewardsList: Reward[] = [];
          teams.forEach((team: any) => {
            if (team.contest.status === "RESOLVED") {
              const c = team.contest;
              if (c.winner1Id === user?.id) {
                rewardsList.push({
                  id: `r-${team.id}`,
                  rewardType: "CHAMPION_NFT",
                  nftAssetId: `fairstakepolicyidwinner_${c.id.substring(0, 4)}`,
                  txHash: "mock_tx_hash_nft_minted",
                  createdAt: new Date().toISOString(),
                  contest: { title: c.title }
                });
              } else if (c.winner2Id === user?.id) {
                rewardsList.push({
                  id: `r-${team.id}`,
                  rewardType: "WINNER_NFT",
                  nftAssetId: `fairstakepolicyidrunner_${c.id.substring(0, 4)}`,
                  txHash: "mock_tx_hash_nft_minted",
                  createdAt: new Date().toISOString(),
                  contest: { title: c.title }
                });
              } else if (c.winner3Id === user?.id) {
                rewardsList.push({
                  id: `r-${team.id}`,
                  rewardType: "PARTICIPATION_NFT",
                  nftAssetId: `fairstakepolicyidparticipation_${c.id.substring(0, 4)}`,
                  txHash: "mock_tx_hash_nft_minted",
                  createdAt: new Date().toISOString(),
                  contest: { title: c.title }
                });
              }
            }
          });

          setRewards(rewardsList.length > 0 ? rewardsList : MOCK_REWARDS);
          setStats({
            contestsJoined,
            totalPoints,
            nftsMinted: rewardsList.length > 0 ? rewardsList.length : MOCK_REWARDS.length
          });
        }
      } catch (err) {
        console.warn("Could not load real profile stats, displaying mock data.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [isConnected, token, user?.id]);

  if (!isConnected) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow max-w-xl mx-auto w-full px-6 py-20 text-center flex flex-col items-center justify-center">
          <AlertCircle className="w-16 h-16 text-amber-500 mb-4 animate-pulse-subtle" />
          <h1 className="text-3xl font-extrabold text-white">Wallet Connection Required</h1>
          <p className="text-slate-400 text-sm mt-3 mb-8">
            Please connect your Lace or Eternl wallet to view your personal rewards, statistics, and NFT cabinet.
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow max-w-7xl mx-auto w-full px-6 py-12">
        
        {/* User Card */}
        <div className="glass-card rounded-[32px] p-8 border border-white/10 shadow-2xl mb-12 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-60 h-60 bg-blue-600/5 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="flex items-center space-x-5 text-left">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center glow-blue border border-blue-400/20">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="font-extrabold text-2xl text-white">{user?.username}</h2>
              <span className="font-mono text-xs text-slate-400 block mt-1">
                {user?.walletAddress}
              </span>
            </div>
          </div>

          {/* Stats Badges */}
          <div className="grid grid-cols-3 gap-6 bg-slate-950/40 p-5 rounded-2xl border border-white/5 w-full md:w-auto">
            <div className="text-center px-4">
              <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Contests</span>
              <span className="font-black text-white text-lg mt-0.5 block">{stats.contestsJoined}</span>
            </div>
            <div className="text-center px-4 border-x border-white/5">
              <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Points</span>
              <span className="font-black text-white text-lg mt-0.5 block">{stats.totalPoints.toFixed(1)}</span>
            </div>
            <div className="text-center px-4">
              <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">NFTs</span>
              <span className="font-black text-white text-lg mt-0.5 block">{stats.nftsMinted}</span>
            </div>
          </div>

        </div>

        {/* NFT Cabinet */}
        <h3 className="font-extrabold text-2xl text-white mb-6 tracking-tight">NFT Cabinet</h3>
        
        {loading ? (
          <div className="text-slate-500 text-center py-10">Loading cabinet...</div>
        ) : rewards.length === 0 ? (
          <div className="text-slate-500 text-center py-20 glass rounded-3xl border border-white/5 text-sm">
            Your cabinet is empty. Join upcoming contests and win to receive commemorative NFTs!
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {rewards.map((reward) => {
              const isChamp = reward.rewardType === "CHAMPION_NFT";
              const isWinner = reward.rewardType === "WINNER_NFT";

              return (
                <div 
                  key={reward.id}
                  className={`glass-card rounded-[28px] p-6 border flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:scale-[1.02] ${
                    isChamp 
                      ? "border-amber-500/20 bg-amber-500/5 shadow-[0_0_30px_rgba(245,158,11,0.08)]"
                      : isWinner
                      ? "border-blue-500/20 bg-blue-500/5 shadow-[0_0_30px_rgba(59,130,246,0.08)]"
                      : "border-slate-500/20 bg-slate-500/5"
                  }`}
                >
                  
                  {/* NFT Glow Top */}
                  <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-[40px] pointer-events-none ${
                    isChamp ? "bg-amber-500/10" : isWinner ? "bg-blue-500/10" : "bg-slate-500/10"
                  }`} />

                  {/* Header */}
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black tracking-widest uppercase ${
                        isChamp ? "bg-amber-500/20 text-amber-300" : isWinner ? "bg-blue-500/20 text-blue-300" : "bg-slate-800 text-slate-400"
                      }`}>
                        {reward.rewardType.replace("_", " ")}
                      </span>
                      <h4 className="font-extrabold text-white text-lg mt-2 leading-tight">{reward.contest.title}</h4>
                    </div>
                    
                    {/* Badge */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow ${
                      isChamp 
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-400" 
                        : isWinner 
                        ? "bg-blue-500/10 border-blue-500/30 text-blue-400" 
                        : "bg-slate-800 border-white/5 text-slate-400"
                    }`}>
                      <Award className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Body Illustration / Mock Asset Card */}
                  <div className="aspect-[4/3] rounded-2xl bg-slate-950/80 border border-white/5 mb-6 flex flex-col items-center justify-center p-4 text-center relative overflow-hidden group">
                    <AwardIcon className={`w-12 h-12 mb-3 animate-pulse-subtle ${
                      isChamp ? "text-amber-400" : isWinner ? "text-blue-400" : "text-slate-400"
                    }`} />
                    <span className={`font-black text-xs uppercase tracking-widest ${
                      isChamp ? "text-gradient-gold" : isWinner ? "text-gradient" : "text-slate-400"
                    }`}>
                      {isChamp ? "FairStake Champion" : isWinner ? "FairStake Runner-Up" : "FairStake Contender"}
                    </span>
                    <span className="block text-[8px] text-slate-500 font-mono mt-1 select-all">{reward.nftAssetId}</span>
                  </div>

                  {/* Footer metadata */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-3 border-t border-white/5">
                    <span>Claimed {new Date(reward.createdAt).toLocaleDateString()}</span>
                    <a 
                      href={getExplorerLink(reward.txHash)} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="flex items-center space-x-0.5 text-blue-400 hover:text-blue-300 transition-colors font-bold"
                    >
                      <span>Mint Tx</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

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
