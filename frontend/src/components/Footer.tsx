import React from "react";
import Link from "next/link";
import { Sparkles, Heart } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full mt-auto py-8 px-6 border-t border-white/5 bg-slate-950/20 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Branding */}
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-lg bg-blue-600/20 flex items-center justify-center border border-blue-500/20">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white">
            Fair<span className="text-blue-500">Stake</span>
          </span>
          <span className="text-xs text-slate-500">
            © {new Date().getFullYear()} On-Chain Escrow Protocol
          </span>
        </div>

        {/* Links */}
        <div className="flex items-center space-x-6 text-xs text-slate-400 font-medium">
          <Link href="/dashboard" className="hover:text-blue-400 transition-colors">Contests</Link>
          <Link href="/leaderboard" className="hover:text-blue-400 transition-colors">Leaderboards</Link>
          <Link href="/admin" className="hover:text-blue-400 transition-colors">Oracle Hub</Link>
          <Link href="/docs" className="hover:text-blue-400 transition-colors">Smart Contract Docs</Link>
        </div>

        {/* Powered by Cardano */}
        <div className="flex items-center space-x-1 text-xs text-slate-500">
          <span>Made with</span>
          <Heart className="w-3 h-3 text-red-500 fill-red-500" />
          <span>on Cardano Preprod</span>
        </div>

      </div>
    </footer>
  );
};
