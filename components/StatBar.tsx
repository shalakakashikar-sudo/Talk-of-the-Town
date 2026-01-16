
import React from 'react';
import { GameStats } from '../types';

interface StatBarProps {
  stats: GameStats;
  onExit: () => void;
}

const StatBar: React.FC<StatBarProps> = ({ stats, onExit }) => {
  return (
    <div className="bg-gray-950 border-b border-white/5 p-4 md:px-8 md:py-6 sticky top-0 z-50 shadow-2xl backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-6">
        <div className="flex items-center space-x-8">
          <button 
            onClick={onExit}
            className="flex items-center space-x-3 text-gray-400 hover:text-white transition-all bg-white/5 hover:bg-white/10 px-5 py-2.5 rounded-2xl group border border-white/5 shadow-sm active:scale-95"
            aria-label="Exit to Menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-[12px] font-black uppercase tracking-[0.2em]">Menu</span>
          </button>
          
          <div className="h-10 w-[1px] bg-white/10 hidden lg:block"></div>

          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-black text-gray-600 tracking-widest mb-1">Mode</span>
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider italic">
              {stats.mode}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-black text-gray-600 tracking-widest mb-1">Rank</span>
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider italic">
              Level {stats.level}
            </span>
          </div>
          
          <div className="h-10 w-[1px] bg-white/10 hidden xl:block"></div>
          
          <div className="hidden xl:flex flex-col">
            <span className="text-[10px] uppercase font-black text-gray-600 tracking-widest mb-1">Created by</span>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Shalaka Kashikar
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-10">
          <div className="flex flex-col items-end">
             <div className="flex items-center space-x-3 mb-2">
                <span className="text-[10px] uppercase font-black text-gray-600 tracking-widest">Confidence</span>
                <span className={`text-sm font-mono font-black ${stats.confidence < 15 ? 'text-rose-500 animate-pulse' : 'text-white'}`}>{stats.confidence}%</span>
             </div>
             <div className="w-40 h-2 bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                <div 
                  className={`h-full transition-all duration-1000 ${
                    stats.confidence > 75 ? 'bg-emerald-500' : 
                    stats.confidence > 35 ? 'bg-amber-500' : 
                    'bg-rose-500'
                  }`}
                  style={{ width: `${stats.confidence}%` }}
                />
             </div>
          </div>

          <div className="flex flex-col items-end group">
            <span className="text-[10px] uppercase font-black text-gray-600 tracking-widest mb-1 group-hover:text-emerald-500 transition-colors">Sector</span>
            <span className="text-xs font-black text-emerald-400 tracking-[0.1em] uppercase bg-emerald-950/20 px-3 py-1 rounded-md border border-emerald-500/10">📍 {stats.location}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatBar;
