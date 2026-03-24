import { getWeaponClass, type WeaponClassId } from "./arsenal";
import {
  AIM_ACCELERATION,
  DASH_BURST_MS,
  DASH_SPEED_BONUS,
  FRONTLINE_SHIFT_SCALE,
  LANE_Y,
  MAP_HEIGHT,
  MAP_WIDTH,
  MELEE_BONUS_ARMOR,
  MELEE_BONUS_HEALTH,
  MOVEMENT_ACCELERATION,
  MAX_UPGRADE_LEVEL,
  OBJECTIVE_LAYOUT,
  PLAYER_BASE_ARMOR,
  PLAYER_BASE_HEALTH,
  PLAYER_BASE_MELEE_COOLDOWN_MS,
  PLAYER_BASE_MELEE_DAMAGE,
  PLAYER_BASE_MELEE_RANGE,
  PLAYER_BASE_RANGED_CONE,
  PLAYER_BASE_RANGED_COOLDOWN_MS,
  PLAYER_BASE_RANGED_DAMAGE,
  PLAYER_BASE_RANGED_RANGE,
  PLAYER_PROJECTILE_SPEED,
  PLAYER_BASE_SPEED,
  RESPAWN_PROTECTION_MS,
  TEAM_IDS,
  type LaneId,
  type TeamId
} from "./constants";

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function normalizeVector(x: number, y: number): { x: number; y: number } {
  const length = Math.hypot(x, y);
  if (length < 0.0001) {
    return { x: 0, y: 0 };
  }

  return { x: x / length, y: y / length };
}

export function getUpgradeCost(level: number): number {
  return 80 + level * 45;
}

export function isUpgradeMaxed(level: number): boolean {
  return level >= MAX_UPGRADE_LEVEL;
}

export function getUnderdogMultiplier(teamHumans: number, otherHumans: number): number {
  if (teamHumans >= otherHumans) {
    return 1;
  }

  return clamp(1 + (otherHumans - teamHumans) * 0.04, 1, 1.24);
}

export function getRespawnProtection(teamHumans: number, otherHumans: number): number {
  return Math.round(RESPAWN_PROTECTION_MS * getUnderdogMultiplier(teamHumans, otherHumans));
}

export function getMaxHealth(damageLevel: number): number {
  return PLAYER_BASE_HEALTH + damageLevel * 8;
}

export function getPlayerMaxHealth(path: "melee" | "ranged", damageLevel: number, healthLevel: number): number {
  return PLAYER_BASE_HEALTH + damageLevel * 8 + healthLevel * 18 + (path === "melee" ? MELEE_BONUS_HEALTH : 0);
}

export function getPlayerMaxArmor(path: "melee" | "ranged", armorLevel: number): number {
  return PLAYER_BASE_ARMOR + armorLevel * 16 + (path === "melee" ? MELEE_BONUS_ARMOR : 0);
}

export function getMovementSpeed(mobilityLevel: number): number {
  return PLAYER_BASE_SPEED + mobilityLevel * 18;
}

export function getMovementAcceleration(mobilityLevel: number): number {
  return MOVEMENT_ACCELERATION + mobilityLevel * 0.85;
}

export function getAimAcceleration(): number {
  return AIM_ACCELERATION;
}

export function getDashDuration(): number {
  return DASH_BURST_MS;
}

export function getDashSpeedBonus(): number {
  return DASH_SPEED_BONUS;
}

export function getMeleeDamage(level: number): number {
  return PLAYER_BASE_MELEE_DAMAGE + level * 9;
}

export function getMeleeRange(level: number): number {
  return PLAYER_BASE_MELEE_RANGE + level * 16;
}

export function getMeleeCooldown(speedLevel: number): number {
  return clamp(PLAYER_BASE_MELEE_COOLDOWN_MS - speedLevel * 50, 260, PLAYER_BASE_MELEE_COOLDOWN_MS);
}

export function getRangedDamage(level: number): number {
  return PLAYER_BASE_RANGED_DAMAGE + level * 7;
}

export function getRangedRange(level: number): number {
  return PLAYER_BASE_RANGED_RANGE + level * 52;
}

export function getRangedCooldown(rateLevel: number): number {
  return clamp(PLAYER_BASE_RANGED_COOLDOWN_MS - rateLevel * 35, 120, PLAYER_BASE_RANGED_COOLDOWN_MS);
}

export function getRangedCone(accuracyLevel: number): number {
  return clamp(PLAYER_BASE_RANGED_CONE - accuracyLevel * 0.08, 0.22, PLAYER_BASE_RANGED_CONE);
}

export function getClassMeleeDamage(classId: WeaponClassId, damageLevel: number): number {
  return getWeaponClass(classId).damage + damageLevel * 6;
}

export function getClassMeleeRange(classId: WeaponClassId, rangeLevel: number): number {
  return getWeaponClass(classId).range + rangeLevel * 10;
}

export function getClassMeleeCooldown(classId: WeaponClassId, speedLevel: number): number {
  const base = getWeaponClass(classId).cooldownMs;
  return clamp(base - speedLevel * 35, Math.round(base * 0.55), base);
}

export function getClassRangedDamage(classId: WeaponClassId): number {
  return getWeaponClass(classId).damage;
}

export function getClassRangedRange(classId: WeaponClassId, rangeLevel: number): number {
  return getWeaponClass(classId).range + rangeLevel * 48;
}

export function getClassRangedCooldown(classId: WeaponClassId, rateLevel: number): number {
  const base = getWeaponClass(classId).cooldownMs;
  return clamp(base - rateLevel * 24, Math.max(90, Math.round(base * 0.45)), base);
}

export function getClassRangedCone(classId: WeaponClassId, accuracyLevel: number): number {
  const baseSpread = getWeaponClass(classId).spread ?? 0.12;
  return clamp(baseSpread - accuracyLevel * 0.018, 0.02, 0.45);
}

export function getClassProjectileSpeed(classId: WeaponClassId): number {
  return getWeaponClass(classId).projectileSpeed ?? PLAYER_PROJECTILE_SPEED;
}

export function getClassProjectileRadius(classId: WeaponClassId): number {
  return getWeaponClass(classId).projectileRadius ?? 6;
}

export function getFrontlineShift(progressByObjective: Iterable<number>): number {
  let total = 0;
  let count = 0;
  for (const progress of progressByObjective) {
    total += progress;
    count += 1;
  }

  if (count === 0) {
    return 0;
  }

  return (total / count) * FRONTLINE_SHIFT_SCALE;
}

export function getSpawnPoint(team: TeamId, lane: LaneId, frontlineShift: number): { x: number; y: number } {
  const laneY = LANE_Y[lane];
  const baseX = team === "germany" ? 260 : MAP_WIDTH - 260;
  const shiftedX = baseX + frontlineShift;
  const clampedX = clamp(shiftedX, 170, MAP_WIDTH - 170);
  return {
    x: clampedX,
    y: clamp(laneY + (team === "germany" ? -36 : 36), 100, MAP_HEIGHT - 100)
  };
}

export function getObjectiveOwner(progress: number): TeamId | "neutral" {
  if (progress >= 25) {
    return TEAM_IDS[0];
  }

  if (progress <= -25) {
    return TEAM_IDS[1];
  }

  return "neutral";
}

export function getDefaultObjectiveProgress(): Record<string, number> {
  return Object.fromEntries(OBJECTIVE_LAYOUT.map((objective) => [objective.id, 0]));
}
