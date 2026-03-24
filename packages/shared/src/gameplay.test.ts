import test from "node:test";
import assert from "node:assert/strict";

import { getClassMeleeDamage, getFrontlineShift, getRespawnProtection, getUnderdogMultiplier, getUpgradeCost } from "./gameplay";
import { getUnlockTier, isClassUnlocked } from "./arsenal";

test("upgrade cost scales per level", () => {
  assert.equal(getUpgradeCost(0), 80);
  assert.equal(getUpgradeCost(3), 215);
});

test("underdog multiplier grows for smaller human team", () => {
  assert.equal(getUnderdogMultiplier(5, 5), 1);
  assert.ok(getUnderdogMultiplier(3, 7) > 1);
});

test("respawn protection inherits underdog bonus", () => {
  assert.ok(getRespawnProtection(3, 7) > getRespawnProtection(7, 3));
});

test("frontline shift averages objective progress", () => {
  assert.ok(Math.abs(getFrontlineShift([50, 50, 50]) - 110) < 0.0001);
  assert.equal(getFrontlineShift([-50, 50, 0]), 0);
});

test("career score unlock tier rises at thresholds", () => {
  assert.equal(getUnlockTier(0), 0);
  assert.equal(getUnlockTier(180), 1);
  assert.equal(getUnlockTier(1400), 5);
});

test("class unlocks respect career score", () => {
  assert.equal(isClassUnlocked("knife", 0), true);
  assert.equal(isClassUnlocked("machine-gun", 900), false);
  assert.equal(isClassUnlocked("machine-gun", 1000), true);
  assert.ok(getClassMeleeDamage("war-hammer", 0) > getClassMeleeDamage("knife", 0));
});
