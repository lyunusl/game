import type { WeaponClassId } from "./arsenal";
import type { LaneId, TeamId } from "./constants";
import type { UpgradeStat } from "./protocol";

export type VehicleTypeId =
  | "heavy-mg"
  | "rocket-truck"
  | "tank"
  | "plane"
  | "aa-buggy"
  | "flame-tank"
  | "artillery-carrier"
  | "gunship-plane"
  | "drone-carrier";
export type PickupKind = "weapon" | "skill" | "mine-crate" | "napalm-canister" | "ammo-overdrive";
export type ZoneKind = "base-heal" | "field-heal";
export type ObstacleKind = "sandbag" | "rock" | "house" | "wall";
export type ObstacleShape = "circle" | "rect";
export type AltitudeMode = "ground" | "air";

export type VehicleWeaponDefinition = {
  cooldownMs: number;
  damage: number;
  projectileSpeed: number;
  range: number;
  splashRadius: number;
  spread: number;
  pelletCount: number;
  homingStrength?: number;
  targetAirOnly?: boolean;
  ignoreObstacles?: boolean;
  salvoIntervalMs?: number;
  alternatingBarrels?: boolean;
  radius: number;
  color: number;
};

export type VehicleDefinition = {
  id: VehicleTypeId;
  name: string;
  mobile: boolean;
  airborne: boolean;
  radius: number;
  maxHealth: number;
  maxArmor: number;
  speed: number;
  acceleration: number;
  respawnMs: number;
  primary: VehicleWeaponDefinition;
  secondary?: VehicleWeaponDefinition;
};

export type PickupDefinition = {
  kind: PickupKind;
  label: string;
  weaponClassId?: WeaponClassId;
  upgradeStat?: UpgradeStat;
  upgradeAmount?: number;
  bonusHealth?: number;
  bonusArmor?: number;
};

export type SocketDefinition = {
  id: string;
  x: number;
  y: number;
  lane?: LaneId;
};

export type VehicleSpawnDefinition = {
  id: string;
  type: VehicleTypeId;
  team: TeamId;
  x: number;
  y: number;
};

export type ZoneSpawnDefinition = {
  id: string;
  kind: ZoneKind;
  x: number;
  y: number;
  radius: number;
  team?: TeamId;
  durationMs?: number;
  healPerSecond: number;
  armorPerSecond: number;
};

export type ObstacleDefinition = {
  id: string;
  kind: ObstacleKind;
  shape: ObstacleShape;
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
};

export const VEHICLE_DEFS: Record<VehicleTypeId, VehicleDefinition> = {
  "heavy-mg": {
    id: "heavy-mg",
    name: "Heavy MG",
    mobile: false,
    airborne: false,
    radius: 24,
    maxHealth: 260,
    maxArmor: 120,
    speed: 0,
    acceleration: 0,
    respawnMs: 22000,
    primary: {
      cooldownMs: 110,
      damage: 14,
      projectileSpeed: 1480,
      range: 760,
      splashRadius: 0,
      spread: 0.11,
      pelletCount: 1,
      radius: 4,
      color: 0xffd58a
    }
  },
  "rocket-truck": {
    id: "rocket-truck",
    name: "Rocket Truck",
    mobile: true,
    airborne: false,
    radius: 28,
    maxHealth: 320,
    maxArmor: 180,
    speed: 112,
    acceleration: 5.6,
    respawnMs: 26000,
    primary: {
      cooldownMs: 1850,
      damage: 34,
      projectileSpeed: 820,
      range: 1480,
      splashRadius: 185,
      spread: 0.44,
      pelletCount: 6,
      homingStrength: 0.05,
      ignoreObstacles: true,
      salvoIntervalMs: 110,
      alternatingBarrels: true,
      radius: 10,
      color: 0xffad64
    }
  },
  tank: {
    id: "tank",
    name: "Tank",
    mobile: true,
    airborne: false,
    radius: 30,
    maxHealth: 540,
    maxArmor: 260,
    speed: 92,
    acceleration: 4.2,
    respawnMs: 32000,
    primary: {
      cooldownMs: 1180,
      damage: 88,
      projectileSpeed: 910,
      range: 760,
      splashRadius: 110,
      spread: 0.035,
      pelletCount: 1,
      radius: 9,
      color: 0xffca74
    },
    secondary: {
      cooldownMs: 155,
      damage: 11,
      projectileSpeed: 1420,
      range: 620,
      splashRadius: 0,
      spread: 0.12,
      pelletCount: 1,
      radius: 4,
      color: 0xffe0a1
    }
  },
  plane: {
    id: "plane",
    name: "Plane",
    mobile: true,
    airborne: true,
    radius: 34,
    maxHealth: 280,
    maxArmor: 90,
    speed: 220,
    acceleration: 7.6,
    respawnMs: 28000,
    primary: {
      cooldownMs: 95,
      damage: 12,
      projectileSpeed: 1520,
      range: 680,
      splashRadius: 0,
      spread: 0.1,
      pelletCount: 1,
      radius: 4,
      color: 0xfff1b8
    },
    secondary: {
      cooldownMs: 980,
      damage: 52,
      projectileSpeed: 840,
      range: 760,
      splashRadius: 120,
      spread: 0.05,
      pelletCount: 1,
      radius: 9,
      color: 0xffb66b
    }
  },
  "aa-buggy": {
    id: "aa-buggy",
    name: "AA Buggy",
    mobile: true,
    airborne: false,
    radius: 24,
    maxHealth: 250,
    maxArmor: 90,
    speed: 172,
    acceleration: 8.4,
    respawnMs: 24000,
    primary: {
      cooldownMs: 90,
      damage: 10,
      projectileSpeed: 1500,
      range: 620,
      splashRadius: 0,
      spread: 0.12,
      pelletCount: 2,
      radius: 4,
      color: 0xffe1a0
    },
    secondary: {
      cooldownMs: 720,
      damage: 36,
      projectileSpeed: 980,
      range: 820,
      splashRadius: 70,
      spread: 0.08,
      pelletCount: 2,
      homingStrength: 0.12,
      targetAirOnly: true,
      salvoIntervalMs: 120,
      alternatingBarrels: true,
      radius: 7,
      color: 0x7dd9ff
    }
  },
  "flame-tank": {
    id: "flame-tank",
    name: "Flame Tank",
    mobile: true,
    airborne: false,
    radius: 32,
    maxHealth: 520,
    maxArmor: 290,
    speed: 88,
    acceleration: 4,
    respawnMs: 32000,
    primary: {
      cooldownMs: 110,
      damage: 16,
      projectileSpeed: 760,
      range: 240,
      splashRadius: 42,
      spread: 0.28,
      pelletCount: 1,
      radius: 8,
      color: 0xff9547
    },
    secondary: {
      cooldownMs: 880,
      damage: 42,
      projectileSpeed: 680,
      range: 560,
      splashRadius: 120,
      spread: 0.06,
      pelletCount: 1,
      ignoreObstacles: true,
      radius: 9,
      color: 0xff7b3e
    }
  },
  "artillery-carrier": {
    id: "artillery-carrier",
    name: "Artillery Carrier",
    mobile: true,
    airborne: false,
    radius: 30,
    maxHealth: 320,
    maxArmor: 120,
    speed: 72,
    acceleration: 3.2,
    respawnMs: 30000,
    primary: {
      cooldownMs: 1650,
      damage: 82,
      projectileSpeed: 540,
      range: 1500,
      splashRadius: 180,
      spread: 0.02,
      pelletCount: 1,
      ignoreObstacles: true,
      radius: 10,
      color: 0xffc777
    },
    secondary: {
      cooldownMs: 1500,
      damage: 18,
      projectileSpeed: 540,
      range: 1320,
      splashRadius: 170,
      spread: 0.02,
      pelletCount: 1,
      ignoreObstacles: true,
      radius: 10,
      color: 0x89a8ff
    }
  },
  "gunship-plane": {
    id: "gunship-plane",
    name: "Gunship",
    mobile: true,
    airborne: true,
    radius: 38,
    maxHealth: 420,
    maxArmor: 150,
    speed: 176,
    acceleration: 6.4,
    respawnMs: 30000,
    primary: {
      cooldownMs: 80,
      damage: 14,
      projectileSpeed: 1580,
      range: 760,
      splashRadius: 0,
      spread: 0.14,
      pelletCount: 2,
      radius: 4,
      color: 0xfff0c5
    },
    secondary: {
      cooldownMs: 1240,
      damage: 46,
      projectileSpeed: 860,
      range: 820,
      splashRadius: 120,
      spread: 0.09,
      pelletCount: 4,
      ignoreObstacles: true,
      salvoIntervalMs: 80,
      alternatingBarrels: true,
      radius: 8,
      color: 0xff9f5d
    }
  },
  "drone-carrier": {
    id: "drone-carrier",
    name: "Drone Carrier",
    mobile: true,
    airborne: false,
    radius: 28,
    maxHealth: 300,
    maxArmor: 140,
    speed: 104,
    acceleration: 4.6,
    respawnMs: 28000,
    primary: {
      cooldownMs: 125,
      damage: 9,
      projectileSpeed: 1360,
      range: 520,
      splashRadius: 0,
      spread: 0.15,
      pelletCount: 1,
      radius: 4,
      color: 0xcde0ff
    },
    secondary: {
      cooldownMs: 2200,
      damage: 0,
      projectileSpeed: 0,
      range: 0,
      splashRadius: 0,
      spread: 0,
      pelletCount: 1,
      radius: 0,
      color: 0x90d8ff
    }
  }
};

export const BASE_ZONE_SPAWNS: ZoneSpawnDefinition[] = [
  { id: "germany-base-heal", kind: "base-heal", x: 210, y: 900, radius: 110, team: "germany", healPerSecond: 28, armorPerSecond: 18 },
  { id: "france-base-heal", kind: "base-heal", x: 2990, y: 900, radius: 110, team: "france", healPerSecond: 28, armorPerSecond: 18 }
];

export const FIELD_ZONE_SOCKETS: SocketDefinition[] = [
  { id: "field-heal-north-west", x: 840, y: 360, lane: "north" },
  { id: "field-heal-north-east", x: 2360, y: 490, lane: "north" },
  { id: "field-heal-mid-west", x: 980, y: 900, lane: "middle" },
  { id: "field-heal-mid-east", x: 2210, y: 900, lane: "middle" },
  { id: "field-heal-south-west", x: 980, y: 1420, lane: "south" },
  { id: "field-heal-south-east", x: 2320, y: 1360, lane: "south" }
];

export const PICKUP_SOCKETS: SocketDefinition[] = [
  { id: "pickup-north-a", x: 1020, y: 360, lane: "north" },
  { id: "pickup-north-b", x: 1610, y: 520, lane: "north" },
  { id: "pickup-north-c", x: 2160, y: 350, lane: "north" },
  { id: "pickup-middle-a", x: 880, y: 870, lane: "middle" },
  { id: "pickup-middle-b", x: 1600, y: 960, lane: "middle" },
  { id: "pickup-middle-c", x: 2300, y: 890, lane: "middle" },
  { id: "pickup-south-a", x: 900, y: 1420, lane: "south" },
  { id: "pickup-south-b", x: 1610, y: 1310, lane: "south" },
  { id: "pickup-south-c", x: 2240, y: 1450, lane: "south" }
];

export const VEHICLE_SPAWNS: VehicleSpawnDefinition[] = [
  { id: "germany-hmg-1", type: "heavy-mg", team: "germany", x: 1120, y: 760 },
  { id: "germany-hmg-2", type: "heavy-mg", team: "germany", x: 1120, y: 1040 },
  { id: "france-hmg-1", type: "heavy-mg", team: "france", x: 2080, y: 760 },
  { id: "france-hmg-2", type: "heavy-mg", team: "france", x: 2080, y: 1040 },
  { id: "germany-rocket-truck", type: "rocket-truck", team: "germany", x: 300, y: 1260 },
  { id: "france-rocket-truck", type: "rocket-truck", team: "france", x: 2900, y: 540 },
  { id: "germany-tank", type: "tank", team: "germany", x: 360, y: 620 },
  { id: "france-tank", type: "tank", team: "france", x: 2840, y: 1180 },
  { id: "germany-plane", type: "plane", team: "germany", x: 460, y: 260 },
  { id: "france-plane", type: "plane", team: "france", x: 2740, y: 1540 },
  { id: "germany-aa-buggy", type: "aa-buggy", team: "germany", x: 520, y: 1030 },
  { id: "france-aa-buggy", type: "aa-buggy", team: "france", x: 2680, y: 770 },
  { id: "germany-flame-tank", type: "flame-tank", team: "germany", x: 430, y: 730 },
  { id: "france-flame-tank", type: "flame-tank", team: "france", x: 2770, y: 1080 },
  { id: "germany-artillery", type: "artillery-carrier", team: "germany", x: 190, y: 520 },
  { id: "france-artillery", type: "artillery-carrier", team: "france", x: 3010, y: 1280 },
  { id: "germany-gunship", type: "gunship-plane", team: "germany", x: 590, y: 230 },
  { id: "france-gunship", type: "gunship-plane", team: "france", x: 2610, y: 1570 },
  { id: "germany-drone-carrier", type: "drone-carrier", team: "germany", x: 250, y: 1120 },
  { id: "france-drone-carrier", type: "drone-carrier", team: "france", x: 2950, y: 680 }
];

export const OBSTACLE_LAYOUT: ObstacleDefinition[] = [
  { id: "north-sandbag-west", kind: "sandbag", shape: "rect", x: 1180, y: 320, width: 120, height: 28 },
  { id: "north-house-mid", kind: "house", shape: "rect", x: 1600, y: 315, width: 120, height: 92 },
  { id: "north-rock-east", kind: "rock", shape: "circle", x: 2160, y: 355, radius: 58 },
  { id: "north-wall-east", kind: "wall", shape: "rect", x: 2360, y: 460, width: 160, height: 24 },
  { id: "middle-sandbag-left", kind: "sandbag", shape: "rect", x: 980, y: 822, width: 170, height: 28 },
  { id: "middle-house-left", kind: "house", shape: "rect", x: 1250, y: 880, width: 136, height: 100 },
  { id: "middle-house-right", kind: "house", shape: "rect", x: 1950, y: 920, width: 136, height: 100 },
  { id: "middle-rock-center", kind: "rock", shape: "circle", x: 1600, y: 900, radius: 70 },
  { id: "middle-wall-right", kind: "wall", shape: "rect", x: 2240, y: 980, width: 150, height: 24 },
  { id: "south-sandbag-west", kind: "sandbag", shape: "rect", x: 1020, y: 1460, width: 160, height: 28 },
  { id: "south-rock-mid", kind: "rock", shape: "circle", x: 1600, y: 1390, radius: 56 },
  { id: "south-house-east", kind: "house", shape: "rect", x: 2140, y: 1410, width: 132, height: 104 },
  { id: "south-wall-east", kind: "wall", shape: "rect", x: 2380, y: 1280, width: 160, height: 24 }
];

export const DEFAULT_FIELD_ZONE_DURATION_MS = 18000;
export const DEFAULT_FIELD_ZONE_RESPAWN_MS = 15000;
export const PICKUP_DURATION_MS = 22000;
export const PICKUP_RESPAWN_MS = 12500;
export const DEATH_DROP_CHANCE = 0.34;
export const PASSIVE_REGEN_DELAY_MS = 2600;
export const PASSIVE_REGEN_PER_SECOND = 5.5;
export const INTERACT_RANGE = 64;
export const PICKUP_RANGE = 58;
