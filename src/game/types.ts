/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type HighwayMode = 'divided_4lane' | 'undivided_2lane';

export type CameraViewMode = 'chase' | 'cockpit' | 'hood';

export type WeatherMode = 'day' | 'night' | 'fog';

export type IndicatorState = 'none' | 'left' | 'right' | 'hazard';

export type GameState = 'title' | 'playing' | 'paused' | 'gameover';

export type TimeOfDay = 'day' | 'sunset' | 'night';

export type VehicleArchetype = 'bus' | 'truck' | 'cng' | 'leguna';

export interface BusLivery {
  id: string;
  name: string;
  bengaliName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  stripeColor: string;
  rearQuote: string;
  routeQuote: string;
}

export interface BoundingBox3D {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface TrafficEntity {
  id: number;
  archetype: VehicleArchetype;
  livery?: BusLivery;
  x: number;
  y: number;
  z: number;
  speed: number; // in m/s (1 m/s = 3.6 km/h)
  targetSpeed: number;
  width: number;
  length: number;
  height: number;
  currentLane: number; // Lane index
  targetLane: number;
  isLaneChanging: boolean;
  laneChangeProgress: number;
  indicator: IndicatorState;
  indicatorTimer: number;
  isOncoming: boolean; // True for opposing traffic
  isOvertakingCounterLane: boolean;
  counterLaneTimer: number;
  honkedReactionTimer: number;
}

export interface GameScoreState {
  distanceTraveledMeters: number;
  currentSpeedKmh: number;
  score: number;
  takaEarned: number;
  nearMissCount: number;
  counterLaneMeters: number;
  maxSpeedKmh: number;
  closeOvertakeNotification?: {
    text: string;
    points: number;
    timestamp: number;
  } | null;
}
