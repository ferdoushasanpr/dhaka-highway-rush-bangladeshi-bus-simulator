/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getLaneConfiguration,
  getRoadBounds,
  isInCounterLane,
  checkAABBCollision,
  getEntityAABB,
  checkNearMiss,
  calculateOvertakeBonus,
  msToKmh,
  kmhToMs,
  getArchetypeSpecs,
  resolveVehicleOverlaps,
  calculateRealisticPlayerSpeedStep,
  evaluateHornYield,
} from './trafficRules';

test('trafficRules: LHT lane configuration for 4-lane divided expressway', () => {
  const lanes = getLaneConfiguration('divided_4lane');
  assert.equal(lanes.length, 4);

  // Left side (positive X in driver view) must be forward lanes
  assert.equal(lanes[0].isOncoming, false);
  assert.ok(lanes[0].centerX > 0, 'Forward outer lane should be positive X (screen left)');
  assert.equal(lanes[1].isOncoming, false);
  assert.ok(lanes[1].centerX > 0, 'Forward inner lane should be positive X (screen left)');

  // Right side (negative X in driver view) must be oncoming lanes
  assert.equal(lanes[2].isOncoming, true);
  assert.ok(lanes[2].centerX < 0, 'Oncoming fast lane should be negative X (screen right)');
  assert.equal(lanes[3].isOncoming, true);
  assert.ok(lanes[3].centerX < 0, 'Oncoming slow lane should be negative X (screen right)');
});

test('trafficRules: LHT lane configuration for 2-lane undivided road', () => {
  const lanes = getLaneConfiguration('undivided_2lane');
  assert.equal(lanes.length, 2);

  // Forward is on Left (positive X)
  assert.equal(lanes[0].isOncoming, false);
  assert.ok(lanes[0].centerX > 0);

  // Oncoming is on Right (negative X)
  assert.equal(lanes[1].isOncoming, true);
  assert.ok(lanes[1].centerX < 0);
});

test('trafficRules: counter-lane detection', () => {
  assert.equal(isInCounterLane(2.0, 'undivided_2lane'), false);
  assert.equal(isInCounterLane(-2.0, 'undivided_2lane'), true);

  assert.equal(isInCounterLane(3.5, 'divided_4lane'), false);
  assert.equal(isInCounterLane(-3.5, 'divided_4lane'), true);
});

test('trafficRules: collision detection (AABB)', () => {
  const boxA = getEntityAABB(0, 0, 10, 2.5, 3.0, 10.0);
  const boxB = getEntityAABB(1.0, 0, 14, 2.5, 3.0, 10.0); // Overlapping
  const boxC = getEntityAABB(10.0, 0, 50, 2.5, 3.0, 10.0); // Far away

  assert.equal(checkAABBCollision(boxA, boxB), true);
  assert.equal(checkAABBCollision(boxA, boxC), false);
});

test('trafficRules: near miss overtake calculation', () => {
  const playerBox = getEntityAABB(0, 0, 20, 2.5, 3.0, 11.0);
  // Beside player with close lateral gap
  const npcBoxClose = getEntityAABB(3.0, 0, 20, 2.5, 3.0, 11.0);
  const npcBoxFar = getEntityAABB(6.0, 0, 20, 2.5, 3.0, 11.0);

  // High speed close overtake
  assert.equal(checkNearMiss(playerBox, npcBoxClose, 80, false), true);
  // Too low speed (< 65 km/h)
  assert.equal(checkNearMiss(playerBox, npcBoxClose, 40, false), false);
  // Too far laterally
  assert.equal(checkNearMiss(playerBox, npcBoxFar, 90, false), false);
  // Already awarded
  assert.equal(checkNearMiss(playerBox, npcBoxClose, 90, true), false);
});

test('trafficRules: unit conversion and bonuses', () => {
  assert.equal(msToKmh(10), 36);
  assert.equal(kmhToMs(72), 20);

  const normalBonus = calculateOvertakeBonus(80, false);
  const counterBonus = calculateOvertakeBonus(80, true);
  assert.equal(counterBonus, normalBonus * 2, 'Counter-lane overtake bonus should double');
});

test('trafficRules: vehicle archetype distinct speeds and characteristics', () => {
  const cng = getArchetypeSpecs('cng');
  const truck = getArchetypeSpecs('truck');
  const leguna = getArchetypeSpecs('leguna');
  const microbus = getArchetypeSpecs('microbus');
  const bus = getArchetypeSpecs('bus');

  // Verify strict speed stratification across vehicle archetypes
  assert.ok(cng.maxSpeedKmh < truck.maxSpeedKmh, 'CNG should be slower than Truck');
  assert.ok(truck.maxSpeedKmh < leguna.maxSpeedKmh, 'Truck should be slower than Leguna');
  assert.ok(leguna.maxSpeedKmh < microbus.maxSpeedKmh, 'Leguna should be slower than Microbus');
  assert.ok(microbus.maxSpeedKmh < bus.maxSpeedKmh, 'Microbus should be slower than Intercity Bus');

  // Verify heavy trucks accelerate much slower than agile microbuses
  assert.ok(truck.accelRate < microbus.accelRate, 'Trucks should have lower acceleration rate than microbuses');
  // Verify slow 3-wheelers yield to honks while proud intercity buses rarely do
  assert.ok(cng.honkYieldProbability > bus.honkYieldProbability);
});

test('trafficRules: realistic bus powertrain physics - tough to meet 130 km/h', () => {
  const dt = 1.0;

  // 1. Low speed launch (0-40 km/h): Brisk torque pull
  const speedAt1s = calculateRealisticPlayerSpeedStep(0, true, false, dt);
  const accelAt0 = speedAt1s; // m/s gained in 1s
  assert.ok(accelAt0 >= 2.5, `Low gear acceleration should be strong (got ${accelAt0} m/s^2)`);

  // 2. High speed acceleration (128 km/h): Extremely tough to meet 130 km/h
  const speedAt128 = kmhToMs(128);
  const speedAfter1sAt128 = calculateRealisticPlayerSpeedStep(speedAt128, true, false, dt);
  const kmhGainedAt128 = (speedAfter1sAt128 - speedAt128) * 3.6;
  assert.ok(
    kmhGainedAt128 < 0.4,
    `Acceleration at 128 km/h should be tough (< 0.4 km/h/s, got ${kmhGainedAt128})`
  );

  // 3. Reaching 130 km/h requires multiple seconds of uninterrupted full throttle
  let currentSpeed = kmhToMs(125);
  let secondsTo130 = 0;
  while (msToKmh(currentSpeed) < 130 && secondsTo130 < 60) {
    currentSpeed = calculateRealisticPlayerSpeedStep(currentSpeed, true, false, 0.5);
    secondsTo130 += 0.5;
  }
  assert.ok(
    secondsTo130 >= 10,
    `Going from 125 to 130 km/h must take at least 10 seconds of continuous throttle (took ${secondsTo130}s)`
  );

  // 4. Aerodynamic drag on coasting: high speed decelerates much faster than low speed
  const highSpeedDecel =
    kmhToMs(130) - calculateRealisticPlayerSpeedStep(kmhToMs(130), false, false, dt);
  const lowSpeedDecel =
    kmhToMs(40) - calculateRealisticPlayerSpeedStep(kmhToMs(40), false, false, dt);
  assert.ok(
    highSpeedDecel > lowSpeedDecel * 2.0,
    `High-speed aerodynamic coasting decel (${highSpeedDecel}) should be > 2x low-speed decel (${lowSpeedDecel})`
  );

  // 5. Pneumatic air braking
  const speedBraking = calculateRealisticPlayerSpeedStep(kmhToMs(100), false, true, dt);
  const decelBrake = kmhToMs(100) - speedBraking;
  assert.ok(decelBrake >= 14, `Air brake deceleration should be >= 14 m/s^2 (got ${decelBrake})`);
});

test('trafficRules: resolveVehicleOverlaps separates overlapping vehicles', () => {
  const v1 = {
    id: 1,
    archetype: 'bus' as const,
    x: 4.5,
    y: 0,
    z: 100,
    speed: 20,
    targetSpeed: 20,
    width: 2.6,
    length: 11.5,
    height: 3.4,
    currentLane: 0,
    targetLane: 0,
    isLaneChanging: false,
    laneChangeProgress: 0,
    indicator: 'none' as const,
    indicatorTimer: 0,
    isOncoming: false,
    isOvertakingCounterLane: false,
    counterLaneTimer: 0,
    honkedReactionTimer: 0,
  };
  const v2 = {
    id: 2,
    archetype: 'bus' as const,
    x: 4.5,
    y: 0,
    z: 103, // severely overlapping in Z
    speed: 25,
    targetSpeed: 25,
    width: 2.6,
    length: 11.5,
    height: 3.4,
    currentLane: 0,
    targetLane: 0,
    isLaneChanging: false,
    laneChangeProgress: 0,
    indicator: 'none' as const,
    indicatorTimer: 0,
    isOncoming: false,
    isOvertakingCounterLane: false,
    counterLaneTimer: 0,
    honkedReactionTimer: 0,
  };

  resolveVehicleOverlaps([v1, v2], undefined, 'divided_4lane');
  // Must separate along Z so they don't overlap
  const zDiff = Math.abs(v1.z - v2.z);
  const minRequiredZ = (v1.length + v2.length) / 2 + 0.90;
  assert.ok(zDiff >= minRequiredZ, `zDiff ${zDiff} should be >= ${minRequiredZ}`);
});

test('trafficRules: resolveVehicleOverlaps separates lateral lane change overlap', () => {
  const v1 = {
    id: 1,
    archetype: 'bus' as const,
    x: 4.5,
    y: 0,
    z: 100,
    speed: 20,
    targetSpeed: 20,
    width: 2.6,
    length: 11.5,
    height: 3.4,
    currentLane: 0,
    targetLane: 1,
    isLaneChanging: true,
    laneChangeProgress: 0.5,
    indicator: 'left' as const,
    indicatorTimer: 0,
    isOncoming: false,
    isOvertakingCounterLane: false,
    counterLaneTimer: 0,
    honkedReactionTimer: 0,
  };
  const v2 = {
    id: 2,
    archetype: 'bus' as const,
    x: 3.5, // Adjacent lateral collision
    y: 0,
    z: 100, // exact same longitudinal position
    speed: 20,
    targetSpeed: 20,
    width: 2.6,
    length: 11.5,
    height: 3.4,
    currentLane: 1,
    targetLane: 1,
    isLaneChanging: false,
    laneChangeProgress: 0,
    indicator: 'none' as const,
    indicatorTimer: 0,
    isOncoming: false,
    isOvertakingCounterLane: false,
    counterLaneTimer: 0,
    honkedReactionTimer: 0,
  };

  resolveVehicleOverlaps([v1, v2], undefined, 'divided_4lane');
  // Lateral overlap must be resolved and lane change aborted
  const xDiff = Math.abs(v1.x - v2.x);
  const minRequiredX = (v1.width + v2.width) / 2 + 0.35;
  assert.ok(xDiff >= minRequiredX, `xDiff ${xDiff} should be >= ${minRequiredX}`);
  assert.equal(v1.isLaneChanging, false, 'Lane change should abort on collision');
});

test('trafficRules: evaluateHornYield only yields for vehicle directly ahead when space available', () => {
  // Lane 1 is at X ~ +2.8 (Fast lane), Lane 0 is at X ~ +6.4 (Slow lane)
  const playerX = 2.8;
  const playerZ = 0;

  const vehicleAheadInSameLane = {
    id: 10,
    archetype: 'truck' as const,
    x: 2.8, // directly in front of player
    y: 0,
    z: 25,
    speed: 15,
    targetSpeed: 15,
    width: 2.5,
    length: 9.0,
    height: 3.2,
    currentLane: 1,
    targetLane: 1,
    isLaneChanging: false,
    laneChangeProgress: 0,
    indicator: 'none' as const,
    indicatorTimer: 0,
    isOncoming: false,
    isOvertakingCounterLane: false,
    counterLaneTimer: 0,
    honkedReactionTimer: 0,
  };

  const vehicleInOtherLane = {
    id: 20,
    archetype: 'cng' as const,
    x: 6.4, // in other lane (Lane 0)
    y: 0,
    z: 22,
    speed: 12,
    targetSpeed: 12,
    width: 1.4,
    length: 2.7,
    height: 1.8,
    currentLane: 0,
    targetLane: 0,
    isLaneChanging: false,
    laneChangeProgress: 0,
    indicator: 'none' as const,
    indicatorTimer: 0,
    isOncoming: false,
    isOvertakingCounterLane: false,
    counterLaneTimer: 0,
    honkedReactionTimer: 0,
  };

  // Case 1: Player is behind vehicleAheadInSameLane, but vehicleInOtherLane occupies Lane 0 at z=22
  // Because Lane 0 is blocked around z=25, vehicleAhead cannot safely yield!
  const evalBlocked = evaluateHornYield(playerX, playerZ, [vehicleAheadInSameLane, vehicleInOtherLane], 'divided_4lane');
  assert.equal(evalBlocked.shouldYield, false);
  assert.equal(evalBlocked.reason, 'no_space', 'Should not yield if adjacent lane has no space');

  // Case 2: Lane 0 is clear! Vehicle ahead in same lane SHOULD yield
  const evalClear = evaluateHornYield(playerX, playerZ, [vehicleAheadInSameLane], 'divided_4lane');
  assert.equal(evalClear.shouldYield, true);
  assert.equal(evalClear.targetNpcId, 10);
  assert.ok(evalClear.targetYieldX! > 5.0, 'Should yield toward slow lane 0');

  // Case 3: Player is in Lane 1, only vehicleInOtherLane (in Lane 0) exists
  // Vehicle in other lane must NOT yield!
  const evalOtherLane = evaluateHornYield(playerX, playerZ, [vehicleInOtherLane], 'divided_4lane');
  assert.equal(evalOtherLane.shouldYield, false);
  assert.equal(evalOtherLane.reason, 'no_vehicle_in_path', 'Vehicles in other lanes must never react to horn');
});

test('zones: Bangladeshi highway landmarks, bridges, bazaars, and flyovers exist and cycle', async () => {
  const { getMilestoneAtZ, getLocationInfoAtZ, HIGHWAY_MILESTONES, ZONE_SEGMENT_SPAN } = await import('./zones');

  // Verify all required Bangladeshi environments are represented
  const zoneTypes = new Set(HIGHWAY_MILESTONES.map((m) => m.zoneType));
  assert.ok(zoneTypes.has('countryside'), 'Should include countryside view');
  assert.ok(zoneTypes.has('town_bazaar'), 'Should include town bazaar view');
  assert.ok(zoneTypes.has('long_bridge'), 'Should include long bridges');
  assert.ok(zoneTypes.has('small_bridge'), 'Should include small bridge / culvert');
  assert.ok(zoneTypes.has('unpaved'), 'Should include highly unpaved roads');
  assert.ok(zoneTypes.has('narrow_road'), 'Should include narrow road');
  assert.ok(zoneTypes.has('flyover'), 'Should include flyover / elevated expressway');

  // Verify iconic bridges specifically requested
  const bridgeNames = HIGHWAY_MILESTONES.filter((m) => m.zoneType === 'long_bridge').map((m) => m.nameBn);
  assert.ok(bridgeNames.some((n) => n.includes('পদ্মা')), 'Should include Padma Bridge');
  assert.ok(bridgeNames.some((n) => n.includes('যমুনা')), 'Should include Jamuna Bridge');
  assert.ok(bridgeNames.some((n) => n.includes('মেঘনা')), 'Should include Meghna Bridge');

  // Verify milestone progression at various Z coordinates
  const startLoc = getLocationInfoAtZ(50);
  assert.ok(startLoc.nameBn.length > 0);
  assert.ok(startLoc.nameEn.length > 0);
  assert.ok(startLoc.badgeBn.length > 0);
  assert.ok(startLoc.nextDestinationBn.length > 0);
  assert.ok(startLoc.nextDistanceKm >= 0);

  // Milestone transition across zone span
  const nextZoneZ = ZONE_SEGMENT_SPAN + 50;
  const nextLoc = getLocationInfoAtZ(nextZoneZ);
  assert.notEqual(startLoc.id, nextLoc.id, 'Should advance to next milestone after ZONE_SEGMENT_SPAN');

  // Unpaved zone has high roughness
  const unpavedMilestone = HIGHWAY_MILESTONES.find((m) => m.zoneType === 'unpaved');
  assert.ok(unpavedMilestone && unpavedMilestone.roughness >= 0.8, 'Unpaved zone should have high roughness');

  // Narrow road has isNarrow flag
  const narrowMilestone = HIGHWAY_MILESTONES.find((m) => m.zoneType === 'narrow_road');
  assert.ok(narrowMilestone && narrowMilestone.isNarrow === true, 'Narrow road must set isNarrow to true');
});


