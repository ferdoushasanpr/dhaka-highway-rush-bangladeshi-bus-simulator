/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/engine';
import {
  CameraViewMode,
  GameState,
  HighwayMode,
  IndicatorState,
  BusLivery,
  GameScoreState,
} from './game/types';
import { BUS_LIVERIES } from './game/proceduralTextures';
import { HUD } from './components/HUD';
import { GameShell } from './components/GameShell';
import { audioManager } from './game/audio';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('title');
  const [cameraMode, setCameraMode] = useState<CameraViewMode>('chase');
  const [highwayMode, setHighwayMode] = useState<HighwayMode>('divided_4lane');
  const [selectedLivery, setSelectedLivery] = useState<BusLivery>(BUS_LIVERIES[0]);
  const [indicator, setIndicator] = useState<IndicatorState>('none');
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const [scoreState, setScoreState] = useState<GameScoreState>({
    distanceTraveledMeters: 0,
    currentSpeedKmh: 0,
    score: 0,
    takaEarned: 0,
    nearMissCount: 0,
    counterLaneMeters: 0,
    maxSpeedKmh: 0,
    closeOvertakeNotification: null,
  });

  // Track keyboard keys pressed
  const keysPressed = useRef<Set<string>>(new Set());

  // Initialize Three.js WebGL Engine once
  useEffect(() => {
    if (!mountRef.current) return;

    const engine = new GameEngine(mountRef.current, {
      onScoreUpdate: (newScoreState) => {
        setScoreState(newScoreState);
      },
      onGameOver: (finalStats) => {
        setScoreState(finalStats);
        setGameState('gameover');
      },
    });

    engineRef.current = engine;

    // Check ?autostart=1 query parameter
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      setGameState('playing');
      engine.start();
    }

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Keyboard controls handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user typing into input fields
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      const code = e.code;
      keysPressed.current.add(code);

      if (!engineRef.current) return;

      if (code === 'KeyW' || code === 'ArrowUp') {
        engineRef.current.setInput('accelerate', true);
      } else if (code === 'KeyS' || code === 'ArrowDown') {
        engineRef.current.setInput('brake', true);
      } else if (code === 'KeyA' || code === 'ArrowLeft') {
        engineRef.current.setInput('steerLeft', true);
      } else if (code === 'KeyD' || code === 'ArrowRight') {
        engineRef.current.setInput('steerRight', true);
      } else if (code === 'Space' || code === 'KeyH') {
        e.preventDefault();
        engineRef.current.setInput('horn', true);
      } else if (code === 'KeyC') {
        // Toggle Camera
        const nextCam = engineRef.current.toggleCameraMode();
        setCameraMode(nextCam);
      } else if (code === 'KeyQ') {
        // Toggle Left Indicator
        engineRef.current.setIndicator('left');
        setIndicator(engineRef.current.getIndicator());
      } else if (code === 'KeyE') {
        // Toggle Right Indicator
        engineRef.current.setIndicator('right');
        setIndicator(engineRef.current.getIndicator());
      } else if (code === 'KeyF') {
        // Toggle Hazard Lights
        engineRef.current.setIndicator('hazard');
        setIndicator(engineRef.current.getIndicator());
      } else if (code === 'KeyM') {
        // Toggle Mute
        const muted = audioManager.toggleMute();
        setIsMuted(muted);
      } else if (code === 'Escape' || code === 'KeyP') {
        // Pause / Resume
        if (gameState === 'playing') {
          handlePause();
        } else if (gameState === 'paused') {
          handleResume();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      keysPressed.current.delete(code);

      if (!engineRef.current) return;

      if (code === 'KeyW' || code === 'ArrowUp') {
        engineRef.current.setInput('accelerate', false);
      } else if (code === 'KeyS' || code === 'ArrowDown') {
        engineRef.current.setInput('brake', false);
      } else if (code === 'KeyA' || code === 'ArrowLeft') {
        engineRef.current.setInput('steerLeft', false);
      } else if (code === 'KeyD' || code === 'ArrowRight') {
        engineRef.current.setInput('steerRight', false);
      } else if (code === 'Space' || code === 'KeyH') {
        engineRef.current.setInput('horn', false);
      }
    };

    const handleBlur = () => {
      // Clear held keys on blur to prevent sticking keys
      keysPressed.current.clear();
      if (engineRef.current) {
        engineRef.current.setInput('accelerate', false);
        engineRef.current.setInput('brake', false);
        engineRef.current.setInput('steerLeft', false);
        engineRef.current.setInput('steerRight', false);
        engineRef.current.setInput('horn', false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [gameState]);

  // Actions
  const handleStartGame = useCallback(() => {
    setGameState('playing');
    if (engineRef.current) {
      engineRef.current.reset();
      engineRef.current.start();
    }
  }, []);

  const handlePause = useCallback(() => {
    setGameState('paused');
    if (engineRef.current) {
      engineRef.current.pause();
    }
  }, []);

  const handleResume = useCallback(() => {
    setGameState('playing');
    if (engineRef.current) {
      engineRef.current.resume();
    }
  }, []);

  const handleRestart = useCallback(() => {
    setGameState('playing');
    if (engineRef.current) {
      engineRef.current.reset();
      engineRef.current.start();
    }
  }, []);

  const handleGoToTitle = useCallback(() => {
    setGameState('title');
    if (engineRef.current) {
      engineRef.current.reset();
      engineRef.current.pause();
    }
  }, []);

  const handleSelectLivery = useCallback((livery: BusLivery) => {
    setSelectedLivery(livery);
    if (engineRef.current) {
      engineRef.current.setLivery(livery);
    }
  }, []);

  const handleSelectHighwayMode = useCallback((mode: HighwayMode) => {
    setHighwayMode(mode);
    if (engineRef.current) {
      engineRef.current.setHighwayMode(mode);
    }
  }, []);

  const handleToggleCamera = useCallback(() => {
    if (engineRef.current) {
      const nextCam = engineRef.current.toggleCameraMode();
      setCameraMode(nextCam);
    }
  }, []);

  const handleSetIndicator = useCallback((ind: IndicatorState) => {
    if (engineRef.current) {
      engineRef.current.setIndicator(ind);
      setIndicator(engineRef.current.getIndicator());
    }
  }, []);

  const handleAirHorn = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.blastAirHorn();
    }
  }, []);

  const handleToggleMute = useCallback(() => {
    const muted = audioManager.toggleMute();
    setIsMuted(muted);
  }, []);

  const handleTouchInputStart = useCallback((action: 'accelerate' | 'brake' | 'steerLeft' | 'steerRight') => {
    if (engineRef.current) {
      engineRef.current.setInput(action, true);
    }
  }, []);

  const handleTouchInputEnd = useCallback((action: 'accelerate' | 'brake' | 'steerLeft' | 'steerRight') => {
    if (engineRef.current) {
      engineRef.current.setInput(action, false);
    }
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black select-none">
      {/* 3D WebGL Canvas Mount Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* In-Game HUD (active when playing) */}
      {gameState === 'playing' && (
        <HUD
          scoreState={scoreState}
          cameraMode={cameraMode}
          highwayMode={highwayMode}
          indicator={indicator}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onToggleCamera={handleToggleCamera}
          onToggleHighwayMode={handleSelectHighwayMode}
          onSetIndicator={handleSetIndicator}
          onAirHorn={handleAirHorn}
          onPause={handlePause}
          onInputStart={handleTouchInputStart}
          onInputEnd={handleTouchInputEnd}
        />
      )}

      {/* Game Shell: Title Screen, Pause Modal, Game Over Modal */}
      <GameShell
        gameState={gameState}
        scoreState={scoreState}
        highwayMode={highwayMode}
        selectedLivery={selectedLivery}
        onStartGame={handleStartGame}
        onResumeGame={handleResume}
        onRestartGame={handleRestart}
        onGoToTitle={handleGoToTitle}
        onSelectLivery={handleSelectLivery}
        onSelectHighwayMode={handleSelectHighwayMode}
      />
    </div>
  );
}
