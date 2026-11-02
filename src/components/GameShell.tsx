/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GameState, HighwayMode, BusLivery, GameScoreState } from '../game/types';
import { BUS_LIVERIES } from '../game/proceduralTextures';
import { Play, RotateCcw, Home, ShieldAlert, Award } from 'lucide-react';

interface GameShellProps {
  gameState: GameState;
  scoreState: GameScoreState;
  highwayMode: HighwayMode;
  selectedLivery: BusLivery;
  onStartGame: () => void;
  onResumeGame: () => void;
  onRestartGame: () => void;
  onGoToTitle: () => void;
  onSelectLivery: (livery: BusLivery) => void;
  onSelectHighwayMode: (mode: HighwayMode) => void;
}

export const GameShell: React.FC<GameShellProps> = ({
  gameState,
  scoreState,
  highwayMode,
  selectedLivery,
  onStartGame,
  onResumeGame,
  onRestartGame,
  onGoToTitle,
  onSelectLivery,
  onSelectHighwayMode,
}) => {
  // Sync document.body.dataset.state
  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  // Handle Enter / Space for Start and Esc for Pause/Resume
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'title') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          onStartGame();
        }
      } else if (gameState === 'gameover') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          onRestartGame();
        }
      } else if (gameState === 'paused') {
        if (e.code === 'Escape' || e.code === 'KeyP') {
          e.preventDefault();
          onResumeGame();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, onStartGame, onRestartGame, onResumeGame]);

  if (gameState === 'playing') {
    return null;
  }

  // 1. Title Screen
  if (gameState === 'title') {
    return (
      <div className="fixed inset-0 z-30 flex flex-col justify-between p-6 bg-gradient-to-t from-black/85 via-black/25 to-black/55 pointer-events-auto">
        {/* Top Header & Bengali Title Emblem */}
        <div className="flex flex-col items-center text-center mt-4">
          {/* Custom SVG Highway Emblem */}
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-10 h-10 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19L8 5H16L20 19" />
              <line x1="12" y1="5" x2="12" y2="9" />
              <line x1="12" y1="13" x2="12" y2="15" />
              <line x1="12" y1="19" x2="12" y2="21" />
            </svg>
            <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-amber-300 to-red-500 tracking-wider">
              DHAKA HIGHWAY RUSH
            </h1>
          </div>
          <p className="text-lg md:text-xl font-bold text-amber-300">
            বাংলার হাইওয়ে বাস সিমুলেটর ও ট্রাফিক রেসার
          </p>
          <p className="text-xs md:text-sm text-neutral-300 max-w-lg mt-1">
            বাংলাদেশের বামহাতি ট্রাফিক (Left-Hand Traffic), পদ্মা সেতু এক্সপ্রেসওয়ে ও কাউন্টার লেন ওভারটেকিং
          </p>
        </div>

        {/* Center Panel: Livery & Highway Selection */}
        <div className="max-w-2xl mx-auto w-full bg-neutral-900/90 border border-neutral-700/80 rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
          {/* Livery Selector */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-2">
              বাস নির্বাচন করুন (CHOOSE INTERCITY COACH)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {BUS_LIVERIES.map((livery) => (
                <button
                  key={livery.id}
                  onClick={() => onSelectLivery(livery)}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    selectedLivery.id === livery.id
                      ? 'border-emerald-500 bg-emerald-950/40 shadow-lg scale-102'
                      : 'border-neutral-800 bg-neutral-800/60 hover:border-neutral-600'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full inline-block border border-white/40"
                      style={{ backgroundColor: livery.primaryColor }}
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-full inline-block border border-white/40"
                      style={{ backgroundColor: livery.secondaryColor }}
                    />
                  </div>
                  <div className="font-bold text-sm text-white">{livery.name}</div>
                  <div className="text-[11px] text-amber-400 font-medium">{livery.bengaliName}</div>
                  <div className="text-[10px] text-neutral-400 italic mt-1 font-serif">"{livery.rearQuote}"</div>
                </button>
              ))}
            </div>
          </div>

          {/* Highway Layout Selector */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-2">
              হাইওয়ে রুট (SELECT HIGHWAY ROUTE)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => onSelectHighwayMode('divided_4lane')}
                className={`p-3 rounded-xl border text-left transition ${
                  highwayMode === 'divided_4lane'
                    ? 'border-emerald-500 bg-emerald-950/40 shadow'
                    : 'border-neutral-800 bg-neutral-800/60 hover:border-neutral-600'
                }`}
              >
                <div className="font-bold text-sm text-white flex items-center justify-between">
                  <span>পদ্মা সেতু এক্সপ্রেসওয়ে (৪ লেন)</span>
                  <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded font-bold">ডিভাইডেড</span>
                </div>
                <div className="text-xs text-neutral-400 mt-1">
                  ঢাকা-মাওয়া-ভাঙ্গা এক্সপ্রেসওয়ে: ২ লেন বামে ফরোয়ার্ড, ২ লেন ডানে অনকামিং। প্রশস্ত রোড ও হাই-স্পিড রেসিং।
                </div>
              </button>

              <button
                onClick={() => onSelectHighwayMode('undivided_2lane')}
                className={`p-3 rounded-xl border text-left transition ${
                  highwayMode === 'undivided_2lane'
                    ? 'border-amber-500 bg-amber-950/40 shadow'
                    : 'border-neutral-800 bg-neutral-800/60 hover:border-neutral-600'
                }`}
              >
                <div className="font-bold text-sm text-white flex items-center justify-between">
                  <span>ঢাকা-সিলেট ক্লাসিক হাইওয়ে (২ লেন)</span>
                  <span className="text-[10px] bg-amber-600 text-white px-2 py-0.5 rounded font-bold">কাউন্টার লেন</span>
                </div>
                <div className="text-xs text-neutral-400 mt-1">
                  অবিভক্ত হাইওয়ে: ট্রাক ও সিএনজি অতিক্রম করতে অনকামিং লেনে কাউন্টার ওভারটেক! ২ গুণ বেশি পয়েন্ট।
                </div>
              </button>
            </div>
          </div>

          {/* Primary Start CTA Button */}
          <button
            data-start="true"
            onClick={onStartGame}
            className="w-full bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-lg py-3.5 px-6 rounded-xl shadow-xl transform active:scale-98 transition flex items-center justify-center gap-3 mt-1"
          >
            <Play className="w-6 h-6 fill-white" />
            <span>হাইওয়ে রেস শুরু করুন (ENTER / SPACE)</span>
          </button>
        </div>

        {/* Single Flat Control Hint Line */}
        <div className="text-center text-xs md:text-sm text-neutral-400 font-medium pb-2">
          WASD / তীরচিহ্ন ড্রাইভ · Space এয়ার হর্ন · C ক্যামেরা ভিউ (৩য় ব্যক্তি / ককপিট) · Q/E ইন্ডিকেটর · F হ্যাজার্ড · Esc বিরতি
        </div>
      </div>
    );
  }

  // 2. Pause Modal
  if (gameState === 'paused') {
    return (
      <div className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-4">
        <div className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl">
          <h2 className="text-2xl font-black text-white mb-1">বিরতি (PAUSED)</h2>
          <p className="text-sm text-neutral-400 mb-6">গাড়ি থামানো রয়েছে</p>

          <div className="flex flex-col gap-3">
            <button
              onClick={onResumeGame}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>চালিয়ে যান (RESUME)</span>
            </button>
            <button
              onClick={onRestartGame}
              className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>পুনরায় শুরু করুন (RESTART)</span>
            </button>
            <button
              onClick={onGoToTitle}
              className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold py-2.5 rounded-xl transition flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span>মূল মেন্যু (TITLE SCREEN)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Game Over Modal
  return (
    <div className="fixed inset-0 z-40 bg-black/85 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border-2 border-red-600/80 rounded-2xl max-w-md w-full p-6 text-center shadow-2xl">
        <div className="w-14 h-14 bg-red-950/80 border border-red-500/50 rounded-full flex items-center justify-center mx-auto mb-3">
          <ShieldAlert className="w-8 h-8 text-red-500 animate-pulse" />
        </div>
        <h2 className="text-3xl font-black text-red-500 mb-1">দুর্ঘটনা! (CRASH)</h2>
        <p className="text-sm text-neutral-400 mb-5">হাইওয়েতে গাড়ি ধাক্কা খেয়েছে</p>

        {/* Performance & Rewards Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6 text-left">
          <div className="bg-neutral-800/80 rounded-xl p-3 border border-neutral-700/60">
            <div className="text-[11px] text-neutral-400 font-semibold uppercase">অতিক্রান্ত দূরত্ব</div>
            <div className="text-xl font-black text-emerald-400 tabular-nums">
              {(scoreState.distanceTraveledMeters / 1000).toFixed(2)} কি.মি.
            </div>
          </div>
          <div className="bg-neutral-800/80 rounded-xl p-3 border border-neutral-700/60">
            <div className="text-[11px] text-neutral-400 font-semibold uppercase">উপার্জিত ভাড়া</div>
            <div className="text-xl font-black text-amber-400 tabular-nums">
              ৳ {scoreState.takaEarned.toLocaleString()}
            </div>
          </div>
          <div className="bg-neutral-800/80 rounded-xl p-3 border border-neutral-700/60">
            <div className="text-[11px] text-neutral-400 font-semibold uppercase">ক্লোজ ওভারটেক</div>
            <div className="text-xl font-black text-orange-400 tabular-nums">
              {scoreState.nearMissCount} বার
            </div>
          </div>
          <div className="bg-neutral-800/80 rounded-xl p-3 border border-neutral-700/60">
            <div className="text-[11px] text-neutral-400 font-semibold uppercase">সর্বোচ্চ গতি</div>
            <div className="text-xl font-black text-white tabular-nums">
              {scoreState.maxSpeedKmh} কি.মি./ঘণ্টা
            </div>
          </div>
        </div>

        {/* Total Score Tile */}
        <div className="bg-gradient-to-r from-amber-950/60 to-emerald-950/60 border border-amber-500/40 rounded-xl p-3.5 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-400" />
            <span className="font-bold text-neutral-200">সর্বমোট স্কোর</span>
          </div>
          <span className="text-2xl font-black text-amber-300 tabular-nums">
            {scoreState.score.toLocaleString()}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            data-start="true"
            onClick={onRestartGame}
            className="w-full bg-gradient-to-r from-red-600 via-amber-600 to-red-600 hover:from-red-500 hover:to-amber-500 text-white font-black py-3.5 rounded-xl shadow-xl transition flex items-center justify-center gap-2 text-base"
          >
            <RotateCcw className="w-5 h-5" />
            <span>আবার চালান (ENTER / SPACE)</span>
          </button>
          <button
            onClick={onGoToTitle}
            className="w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-sm"
          >
            <Home className="w-4 h-4" />
            <span>মূল মেন্যু (TITLE SCREEN)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
