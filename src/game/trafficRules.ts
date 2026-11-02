/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BoundingBox3D, HighwayMode, VehicleArchetype, TrafficEntity } from './types';

// Standard Highway lane width in meters
export const LANE_WIDTH = 3.6;
// Shoulder width
export const SHOULDER_WIDTH = 2.5;
// Divider width for 4-lane expressway
export const DIVIDER_WIDTH = 2.0;

export interface LaneInfo {
  index: number;
  centerX: number;
  isOncoming: boolean;
  name: string;
}

/**
 * Returns lane configuration for the highway mode.
 * In Bangladeshi Left-Hand Traffic:
 * - Forward lanes are on the LEFT (positive X coordinates in driver's +Z view).
 * - Oncoming lanes are on the RIGHT (negative X coordinates).
 */
export function getLaneConfiguration(mode: HighwayMode): LaneInfo[] {
  if (mode === 'divided_4lane') {
    // Left side: Lane 0 (outer left/slow), Lane 1 (inner left/fast)
    // Central barrier at X = 0
    // Right side: Lane 2 (inner right/fast oncoming), Lane 3 (outer right/slow oncoming)
    const lane0X = +(DIVIDER_WIDTH / 2 + LANE_WIDTH * 1.5); // Slow forward (Outer Left)
    const lane1X = +(DIVIDER_WIDTH / 2 + LANE_WIDTH * 0.5); // Fast forward (Inner Left)
    const lane2X = -(DIVIDER_WIDTH / 2 + LANE_WIDTH * 0.5); // Fast oncoming (Inner Right)
    const lane3X = -(DIVIDER_WIDTH / 2 + LANE_WIDTH * 1.5); // Slow oncoming (Outer Right)

    return [
      { index: 0, centerX: lane0X, isOncoming: false, name: 'Forward Slow (Outer Left)' },
      { index: 1, centerX: lane1X, isOncoming: false, name: 'Forward Fast (Inner Left)' },
      { index: 2, centerX: lane2X, isOncoming: true, name: 'Oncoming Fast (Inner Right)' },
      { index: 3, centerX: lane3X, isOncoming: true, name: 'Oncoming Slow (Outer Right)' },
    ];
  } else {
    // 2-Lane Undivided:
    // Lane 0: Forward (Left, positive X)
    // Lane 1: Oncoming (Right, negative X)
    const lane0X = +(LANE_WIDTH / 2);
    const lane1X = -(LANE_WIDTH / 2);

    return [
      { index: 0, centerX: lane0X, isOncoming: false, name: 'Forward Lane (Left)' },
      { index: 1, centerX: lane1X, isOncoming: true, name: 'Oncoming Lane (Right)' },
    ];
  }
}

/**
 * Road lateral boundaries: Left shoulder limit and Right shoulder limit
 */
export function getRoadBounds(mode: HighwayMode): { minX: number; maxX: number } {
  if (mode === 'divided_4lane') {
    const halfRoad = DIVIDER_WIDTH / 2 + LANE_WIDTH * 2 + SHOULDER_WIDTH;
    return { minX: -halfRoad, maxX: halfRoad };
  } else {
    const halfRoad = LANE_WIDTH + SHOULDER_WIDTH;
    return { minX: -halfRoad, maxX: halfRoad };
  }
}

/**
 * Determine if a position is in the counter-lane (opposing oncoming traffic)
 */
export function isInCounterLane(x: number, mode: HighwayMode): boolean {
  if (mode === 'divided_4lane') {
    // In divided expressway, crossing the divider into oncoming side (X < 0) is counter-lane
    return x < -DIVIDER_WIDTH / 2;
  } else {
    // In 2-lane undivided, crossing center line into oncoming side (X < 0) is counter-lane
    return x < 0;
  }
}

/**
 * Check 3D AABB Collision between two bounding boxes
 */
export function checkAABBCollision(a: BoundingBox3D, b: BoundingBox3D): boolean {
  return (
    a.minX <= b.maxX &&
    a.maxX >= b.minX &&
    a.minY <= b.maxY &&
    a.maxY >= b.minY &&
    a.minZ <= b.maxZ &&
    a.maxZ >= b.minZ
  );
}

/**
 * Calculate AABB box for an entity given its center and dimensions
 */
export function getEntityAABB(
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  length: number,
  margin = 0.9 // slight margin to account for rounded bumper contours
): BoundingBox3D {
  const hw = (width * margin) / 2;
  const hh = height / 2;
  const hl = (length * margin) / 2;

  return {
    minX: x - hw,
    maxX: x + hw,
    minY: y,
    maxY: y + hh * 2,
    minZ: z - hl,
    maxZ: z + hl,
  };
}

/**
 * Check if player achieved a near-miss overtake
 * A near miss occurs when player overtakes an NPC at high speed (> 70 km/h)
 * with a close lateral gap (< 0.8m) without colliding.
 */
export function checkNearMiss(
  playerBox: BoundingBox3D,
  npcBox: BoundingBox3D,
  playerSpeedKmh: number,
  alreadyAwarded: boolean
): boolean {
  if (alreadyAwarded || playerSpeedKmh < 65) return false;

  const lateralDistance = Math.min(
    Math.abs(playerBox.minX - npcBox.maxX),
    Math.abs(playerBox.maxX - npcBox.minX)
  );

  const longitudinalOverlap =
    playerBox.minZ <= npcBox.maxZ && playerBox.maxZ >= npcBox.minZ;

  return longitudinalOverlap && lateralDistance < 0.95;
}

/**
 * Calculate score bonus based on speed and near miss
 */
export function calculateOvertakeBonus(playerSpeedKmh: number, isCounterLane: boolean): number {
  const baseBonus = Math.floor(playerSpeedKmh * 1.5);
  return isCounterLane ? baseBonus * 2 : baseBonus;
}

/**
 * Convert m/s to km/h
 */
export function msToKmh(ms: number): number {
  return Math.round(ms * 3.6);
}

/**
 * Convert km/h to m/s
 */
export function kmhToMs(kmh: number): number {
  return kmh / 3.6;
}

/**
 * Check if a lane at position Z has sufficient gap for safe lane change or spawn
 */
export function isLaneClear(
  targetX: number,
  targetZ: number,
  vehicleLength: number,
  vehicles: Array<{ id: number; x: number; z: number; length: number; isOncoming: boolean }>,
  ignoreId: number = -1,
  requiredFrontGap: number = 28,
  requiredRearGap: number = 22
): boolean {
  for (const other of vehicles) {
    if (other.id === ignoreId) continue;
    // Check if in same lane laterally
    const lateralDist = Math.abs(other.x - targetX);
    if (lateralDist < 2.2) {
      // Longitudinal distance
      const zDiff = other.z - targetZ;
      if (zDiff >= 0 && zDiff < requiredFrontGap + (vehicleLength + other.length) / 2) {
        return false; // Vehicle ahead in target lane is too close
      }
      if (zDiff < 0 && Math.abs(zDiff) < requiredRearGap + (vehicleLength + other.length) / 2) {
        return false; // Vehicle behind in target lane is too close
      }
    }
  }
  return true;
}

/**
 * Strict physics separation for traffic entities to prevent any overlap or clipping
 */
export function resolveVehicleOverlaps(
  vehicles: TrafficEntity[],
  player?: { x: number; z: number; width: number; length: number }
) {
  // Sort by Z coordinate
  const count = vehicles.length;
  for (let i = 0; i < count; i++) {
    const a = vehicles[i];

    // Check against player if provided
    if (player && !a.isOncoming) {
      const lateralOverlap = Math.abs(a.x - player.x) < (a.width + player.width) / 2 * 0.92;
      const minSafeDist = (a.length + player.length) / 2 + 0.8;
      const zDist = Math.abs(a.z - player.z);

      if (lateralOverlap && zDist < minSafeDist) {
        if (a.z < player.z) {
          // NPC is behind player: push back and match/lower speed
          a.z = player.z - minSafeDist;
          a.speed = Math.min(a.speed, kmhToMs(40));
        } else {
          // NPC is ahead of player: push ahead
          a.z = player.z + minSafeDist;
        }
      }
    }

    for (let j = i + 1; j < count; j++) {
      const b = vehicles[j];
      // Only vehicles traveling in same direction can follow each other
      if (a.isOncoming !== b.isOncoming) continue;

      const lateralDist = Math.abs(a.x - b.x);
      const minLateral = (a.width + b.width) / 2 * 0.90;

      if (lateralDist < minLateral) {
        const minZDist = (a.length + b.length) / 2 + 1.5;
        const zDist = Math.abs(a.z - b.z);

        if (zDist < minZDist) {
          // Overlap detected! Separate them strictly
          if (a.isOncoming) {
            // Oncoming moves in -Z
            const front = a.z < b.z ? a : b;
            const rear = a.z < b.z ? b : a;
            rear.z = front.z + minZDist;
            rear.speed = Math.min(rear.speed, front.speed);
          } else {
            // Forward moves in +Z
            const front = a.z > b.z ? a : b;
            const rear = a.z > b.z ? b : a;
            rear.z = front.z - minZDist;
            rear.speed = Math.min(rear.speed, front.speed);
          }
        }
      }
    }
  }
}

/**
 * Vehicle Archetype dimensions and speed ranges
 */
export function getArchetypeSpecs(archetype: VehicleArchetype) {
  switch (archetype) {
    case 'bus':
      return {
        width: 2.6,
        length: 11.5,
        height: 3.4,
        minSpeedKmh: 75,
        maxSpeedKmh: 105,
        honkYieldProbability: 0.1, // Proud intercity buses rarely yield
      };
    case 'truck':
      return {
        width: 2.5,
        length: 9.0,
        height: 3.2,
        minSpeedKmh: 45,
        maxSpeedKmh: 65,
        honkYieldProbability: 0.75, // Heavy trucks yield when honked
      };
    case 'cng':
      return {
        width: 1.4,
        length: 2.7,
        height: 1.8,
        minSpeedKmh: 35,
        maxSpeedKmh: 50,
        honkYieldProbability: 0.9, // Auto rickshaws quickly slide to shoulder
      };
    case 'leguna':
      return {
        width: 1.7,
        length: 4.6,
        height: 2.2,
        minSpeedKmh: 40,
        maxSpeedKmh: 60,
        honkYieldProbability: 0.8, // Legunas slide over
      };
  }
}

