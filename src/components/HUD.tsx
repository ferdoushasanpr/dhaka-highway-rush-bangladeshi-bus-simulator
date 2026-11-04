/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CameraViewMode, GameScoreState, HighwayMode, IndicatorState, WeatherMode } from '../game/types';
import { Volume2, VolumeX, Pause, Camera, Radio, AlertTriangle, Sun, Moon, CloudFog, MapPin, Navigation } from 'lucide-react';

interface HUDProps {
  scoreState: GameScoreState;
  cameraMode: CameraViewMode;
  highwayMode: HighwayMode;
  weatherMode: WeatherMode;
  indicator: IndicatorState;
  isMuted: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleWeather: () => void;
  onToggleHighwayMode: (mode: HighwayMode) => void;
  onSetIndicator: (indicator: IndicatorState) => void;
  onAirHorn: () => void;
  onPause: () => void;
  onInputStart: (action: 'accelerate' | 'brake' | 'steerLeft' | 'steerRight') => void;
  onInputEnd: (action: 'accelerate' | 'brake' | 'steerLeft' | 'steerRight') => void;
}

export const HUD: React.FC<HUDProps> = ({
  scoreState,
  cameraMode,
  highwayMode,
  weatherMode,
  indicator,
  isMuted,
  onToggleMute,
  onToggleCamera,
  onToggleWeather,
  onToggleHighwayMode,
  onSetIndicator,
  onAirHorn,
  onPause,
  onInputStart,
  onInputEnd,
}) => {
  const speed = scoreState.currentSpeedKmh;
  const speedNormalized = Math.min(speed / 140, 1.0);
  const needleRotation = -120 + speedNormalized * 240; // -120deg to +120deg

  const distanceKm = (scoreState.distanceTraveledMeters / 1000).toFixed(1);
  const gear = speed === 0 ? 'N' : speed < 25 ? '1' : speed < 50 ? '2' : speed < 75 ? '3' : speed < 100 ? '4' : '5';

  return (
    <div className="fixed inset-0 pointer-events-none select-none flex flex-col justify-between p-4 z-20">
      {/* Top Bar: Cluster Left (Stats & Rewards), Center (Near Miss Toast), Right (Utility Buttons) */}
      <div className="flex items-start justify-between w-full">
        {/* Left Stats Cluster */}
        <div className="flex flex-col gap-2 pointer-events-auto">
          {/* Taka & Score Banner */}
          <div className="bg-neutral-900/90 border border-amber-500/40 rounded-lg px-3.5 py-2 flex items-center gap-3 shadow-lg">
            <div className="flex items-center gap-1.5">
              <span className="text-amber-400 font-black text-xl">৳</span>
              <span className="text-amber-300 font-bold text-lg tabular-nums">
                {scoreState.takaEarned.toLocaleString()}
              </span>
            </div>
            <div className="h-4 w-px bg-neutral-700" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">স্কোর</span>
              <span className="text-white font-bold text-sm tabular-nums">
                {scoreState.score.toLocaleString()}
              </span>
            </div>
            <div className="h-4 w-px bg-neutral-700" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">দূরত্ব</span>
              <span className="text-emerald-400 font-bold text-sm tabular-nums">
                {distanceKm} কি.মি.
              </span>
            </div>
          </div>

          {/* Near-Miss Counter */}
          <div className="flex items-center gap-2">
            <div className="bg-neutral-900/85 border border-neutral-700/60 rounded px-2.5 py-1 text-xs text-neutral-300 flex items-center gap-1.5 shadow">
              <span className="text-orange-400 font-bold">⚡ ক্লোজ ওভারটেক:</span>
              <span className="text-white font-bold tabular-nums">{scoreState.nearMissCount}</span>
            </div>
            {scoreState.counterLaneMeters > 0 && (
              <div className="bg-red-950/80 border border-red-500/50 rounded px-2.5 py-1 text-xs text-red-200 flex items-center gap-1 shadow animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span className="font-bold">কাউন্টার লেন 2x</span>
              </div>
            )}
          </div>

          {/* Mobile/Compact Location Tag */}
          {scoreState.currentLocation && (
            <div className="lg:hidden flex items-center gap-1.5 bg-neutral-900/90 border border-emerald-500/40 rounded px-2.5 py-1 text-[11px] shadow">
              <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="text-white font-bold truncate max-w-[180px]">
                {scoreState.currentLocation.nameBn}
              </span>
              <span className="text-emerald-300 text-[9px] font-bold px-1 bg-emerald-950 rounded">
                {scoreState.currentLocation.badgeBn}
              </span>
            </div>
          )}
        </div>

        {/* Center: Bangladeshi Highway Location Banner (RHD Style) */}
        {scoreState.currentLocation && (
          <div className="flex flex-col items-center bg-neutral-900/95 border border-emerald-500/50 rounded-lg px-3 md:px-4 py-1.5 md:py-2 shadow-2xl backdrop-blur-sm pointer-events-auto max-w-[240px] sm:max-w-xs md:max-w-md">
            <div className="flex items-center gap-1.5 md:gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-white font-extrabold text-xs md:text-sm tracking-wide truncate">
                {scoreState.currentLocation.nameBn}
              </span>
              <span className="bg-emerald-950 text-emerald-300 text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-500/40 shrink-0">
                {scoreState.currentLocation.badgeBn}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2 md:gap-3 text-[10px] md:text-[11px] text-neutral-300 mt-0.5 truncate">
              <span className="text-neutral-400 font-medium">
                {scoreState.currentLocation.nameEn}
              </span>
              <span className="text-emerald-500">•</span>
              <span className="text-amber-300 font-semibold truncate">
                পরবর্তী: {scoreState.currentLocation.nextDestinationBn}
              </span>
              <span className="bg-neutral-800 text-neutral-200 px-1 rounded text-[10px] font-mono shrink-0">
                {scoreState.currentLocation.nextDistanceKm} কি.মি.
              </span>
            </div>
          </div>
        )}

        {/* Landmark Entrance Notification Toast */}
        {scoreState.locationToast && (
          <div className="pointer-events-none transform -translate-x-1/2 left-1/2 fixed top-20 bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 text-white font-bold text-xs md:text-sm px-6 py-2.5 rounded-full shadow-2xl border border-emerald-300/40 tracking-wide flex items-center gap-2.5 animate-pulse z-40">
            <span className="text-base">📍</span>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span>প্রবেশ করছেন: {scoreState.locationToast.nameBn}</span>
                <span className="bg-white/20 text-emerald-200 text-[10px] px-1.5 py-0.5 rounded font-black">
                  {scoreState.locationToast.badgeBn}
                </span>
              </div>
              <span className="text-[10px] text-emerald-200 font-normal">
                {scoreState.locationToast.nameEn}
              </span>
            </div>
          </div>
        )}

        {/* Center Toast: Close Overtake Notification */}
        {scoreState.closeOvertakeNotification && (
          <div className="pointer-events-none transform -translate-x-1/2 left-1/2 fixed top-6 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-black font-black text-sm md:text-base px-6 py-2 rounded-full shadow-2xl tracking-wide flex items-center gap-2 animate-bounce">
            <span>🔥</span>
            <span>{scoreState.closeOvertakeNotification.text}</span>
          </div>
        )}

        {/* Right Utility Cluster: Highway Mode, Weather, Camera, Mute, Pause */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Highway Mode Switcher */}
          <div className="flex bg-neutral-900/90 border border-neutral-700 rounded-lg p-0.5 text-xs font-semibold">
            <button
              onClick={() => onToggleHighwayMode('divided_4lane')}
              className={`px-2.5 py-1.5 rounded transition ${
                highwayMode === 'divided_4lane'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="পদ্মা এক্সপ্রেসওয়ে (৪ লেন ডিভাইডেড)"
            >
              ৪-লেন এক্সপ্রেসওয়ে
            </button>
            <button
              onClick={() => onToggleHighwayMode('undivided_2lane')}
              className={`px-2.5 py-1.5 rounded transition ${
                highwayMode === 'undivided_2lane'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="ক্লাসিক হাইওয়ে (২ লেন কাউন্টার ওভারটেক)"
            >
              ২-লেন হাইওয়ে
            </button>
          </div>

          {/* Weather / Time-of-Day Switcher */}
          <button
            onClick={onToggleWeather}
            className="bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 p-2 rounded-lg transition shadow flex items-center gap-1 text-xs font-bold"
            title="আবহাওয়া সুইচ: দিন / রাত / কুয়াশা (N)"
            aria-label="Toggle weather mode"
          >
            {weatherMode === 'day' && <Sun className="w-4 h-4 text-amber-400" />}
            {weatherMode === 'night' && <Moon className="w-4 h-4 text-indigo-400" />}
            {weatherMode === 'fog' && <CloudFog className="w-4 h-4 text-slate-300" />}
            <span className="hidden sm:inline">
              {weatherMode === 'day' ? 'দিন' : weatherMode === 'night' ? 'রাত' : 'কুয়াশা'}
            </span>
          </button>

          {/* Camera View Mode */}
          <button
            onClick={onToggleCamera}
            className="bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 p-2 rounded-lg transition shadow flex items-center gap-1 text-xs font-bold"
            title="ক্যামেরা সুইচ (C)"
            aria-label="Toggle camera view"
          >
            <Camera className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">
              {cameraMode === 'chase' ? '৩য় ব্যক্তি' : cameraMode === 'cockpit' ? 'ককপিট' : 'হুড'}
            </span>
          </button>

          {/* Audio Mute */}
          <button
            onClick={onToggleMute}
            className="bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 p-2 rounded-lg transition shadow"
            title="শব্দ অন/অফ (M)"
            aria-label="Toggle mute"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-green-400" />}
          </button>

          {/* Pause */}
          <button
            onClick={onPause}
            className="bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 p-2 rounded-lg transition shadow"
            title="বিরতি (Esc / P)"
            aria-label="Pause game"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Control Dock: Unified, Low-Occlusion Dashboard */}
      <div className="flex flex-row items-end justify-between w-full gap-2 pb-1">
        {/* Left Touch Controls: Steer Left & Right + Indicators */}
        <div className="flex flex-col gap-1 pointer-events-auto">
          {/* Turn Indicators (Compact) */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onSetIndicator('left')}
              className={`px-2 py-1 rounded border text-[10px] font-bold transition ${
                indicator === 'left'
                  ? 'bg-amber-500 text-black border-amber-400 animate-pulse'
                  : 'bg-neutral-900/80 text-amber-400 border-neutral-700'
              }`}
              title="বামে সিগন্যাল (Q)"
            >
              ◀
            </button>
            <button
              onClick={() => onSetIndicator('hazard')}
              className={`px-2 py-1 rounded border text-[10px] font-bold transition ${
                indicator === 'hazard'
                  ? 'bg-red-600 text-white border-red-400 animate-pulse'
                  : 'bg-neutral-900/80 text-red-400 border-neutral-700'
              }`}
              title="হ্যাজার্ড লাইটস (F)"
            >
              ⚠
            </button>
            <button
              onClick={() => onSetIndicator('right')}
              className={`px-2 py-1 rounded border text-[10px] font-bold transition ${
                indicator === 'right'
                  ? 'bg-amber-500 text-black border-amber-400 animate-pulse'
                  : 'bg-neutral-900/80 text-amber-400 border-neutral-700'
              }`}
              title="ডানে সিগন্যাল (E)"
            >
              ▶
            </button>
          </div>

          {/* Steer Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onPointerDown={() => onInputStart('steerLeft')}
              onPointerUp={() => onInputEnd('steerLeft')}
              onPointerLeave={() => onInputEnd('steerLeft')}
              className="w-12 h-12 sm:w-14 sm:h-14 bg-neutral-900/90 active:bg-neutral-700 border border-neutral-600 rounded-xl text-white font-bold text-xl flex items-center justify-center shadow-lg active:scale-95 transition"
              aria-label="Steer Left"
            >
              ◀
            </button>
            <button
              onPointerDown={() => onInputStart('steerRight')}
              onPointerUp={() => onInputEnd('steerRight')}
              onPointerLeave={() => onInputEnd('steerRight')}
              className="w-12 h-12 sm:w-14 sm:h-14 bg-neutral-900/90 active:bg-neutral-700 border border-neutral-600 rounded-xl text-white font-bold text-xl flex items-center justify-center shadow-lg active:scale-95 transition"
              aria-label="Steer Right"
            >
              ▶
            </button>
          </div>
        </div>

        {/* Center: Analog & Digital Bangla Speedometer Dashboard */}
        <div className="bg-neutral-950/95 border border-neutral-800 rounded-2xl px-2.5 py-2 sm:px-3 sm:py-3 flex items-center gap-2.5 sm:gap-4 shadow-2xl pointer-events-auto">
          {/* Analog Dial Gauge (hidden on extra small screens) */}
          <div className="relative w-14 h-14 sm:w-20 sm:h-20 hidden xs:flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#27272a"
                strokeWidth="8"
                strokeDasharray="188 62"
                strokeDashoffset="31"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={speed > 100 ? '#ef4444' : speed > 70 ? '#f59e0b' : '#10b981'}
                strokeWidth="8"
                strokeDasharray="188 62"
                strokeDashoffset={188 - speedNormalized * 188 + 31}
                className="transition-all duration-75"
              />
            </svg>
            <div
              className="absolute w-0.5 sm:w-1 h-7 sm:h-9 bg-amber-400 origin-bottom rounded transition-transform duration-75 shadow"
              style={{
                transform: `rotate(${needleRotation}deg) translateY(-50%)`,
              }}
            />
            <div className="absolute w-2.5 h-2.5 bg-neutral-200 rounded-full border border-neutral-700" />
          </div>

          {/* Speed Digital Readout */}
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className="text-white font-black text-2xl sm:text-3xl tabular-nums tracking-tight">
                {speed}
              </span>
              <span className="text-neutral-400 text-[10px] sm:text-xs font-bold uppercase">কি.মি./ঘণ্টা</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="bg-neutral-800 text-amber-400 px-1.5 py-0.5 rounded text-[10px] font-bold">
                গিয়ার {gear}
              </span>
            </div>
          </div>

          {/* Air Horn Button */}
          <button
            onClick={onAirHorn}
            className="bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 active:scale-95 text-white font-black px-2.5 py-2 sm:px-3.5 sm:py-2.5 rounded-xl shadow-lg border border-red-400/40 flex flex-col items-center gap-0.5 transition"
            title="মিউজিক্যাল এয়ার হর্ন বাজান (Space / H)"
          >
            <Radio className="w-4 h-4 animate-pulse" />
            <span className="text-[10px] sm:text-xs whitespace-nowrap">এয়ার হর্ন</span>
          </button>
        </div>

        {/* Right Touch Controls: Air Brake & Diesel Accelerator Pedals */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Air Brake Pedal */}
          <button
            onPointerDown={() => onInputStart('brake')}
            onPointerUp={() => onInputEnd('brake')}
            onPointerLeave={() => onInputEnd('brake')}
            className="w-13 h-16 sm:w-16 sm:h-20 bg-red-950/90 active:bg-red-800 border-2 border-red-600/70 rounded-xl text-white font-bold flex flex-col items-center justify-center shadow-xl active:scale-95 transition"
            aria-label="Pneumatic Air Brake"
          >
            <span className="text-[10px] sm:text-xs font-black text-red-300">ব্রেক</span>
            <span className="text-xl sm:text-2xl">🛑</span>
          </button>

          {/* Diesel Accelerator Pedal */}
          <button
            onPointerDown={() => onInputStart('accelerate')}
            onPointerUp={() => onInputEnd('accelerate')}
            onPointerLeave={() => onInputEnd('accelerate')}
            className="w-13 h-18 sm:w-16 sm:h-22 bg-emerald-950/90 active:bg-emerald-800 border-2 border-emerald-500/70 rounded-xl text-white font-bold flex flex-col items-center justify-center shadow-xl active:scale-95 transition"
            aria-label="Accelerate"
          >
            <span className="text-[10px] sm:text-xs font-black text-emerald-300">গ্যাস</span>
            <span className="text-xl sm:text-2xl">🚀</span>
          </button>
        </div>
      </div>
    </div>
  );
};
