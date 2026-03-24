export const GAME_TICK_RATE = 20;
export const GAME_TICK_MS = 1000 / GAME_TICK_RATE;

export const MAP_WIDTH = 3200;
export const MAP_HEIGHT = 1800;
export const PLAYER_RADIUS = 21;
export const PLAYER_BASE_SPEED = 220;
export const PLAYER_BASE_HEALTH = 135;
export const PLAYER_BASE_ARMOR = 14;
export const MELEE_BONUS_HEALTH = 48;
export const MELEE_BONUS_ARMOR = 44;
export const PLAYER_BASE_MELEE_DAMAGE = 24;
export const PLAYER_BASE_MELEE_RANGE = 64;
export const PLAYER_BASE_RANGED_DAMAGE = 14;
export const PLAYER_BASE_RANGED_RANGE = 380;
export const PLAYER_BASE_RANGED_CONE = 0.8;
export const PLAYER_BASE_MELEE_COOLDOWN_MS = 520;
export const PLAYER_BASE_RANGED_COOLDOWN_MS = 260;
export const PLAYER_PROJECTILE_SPEED = 980;
export const PLAYER_PROJECTILE_RADIUS = 6;
export const DASH_DISTANCE = 145;
export const DASH_COOLDOWN_MS = 2800;
export const DASH_BURST_MS = 310;
export const DASH_SPEED_BONUS = 720;
export const MOVEMENT_ACCELERATION = 10.5;
export const AIM_ACCELERATION = 14;
export const RESPAWN_MS = 2500;
export const RESPAWN_PROTECTION_MS = 1750;
export const SCORE_RETAIN_ON_DEATH = 0.55;
export const MAX_HUMAN_PLAYERS = 40;
export const DEFAULT_BOTS_PER_TEAM = 4;
export const MAX_BOTS_PER_TEAM = 12;
export const MAX_UPGRADE_LEVEL = 4;

export const KILL_SCORE = 100;
export const ASSIST_SCORE = 45;
export const DAMAGE_SCORE_FACTOR = 0.18;
export const OBJECTIVE_TICK_SCORE = 2.5;
export const OBJECTIVE_HOLD_TEAM_SCORE = 1.5;

export const OBJECTIVE_RADIUS = 150;
export const OBJECTIVE_CAPTURE_RATE = 12;
export const FRONTLINE_SHIFT_SCALE = 2.2;

export const TEAM_IDS = ["germany", "france"] as const;
export type TeamId = (typeof TEAM_IDS)[number];

export const TEAM_CONFIG: Record<TeamId, { name: string; color: number; accent: string }> = {
  germany: { name: "Germany", color: 0x3d3d3d, accent: "#d5b64d" },
  france: { name: "France", color: 0x244fa3, accent: "#f4f6ff" }
};

export const LANE_IDS = ["north", "middle", "south"] as const;
export type LaneId = (typeof LANE_IDS)[number];

export const OBJECTIVE_LAYOUT: Array<{ id: string; lane: LaneId; x: number; y: number }> = [
  { id: "north-redoubt", lane: "north", x: 1600, y: 430 },
  { id: "middle-crossroads", lane: "middle", x: 1600, y: 900 },
  { id: "south-bridge", lane: "south", x: 1600, y: 1370 }
];

export const LANE_Y: Record<LaneId, number> = {
  north: 430,
  middle: 900,
  south: 1370
};

export const BOT_NAMES = [
  "Alpha", "Bravo", "Crimson", "Dawn", "Echo", "Falcon", "Ghost", "Hammer", "Iron", "Javelin",
  "Kraken", "Lancer", "Mako", "Nova", "Onyx", "Pike", "Quartz", "Raven", "Saber", "Talon"
] as const;
