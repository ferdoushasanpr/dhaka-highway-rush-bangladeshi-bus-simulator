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
  getArchetypeSpecs
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
