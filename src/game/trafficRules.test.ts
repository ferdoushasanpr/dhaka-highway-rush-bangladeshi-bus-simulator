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

test('trafficRules: vehicle archetype specs', () => {
  const cng = getArchetypeSpecs('cng');
  const bus = getArchetypeSpecs('bus');
  assert.ok(cng.width < bus.width);
  assert.ok(cng.minSpeedKmh < bus.minSpeedKmh);
  assert.ok(cng.honkYieldProbability > bus.honkYieldProbability);
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


