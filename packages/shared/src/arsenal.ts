export const CLASS_UNLOCK_SCORES = [0, 150, 350, 650, 1000, 1400] as const;

export type WeaponPath = "melee" | "ranged";

export type WeaponClassId =
  | "knife"
  | "sword"
  | "katana"
  | "mace"
  | "war-hammer"
  | "morning-star"
  | "chain-blade"
  | "pistol"
  | "repeater-carbine"
  | "shotgun"
  | "flamethrower"
  | "smg"
  | "grenade-launcher"
  | "machine-gun"
  | "minigun"
  | "emp-launcher"
  | "rocket-launcher"
  | "cluster-rocket";

export type WeaponRenderKind =
  | "knife"
  | "sword"
  | "katana"
  | "mace"
  | "hammer"
  | "morningstar"
  | "chainblade"
  | "pistol"
  | "carbine"
  | "shotgun"
  | "flame"
  | "smg"
  | "launcher"
  | "machinegun"
  | "minigun"
  | "emp"
  | "rocket";

export type ImpactStyle = "melee" | "bullet" | "explosion" | "flame" | "shock";

export type WeaponClassDefinition = {
  id: WeaponClassId;
  name: string;
  path: WeaponPath;
  tier: number;
  unlockScore: number;
  renderKind: WeaponRenderKind;
  impactStyle: ImpactStyle;
  damage: number;
  range: number;
  cooldownMs: number;
  knockback: number;
  swingArc?: number;
  projectileSpeed?: number;
  projectileRadius?: number;
  spread?: number;
  pelletCount?: number;
  splashRadius?: number;
};

export const DEFAULT_MELEE_CLASS_ID: WeaponClassId = "knife";
export const DEFAULT_RANGED_CLASS_ID: WeaponClassId = "pistol";
export const DEFAULT_ACTIVE_CLASS_ID: WeaponClassId = DEFAULT_RANGED_CLASS_ID;

export const WEAPON_CLASSES: Record<WeaponClassId, WeaponClassDefinition> = {
  knife: {
    id: "knife",
    name: "Knife",
    path: "melee",
    tier: 0,
    unlockScore: CLASS_UNLOCK_SCORES[0],
    renderKind: "knife",
    impactStyle: "melee",
    damage: 34,
    range: 58,
    cooldownMs: 320,
    knockback: 12,
    swingArc: 0.85
  },
  sword: {
    id: "sword",
    name: "Sword",
    path: "melee",
    tier: 1,
    unlockScore: CLASS_UNLOCK_SCORES[1],
    renderKind: "sword",
    impactStyle: "melee",
    damage: 42,
    range: 72,
    cooldownMs: 420,
    knockback: 18,
    swingArc: 1
  },
  katana: {
    id: "katana",
    name: "Katana",
    path: "melee",
    tier: 2,
    unlockScore: CLASS_UNLOCK_SCORES[2],
    renderKind: "katana",
    impactStyle: "melee",
    damage: 39,
    range: 82,
    cooldownMs: 260,
    knockback: 14,
    swingArc: 1.15
  },
  mace: {
    id: "mace",
    name: "Mace",
    path: "melee",
    tier: 3,
    unlockScore: CLASS_UNLOCK_SCORES[3],
    renderKind: "mace",
    impactStyle: "melee",
    damage: 52,
    range: 68,
    cooldownMs: 540,
    knockback: 24,
    swingArc: 0.8
  },
  "war-hammer": {
    id: "war-hammer",
    name: "War Hammer",
    path: "melee",
    tier: 4,
    unlockScore: CLASS_UNLOCK_SCORES[4],
    renderKind: "hammer",
    impactStyle: "melee",
    damage: 64,
    range: 74,
    cooldownMs: 690,
    knockback: 36,
    swingArc: 0.72
  },
  "morning-star": {
    id: "morning-star",
    name: "Morning Star",
    path: "melee",
    tier: 5,
    unlockScore: CLASS_UNLOCK_SCORES[5],
    renderKind: "morningstar",
    impactStyle: "melee",
    damage: 58,
    range: 80,
    cooldownMs: 610,
    knockback: 32,
    swingArc: 0.94
  },
  "chain-blade": {
    id: "chain-blade",
    name: "Chain Blade",
    path: "melee",
    tier: 4,
    unlockScore: CLASS_UNLOCK_SCORES[4],
    renderKind: "chainblade",
    impactStyle: "melee",
    damage: 56,
    range: 118,
    cooldownMs: 540,
    knockback: 28,
    swingArc: 0.68
  },
  pistol: {
    id: "pistol",
    name: "Pistol",
    path: "ranged",
    tier: 0,
    unlockScore: CLASS_UNLOCK_SCORES[0],
    renderKind: "pistol",
    impactStyle: "bullet",
    damage: 18,
    range: 430,
    cooldownMs: 260,
    knockback: 8,
    projectileSpeed: 1100,
    projectileRadius: 5,
    spread: 0.12,
    pelletCount: 1
  },
  "repeater-carbine": {
    id: "repeater-carbine",
    name: "Repeater Carbine",
    path: "ranged",
    tier: 1,
    unlockScore: CLASS_UNLOCK_SCORES[1],
    renderKind: "carbine",
    impactStyle: "bullet",
    damage: 24,
    range: 560,
    cooldownMs: 380,
    knockback: 11,
    projectileSpeed: 1220,
    projectileRadius: 5,
    spread: 0.08,
    pelletCount: 1
  },
  shotgun: {
    id: "shotgun",
    name: "Shotgun",
    path: "ranged",
    tier: 2,
    unlockScore: CLASS_UNLOCK_SCORES[2],
    renderKind: "shotgun",
    impactStyle: "bullet",
    damage: 12,
    range: 260,
    cooldownMs: 620,
    knockback: 14,
    projectileSpeed: 980,
    projectileRadius: 5,
    spread: 0.28,
    pelletCount: 5
  },
  flamethrower: {
    id: "flamethrower",
    name: "Flamethrower",
    path: "ranged",
    tier: 2,
    unlockScore: CLASS_UNLOCK_SCORES[2],
    renderKind: "flame",
    impactStyle: "flame",
    damage: 10,
    range: 210,
    cooldownMs: 96,
    knockback: 4,
    projectileSpeed: 720,
    projectileRadius: 8,
    spread: 0.32,
    pelletCount: 1,
    splashRadius: 36
  },
  smg: {
    id: "smg",
    name: "SMG",
    path: "ranged",
    tier: 3,
    unlockScore: CLASS_UNLOCK_SCORES[3],
    renderKind: "smg",
    impactStyle: "bullet",
    damage: 11,
    range: 360,
    cooldownMs: 125,
    knockback: 8,
    projectileSpeed: 1200,
    projectileRadius: 4,
    spread: 0.16,
    pelletCount: 1
  },
  "grenade-launcher": {
    id: "grenade-launcher",
    name: "Grenade Launcher",
    path: "ranged",
    tier: 3,
    unlockScore: CLASS_UNLOCK_SCORES[3],
    renderKind: "launcher",
    impactStyle: "explosion",
    damage: 42,
    range: 720,
    cooldownMs: 780,
    knockback: 16,
    projectileSpeed: 640,
    projectileRadius: 8,
    spread: 0.06,
    pelletCount: 1,
    splashRadius: 104
  },
  "machine-gun": {
    id: "machine-gun",
    name: "Machine Gun",
    path: "ranged",
    tier: 4,
    unlockScore: CLASS_UNLOCK_SCORES[4],
    renderKind: "machinegun",
    impactStyle: "bullet",
    damage: 16,
    range: 520,
    cooldownMs: 170,
    knockback: 9,
    projectileSpeed: 1320,
    projectileRadius: 5,
    spread: 0.14,
    pelletCount: 1
  },
  minigun: {
    id: "minigun",
    name: "Minigun",
    path: "ranged",
    tier: 4,
    unlockScore: CLASS_UNLOCK_SCORES[4],
    renderKind: "minigun",
    impactStyle: "bullet",
    damage: 10,
    range: 500,
    cooldownMs: 90,
    knockback: 7,
    projectileSpeed: 1380,
    projectileRadius: 4,
    spread: 0.18,
    pelletCount: 1
  },
  "emp-launcher": {
    id: "emp-launcher",
    name: "EMP Launcher",
    path: "ranged",
    tier: 4,
    unlockScore: CLASS_UNLOCK_SCORES[4],
    renderKind: "emp",
    impactStyle: "shock",
    damage: 26,
    range: 640,
    cooldownMs: 960,
    knockback: 10,
    projectileSpeed: 760,
    projectileRadius: 8,
    spread: 0.05,
    pelletCount: 1,
    splashRadius: 128
  },
  "rocket-launcher": {
    id: "rocket-launcher",
    name: "Rocket Launcher",
    path: "ranged",
    tier: 5,
    unlockScore: CLASS_UNLOCK_SCORES[5],
    renderKind: "rocket",
    impactStyle: "explosion",
    damage: 60,
    range: 540,
    cooldownMs: 960,
    knockback: 24,
    projectileSpeed: 700,
    projectileRadius: 10,
    spread: 0.04,
    pelletCount: 1,
    splashRadius: 120
  },
  "cluster-rocket": {
    id: "cluster-rocket",
    name: "Cluster Rocket",
    path: "ranged",
    tier: 5,
    unlockScore: CLASS_UNLOCK_SCORES[5],
    renderKind: "rocket",
    impactStyle: "explosion",
    damage: 38,
    range: 720,
    cooldownMs: 1160,
    knockback: 26,
    projectileSpeed: 760,
    projectileRadius: 10,
    spread: 0.08,
    pelletCount: 1,
    splashRadius: 92
  }
};

export const WEAPON_CLASS_IDS = Object.keys(WEAPON_CLASSES) as WeaponClassId[];

export const CLASS_IDS_BY_PATH: Record<WeaponPath, WeaponClassId[]> = {
  melee: WEAPON_CLASS_IDS.filter((classId): classId is WeaponClassId => WEAPON_CLASSES[classId]?.path === "melee"),
  ranged: WEAPON_CLASS_IDS.filter((classId): classId is WeaponClassId => WEAPON_CLASSES[classId]?.path === "ranged")
};

export function getWeaponClass(classId: WeaponClassId): WeaponClassDefinition {
  return WEAPON_CLASSES[classId];
}

export function getUnlockTier(score: number): number {
  let unlockedTier = 0;
  for (let index = 0; index < CLASS_UNLOCK_SCORES.length; index += 1) {
    const threshold = CLASS_UNLOCK_SCORES[index] ?? Number.MAX_SAFE_INTEGER;
    if (score >= threshold) {
      unlockedTier = index;
    }
  }

  return unlockedTier;
}

export function isClassUnlocked(classId: WeaponClassId, careerScore: number): boolean {
  return careerScore >= WEAPON_CLASSES[classId].unlockScore;
}

export function getDefaultClassForPath(path: WeaponPath): WeaponClassId {
  return path === "melee" ? DEFAULT_MELEE_CLASS_ID : DEFAULT_RANGED_CLASS_ID;
}
