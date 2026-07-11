import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateEloKill } from './ranking.js';

test('equal ratings move by sixteen points', () => {
  const result = calculateEloKill(1000, 1000);
  assert.equal(result.delta, 16);
  assert.equal(result.killerRating, 1016);
  assert.equal(result.victimRating, 984);
});

test('an underdog receives more rating than a favorite', () => {
  const underdog = calculateEloKill(500, 1000);
  const favorite = calculateEloKill(1000, 500);
  assert.ok(underdog.delta > 16);
  assert.ok(favorite.delta < 16);
});

test('rating never falls below zero and every kill awards at least one point', () => {
  const result = calculateEloKill(3000, 0);
  assert.equal(result.delta, 1);
  assert.equal(result.victimRating, 0);
});
