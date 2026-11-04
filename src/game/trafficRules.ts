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
// Velocity scale factor for 3D perspective optical flow
export const SPEED_WORLD_SCALE = 1.75;

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
    return x < -DIVIDER_WIDTH / 2;
  } else {
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
  margin = 0.92 // tight hitbox fidelity
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

export function msToKmh(ms: number): number {
  return Math.round(ms * 3.6);
}

export function kmhToMs(kmh: number): number {
  return kmh / 3.6;
}

/**
 * Check if a lane at position Z has sufficient gap for safe lane change or spawn.
 * Checks both longitudinal gap and lateral proximity of any vehicle currently transitioning.
 */
export function isLaneClear(
  targetX: number,
  targetZ: number,
  vehicleLength: number,
  vehicles: Array<{ id: number; x: number; z: number; length: number; width?: number; isOncoming: boolean }>,
  ignoreId: number = -1,
  requiredFrontGap: number = 32,
  requiredRearGap: number = 26
): boolean {
  for (const other of vehicles) {
    if (other.id === ignoreId) continue;
    // Check if within lateral zone of the target lane
    const lateralDist = Math.abs(other.x - targetX);
    if (lateralDist < 2.4) {
      // Longitudinal distance
      const zDiff = other.z - targetZ;
      const combinedHalfLengths = (vehicleLength + other.length) / 2;
      if (zDiff >= 0 && zDiff < requiredFrontGap + combinedHalfLengths) {
        return false; // Vehicle ahead in target lane is too close
      }
      if (zDiff < 0 && Math.abs(zDiff) < requiredRearGap + combinedHalfLengths) {
        return false; // Vehicle behind in target lane is too close
      }
    }
  }
  return true;
}

/**
 * Check if an NPC in active lane change is safe from any lateral collision.
 * If another vehicle is encroaching into its envelope, returns false so the AI can abort.
 */
export function isLaneChangeSafe(
  npc: TrafficEntity,
  vehicles: TrafficEntity[],
  player?: { x: number; z: number; width: number; length: number }
): boolean {
  // Check against player
  if (player && !npc.isOncoming) {
    const latDist = Math.abs(npc.x - player.x);
    const longDist = Math.abs(npc.z - player.z);
    if (latDist < (npc.width + player.width) / 2 + 0.8 && longDist < (npc.length + player.length) / 2 + 3.0) {
      return false;
    }
  }

  // Check against other traffic
  for (const other of vehicles) {
    if (other.id === npc.id) continue;
    const latDist = Math.abs(npc.x - other.x);
    const longDist = Math.abs(npc.z - other.z);
    const minLat = (npc.width + other.width) / 2 + 0.7;
    const minLong = (npc.length + other.length) / 2 + 3.5;
    if (latDist < minLat && longDist < minLong) {
      return false;
    }
  }

  return true;
}

export interface HornYieldEvaluation {
  shouldYield: boolean;
  targetNpcId?: number;
  targetYieldX?: number;
  reason?: 'no_vehicle_in_path' | 'oncoming' | 'no_space' | 'success';
}

/**
 * Evaluates whether any vehicle ahead should yield to the player's air horn.
 * Strictly enforces Bangladeshi highway rules and user requirements:
 * 1. ONLY the vehicle the player is directly behind (|npc.x - playerX| < 1.6) can react.
 *    Vehicles in other lanes are completely ignored!
 * 2. Only yields if there is enough safe space available in the adjacent slow lane or shoulder.
 */
export function evaluateHornYield(
  playerX: number,
  playerZ: number,
  vehicles: TrafficEntity[],
  highwayMode: HighwayMode
): HornYieldEvaluation {
  let closestNpc: TrafficEntity | null = null;
  let minDistance = Infinity;

  for (const npc of vehicles) {
    if (npc.isOncoming) continue; // Oncoming traffic never yields

    const zDiff = npc.z - playerZ;
    // Must be in front of player within audible range (4m to 52m)
    if (zDiff > 4.0 && zDiff < 52.0) {
      // Must be DIRECTLY ahead in the player's lateral lane corridor
      const lateralDist = Math.abs(npc.x - playerX);
      if (lateralDist < 1.65) {
        if (zDiff < minDistance) {
          minDistance = zDiff;
          closestNpc = npc;
        }
      }
    }
  }

  if (!closestNpc) {
    return { shouldYield: false, reason: 'no_vehicle_in_path' };
  }

  // Determine target yield X coordinate (move to the left in LHT)
  const bounds = getRoadBounds(highwayMode);
  let targetYieldX: number;

  if (highwayMode === 'divided_4lane') {
    // In 4-lane divided expressway:
    // If NPC is in Lane 1 (fast lane, centerX ~ +2.8), giving side means pulling into Lane 0 (slow lane, centerX ~ +6.4)
    if (closestNpc.currentLane === 1) {
      const lane0X = +(DIVIDER_WIDTH / 2 + LANE_WIDTH * 1.5);
      targetYieldX = lane0X;
    } else {
      // In Lane 0 (slow lane), slide to outer left shoulder
      targetYieldX = Math.min(bounds.maxX - 1.4, closestNpc.x + 1.35);
    }
  } else {
    // 2-lane road: slide to outer left shoulder
    targetYieldX = Math.min(bounds.maxX - 1.25, closestNpc.x + 1.25);
  }

  // Verify space is clear at targetYieldX around closestNpc.z
  const spaceClear = isLaneClear(
    targetYieldX,
    closestNpc.z,
    closestNpc.length,
    vehicles,
    closestNpc.id,
    22,
    16
  );

  if (!spaceClear) {
    return { shouldYield: false, targetNpcId: closestNpc.id, reason: 'no_space' };
  }

  return {
    shouldYield: true,
    targetNpcId: closestNpc.id,
    targetYieldX,
    reason: 'success',
  };
}

/**
 * Strict 2D AABB / OBB physics non-penetration separation for traffic entities.
 * Resolves both lateral side-by-side overlaps and longitudinal rear-end overlaps,
 * guaranteeing vehicles never intersect or clip into each other or the player.
 */
export function resolveVehicleOverlaps(
  vehicles: TrafficEntity[],
  player?: { x: number; z: number; width: number; length: number },
  highwayMode: HighwayMode = 'divided_4lane'
) {
  const bounds = getRoadBounds(highwayMode);
  const count = vehicles.length;

  // 1. Resolve overlap with Player bus
  if (player) {
    for (let i = 0; i < count; i++) {
      const npc = vehicles[i];
      if (npc.isOncoming) continue; // Oncoming collisions are handled by crash detector

      const dx = npc.x - player.x;
      const dz = npc.z - player.z;
      const minX = (npc.width + player.width) / 2 + 0.2;
      const minZ = (npc.length + player.length) / 2 + 0.6;

      const overlapX = minX - Math.abs(dx);
      const overlapZ = minZ - Math.abs(dz);

      if (overlapX > 0 && overlapZ > 0) {
        // Penetration detected!
        if (overlapX < overlapZ * 0.7) {
          // Push NPC away laterally from player
          const dirX = dx >= 0 ? 1 : -1;
          npc.x = player.x + dirX * minX;
          if (npc.isLaneChanging) {
            npc.isLaneChanging = false;
            npc.targetLane = npc.currentLane;
            npc.indicator = 'none';
          }
        } else {
          // Push NPC away longitudinally
          if (dz > 0) {
            npc.z = player.z + minZ;
          } else {
            npc.z = player.z - minZ;
            npc.speed = Math.min(npc.speed, kmhToMs(30));
          }
        }
      }
    }
  }

  // 2. Pairwise Traffic Separation
  for (let i = 0; i < count; i++) {
    const a = vehicles[i];

    for (let j = i + 1; j < count; j++) {
      const b = vehicles[j];

      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const minX = (a.width + b.width) / 2 + 0.35;
      const minZ = (a.length + b.length) / 2 + 0.90;

      const overlapX = minX - Math.abs(dx);
      const overlapZ = minZ - Math.abs(dz);

      if (overlapX > 0 && overlapZ > 0) {
        // Normalize penetration by bounding box dimensions
        const normOverlapX = overlapX / minX;
        const normOverlapZ = overlapZ / minZ;

        // They are penetrating each other!
        if (a.isOncoming === b.isOncoming) {
          // Same direction:
          if (normOverlapX < normOverlapZ && Math.abs(dx) > 0.6) {
            // Lateral side-swipe conflict during lane change or merge
            const pushDist = overlapX * 0.5 + 0.05;
            const dirX = dx >= 0 ? 1 : -1;
            b.x += pushDist * dirX;
            a.x -= pushDist * dirX;

            // Abort lane changes on collision
            if (a.isLaneChanging) {
              a.isLaneChanging = false;
              a.targetLane = a.currentLane;
              a.indicator = 'none';
            }
            if (b.isLaneChanging) {
              b.isLaneChanging = false;
              b.targetLane = b.currentLane;
              b.indicator = 'none';
            }
          } else {
            // Front-to-back following conflict (same lane or high lateral overlap):
            if (a.isOncoming) {
              // Moving in -Z: lower Z is front
              const front = a.z < b.z ? a : b;
              const rear = front === a ? b : a;
              rear.z = front.z + minZ;
              rear.speed = Math.min(rear.speed, Math.max(0, front.speed - 1.5));
            } else {
              // Moving in +Z: higher Z is front
              const front = a.z > b.z ? a : b;
              const rear = front === a ? b : a;
              rear.z = front.z - minZ;
              rear.speed = Math.min(rear.speed, Math.max(0, front.speed - 1.5));
            }
          }
        } else {
          // Oncoming vs Forward (e.g. Counter-lane overtaking conflict):
          // Push apart laterally so they don't clip through each other!
          const dirX = dx >= 0 ? 1 : -1;
          const pushDist = overlapX * 0.5 + 0.1;
          b.x += pushDist * dirX;
          a.x -= pushDist * dirX;
          a.speed = Math.max(0, a.speed - 4.0);
          b.speed = Math.max(0, b.speed - 4.0);
          if (a.isLaneChanging) {
            a.isLaneChanging = false;
            a.targetLane = a.currentLane;
          }
          if (b.isLaneChanging) {
            b.isLaneChanging = false;
            b.targetLane = b.currentLane;
          }
        }
      }
    }

    // Clamp NPC within highway shoulders
    a.x = Math.max(bounds.minX + a.width / 2, Math.min(bounds.maxX - a.width / 2, a.x));
  }
}

/**
 * Vehicle Archetype dimensions, distinct speed distributions, acceleration rates, and names.
 * Carefully calibrated to ensure distinct, authentic Bangladeshi highway traffic speeds:
 * - CNG: 36-48 km/h (slow 3-wheelers hugging outer left lane)
 * - Heavy Truck: 46-62 km/h (overloaded Tata/Bedford cargo trucks)
 * - Leguna: 56-70 km/h (local human haulers)
 * - Microbus: 78-95 km/h (Toyota HiAce/Noah express vans)
 * - Intercity Bus: 90-112 km/h (Hanif/Shyamoli/Ena express coaches)
 */
export function getArchetypeSpecs(archetype: VehicleArchetype) {
  switch (archetype) {
    case 'cng':
      return {
        width: 1.4,
        length: 2.7,
        height: 1.8,
        minSpeedKmh: 36,
        maxSpeedKmh: 48,
        accelRate: 0.8,
        honkYieldProbability: 0.95, // Auto rickshaws quickly slide to shoulder
        displayName: 'CNG Auto-Rickshaw',
        bengaliName: 'সিএনজি অটোরিকশা',
      };
    case 'truck':
      return {
        width: 2.5,
        length: 9.0,
        height: 3.2,
        minSpeedKmh: 46,
        maxSpeedKmh: 62,
        accelRate: 0.5, // Heavy 10-wheelers accelerate very slowly
        honkYieldProbability: 0.75, // Heavy trucks yield when honked
        displayName: 'Tata Heavy Truck',
        bengaliName: 'টাটা হেভি ট্রাক',
      };
    case 'leguna':
      return {
        width: 1.7,
        length: 4.6,
        height: 2.2,
        minSpeedKmh: 56,
        maxSpeedKmh: 70,
        accelRate: 0.9,
        honkYieldProbability: 0.8, // Legunas slide over
        displayName: 'Leguna Human Hauler',
        bengaliName: 'লেগুনা',
      };
    case 'microbus':
      return {
        width: 1.85,
        length: 4.85,
        height: 2.05,
        minSpeedKmh: 78,
        maxSpeedKmh: 95,
        accelRate: 1.5, // Agile private minivan
        honkYieldProbability: 0.4,
        displayName: 'HiAce Microbus',
        bengaliName: 'হাইস মাইক্রোবাস',
      };
    case 'bus':
      return {
        width: 2.6,
        length: 11.5,
        height: 3.4,
        minSpeedKmh: 90,
        maxSpeedKmh: 112,
        accelRate: 1.2,
        honkYieldProbability: 0.1, // Proud intercity buses rarely yield
        displayName: 'Intercity Coach',
        bengaliName: 'আন্তঃজেলা বাস',
      };
  }
}

/**
 * Calculates updated player vehicle speed with realistic heavy bus powertrain dynamics:
 * - Low gear diesel torque gives responsive launch from 0-45 km/h
 * - Steady pull through 45-80 km/h (cruising highway ramp-up)
 * - Noticeable drag at 80-105 km/h (typical intercity coach cruising)
 * - Heavy aerodynamic drag and high-gear resistance from 105-122 km/h
 * - Severe resistance above 125 km/h, making 130 km/h tough to meet
 * - Theoretical terminal top speed ~134 km/h under sustained uninterrupted full throttle on clear road
 * - Heavy aerodynamic coasting resistance when letting off the gas (rapidly bleeds speed down to cruising)
 * - Powerful pneumatic air-brake deceleration
 */
export function calculateRealisticPlayerSpeedStep(
  currentSpeedMs: number,
  accelerating: boolean,
  braking: boolean,
  dt: number,
  terminalSpeedKmh = 134
): number {
  if (braking) {
    const brakeDecel = 16.0; // m/s^2 pneumatic air brakes
    return Math.max(0, currentSpeedMs - brakeDecel * dt);
  }

  const currentKmh = currentSpeedMs * 3.6;
  const terminalSpeedMs = terminalSpeedKmh / 3.6;

  if (accelerating) {
    let netAccel: number;
    if (currentKmh < 45) {
      // 0 to 45 km/h: Low gear diesel torque (3.0 -> 2.2 m/s^2)
      netAccel = 3.0 - (currentKmh / 45) * 0.8;
    } else if (currentKmh < 80) {
      // 45 to 80 km/h: 3rd & 4th gear highway pull (2.2 -> 1.3 m/s^2)
      netAccel = 2.2 - ((currentKmh - 45) / 35) * 0.9;
    } else if (currentKmh < 105) {
      // 80 to 105 km/h: 5th gear cruising, air drag increasing (1.3 -> 0.6 m/s^2)
      netAccel = 1.3 - ((currentKmh - 80) / 25) * 0.7;
    } else if (currentKmh < 120) {
      // 105 to 120 km/h: 6th gear, large frontal bus area pushing air (0.6 -> 0.26 m/s^2)
      netAccel = 0.6 - ((currentKmh - 105) / 15) * 0.34;
    } else if (currentKmh < 128) {
      // 120 to 128 km/h: Tough climb against heavy aerodynamic drag (0.26 -> 0.10 m/s^2)
      netAccel = 0.26 - ((currentKmh - 120) / 8) * 0.16;
    } else if (currentKmh < 130) {
      // 128 to 130 km/h: Very tough to break into 130 km/h (0.10 -> 0.045 m/s^2)
      netAccel = 0.10 - ((currentKmh - 128) / 2) * 0.055;
    } else {
      // Above 130 km/h: Extreme struggle toward terminal speed (~134 km/h)
      const remainingHeadroom = Math.max(0, (terminalSpeedKmh - currentKmh) / (terminalSpeedKmh - 130));
      netAccel = 0.045 * Math.pow(remainingHeadroom, 1.6);
    }

    const nextSpeedMs = currentSpeedMs + netAccel * dt;
    return Math.min(terminalSpeedMs, Math.max(0, nextSpeedMs));
  } else {
    // Coasting: Engine compression braking + quadratic aerodynamic drag (F_drag ~ v^2)
    // At 130 km/h (36.1 m/s): drag decel ~ 2.8 m/s^2 + base 1.3 = 4.1 m/s^2
    // At 80 km/h (22.2 m/s): drag decel ~ 1.0 m/s^2 + base 1.3 = 2.3 m/s^2
    // At 30 km/h (8.3 m/s): drag decel ~ 0.15 m/s^2 + base 1.3 = 1.45 m/s^2
    const baseRollingResistance = 1.3;
    const aeroDecel = Math.pow(currentSpeedMs / 36.1, 2) * 2.8;
    const totalDecel = baseRollingResistance + aeroDecel;
    return Math.max(0, currentSpeedMs - totalDecel * dt);
  }
}
