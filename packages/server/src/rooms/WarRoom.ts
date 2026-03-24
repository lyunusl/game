import { Client, Room } from "@colyseus/core";

import {
  CLASS_UNLOCK_SCORES,
  ASSIST_SCORE,
  BASE_ZONE_SPAWNS,
  BOT_NAMES,
  CLASS_IDS_BY_PATH,
  DAMAGE_SCORE_FACTOR,
  DASH_BURST_MS,
  DASH_COOLDOWN_MS,
  DASH_DISTANCE,
  DEATH_DROP_CHANCE,
  DEFAULT_ACTIVE_CLASS_ID,
  DEFAULT_BOTS_PER_TEAM,
  DEFAULT_FIELD_ZONE_DURATION_MS,
  DEFAULT_FIELD_ZONE_RESPAWN_MS,
  DEFAULT_MELEE_CLASS_ID,
  DEFAULT_RANGED_CLASS_ID,
  FIELD_ZONE_SOCKETS,
  GAME_TICK_MS,
  INTERACT_RANGE,
  KILL_SCORE,
  LANE_IDS,
  MAP_HEIGHT,
  MAP_WIDTH,
  MAX_BOTS_PER_TEAM,
  MAX_HUMAN_PLAYERS,
  OBJECTIVE_CAPTURE_RATE,
  OBJECTIVE_HOLD_TEAM_SCORE,
  OBJECTIVE_LAYOUT,
  OBJECTIVE_RADIUS,
  OBJECTIVE_TICK_SCORE,
  OBSTACLE_LAYOUT,
  PASSIVE_REGEN_DELAY_MS,
  PASSIVE_REGEN_PER_SECOND,
  PICKUP_DURATION_MS,
  PICKUP_RANGE,
  PICKUP_RESPAWN_MS,
  PICKUP_SOCKETS,
  PLAYER_RADIUS,
  RESPAWN_MS,
  TEAM_IDS,
  VEHICLE_DEFS,
  VEHICLE_SPAWNS,
  clamp,
  getAimAcceleration,
  getClassMeleeCooldown,
  getClassMeleeDamage,
  getClassMeleeRange,
  getClassProjectileRadius,
  getClassProjectileSpeed,
  getClassRangedCone,
  getClassRangedCooldown,
  getClassRangedRange,
  getFrontlineShift,
  getMovementAcceleration,
  getMovementSpeed,
  getObjectiveOwner,
  getPlayerMaxArmor,
  getPlayerMaxHealth,
  getRespawnProtection,
  getSpawnPoint,
  getUnderdogMultiplier,
  getUnlockTier,
  getUpgradeCost,
  getWeaponClass,
  isClassUnlocked,
  isUpgradeMaxed,
  normalizeVector,
  type InputMessage,
  type JoinPayload,
  type LaneId,
  type SelectClassChoice,
  type TeamId,
  type UpgradeChoice,
  type UpgradeStat,
  type VehicleDefinition,
  type VehicleTypeId,
  type WeaponClassId,
  type RoomVisibility
} from "../../../shared/src";
import {
  MatchState,
  DroneState,
  HazardState,
  ObjectiveState,
  ObstacleState,
  PickupState,
  PlayerState,
  ProjectileState,
  VehicleState,
  ZoneState
} from "./schema";

type BotBrain = {
  lane: LaneId;
  retargetAt: number;
  lastX: number;
  lastY: number;
  stuckSince: number;
};

type DamageEntry = {
  amount: number;
  at: number;
};

type DamageLedger = Map<string, Map<string, DamageEntry>>;

type VehicleWeaponSlot = "primary" | "secondary";
type PendingVehicleSalvo = {
  vehicleId: string;
  occupantId: string;
  slot: VehicleWeaponSlot;
  remaining: number;
  nextAt: number;
  side: -1 | 1;
};

type UpgradeLevelKey =
  | "healthLevel"
  | "armorLevel"
  | "meleeDamageLevel"
  | "meleeSpeedLevel"
  | "meleeRangeLevel"
  | "rangedRateLevel"
  | "rangedRangeLevel"
  | "rangedAccuracyLevel"
  | "movementLevel";

const BOT_RETARGET_MS = 1250;
const BOT_STUCK_TIMEOUT_MS = 1700;
const BOT_STUCK_DISTANCE = 18;
const VEHICLE_EJECT_DISTANCE = 58;
const FIELD_ZONE_LIMIT = 2;
const PICKUP_LIMIT = 7;
const VEHICLE_REGEN_PER_SECOND = 4.5;
const INTERACT_COOLDOWN_MS = 280;
const BURN_DAMAGE_PER_SECOND = 7;
const EMP_DURATION_MS = 2400;
const OVERDRIVE_DURATION_MS = 8000;
const NAPALM_DURATION_MS = 5200;
const UTILITY_PULSE_MS = 150;
const DRONE_DAMAGE = 9;
const DRONE_SPEED = 240;
const DRONE_ATTACK_RANGE = 260;
const DRONE_ATTACK_COOLDOWN_MS = 240;

export class WarRoom extends Room<MatchState> {
  override maxClients = MAX_HUMAN_PLAYERS;

  private readonly inputs = new Map<string, InputMessage>();
  private readonly botBrains = new Map<string, BotBrain>();
  private readonly damageLedger: DamageLedger = new Map();
  private readonly pendingVehicleSalvos = new Map<string, PendingVehicleSalvo>();

  private projectileSequence = 0;
  private pickupSequence = 0;
  private zoneSequence = 0;
  private hazardSequence = 0;
  private droneSequence = 0;
  private targetBotsPerTeam = DEFAULT_BOTS_PER_TEAM;
  private nextFieldZoneAt = 0;
  private nextPickupAt = 0;

  override onCreate(options: JoinPayload): void {
    const visibility = (options.visibility ?? "private") as RoomVisibility;
    this.setState(new MatchState());
    this.autoDispose = visibility !== "public";
    this.targetBotsPerTeam = clamp(Math.round(options.botCountPerTeam ?? DEFAULT_BOTS_PER_TEAM), 0, MAX_BOTS_PER_TEAM);
    void this.setMetadata({ visibility });
    void this.setPrivate(visibility === "private");
    this.createObjectives();
    this.createObstacles();
    this.createBaseZones();
    this.createVehicles();

    this.onMessage("input", (client, message: InputMessage) => {
      this.inputs.set(client.sessionId, sanitizeInput(message));
    });

    this.onMessage("upgrade", (client, choice: UpgradeChoice) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.alive) {
        return;
      }

      this.handleUpgrade(player, choice);
    });

    this.onMessage("selectClass", (client, choice: SelectClassChoice) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.alive) {
        return;
      }

      this.handleClassSelection(player, choice.classId);
    });

    this.onMessage("queueClass", (client, choice: SelectClassChoice) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.alive) {
        return;
      }

      this.handleClassSelection(player, choice.classId);
    });

    this.setSimulationInterval((deltaMs) => this.updateMatch(deltaMs));
    this.setPatchRate(GAME_TICK_MS);
    this.nextFieldZoneAt = Date.now() + DEFAULT_FIELD_ZONE_RESPAWN_MS;
    this.nextPickupAt = Date.now() + PICKUP_RESPAWN_MS;
  }

  override onJoin(client: Client, options: JoinPayload): void {
    const team = this.pickTeam(options.preferredTeam);
    const preferredLane = this.pickJoinLane(team);
    const player = new PlayerState();
    player.id = client.sessionId;
    player.name = sanitizePlayerName(options.playerName, this.state.players.size + 1);
    player.team = team;
    player.preferredLane = preferredLane;
    player.isBot = false;
    this.resetPlayerBuild(player);
    this.spawnPlayer(player, Date.now());
    this.state.players.set(player.id, player);
    this.inputs.set(player.id, sanitizeInput(undefined));
    this.syncBots();
  }

  override onLeave(client: Client): void {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      this.unmountPlayer(player, true);
      this.state.players.delete(client.sessionId);
      this.inputs.delete(client.sessionId);
      this.botBrains.delete(client.sessionId);
      this.damageLedger.delete(client.sessionId);
      for (const ledger of this.damageLedger.values()) {
        ledger.delete(client.sessionId);
      }
    }

    this.syncBots();
  }

  private updateMatch(deltaMs: number): void {
    const now = Date.now();
    const deltaSeconds = deltaMs / 1000;

    this.syncBots();
    this.updateTemporaryZones(now);
    this.updatePickups(now);
    this.updateRespawns(now);
    this.updateBotInputs(now);
    this.updateVehicles(now, deltaSeconds);
    this.updateVehicleSalvos(now);
    this.updatePlayers(now, deltaSeconds);
    this.updateProjectiles(now, deltaSeconds);
    this.updateHazards(now, deltaSeconds);
    this.updateDrones(now, deltaSeconds);
    this.applyHealingAndRegen(now, deltaSeconds);
    this.updateObjectives(deltaSeconds);
    this.state.frontlineShift = getFrontlineShift(Array.from(this.state.objectives.values()).map((objective) => objective.progress));
  }

  private createObjectives(): void {
    for (const layout of OBJECTIVE_LAYOUT) {
      const objective = new ObjectiveState();
      objective.id = layout.id;
      objective.lane = layout.lane;
      objective.x = layout.x;
      objective.y = layout.y;
      objective.radius = OBJECTIVE_RADIUS;
      objective.progress = 0;
      objective.owner = "neutral";
      this.state.objectives.set(objective.id, objective);
    }
  }

  private createObstacles(): void {
    for (const layout of OBSTACLE_LAYOUT) {
      const obstacle = new ObstacleState();
      obstacle.id = layout.id;
      obstacle.kind = layout.kind;
      obstacle.shape = layout.shape;
      obstacle.x = layout.x;
      obstacle.y = layout.y;
      obstacle.width = layout.width ?? 0;
      obstacle.height = layout.height ?? 0;
      obstacle.radius = layout.radius ?? 0;
      this.state.obstacles.set(obstacle.id, obstacle);
    }
  }

  private createBaseZones(): void {
    for (const layout of BASE_ZONE_SPAWNS) {
      const zone = new ZoneState();
      zone.id = layout.id;
      zone.kind = layout.kind;
      zone.team = layout.team ?? "";
      zone.active = true;
      zone.x = layout.x;
      zone.y = layout.y;
      zone.radius = layout.radius;
      zone.healPerSecond = layout.healPerSecond;
      zone.armorPerSecond = layout.armorPerSecond;
      zone.expiresAt = 0;
      this.state.zones.set(zone.id, zone);
    }
  }

  private createVehicles(): void {
    for (const spawn of VEHICLE_SPAWNS) {
      this.state.vehicles.set(spawn.id, this.createVehicleState(spawn.id, spawn.type, spawn.team, spawn.x, spawn.y));
    }
  }

  private createVehicleState(id: string, type: VehicleTypeId, team: TeamId, x: number, y: number): VehicleState {
    const definition = VEHICLE_DEFS[type];
    const vehicle = new VehicleState();
    vehicle.id = id;
    vehicle.type = type;
    vehicle.team = team;
    vehicle.occupantId = "";
    vehicle.alive = true;
    vehicle.x = x;
    vehicle.y = y;
    vehicle.spawnX = x;
    vehicle.spawnY = y;
    vehicle.aimX = team === "germany" ? 1 : -1;
    vehicle.aimY = 0;
    vehicle.velocityX = 0;
    vehicle.velocityY = 0;
    vehicle.health = definition.maxHealth;
    vehicle.maxHealth = definition.maxHealth;
    vehicle.armor = definition.maxArmor;
    vehicle.maxArmor = definition.maxArmor;
    vehicle.radius = definition.radius;
    vehicle.mobile = definition.mobile;
    vehicle.airborne = definition.airborne;
    vehicle.respawnAt = 0;
    vehicle.lastPrimaryAt = 0;
    vehicle.lastSecondaryAt = 0;
    vehicle.regenBlockedUntil = 0;
    vehicle.burnUntil = 0;
    vehicle.empUntil = 0;
    vehicle.overdriveUntil = 0;
    vehicle.spinUp = 0;
    return vehicle;
  }

  private pickTeam(preferredTeam?: TeamId | "auto"): TeamId {
    if (preferredTeam && preferredTeam !== "auto") {
      return preferredTeam;
    }

    const germanyHumans = this.getHumanCount("germany");
    const franceHumans = this.getHumanCount("france");
    return germanyHumans <= franceHumans ? "germany" : "france";
  }

  private pickJoinLane(team: TeamId): LaneId {
    const objectives = Array.from(this.state.objectives.values())
      .sort((left, right) => {
        const leftBias = left.owner === team ? 1 : 0;
        const rightBias = right.owner === team ? 1 : 0;
        return leftBias - rightBias;
      });

    return (objectives[0]?.lane as LaneId | undefined) ?? "middle";
  }

  private syncBots(): void {
    for (const team of TEAM_IDS) {
      const currentBots = Array.from(this.state.players.values()).filter((player) => player.isBot && player.team === team);
      while (currentBots.length < this.targetBotsPerTeam) {
        const bot = this.createBot(team);
        currentBots.push(bot);
      }

      while (currentBots.length > this.targetBotsPerTeam) {
        const bot = currentBots.pop();
        if (!bot) {
          break;
        }

        this.unmountPlayer(bot, true);
        this.state.players.delete(bot.id);
        this.inputs.delete(bot.id);
        this.botBrains.delete(bot.id);
        this.damageLedger.delete(bot.id);
      }
    }
  }

  private createBot(team: TeamId): PlayerState {
    const bot = new PlayerState();
    bot.id = `bot-${team}-${Math.random().toString(36).slice(2, 9)}`;
    bot.name = `${BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)] ?? "Rook"} ${Math.floor(Math.random() * 90) + 10}`;
    bot.team = team;
    bot.preferredLane = LANE_IDS[Math.floor(Math.random() * LANE_IDS.length)] ?? "middle";
    bot.isBot = true;
    this.resetPlayerBuild(bot);
    this.spawnPlayer(bot, Date.now());
    this.state.players.set(bot.id, bot);
    this.inputs.set(bot.id, sanitizeInput(undefined));
    this.botBrains.set(bot.id, {
      lane: bot.preferredLane as LaneId,
      retargetAt: 0,
      lastX: bot.x,
      lastY: bot.y,
      stuckSince: 0
    });
    return bot;
  }

  private resetPlayerBuild(player: PlayerState): void {
    player.activePath = "ranged";
    player.activeClassId = DEFAULT_ACTIVE_CLASS_ID;
    player.currentVehicleId = "";
    player.combatScore = 0;
    player.unlockedMeleeTier = 0;
    player.unlockedRangedTier = 0;
    player.healthLevel = 0;
    player.armorLevel = 0;
    player.meleeDamageLevel = 0;
    player.meleeSpeedLevel = 0;
    player.meleeRangeLevel = 0;
    player.rangedRateLevel = 0;
    player.rangedRangeLevel = 0;
    player.rangedAccuracyLevel = 0;
    player.movementLevel = 0;
    player.burnUntil = 0;
    player.empUntil = 0;
    player.overdriveUntil = 0;
    player.spinUp = 0;
    player.utilityKind = "";
    player.utilityCharges = 0;
    player.utilityExpiresAt = 0;
    this.recalculatePlayerDurability(player, true);
  }

  private spawnPlayer(player: PlayerState, now: number): void {
    const spawn = getSpawnPoint(player.team as TeamId, player.preferredLane as LaneId, this.state.frontlineShift * (player.team === "germany" ? 1 : -1));
    player.alive = true;
    player.x = spawn.x;
    player.y = spawn.y;
    player.velocityX = 0;
    player.velocityY = 0;
    player.aimX = player.team === "germany" ? 1 : -1;
    player.aimY = 0;
    player.health = player.maxHealth;
    player.armor = player.maxArmor;
    player.regenBlockedUntil = now + PASSIVE_REGEN_DELAY_MS;
    player.shieldUntil = now + this.getTeamRespawnShield(player.team as TeamId);
    player.respawnAt = 0;
    player.dashUntil = 0;
    player.dashCooldownUntil = now + 500;
    player.lastDamageAt = 0;
    player.lastMeleeAt = 0;
    player.lastRangedAt = 0;
    player.lastInteractAt = 0;
    player.burnUntil = 0;
    player.empUntil = 0;
    player.overdriveUntil = 0;
    player.spinUp = 0;
  }

  private getTeamRespawnShield(team: TeamId): number {
    const humans = this.getHumanCount(team);
    const opponents = this.getHumanCount(otherTeam(team));
    return getRespawnProtection(humans, opponents);
  }

  private recalculatePlayerDurability(player: PlayerState, refill = false): void {
    const nextMaxHealth = getPlayerMaxHealth(player.activePath as "melee" | "ranged", player.meleeDamageLevel, player.healthLevel);
    const nextMaxArmor = getPlayerMaxArmor(player.activePath as "melee" | "ranged", player.armorLevel);
    const healthRatio = player.maxHealth > 0 ? player.health / player.maxHealth : 1;
    const armorRatio = player.maxArmor > 0 ? player.armor / player.maxArmor : 1;
    player.maxHealth = nextMaxHealth;
    player.maxArmor = nextMaxArmor;
    player.health = refill ? nextMaxHealth : clamp(Math.round(nextMaxHealth * healthRatio), 1, nextMaxHealth);
    player.armor = refill ? nextMaxArmor : clamp(Math.round(nextMaxArmor * armorRatio), 0, nextMaxArmor);
  }

  private updateTemporaryZones(now: number): void {
    for (const [zoneId, zone] of this.state.zones) {
      if (zone.kind !== "field-heal" || !zone.active || zone.expiresAt <= 0 || zone.expiresAt > now) {
        continue;
      }

      this.state.zones.delete(zoneId);
      this.broadcast("combat", { type: "healZoneExpire", zoneId, at: now });
    }

    const activeFieldZones = Array.from(this.state.zones.values()).filter((zone) => zone.kind === "field-heal" && zone.active);
    if (activeFieldZones.length >= FIELD_ZONE_LIMIT || now < this.nextFieldZoneAt) {
      return;
    }

    const availableSocket = pickRandom(
      FIELD_ZONE_SOCKETS.filter((socket) => !activeFieldZones.some((zone) => Math.hypot(zone.x - socket.x, zone.y - socket.y) < 24))
    );
    if (!availableSocket) {
      this.nextFieldZoneAt = now + DEFAULT_FIELD_ZONE_RESPAWN_MS;
      return;
    }

    const zone = new ZoneState();
    zone.id = `field-zone-${++this.zoneSequence}`;
    zone.kind = "field-heal";
    zone.team = "";
    zone.active = true;
    zone.x = availableSocket.x;
    zone.y = availableSocket.y;
    zone.radius = 88;
    zone.healPerSecond = 22;
    zone.armorPerSecond = 10;
    zone.expiresAt = now + DEFAULT_FIELD_ZONE_DURATION_MS;
    this.state.zones.set(zone.id, zone);
    this.nextFieldZoneAt = now + DEFAULT_FIELD_ZONE_RESPAWN_MS;
    this.broadcast("combat", { type: "healZoneSpawn", zoneId: zone.id, x: zone.x, y: zone.y, radius: zone.radius, at: now });
  }

  private updatePickups(now: number): void {
    for (const [pickupId, pickup] of this.state.pickups) {
      if (pickup.expiresAt > 0 && pickup.expiresAt <= now) {
        this.state.pickups.delete(pickupId);
      }
    }

    if (this.state.pickups.size >= PICKUP_LIMIT || now < this.nextPickupAt) {
      return;
    }

    const socket = pickRandom(PICKUP_SOCKETS);
    if (!socket) {
      this.nextPickupAt = now + PICKUP_RESPAWN_MS;
      return;
    }

    this.spawnPickup(socket.x, socket.y, now, false);
    this.nextPickupAt = now + PICKUP_RESPAWN_MS;
  }

  private spawnPickup(x: number, y: number, now: number, forceSkill: boolean): PickupState {
    const pickup = new PickupState();
    pickup.id = `pickup-${++this.pickupSequence}`;
    pickup.x = x;
    pickup.y = y;
    pickup.radius = 18;
    pickup.expiresAt = now + PICKUP_DURATION_MS;

    const roll = Math.random();
    const createSkill = forceSkill || roll > 0.58;
    if (!forceSkill && roll < 0.14) {
      pickup.kind = "mine-crate";
      pickup.label = "Mine Crate";
      pickup.utilityKind = "mine";
    } else if (!forceSkill && roll < 0.24) {
      pickup.kind = "napalm-canister";
      pickup.label = "Napalm Canister";
      pickup.utilityKind = "napalm";
    } else if (!forceSkill && roll < 0.34) {
      pickup.kind = "ammo-overdrive";
      pickup.label = "Ammo Overdrive";
      pickup.utilityKind = "overdrive";
    } else if (createSkill) {
      const skill = pickRandom<UpgradeStat>(["health", "armor", "damage", "speed", "range", "rate", "accuracy", "mobility"] as UpgradeStat[]) ?? "health";
      pickup.kind = "skill";
      pickup.label = friendlyUpgradeName(skill);
      pickup.upgradeStat = skill;
      pickup.upgradeAmount = 1;
      pickup.bonusHealth = skill === "health" ? 14 : 0;
      pickup.bonusArmor = skill === "armor" ? 12 : 0;
    } else {
      const classId = pickRandom<WeaponClassId>([
        "sword",
        "katana",
        "chain-blade",
        "mace",
        "shotgun",
        "flamethrower",
        "smg",
        "grenade-launcher",
        "machine-gun",
        "minigun",
        "emp-launcher",
        "cluster-rocket",
        "rocket-launcher"
      ]) ?? "shotgun";
      pickup.kind = "weapon";
      pickup.label = getWeaponClass(classId).name;
      pickup.weaponClassId = classId;
    }

    this.state.pickups.set(pickup.id, pickup);
    return pickup;
  }

  private updateRespawns(now: number): void {
    for (const player of this.state.players.values()) {
      if (!player.alive && player.respawnAt > 0 && player.respawnAt <= now) {
        this.spawnPlayer(player, now);
      }
    }

    for (const vehicle of this.state.vehicles.values()) {
      if (!vehicle.alive && vehicle.respawnAt > 0 && vehicle.respawnAt <= now) {
        const restored = this.createVehicleState(vehicle.id, vehicle.type as VehicleTypeId, vehicle.team as TeamId, vehicle.spawnX, vehicle.spawnY);
        this.state.vehicles.set(vehicle.id, restored);
        this.broadcast("combat", {
          type: "vehicleRespawn",
          vehicleId: restored.id,
          vehicleType: restored.type as VehicleTypeId,
          team: restored.team as TeamId,
          at: now
        });
      }
    }
  }

  private updatePlayers(now: number, deltaSeconds: number): void {
    for (const player of this.state.players.values()) {
      if (!player.alive) {
        continue;
      }

      if (player.currentVehicleId) {
        const vehicle = this.state.vehicles.get(player.currentVehicleId);
        if (!vehicle || !vehicle.alive) {
          player.currentVehicleId = "";
        } else {
          player.x = vehicle.x;
          player.y = vehicle.y;
          player.velocityX = vehicle.velocityX;
          player.velocityY = vehicle.velocityY;
          player.aimX = vehicle.aimX;
          player.aimY = vehicle.aimY;
          continue;
        }
      }

      const input = this.inputs.get(player.id) ?? sanitizeInput(undefined);
      const move = normalizeVector(input.moveX, input.moveY);
      const minigunDrag = player.activeClassId === "minigun" && input.primary ? 0.58 : 1;
      const empSlow = player.empUntil > now ? 0.6 : 1;
      const targetSpeed = (getMovementSpeed(player.movementLevel) + (player.activePath === "melee" ? 34 : 0)) * minigunDrag * empSlow;
      const dashActive = player.dashUntil > now;
      const dashBoost = dashActive ? (DASH_DISTANCE + 110) * empSlow : 0;
      const acceleration = getMovementAcceleration(player.movementLevel) * 48 * deltaSeconds;
      const desiredVelocityX = move.x * (targetSpeed + dashBoost);
      const desiredVelocityY = move.y * (targetSpeed + dashBoost);
      player.velocityX += (desiredVelocityX - player.velocityX) * clamp(acceleration, 0, 1);
      player.velocityY += (desiredVelocityY - player.velocityY) * clamp(acceleration, 0, 1);

      const aim = normalizeVector(
        player.aimX + (input.aimX - player.aimX) * clamp(getAimAcceleration() * deltaSeconds, 0, 1),
        player.aimY + (input.aimY - player.aimY) * clamp(getAimAcceleration() * deltaSeconds, 0, 1)
      );
      player.aimX = aim.x;
      player.aimY = aim.y;

      if (input.dash && player.empUntil <= now && player.dashCooldownUntil <= now) {
        player.dashUntil = now + DASH_BURST_MS;
        player.dashCooldownUntil = now + DASH_COOLDOWN_MS;
      }

      player.x += player.velocityX * deltaSeconds;
      player.y += player.velocityY * deltaSeconds;
      clampEntityToMap(player, PLAYER_RADIUS);
      this.resolveGroundCollision(player, PLAYER_RADIUS);

      if (input.interact && now - player.lastInteractAt >= INTERACT_COOLDOWN_MS) {
        this.handleInteract(player, now);
      }

      if (player.activeClassId === "minigun") {
        player.spinUp = clamp(player.spinUp + (input.primary ? 2.3 : -1.9) * deltaSeconds, 0, 1);
      } else {
        player.spinUp = 0;
      }

      this.tryCollectPickup(player, now);
      if (input.utility) {
        this.handleUtilityUse(player, input, now);
      }
      this.handlePlayerCombat(player, input, now);
    }
  }

  private updateVehicles(now: number, deltaSeconds: number): void {
    for (const vehicle of this.state.vehicles.values()) {
      if (!vehicle.alive) {
        continue;
      }

      const definition = VEHICLE_DEFS[vehicle.type as VehicleTypeId];
      const occupant = vehicle.occupantId ? this.state.players.get(vehicle.occupantId) : undefined;
      if (!occupant || !occupant.alive) {
        vehicle.occupantId = "";
      }

      const activeOccupant = vehicle.occupantId ? this.state.players.get(vehicle.occupantId) : undefined;
      const input = activeOccupant ? this.inputs.get(activeOccupant.id) ?? sanitizeInput(undefined) : sanitizeInput(undefined);

      if (activeOccupant) {
        const aim =
          vehicle.type === "artillery-carrier"
            ? normalizeVector(input.cursorWorldX - vehicle.x, input.cursorWorldY - vehicle.y)
            : normalizeVector(input.aimX, input.aimY);
        vehicle.aimX = aim.x;
        vehicle.aimY = aim.y;
      }

      if (definition.mobile && activeOccupant) {
        const move = normalizeVector(input.moveX, input.moveY);
        const empSlow = vehicle.empUntil > now ? 0.45 : 1;
        const desiredVelocityX = move.x * definition.speed * empSlow;
        const desiredVelocityY = move.y * definition.speed * empSlow;
        const lerpAmount = clamp(definition.acceleration * deltaSeconds, 0, 1);
        vehicle.velocityX += (desiredVelocityX - vehicle.velocityX) * lerpAmount;
        vehicle.velocityY += (desiredVelocityY - vehicle.velocityY) * lerpAmount;
        vehicle.x += vehicle.velocityX * deltaSeconds;
        vehicle.y += vehicle.velocityY * deltaSeconds;
        clampEntityToMap(vehicle, vehicle.radius);
        if (!definition.airborne) {
          this.resolveGroundCollision(vehicle, vehicle.radius);
        }
      } else {
        vehicle.velocityX *= 0.78;
        vehicle.velocityY *= 0.78;
      }

      if (activeOccupant && input.interact && now - activeOccupant.lastInteractAt >= INTERACT_COOLDOWN_MS) {
        activeOccupant.lastInteractAt = now;
        this.unmountPlayer(activeOccupant, false);
        continue;
      }

      if (vehicle.empUntil > now) {
        continue;
      }

      if (activeOccupant && input.primary) {
        if (vehicle.type === "flame-tank") {
          this.fireFlameConeFromVehicle(vehicle, activeOccupant, now);
          continue;
        }
        if (vehicle.type === "artillery-carrier") {
          this.fireArtilleryCarrier(vehicle, activeOccupant, input, now, false);
          continue;
        }
        this.tryFireVehicleWeapon(vehicle, activeOccupant, definition, "primary", now);
      }

      if (activeOccupant && input.secondary && definition.secondary) {
        if (vehicle.type === "artillery-carrier") {
          this.fireArtilleryCarrier(vehicle, activeOccupant, input, now, true);
          continue;
        }
        if (vehicle.type === "drone-carrier") {
          this.releaseCarrierDrones(vehicle, activeOccupant, now);
          continue;
        }
        this.tryFireVehicleWeapon(vehicle, activeOccupant, definition, "secondary", now);
      }
    }
  }

  private updateProjectiles(now: number, deltaSeconds: number): void {
    for (const [projectileId, projectile] of this.state.projectiles) {
      if (projectile.expiresAt > 0 && projectile.expiresAt <= now) {
        if (projectile.splashRadius > 0) {
          this.handleProjectileImpact(projectile, undefined, undefined, projectile.x, projectile.y, now, false);
        }
        this.state.projectiles.delete(projectileId);
        continue;
      }

      projectile.prevX = projectile.x;
      projectile.prevY = projectile.y;
      if (projectile.targetEntityId && projectile.homingStrength > 0) {
        this.applyProjectileHoming(projectile, deltaSeconds);
      }

      projectile.x += projectile.dirX * projectile.speed * deltaSeconds;
      projectile.y += projectile.dirY * projectile.speed * deltaSeconds;
      projectile.remainingRange -= Math.hypot(projectile.x - projectile.prevX, projectile.y - projectile.prevY);

      if (projectile.splitCount > 0 && projectile.splitAtRange >= 0 && projectile.remainingRange <= projectile.splitAtRange) {
        this.splitClusterProjectile(projectile, now);
        this.state.projectiles.delete(projectileId);
        continue;
      }

      if (projectile.remainingRange <= 0) {
        if (projectile.splashRadius > 0) {
          this.handleProjectileImpact(projectile, undefined, undefined, projectile.x, projectile.y, now, false);
        }
        this.state.projectiles.delete(projectileId);
        continue;
      }

      if (projectile.altitudeMode !== "air" && !projectile.ignoreObstacles) {
        const obstacleHit = this.findObstacleIntersection(projectile.prevX, projectile.prevY, projectile.x, projectile.y);
        if (obstacleHit) {
          this.handleProjectileImpact(projectile, undefined, undefined, obstacleHit.x, obstacleHit.y, now, true);
          this.state.projectiles.delete(projectileId);
          continue;
        }
      }

      const vehicleHit = this.findVehicleHit(projectile);
      if (vehicleHit) {
        this.handleProjectileImpact(projectile, undefined, vehicleHit, vehicleHit.x, vehicleHit.y, now, false);
        this.state.projectiles.delete(projectileId);
        continue;
      }

      const playerHit = this.findPlayerHit(projectile);
      if (playerHit) {
        this.handleProjectileImpact(projectile, playerHit, undefined, playerHit.x, playerHit.y, now, false);
        this.state.projectiles.delete(projectileId);
        continue;
      }
    }
  }

  private applyHealingAndRegen(now: number, deltaSeconds: number): void {
    for (const player of this.state.players.values()) {
      if (!player.alive || player.currentVehicleId) {
        continue;
      }

      if (player.utilityExpiresAt > 0 && player.utilityExpiresAt <= now) {
        player.utilityKind = "";
        player.utilityCharges = 0;
        player.utilityExpiresAt = 0;
      }

      if (player.burnUntil > now) {
        player.health = clamp(player.health - BURN_DAMAGE_PER_SECOND * deltaSeconds, 0, player.maxHealth);
        player.regenBlockedUntil = now + 350;
        if (player.health <= 0) {
          const attacker = this.findFallbackAttacker(player.team as TeamId);
          if (attacker) {
            this.killPlayer(player, attacker, now, "flamethrower");
          }
          continue;
        }
      }

      for (const zone of this.state.zones.values()) {
        if (!zone.active || zone.team && zone.team !== player.team) {
          continue;
        }

        if (Math.hypot(player.x - zone.x, player.y - zone.y) <= zone.radius + PLAYER_RADIUS) {
          player.health = clamp(player.health + zone.healPerSecond * deltaSeconds, 0, player.maxHealth);
          player.armor = clamp(player.armor + zone.armorPerSecond * deltaSeconds, 0, player.maxArmor);
        }
      }

      if (player.regenBlockedUntil <= now && player.burnUntil <= now) {
        player.health = clamp(player.health + PASSIVE_REGEN_PER_SECOND * deltaSeconds, 0, player.maxHealth);
      }
    }

    for (const vehicle of this.state.vehicles.values()) {
      if (!vehicle.alive || vehicle.regenBlockedUntil > now) {
        if (!vehicle.alive) {
          continue;
        }
      }

      if (vehicle.burnUntil > now) {
        vehicle.health = clamp(vehicle.health - BURN_DAMAGE_PER_SECOND * 1.25 * deltaSeconds, 0, vehicle.maxHealth);
        vehicle.regenBlockedUntil = now + 350;
        if (vehicle.health <= 0) {
          const attacker = this.findFallbackAttacker(vehicle.team as TeamId);
          if (attacker) {
            this.destroyVehicle(vehicle, attacker, now, "flamethrower");
          }
          continue;
        }
      }

      if (vehicle.regenBlockedUntil <= now && vehicle.burnUntil <= now) {
        vehicle.health = clamp(vehicle.health + VEHICLE_REGEN_PER_SECOND * deltaSeconds, 0, vehicle.maxHealth);
      }
    }
  }

  private updateHazards(now: number, deltaSeconds: number): void {
    for (const [hazardId, hazard] of this.state.hazards) {
      if (hazard.expiresAt <= now) {
        this.broadcast("combat", {
          type: "hazardExpire",
          actorId: hazard.ownerId || undefined,
          hazardKind: hazard.kind as "mine" | "napalm",
          x: hazard.x,
          y: hazard.y,
          radius: hazard.radius,
          at: now
        });
        this.state.hazards.delete(hazardId);
        continue;
      }

      if (hazard.kind === "napalm") {
        const attacker = this.findFallbackAttacker(hazard.team as TeamId, hazard.ownerId);
        if (!attacker) {
          continue;
        }
        for (const player of this.state.players.values()) {
          if (!player.alive || player.team === hazard.team || player.currentVehicleId) {
            continue;
          }
          const distance = Math.hypot(player.x - hazard.x, player.y - hazard.y);
          if (distance <= hazard.radius + PLAYER_RADIUS) {
            this.damagePlayer(player, attacker, hazard.damagePerSecond * deltaSeconds, now, "flamethrower");
            player.burnUntil = Math.max(player.burnUntil, now + 1200);
          }
        }
        for (const vehicle of this.state.vehicles.values()) {
          if (!vehicle.alive || vehicle.team === hazard.team) {
            continue;
          }
          const distance = Math.hypot(vehicle.x - hazard.x, vehicle.y - hazard.y);
          if (distance <= hazard.radius + vehicle.radius) {
            this.damageVehicle(vehicle, attacker, hazard.damagePerSecond * 0.9 * deltaSeconds, now, "flamethrower");
            vehicle.burnUntil = Math.max(vehicle.burnUntil, now + 1400);
          }
        }
      }

      if (hazard.kind === "mine" && hazard.armedAt <= now) {
        const triggerPlayer = Array.from(this.state.players.values()).find((player) =>
          player.alive && player.team !== hazard.team && !player.currentVehicleId && Math.hypot(player.x - hazard.x, player.y - hazard.y) <= hazard.radius + PLAYER_RADIUS
        );
        const triggerVehicle = Array.from(this.state.vehicles.values()).find((vehicle) =>
          vehicle.alive && vehicle.team !== hazard.team && Math.hypot(vehicle.x - hazard.x, vehicle.y - hazard.y) <= hazard.radius + vehicle.radius
        );
        if (triggerPlayer || triggerVehicle) {
          const attacker = this.findFallbackAttacker(hazard.team as TeamId, hazard.ownerId);
          if (attacker) {
            const fakeProjectile = new ProjectileState();
            fakeProjectile.ownerId = attacker.id;
            fakeProjectile.team = attacker.team;
            fakeProjectile.classId = "rocket-launcher";
            fakeProjectile.damage = 52;
            fakeProjectile.splashRadius = 86;
            fakeProjectile.radius = 8;
            this.handleProjectileImpact(fakeProjectile, undefined, undefined, hazard.x, hazard.y, now, false);
          }
          this.broadcast("combat", {
            type: "mineTriggered",
            actorId: hazard.ownerId || "system",
            team: hazard.team as TeamId,
            x: hazard.x,
            y: hazard.y,
            at: now
          });
          this.state.hazards.delete(hazardId);
        }
      }
    }
  }

  private updateDrones(now: number, deltaSeconds: number): void {
    for (const [droneId, drone] of this.state.drones) {
      if (drone.expiresAt <= now || drone.health <= 0) {
        this.broadcast("combat", {
          type: "droneDestroyed",
          actorId: drone.ownerId,
          droneId,
          team: drone.team as TeamId,
          x: drone.x,
          y: drone.y,
          at: now
        });
        this.state.drones.delete(droneId);
        continue;
      }

      const owner = this.state.players.get(drone.ownerId);
      const targetPlayer = Array.from(this.state.players.values())
        .filter((player) => player.alive && player.team !== drone.team && !player.currentVehicleId)
        .sort((left, right) => Math.hypot(left.x - drone.x, left.y - drone.y) - Math.hypot(right.x - drone.x, right.y - drone.y))[0];
      const targetVehicle = Array.from(this.state.vehicles.values())
        .filter((vehicle) => vehicle.alive && vehicle.team !== drone.team)
        .sort((left, right) => Math.hypot(left.x - drone.x, left.y - drone.y) - Math.hypot(right.x - drone.x, right.y - drone.y))[0];
      const playerDistance = targetPlayer ? Math.hypot(targetPlayer.x - drone.x, targetPlayer.y - drone.y) : Number.POSITIVE_INFINITY;
      const vehicleDistance = targetVehicle ? Math.hypot(targetVehicle.x - drone.x, targetVehicle.y - drone.y) : Number.POSITIVE_INFINITY;
      const target = playerDistance <= vehicleDistance ? targetPlayer : targetVehicle;
      const orbitTarget = owner ? { x: owner.x + (hashString(drone.id) % 2 === 0 ? 34 : -34), y: owner.y - 28 } : undefined;
      const focus = target && Math.hypot(target.x - drone.x, target.y - drone.y) < 560 ? target : orbitTarget;
      if (focus) {
        const direction = normalizeVector(focus.x - drone.x, focus.y - drone.y);
        drone.aimX = direction.x;
        drone.aimY = direction.y;
        drone.x = clamp(drone.x + direction.x * DRONE_SPEED * deltaSeconds, 0, MAP_WIDTH);
        drone.y = clamp(drone.y + direction.y * DRONE_SPEED * deltaSeconds, 0, MAP_HEIGHT);
      }

      if (target && now - drone.lastAttackAt >= DRONE_ATTACK_COOLDOWN_MS) {
        const distance = Math.hypot(target.x - drone.x, target.y - drone.y);
        if (distance <= DRONE_ATTACK_RANGE + ("radius" in target ? target.radius : PLAYER_RADIUS)) {
          const attacker = owner ?? this.findFallbackAttacker(drone.team as TeamId);
          if (attacker) {
            if ("currentVehicleId" in target) {
              this.damagePlayer(target as PlayerState, attacker, DRONE_DAMAGE, now, "machine-gun");
            } else {
              this.damageVehicle(target as VehicleState, attacker, DRONE_DAMAGE * 1.2, now, "machine-gun");
            }
          }
          drone.lastAttackAt = now;
        }
      }
    }
  }

  private updateObjectives(deltaSeconds: number): void {
    for (const objective of this.state.objectives.values()) {
      let pressure = 0;
      for (const player of this.state.players.values()) {
        if (!player.alive) {
          continue;
        }

        const position = player.currentVehicleId ? this.state.vehicles.get(player.currentVehicleId) : player;
        if (!position) {
          continue;
        }

        if (Math.hypot(position.x - objective.x, position.y - objective.y) <= objective.radius + (player.currentVehicleId ? 20 : PLAYER_RADIUS)) {
          pressure += player.team === "germany" ? 1 : -1;
          const holderScore = OBJECTIVE_TICK_SCORE * getUnderdogMultiplier(this.getHumanCount(player.team as TeamId), this.getHumanCount(otherTeam(player.team as TeamId)));
          this.addScore(player, holderScore);
        }
      }

      objective.progress = clamp(objective.progress + pressure * OBJECTIVE_CAPTURE_RATE * deltaSeconds, -100, 100);
      const previousOwner = objective.owner;
      objective.owner = getObjectiveOwner(objective.progress);
      if (objective.owner !== previousOwner && objective.owner !== "neutral") {
        this.broadcast("combat", {
          type: "capture",
          actorId: objective.id,
          team: objective.owner as TeamId,
          objectiveId: objective.id,
          at: Date.now()
        });
      }
    }

    const germanyControlled = Array.from(this.state.objectives.values()).filter((objective) => objective.owner === "germany").length;
    const franceControlled = Array.from(this.state.objectives.values()).filter((objective) => objective.owner === "france").length;
    this.state.germanyScore += germanyControlled * OBJECTIVE_HOLD_TEAM_SCORE * deltaSeconds;
    this.state.franceScore += franceControlled * OBJECTIVE_HOLD_TEAM_SCORE * deltaSeconds;
  }

  private handleUpgrade(player: PlayerState, choice: UpgradeChoice): void {
    const levelKey = getUpgradeLevelKey(choice.stat);
    const currentLevel = player[levelKey];
    if (typeof currentLevel !== "number" || isUpgradeMaxed(currentLevel)) {
      return;
    }

    if (player.combatScore < getUpgradeCost(currentLevel)) {
      return;
    }

    if (choice.category === "melee" && player.activePath !== "melee" && choice.stat !== "range") {
      return;
    }

    if (choice.category === "ranged" && player.activePath !== "ranged" && choice.stat !== "range") {
      return;
    }

    player[levelKey] = currentLevel + 1;
    this.recalculatePlayerDurability(player, false);
  }

  private handleClassSelection(player: PlayerState, classId: WeaponClassId): void {
    if (!isClassUnlocked(classId, player.combatScore)) {
      return;
    }

    const nextClass = getWeaponClass(classId);
    player.activeClassId = classId;
    player.activePath = nextClass.path;
    if (nextClass.path === "melee" && player.activeClassId === DEFAULT_RANGED_CLASS_ID) {
      player.activeClassId = DEFAULT_MELEE_CLASS_ID;
    }
    this.recalculatePlayerDurability(player, false);
    this.broadcast("combat", { type: "select", actorId: player.id, classId, at: Date.now() });
  }

  private handleInteract(player: PlayerState, now: number): void {
    if (player.currentVehicleId) {
      player.lastInteractAt = now;
      this.unmountPlayer(player, false);
      return;
    }

    let nearestVehicle: VehicleState | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const vehicle of this.state.vehicles.values()) {
      if (!vehicle.alive || vehicle.team !== player.team) {
        continue;
      }

      const distance = Math.hypot(player.x - vehicle.x, player.y - vehicle.y);
      if (distance < INTERACT_RANGE + vehicle.radius && distance < nearestDistance) {
        nearestVehicle = vehicle;
        nearestDistance = distance;
      }
    }

    if (nearestVehicle) {
      player.lastInteractAt = now;
      this.mountVehicle(player, nearestVehicle, now);
    }
  }

  private mountVehicle(player: PlayerState, vehicle: VehicleState, now: number): void {
    if (!vehicle.alive || vehicle.team !== player.team) {
      return;
    }

    if (vehicle.occupantId) {
      const existingOccupant = this.state.players.get(vehicle.occupantId);
      if (!existingOccupant || existingOccupant.id === player.id) {
        vehicle.occupantId = "";
      } else if (existingOccupant.isBot) {
        existingOccupant.currentVehicleId = "";
        existingOccupant.x = clamp(vehicle.x + (player.team === "germany" ? -VEHICLE_EJECT_DISTANCE : VEHICLE_EJECT_DISTANCE), PLAYER_RADIUS, MAP_WIDTH - PLAYER_RADIUS);
        existingOccupant.y = clamp(vehicle.y + 20, PLAYER_RADIUS, MAP_HEIGHT - PLAYER_RADIUS);
        existingOccupant.health = Math.max(24, existingOccupant.health);
        vehicle.occupantId = "";
      } else {
        return;
      }
    }

    player.currentVehicleId = vehicle.id;
    player.x = vehicle.x;
    player.y = vehicle.y;
    player.velocityX = 0;
    player.velocityY = 0;
    vehicle.occupantId = player.id;
    this.broadcast("combat", {
      type: "mount",
      actorId: player.id,
      vehicleId: vehicle.id,
      vehicleType: vehicle.type as VehicleTypeId,
      at: now
    });
  }

  private unmountPlayer(player: PlayerState, silent: boolean): void {
    if (!player.currentVehicleId) {
      return;
    }

    const vehicle = this.state.vehicles.get(player.currentVehicleId);
    if (vehicle && vehicle.occupantId === player.id) {
      vehicle.occupantId = "";
      const offset = vehicle.team === "germany" ? -VEHICLE_EJECT_DISTANCE : VEHICLE_EJECT_DISTANCE;
      player.x = clamp(vehicle.x + offset, PLAYER_RADIUS, MAP_WIDTH - PLAYER_RADIUS);
      player.y = clamp(vehicle.y + 16, PLAYER_RADIUS, MAP_HEIGHT - PLAYER_RADIUS);
      player.velocityX = vehicle.velocityX * 0.4;
      player.velocityY = vehicle.velocityY * 0.4;
      this.resolveGroundCollision(player, PLAYER_RADIUS);
      if (!silent) {
        this.broadcast("combat", {
          type: "mount",
          actorId: player.id,
          vehicleId: vehicle.id,
          vehicleType: vehicle.type as VehicleTypeId,
          at: Date.now()
        });
      }
    }

    player.currentVehicleId = "";
  }

  private tryCollectPickup(player: PlayerState, now: number): void {
    for (const [pickupId, pickup] of this.state.pickups) {
      if (Math.hypot(player.x - pickup.x, player.y - pickup.y) > PICKUP_RANGE + pickup.radius) {
        continue;
      }

      if (pickup.kind === "weapon" && pickup.weaponClassId) {
        player.activeClassId = pickup.weaponClassId as WeaponClassId;
        player.activePath = getWeaponClass(player.activeClassId as WeaponClassId).path;
        this.recalculatePlayerDurability(player, false);
      } else if (pickup.kind === "skill" && pickup.upgradeStat) {
        const levelKey = getUpgradeLevelKey(pickup.upgradeStat as UpgradeStat);
        if (player[levelKey] < 4) {
          player[levelKey] += pickup.upgradeAmount || 1;
        }
        player.health = clamp(player.health + pickup.bonusHealth, 0, player.maxHealth);
        player.armor = clamp(player.armor + pickup.bonusArmor, 0, player.maxArmor);
        this.recalculatePlayerDurability(player, false);
      } else if (pickup.kind === "mine-crate") {
        player.utilityKind = "mine";
        player.utilityCharges = 2;
        player.utilityExpiresAt = now + PICKUP_DURATION_MS;
      } else if (pickup.kind === "napalm-canister") {
        player.utilityKind = "napalm";
        player.utilityCharges = 1;
        player.utilityExpiresAt = now + PICKUP_DURATION_MS;
      } else if (pickup.kind === "ammo-overdrive") {
        player.overdriveUntil = now + OVERDRIVE_DURATION_MS;
        this.broadcast("combat", {
          type: "statusApplied",
          actorId: player.id,
          targetId: player.id,
          status: "overdrive",
          at: now
        });
      }

      this.state.pickups.delete(pickupId);
      this.broadcast("combat", {
        type: "pickup",
        actorId: player.id,
        pickupKind: pickup.kind as "weapon" | "skill" | "mine-crate" | "napalm-canister" | "ammo-overdrive",
        label: pickup.label,
        at: now
      });
      break;
    }
  }

  private handlePlayerCombat(player: PlayerState, input: InputMessage, now: number): void {
    const weaponClass = getWeaponClass(player.activeClassId as WeaponClassId);
    if (weaponClass.path === "melee") {
      if (!input.primary || player.lastMeleeAt + getClassMeleeCooldown(player.activeClassId as WeaponClassId, player.meleeSpeedLevel) > now) {
        return;
      }

      player.lastMeleeAt = now;
      const meleeRange = getClassMeleeRange(player.activeClassId as WeaponClassId, player.meleeRangeLevel) + (player.dashUntil > now ? 18 : 0);
      let hit = false;
      for (const target of this.state.players.values()) {
        if (!target.alive || target.team === player.team || target.currentVehicleId) {
          continue;
        }

        const offsetX = target.x - player.x;
        const offsetY = target.y - player.y;
        const distance = Math.hypot(offsetX, offsetY);
        if (distance > meleeRange + PLAYER_RADIUS) {
          continue;
        }

        const direction = normalizeVector(offsetX, offsetY);
        if (direction.x * player.aimX + direction.y * player.aimY < 0.22) {
          continue;
        }

        hit = true;
        this.damagePlayer(target, player, getClassMeleeDamage(player.activeClassId as WeaponClassId, player.meleeDamageLevel) + 16, now, player.activeClassId as WeaponClassId);
        if (player.activeClassId === "chain-blade") {
          target.x += (player.x - target.x) * 0.24;
          target.y += (player.y - target.y) * 0.24;
        }
      }

      for (const vehicle of this.state.vehicles.values()) {
        if (!vehicle.alive || vehicle.team === player.team) {
          continue;
        }

        const distance = Math.hypot(vehicle.x - player.x, vehicle.y - player.y);
        if (distance <= meleeRange + vehicle.radius) {
          hit = true;
          this.damageVehicle(vehicle, player, getClassMeleeDamage(player.activeClassId as WeaponClassId, player.meleeDamageLevel) * 0.8, now, player.activeClassId as WeaponClassId);
        }
      }

      this.broadcast("combat", {
        type: "impact",
        actorId: player.id,
        classId: player.activeClassId as WeaponClassId,
        style: "melee",
        hit,
        blood: hit,
        x: player.x + player.aimX * meleeRange * 0.78,
        y: player.y + player.aimY * meleeRange * 0.78,
        at: now
      });
      return;
    }

    if (weaponClass.id === "flamethrower") {
      if (!input.primary || player.lastRangedAt + Math.round(getClassRangedCooldown("flamethrower", player.rangedRateLevel) * (player.overdriveUntil > now ? 0.72 : 1)) > now) {
        return;
      }
      player.lastRangedAt = now;
      this.applyFlameCone(player, now, false);
      return;
    }

    if (!(input.primary || input.secondary)) {
      return;
    }

    const overdriveRate = player.overdriveUntil > now ? 0.72 : 1;
    const overdriveSpread = player.overdriveUntil > now ? 1.22 : 1;
    const minigunReady = player.activeClassId !== "minigun" || player.spinUp >= 0.35;
    const baseCooldown = getClassRangedCooldown(player.activeClassId as WeaponClassId, player.rangedRateLevel);
    const effectiveCooldown =
      player.activeClassId === "minigun" ? Math.round(baseCooldown * (1.15 - player.spinUp * 0.62) * overdriveRate) : Math.round(baseCooldown * overdriveRate);
    if (!minigunReady || player.lastRangedAt + effectiveCooldown > now) {
      return;
    }

    player.lastRangedAt = now;
    const baseWeapon = getWeaponClass(player.activeClassId as WeaponClassId);
    const pelletCount = baseWeapon.pelletCount ?? 1;
    const spread = getClassRangedCone(player.activeClassId as WeaponClassId, player.rangedAccuracyLevel) * overdriveSpread;
    const range = getClassRangedRange(player.activeClassId as WeaponClassId, player.rangedRangeLevel);
    const projectileSpeed = getClassProjectileSpeed(player.activeClassId as WeaponClassId);
    const radius = getClassProjectileRadius(player.activeClassId as WeaponClassId);
    const splashRadius = baseWeapon.splashRadius ?? 0;
    for (let index = 0; index < pelletCount; index += 1) {
      const spreadAmount = (Math.random() - 0.5) * spread;
      const direction = rotateVector({ x: player.aimX, y: player.aimY }, spreadAmount);
      const config: Parameters<WarRoom["spawnProjectile"]>[0] = {
        ownerId: player.id,
        ownerType: "player",
        team: player.team as TeamId,
        classId: player.activeClassId as WeaponClassId,
        x: player.x + direction.x * 24,
        y: player.y + direction.y * 24,
        dirX: direction.x,
        dirY: direction.y,
        speed: projectileSpeed,
        radius,
        damage: baseWeapon.damage,
        range,
        splashRadius,
        sourceVehicleId: "",
        altitudeMode: "ground",
        ignoreObstacles: false,
        targetEntityId: baseWeapon.id === "rocket-launcher" ? this.findAirTarget(player.team as TeamId, player.x, player.y, direction) : "",
        targetType: baseWeapon.id === "rocket-launcher" ? "vehicle" : "",
        homingStrength: baseWeapon.id === "rocket-launcher" ? 0.09 : 0,
        splitCount: 0,
        splitAtRange: -1,
        spawnHazardKind: "",
        statusPower: 0
      };

      if (baseWeapon.id === "grenade-launcher") {
        config.altitudeMode = "air";
        config.ignoreObstacles = true;
      } else if (baseWeapon.id === "emp-launcher") {
        config.altitudeMode = "air";
        config.ignoreObstacles = true;
        config.statusPower = EMP_DURATION_MS;
      } else if (baseWeapon.id === "cluster-rocket") {
        config.altitudeMode = "air";
        config.ignoreObstacles = true;
        config.splitCount = 6;
        config.splitAtRange = range * 0.35;
      }

      this.spawnProjectile(config);
    }
  }

  private tryFireVehicleWeapon(
    vehicle: VehicleState,
    occupant: PlayerState,
    definition: VehicleDefinition,
    slot: VehicleWeaponSlot,
    now: number
  ): void {
    const weapon = slot === "primary" ? definition.primary : definition.secondary;
    if (!weapon) {
      return;
    }

    const lastAtKey = slot === "primary" ? "lastPrimaryAt" : "lastSecondaryAt";
    if (vehicle[lastAtKey] + weapon.cooldownMs > now) {
      return;
    }

    vehicle[lastAtKey] = now;
    if (slot === "primary") {
      occupant.lastRangedAt = now;
    } else {
      occupant.lastMeleeAt = now;
    }

    const pelletCount = weapon.pelletCount || 1;
    if (weapon.salvoIntervalMs && pelletCount > 1) {
      this.pendingVehicleSalvos.set(this.getVehicleSalvoKey(vehicle.id, slot), {
        vehicleId: vehicle.id,
        occupantId: occupant.id,
        slot,
        remaining: pelletCount,
        nextAt: now,
        side: 1
      });
      return;
    }

    for (let index = 0; index < pelletCount; index += 1) {
      this.spawnVehicleProjectile(vehicle, occupant, weapon, slot, 0);
    }
  }

  private updateBotInputs(now: number): void {
    for (const player of this.state.players.values()) {
      if (!player.isBot || !player.alive) {
        continue;
      }

      const brain = this.botBrains.get(player.id);
      if (!brain) {
        continue;
      }

      const input = sanitizeInput(undefined);
      if (player.currentVehicleId) {
        this.driveBotVehicle(player, brain, input);
        this.inputs.set(player.id, input);
        continue;
      }

      const nearbyVehicle = this.findDesiredVehicle(player, 170);
      if (nearbyVehicle) {
        const toVehicle = normalizeVector(nearbyVehicle.x - player.x, nearbyVehicle.y - player.y);
        input.moveX = toVehicle.x;
        input.moveY = toVehicle.y;
        input.aimX = toVehicle.x;
        input.aimY = toVehicle.y;
        if (Math.hypot(nearbyVehicle.x - player.x, nearbyVehicle.y - player.y) < INTERACT_RANGE + nearbyVehicle.radius) {
          input.interact = true;
        }
        this.inputs.set(player.id, input);
        continue;
      }

      const threat = this.findEnemyTarget(player, player.activePath === "melee" ? 240 : 540, false, "ground");
      if (player.health < player.maxHealth * 0.35) {
        const healZone = this.findBestHealZone(player);
        if (healZone) {
          const toZone = normalizeVector(healZone.x - player.x, healZone.y - player.y);
          input.moveX = toZone.x;
          input.moveY = toZone.y;
          input.aimX = toZone.x;
          input.aimY = toZone.y;
        }
      } else {
        if (brain.retargetAt <= now) {
          const objective = this.pickBotObjective(player.team as TeamId, brain.lane);
          if (objective) {
            brain.lane = objective.lane as LaneId;
          }
          brain.retargetAt = now + BOT_RETARGET_MS + Math.random() * 500;
        }

        const targetObjective = this.pickBotObjective(player.team as TeamId, brain.lane);
        const pickup = this.findNearbyPickup(player, 210);
        const moveTarget = pickup ?? threat ?? targetObjective;
        if (moveTarget) {
          const toTarget = normalizeVector(moveTarget.x - player.x, moveTarget.y - player.y);
          const orbit = threat && player.activePath === "ranged" ? 0.28 : 0;
          input.moveX = clamp(toTarget.x - toTarget.y * orbit, -1, 1);
          input.moveY = clamp(toTarget.y + toTarget.x * orbit, -1, 1);
          input.aimX = threat ? normalizeVector(threat.x - player.x, threat.y - player.y).x : toTarget.x;
          input.aimY = threat ? normalizeVector(threat.x - player.x, threat.y - player.y).y : toTarget.y;
        }
      }

      if (threat) {
        const distance = Math.hypot(threat.x - player.x, threat.y - player.y);
        const clearShot = this.hasLineOfSight(player.x, player.y, threat.x, threat.y, "ground");
        if (player.activePath === "melee") {
          input.primary = distance < getClassMeleeRange(player.activeClassId as WeaponClassId, player.meleeRangeLevel) + 18;
          input.dash = distance < 180 && player.dashCooldownUntil <= now;
        } else {
          input.primary = clearShot && distance < getClassRangedRange(player.activeClassId as WeaponClassId, player.rangedRangeLevel) + 30;
          input.secondary = input.primary && player.activeClassId === "rocket-launcher";
        }
      }

      const movementSinceLast = Math.hypot(player.x - brain.lastX, player.y - brain.lastY);
      if (movementSinceLast < BOT_STUCK_DISTANCE) {
        brain.stuckSince = brain.stuckSince || now;
      } else {
        brain.stuckSince = 0;
        brain.lastX = player.x;
        brain.lastY = player.y;
      }

      if (brain.stuckSince > 0 && now - brain.stuckSince > BOT_STUCK_TIMEOUT_MS) {
        const objective = this.pickBotObjective(player.team as TeamId, pickRandom(LANE_IDS) ?? "middle");
        if (objective) {
          player.x = clamp(objective.x + (player.team === "germany" ? -140 : 140), PLAYER_RADIUS, MAP_WIDTH - PLAYER_RADIUS);
          player.y = clamp(objective.y + (Math.random() - 0.5) * 100, PLAYER_RADIUS, MAP_HEIGHT - PLAYER_RADIUS);
        }
        brain.stuckSince = 0;
        brain.lastX = player.x;
        brain.lastY = player.y;
      }

      this.updateBotLoadout(player, threat, now);

      this.inputs.set(player.id, input);
    }
  }

  private driveBotVehicle(player: PlayerState, brain: BotBrain, input: InputMessage): void {
    const vehicle = player.currentVehicleId ? this.state.vehicles.get(player.currentVehicleId) : undefined;
    if (!vehicle || !vehicle.alive) {
      return;
    }

    const rocketTruck = vehicle.type === "rocket-truck";
    const artillery = vehicle.type === "artillery-carrier";
    const threat = this.findEnemyTarget(
      player,
      artillery ? 1320 : rocketTruck ? 1180 : vehicle.type === "plane" || vehicle.type === "gunship-plane" ? 740 : 620,
      true,
      vehicle.type === "plane" || vehicle.type === "gunship-plane" ? "air" : "ground",
      rocketTruck || artillery
    );
    const objective = this.pickBotObjective(player.team as TeamId, brain.lane);
    const moveTarget = threat ?? objective;
    if (moveTarget) {
      const direction = normalizeVector(moveTarget.x - vehicle.x, moveTarget.y - vehicle.y);
      input.moveX = direction.x;
      input.moveY = direction.y;
      input.aimX = direction.x;
      input.aimY = direction.y;
      input.cursorWorldX = moveTarget.x;
      input.cursorWorldY = moveTarget.y;
      const clearShot = rocketTruck || artillery || this.hasLineOfSight(vehicle.x, vehicle.y, moveTarget.x, moveTarget.y, vehicle.type === "plane" || vehicle.type === "gunship-plane" ? "air" : "ground");
      const distance = Math.hypot(moveTarget.x - vehicle.x, moveTarget.y - vehicle.y);
      input.primary = clearShot && (vehicle.type !== "flame-tank" || distance < 240);
      input.secondary =
        clearShot &&
        vehicle.type !== "heavy-mg" &&
        (vehicle.type !== "drone-carrier" || this.countTeamDrones(vehicle.team as TeamId, player.id) < 2);
    }

    if (vehicle.health < vehicle.maxHealth * 0.24 && vehicle.type !== "heavy-mg") {
      const baseZone = this.findBestHealZone(player);
      if (baseZone) {
        const direction = normalizeVector(baseZone.x - vehicle.x, baseZone.y - vehicle.y);
        input.moveX = direction.x;
        input.moveY = direction.y;
        input.aimX = direction.x;
        input.aimY = direction.y;
      }
    }
  }

  private updateBotLoadout(player: PlayerState, threat: { x: number; y: number; id?: string } | undefined, now: number): void {
    if (Math.random() > 0.012) {
      return;
    }

    const distance = threat ? Math.hypot(threat.x - player.x, threat.y - player.y) : Number.POSITIVE_INFINITY;
    if (distance < 140 && player.combatScore >= CLASS_UNLOCK_SCORES[4]) {
      this.handleClassSelection(player, "chain-blade");
      return;
    }
    if (distance < 240 && player.combatScore >= CLASS_UNLOCK_SCORES[2]) {
      this.handleClassSelection(player, Math.random() > 0.5 ? "flamethrower" : "shotgun");
      return;
    }
    if (player.combatScore >= CLASS_UNLOCK_SCORES[5] && Math.random() > 0.7) {
      this.handleClassSelection(player, Math.random() > 0.5 ? "cluster-rocket" : "rocket-launcher");
      return;
    }
    if (player.combatScore >= CLASS_UNLOCK_SCORES[4] && Math.random() > 0.55) {
      this.handleClassSelection(player, pickRandom<WeaponClassId>(["minigun", "emp-launcher", "machine-gun", "chain-blade"]) ?? "machine-gun");
      return;
    }
    if (player.combatScore >= CLASS_UNLOCK_SCORES[3] && Math.random() > 0.45) {
      this.handleClassSelection(player, pickRandom<WeaponClassId>(["grenade-launcher", "smg", "mace"]) ?? "smg");
      return;
    }
    if (player.combatScore >= CLASS_UNLOCK_SCORES[2]) {
      this.handleClassSelection(player, pickRandom<WeaponClassId>(["flamethrower", "shotgun", "katana"]) ?? "shotgun");
    }
  }

  private countTeamDrones(team: TeamId, ownerId = ""): number {
    return Array.from(this.state.drones.values()).filter((drone) => drone.team === team && (!ownerId || drone.ownerId === ownerId)).length;
  }

  private pickBotObjective(team: TeamId, lane: LaneId): ObjectiveState | undefined {
    const laneObjective = Array.from(this.state.objectives.values()).find((objective) => objective.lane === lane && objective.owner !== team);
    if (laneObjective) {
      return laneObjective;
    }

    return Array.from(this.state.objectives.values()).sort((left, right) => Math.abs(left.progress) - Math.abs(right.progress))[0];
  }

  private findNearbyPickup(player: PlayerState, range: number): PickupState | undefined {
    return Array.from(this.state.pickups.values()).find((pickup) => Math.hypot(pickup.x - player.x, pickup.y - player.y) < range);
  }

  private findBestHealZone(player: PlayerState): ZoneState | undefined {
    return Array.from(this.state.zones.values())
      .filter((zone) => zone.active && (!zone.team || zone.team === player.team))
      .sort((left, right) => Math.hypot(left.x - player.x, left.y - player.y) - Math.hypot(right.x - player.x, right.y - player.y))[0];
  }

  private findDesiredVehicle(player: PlayerState, range: number): VehicleState | undefined {
    return Array.from(this.state.vehicles.values())
      .filter((vehicle) => vehicle.alive && vehicle.team === player.team && (!vehicle.occupantId || this.state.players.get(vehicle.occupantId)?.isBot))
      .sort((left, right) => Math.hypot(left.x - player.x, left.y - player.y) - Math.hypot(right.x - player.x, right.y - player.y))
      .find((vehicle) => Math.hypot(vehicle.x - player.x, vehicle.y - player.y) < range);
  }

  private findEnemyTarget(
    player: PlayerState,
    range: number,
    includeVehicles = false,
    altitudeMode: "ground" | "air" = "ground",
    ignoreLineOfSight = false
  ): { x: number; y: number; id?: string } | undefined {
    const enemies: Array<{ x: number; y: number; distance: number; id?: string }> = [];
    for (const target of this.state.players.values()) {
      if (!target.alive || target.team === player.team || target.currentVehicleId) {
        continue;
      }
      const distance = Math.hypot(target.x - player.x, target.y - player.y);
      if (!ignoreLineOfSight && !this.hasLineOfSight(player.x, player.y, target.x, target.y, altitudeMode)) {
        continue;
      }
      enemies.push({ x: target.x, y: target.y, distance, id: target.id });
    }

    if (includeVehicles) {
      for (const vehicle of this.state.vehicles.values()) {
        if (!vehicle.alive || vehicle.team === player.team) {
          continue;
        }
        const distance = Math.hypot(vehicle.x - player.x, vehicle.y - player.y);
        if (!ignoreLineOfSight && !this.hasLineOfSight(player.x, player.y, vehicle.x, vehicle.y, altitudeMode)) {
          continue;
        }
        enemies.push({ x: vehicle.x, y: vehicle.y, distance, id: vehicle.id });
      }
    }

    return enemies.filter((entry) => entry.distance < range).sort((left, right) => left.distance - right.distance)[0];
  }

  private applyProjectileHoming(projectile: ProjectileState, deltaSeconds: number): void {
    const targetVehicle = projectile.targetType === "vehicle" ? this.state.vehicles.get(projectile.targetEntityId) : undefined;
    const targetPlayer = projectile.targetType === "player" ? this.state.players.get(projectile.targetEntityId) : undefined;
    const target = targetVehicle && targetVehicle.alive ? targetVehicle : targetPlayer && targetPlayer.alive ? targetPlayer : undefined;
    if (!target) {
      projectile.targetEntityId = "";
      projectile.targetType = "";
      return;
    }

    const desired = normalizeVector(target.x - projectile.x, target.y - projectile.y);
    projectile.dirX += (desired.x - projectile.dirX) * clamp(projectile.homingStrength * deltaSeconds * 60, 0, 1);
    projectile.dirY += (desired.y - projectile.dirY) * clamp(projectile.homingStrength * deltaSeconds * 60, 0, 1);
    const normalized = normalizeVector(projectile.dirX, projectile.dirY);
    projectile.dirX = normalized.x;
    projectile.dirY = normalized.y;
  }

  private findVehicleHit(projectile: ProjectileState): VehicleState | undefined {
    return Array.from(this.state.vehicles.values()).find((vehicle) => {
      if (!vehicle.alive || vehicle.team === projectile.team) {
        return false;
      }
      return distancePointToSegment(vehicle.x, vehicle.y, projectile.prevX, projectile.prevY, projectile.x, projectile.y) <= vehicle.radius + projectile.radius;
    });
  }

  private findPlayerHit(projectile: ProjectileState): PlayerState | undefined {
    return Array.from(this.state.players.values()).find((player) => {
      if (!player.alive || player.team === projectile.team || player.currentVehicleId) {
        return false;
      }
      return distancePointToSegment(player.x, player.y, projectile.prevX, projectile.prevY, projectile.x, projectile.y) <= PLAYER_RADIUS + projectile.radius;
    });
  }

  private handleProjectileImpact(
    projectile: ProjectileState,
    playerTarget: PlayerState | undefined,
    vehicleTarget: VehicleState | undefined,
    x: number,
    y: number,
    now: number,
    obstacleImpact: boolean
  ): void {
    if (projectile.splashRadius > 0) {
      this.broadcast("combat", {
        type: "explosion",
        actorId: projectile.ownerId,
        team: projectile.team as TeamId,
        classId: projectile.classId as WeaponClassId,
        x,
        y,
        radius: projectile.splashRadius,
        at: now
      });
      this.applySplashDamage(projectile, x, y, now);
    } else if (playerTarget) {
      const attacker = this.state.players.get(projectile.ownerId);
      if (attacker) {
        this.damagePlayer(playerTarget, attacker, projectile.damage, now, projectile.classId as WeaponClassId);
        if (projectile.statusPower > 0) {
          this.applyStatusToPlayer(playerTarget, projectile.classId === "emp-launcher" ? "emp" : "burn", projectile.statusPower, now);
        }
      }
    } else if (vehicleTarget) {
      const attacker = this.state.players.get(projectile.ownerId);
      if (attacker) {
        this.damageVehicle(vehicleTarget, attacker, projectile.damage, now, projectile.classId as WeaponClassId);
        if (projectile.statusPower > 0) {
          this.applyStatusToVehicle(vehicleTarget, "emp", projectile.statusPower, now);
        }
      }
    }

    if (projectile.spawnHazardKind === "napalm") {
      this.spawnHazard("napalm", projectile.ownerId, projectile.team as TeamId, x, y, Math.max(54, projectile.splashRadius * 0.6), now + NAPALM_DURATION_MS, 16, now);
    }

    if (obstacleImpact) {
      this.broadcast("combat", {
        type: "impactObstacle",
        x,
        y,
        altitudeMode: projectile.altitudeMode as "ground" | "air",
        at: now
      });
      return;
    }

    this.broadcast("combat", {
      type: "impact",
      actorId: projectile.ownerId,
      targetId: playerTarget?.id ?? vehicleTarget?.id,
      team: projectile.team as TeamId,
      classId: projectile.classId as WeaponClassId,
      style: projectile.splashRadius > 0 ? "explosion" : getWeaponClass(projectile.classId as WeaponClassId).impactStyle,
      hit: true,
      blood: Boolean(playerTarget),
      x,
      y,
      radius: projectile.splashRadius || projectile.radius * 3,
      at: now
    });
  }

  private applySplashDamage(projectile: ProjectileState, x: number, y: number, now: number): void {
    const attacker = this.state.players.get(projectile.ownerId);
    if (!attacker) {
      return;
    }

    for (const player of this.state.players.values()) {
      if (!player.alive || player.team === projectile.team || player.currentVehicleId) {
        continue;
      }

      const distance = Math.hypot(player.x - x, player.y - y);
      if (distance > projectile.splashRadius + PLAYER_RADIUS) {
        continue;
      }
      const falloff = 1 - distance / Math.max(projectile.splashRadius, 1);
      this.damagePlayer(player, attacker, projectile.damage * Math.max(0.24, falloff), now, projectile.classId as WeaponClassId);
      if (projectile.classId === "emp-launcher") {
        this.applyStatusToPlayer(player, "emp", projectile.statusPower || EMP_DURATION_MS, now);
      } else if (projectile.classId === "flamethrower" || projectile.spawnHazardKind === "napalm") {
        this.applyStatusToPlayer(player, "burn", Math.max(900, projectile.statusPower), now);
      }
    }

    for (const vehicle of this.state.vehicles.values()) {
      if (!vehicle.alive || vehicle.team === projectile.team) {
        continue;
      }

      const distance = Math.hypot(vehicle.x - x, vehicle.y - y);
      if (distance > projectile.splashRadius + vehicle.radius) {
        continue;
      }
      const falloff = 1 - distance / Math.max(projectile.splashRadius, 1);
      this.damageVehicle(vehicle, attacker, projectile.damage * Math.max(0.3, falloff), now, projectile.classId as WeaponClassId);
      if (projectile.classId === "emp-launcher" || projectile.statusPower > 0) {
        this.applyStatusToVehicle(vehicle, "emp", projectile.statusPower || EMP_DURATION_MS, now);
      } else if (projectile.spawnHazardKind === "napalm") {
        this.applyStatusToVehicle(vehicle, "burn", 1400, now);
      }
    }
  }

  private handleUtilityUse(player: PlayerState, input: InputMessage, now: number): void {
    if (!player.utilityKind || player.utilityCharges <= 0 || player.utilityExpiresAt <= now) {
      player.utilityKind = "";
      player.utilityCharges = 0;
      player.utilityExpiresAt = 0;
      return;
    }
    if (now - player.lastInteractAt < UTILITY_PULSE_MS) {
      return;
    }

    player.lastInteractAt = now;
    const aimDirection = normalizeVector(input.cursorWorldX - player.x, input.cursorWorldY - player.y);
    if (player.utilityKind === "mine") {
      const placeX = clamp(player.x + aimDirection.x * 42, PLAYER_RADIUS, MAP_WIDTH - PLAYER_RADIUS);
      const placeY = clamp(player.y + aimDirection.y * 42, PLAYER_RADIUS, MAP_HEIGHT - PLAYER_RADIUS);
      this.spawnHazard("mine", player.id, player.team as TeamId, placeX, placeY, 22, now + 32000, 0, now + 650);
      this.broadcast("combat", {
        type: "minePlaced",
        actorId: player.id,
        team: player.team as TeamId,
        x: placeX,
        y: placeY,
        at: now
      });
    } else if (player.utilityKind === "napalm") {
      const distance = clamp(Math.hypot(input.cursorWorldX - player.x, input.cursorWorldY - player.y), 70, 260);
      const landX = clamp(player.x + aimDirection.x * distance, 0, MAP_WIDTH);
      const landY = clamp(player.y + aimDirection.y * distance, 0, MAP_HEIGHT);
      this.spawnHazard("napalm", player.id, player.team as TeamId, landX, landY, 88, now + NAPALM_DURATION_MS, 18, now);
    } else {
      return;
    }

    player.utilityCharges -= 1;
    if (player.utilityCharges <= 0) {
      player.utilityKind = "";
      player.utilityExpiresAt = 0;
    }
  }

  private applyFlameCone(player: PlayerState, now: number, fromVehicle: boolean): void {
    const range = fromVehicle ? 250 : getClassRangedRange("flamethrower", player.rangedRangeLevel);
    const coneDot = fromVehicle ? 0.46 : 0.4;
    let hit = false;
    for (const target of this.state.players.values()) {
      if (!target.alive || target.team === player.team || target.currentVehicleId) {
        continue;
      }
      const toTarget = normalizeVector(target.x - player.x, target.y - player.y);
      const distance = Math.hypot(target.x - player.x, target.y - player.y);
      if (distance > range || toTarget.x * player.aimX + toTarget.y * player.aimY < coneDot) {
        continue;
      }
      this.damagePlayer(target, player, fromVehicle ? 18 : 12, now, "flamethrower");
      this.applyStatusToPlayer(target, "burn", 1300, now);
      hit = true;
    }
    for (const vehicle of this.state.vehicles.values()) {
      if (!vehicle.alive || vehicle.team === player.team) {
        continue;
      }
      const toTarget = normalizeVector(vehicle.x - player.x, vehicle.y - player.y);
      const distance = Math.hypot(vehicle.x - player.x, vehicle.y - player.y);
      if (distance > range + vehicle.radius || toTarget.x * player.aimX + toTarget.y * player.aimY < coneDot) {
        continue;
      }
      this.damageVehicle(vehicle, player, fromVehicle ? 20 : 11, now, "flamethrower");
      this.applyStatusToVehicle(vehicle, "burn", 1500, now);
      hit = true;
    }
    this.spawnHazard(
      "napalm",
      player.id,
      player.team as TeamId,
      clamp(player.x + player.aimX * Math.min(range, 150), 0, MAP_WIDTH),
      clamp(player.y + player.aimY * Math.min(range, 150), 0, MAP_HEIGHT),
      fromVehicle ? 72 : 46,
      now + (fromVehicle ? 2600 : 1700),
      fromVehicle ? 14 : 8,
      now
    );
    this.broadcast("combat", {
      type: "impact",
      actorId: player.id,
      team: player.team as TeamId,
      classId: "flamethrower",
      style: "flame",
      hit,
      blood: hit,
      x: player.x + player.aimX * range * 0.64,
      y: player.y + player.aimY * range * 0.64,
      radius: range * 0.5,
      at: now
    });
  }

  private fireFlameConeFromVehicle(vehicle: VehicleState, occupant: PlayerState, now: number): void {
    if (vehicle.lastPrimaryAt + VEHICLE_DEFS["flame-tank"].primary.cooldownMs > now) {
      return;
    }
    vehicle.lastPrimaryAt = now;
    occupant.aimX = vehicle.aimX;
    occupant.aimY = vehicle.aimY;
    occupant.x = vehicle.x;
    occupant.y = vehicle.y;
    this.applyFlameCone(occupant, now, true);
  }

  private fireArtilleryCarrier(vehicle: VehicleState, occupant: PlayerState, input: InputMessage, now: number, suppression: boolean): void {
    const key = suppression ? "lastSecondaryAt" : "lastPrimaryAt";
    const weapon = suppression ? VEHICLE_DEFS["artillery-carrier"].secondary! : VEHICLE_DEFS["artillery-carrier"].primary;
    if (vehicle[key] + weapon.cooldownMs > now) {
      return;
    }
    vehicle[key] = now;
    const direction = normalizeVector(input.cursorWorldX - vehicle.x, input.cursorWorldY - vehicle.y);
    const targetDistance = clamp(Math.hypot(input.cursorWorldX - vehicle.x, input.cursorWorldY - vehicle.y), 80, weapon.range);
    this.spawnProjectile({
      ownerId: occupant.id,
      ownerType: "vehicle",
      team: vehicle.team as TeamId,
      classId: suppression ? "emp-launcher" : "rocket-launcher",
      x: vehicle.x + direction.x * (vehicle.radius + 10),
      y: vehicle.y + direction.y * (vehicle.radius + 10),
      dirX: direction.x,
      dirY: direction.y,
      speed: weapon.projectileSpeed,
      radius: weapon.radius,
      damage: weapon.damage,
      range: targetDistance,
      splashRadius: weapon.splashRadius,
      sourceVehicleId: vehicle.id,
      altitudeMode: "air",
      ignoreObstacles: true,
      targetEntityId: "",
      targetType: "",
      homingStrength: 0,
      splitCount: 0,
      splitAtRange: -1,
      spawnHazardKind: suppression ? "" : "",
      statusPower: suppression ? EMP_DURATION_MS : 0
    });
  }

  private releaseCarrierDrones(vehicle: VehicleState, occupant: PlayerState, now: number): void {
    const weapon = VEHICLE_DEFS["drone-carrier"].secondary!;
    if (vehicle.lastSecondaryAt + weapon.cooldownMs > now) {
      return;
    }
    vehicle.lastSecondaryAt = now;
    for (let index = 0; index < 3; index += 1) {
      const drone = new DroneState();
      drone.id = `drone-${++this.droneSequence}`;
      drone.team = vehicle.team;
      drone.ownerId = occupant.id;
      drone.x = clamp(vehicle.x + (index - 1) * 22, 0, MAP_WIDTH);
      drone.y = clamp(vehicle.y - 18 - index * 4, 0, MAP_HEIGHT);
      drone.aimX = vehicle.aimX;
      drone.aimY = vehicle.aimY;
      drone.health = 34;
      drone.maxHealth = 34;
      drone.radius = 10;
      drone.lastAttackAt = 0;
      drone.expiresAt = now + 14000;
      this.state.drones.set(drone.id, drone);
      this.broadcast("combat", {
        type: "droneLaunch",
        actorId: occupant.id,
        droneId: drone.id,
        team: vehicle.team as TeamId,
        x: drone.x,
        y: drone.y,
        at: now
      });
    }
  }

  private splitClusterProjectile(projectile: ProjectileState, now: number): void {
    this.broadcast("combat", {
      type: "clusterSplit",
      actorId: projectile.ownerId,
      x: projectile.x,
      y: projectile.y,
      at: now
    });
    for (let index = 0; index < projectile.splitCount; index += 1) {
      const angle = (-0.35 + index / Math.max(projectile.splitCount - 1, 1) * 0.7) + (Math.random() - 0.5) * 0.22;
      const direction = rotateVector({ x: projectile.dirX, y: projectile.dirY }, angle);
      this.spawnProjectile({
        ownerId: projectile.ownerId,
        ownerType: projectile.ownerType as "player" | "vehicle",
        team: projectile.team as TeamId,
        classId: "rocket-launcher",
        x: projectile.x,
        y: projectile.y,
        dirX: direction.x,
        dirY: direction.y,
        speed: Math.max(720, projectile.speed * 0.88),
        radius: Math.max(6, projectile.radius - 2),
        damage: Math.max(18, projectile.damage * 0.42),
        range: 260 + Math.random() * 120,
        splashRadius: Math.max(48, projectile.splashRadius * 0.45),
        sourceVehicleId: projectile.sourceVehicleId,
        altitudeMode: "air",
        ignoreObstacles: true,
        targetEntityId: "",
        targetType: "",
        homingStrength: 0,
        splitCount: 0,
        splitAtRange: -1,
        spawnHazardKind: "",
        statusPower: 0
      });
    }
  }

  private spawnHazard(
    kind: "mine" | "napalm",
    ownerId: string,
    team: TeamId,
    x: number,
    y: number,
    radius: number,
    expiresAt: number,
    damagePerSecond: number,
    armedAt: number
  ): void {
    const hazard = new HazardState();
    hazard.id = `hazard-${++this.hazardSequence}`;
    hazard.kind = kind;
    hazard.ownerId = ownerId;
    hazard.team = team;
    hazard.x = x;
    hazard.y = y;
    hazard.radius = radius;
    hazard.damagePerSecond = damagePerSecond;
    hazard.expiresAt = expiresAt;
    hazard.armedAt = armedAt;
    this.state.hazards.set(hazard.id, hazard);
    this.broadcast("combat", {
      type: "hazardSpawn",
      actorId: ownerId,
      hazardKind: kind,
      x,
      y,
      radius,
      at: Date.now()
    });
  }

  private applyStatusToPlayer(player: PlayerState, status: "burn" | "emp" | "overdrive", durationMs: number, now: number): void {
    if (status === "burn") {
      player.burnUntil = Math.max(player.burnUntil, now + durationMs);
    } else if (status === "emp") {
      player.empUntil = Math.max(player.empUntil, now + durationMs);
    } else {
      player.overdriveUntil = Math.max(player.overdriveUntil, now + durationMs);
    }
    this.broadcast("combat", {
      type: "statusApplied",
      actorId: player.id,
      targetId: player.id,
      status,
      at: now
    });
  }

  private applyStatusToVehicle(vehicle: VehicleState, status: "burn" | "emp", durationMs: number, now: number): void {
    if (status === "burn") {
      vehicle.burnUntil = Math.max(vehicle.burnUntil, now + durationMs);
    } else {
      vehicle.empUntil = Math.max(vehicle.empUntil, now + durationMs);
    }
    this.broadcast("combat", {
      type: "statusApplied",
      actorId: vehicle.occupantId || vehicle.id,
      targetId: vehicle.id,
      status,
      at: now
    });
  }

  private findFallbackAttacker(team: TeamId, preferredId = ""): PlayerState | undefined {
    if (preferredId) {
      const preferred = this.state.players.get(preferredId);
      if (preferred) {
        return preferred;
      }
    }
    return Array.from(this.state.players.values()).find((player) => player.team === team) ?? Array.from(this.state.players.values())[0];
  }

  private damagePlayer(target: PlayerState, attacker: PlayerState, amount: number, now: number, classId: WeaponClassId): void {
    if (!target.alive || target.team === attacker.team || now < target.shieldUntil) {
      return;
    }

    target.lastDamageAt = now;
    target.regenBlockedUntil = now + PASSIVE_REGEN_DELAY_MS;
    const armorAbsorb = Math.min(target.armor, amount * 0.58);
    target.armor = clamp(target.armor - armorAbsorb, 0, target.maxArmor);
    const healthDamage = Math.max(1, amount - armorAbsorb);
    target.health -= healthDamage;
    target.velocityX += attacker.aimX * (getWeaponClass(classId).knockback * (target.activePath === "melee" ? 0.45 : 1));
    target.velocityY += attacker.aimY * (getWeaponClass(classId).knockback * (target.activePath === "melee" ? 0.45 : 1));
    this.recordDamage(target.id, attacker.id, healthDamage, now);
    this.addScore(attacker, healthDamage * DAMAGE_SCORE_FACTOR);

    if (target.health <= 0) {
      this.killPlayer(target, attacker, now, classId);
    }
  }

  private damageVehicle(vehicle: VehicleState, attacker: PlayerState, amount: number, now: number, classId: WeaponClassId): void {
    if (!vehicle.alive || vehicle.team === attacker.team) {
      return;
    }

    vehicle.regenBlockedUntil = now + PASSIVE_REGEN_DELAY_MS;
    const armorAbsorb = Math.min(vehicle.armor, amount * 0.64);
    vehicle.armor = clamp(vehicle.armor - armorAbsorb, 0, vehicle.maxArmor);
    vehicle.health -= Math.max(1, amount - armorAbsorb);
    this.addScore(attacker, amount * DAMAGE_SCORE_FACTOR * 0.9);
    if (vehicle.health <= 0) {
      this.destroyVehicle(vehicle, attacker, now, classId);
    }
  }

  private killPlayer(target: PlayerState, attacker: PlayerState, now: number, classId: WeaponClassId): void {
    target.alive = false;
    target.health = 0;
    target.deaths += 1;
    target.respawnAt = now + RESPAWN_MS;
    this.unmountPlayer(target, true);
    attacker.kills += 1;
    this.addScore(attacker, KILL_SCORE);

    const ledger = this.damageLedger.get(target.id);
    if (ledger) {
      for (const [assistantId, entry] of ledger) {
        if (assistantId === attacker.id || now - entry.at > 9000 || entry.amount < 16) {
          continue;
        }
        const assistant = this.state.players.get(assistantId);
        if (assistant) {
          assistant.assists += 1;
          this.addScore(assistant, ASSIST_SCORE);
        }
      }
      this.damageLedger.delete(target.id);
    }

    if (Math.random() < DEATH_DROP_CHANCE) {
      this.spawnPickup(target.x, target.y, now, Math.random() > 0.5);
    }

    this.broadcast("combat", {
      type: "kill",
      actorId: attacker.id,
      targetId: target.id,
      team: attacker.team as TeamId,
      classId,
      at: now
    });

    this.resetPlayerBuild(target);
  }

  private destroyVehicle(vehicle: VehicleState, attacker: PlayerState, now: number, classId: WeaponClassId): void {
    vehicle.alive = false;
    const definition = VEHICLE_DEFS[vehicle.type as VehicleTypeId];
    vehicle.health = 0;
    vehicle.respawnAt = now + definition.respawnMs;
    if (vehicle.occupantId) {
      const occupant = this.state.players.get(vehicle.occupantId);
      if (occupant && occupant.alive) {
        occupant.currentVehicleId = "";
        occupant.health = 1;
        occupant.armor = 0;
        occupant.x = clamp(vehicle.x + (vehicle.team === "germany" ? -VEHICLE_EJECT_DISTANCE : VEHICLE_EJECT_DISTANCE), PLAYER_RADIUS, MAP_WIDTH - PLAYER_RADIUS);
        occupant.y = clamp(vehicle.y + 22, PLAYER_RADIUS, MAP_HEIGHT - PLAYER_RADIUS);
        occupant.regenBlockedUntil = now + PASSIVE_REGEN_DELAY_MS;
      }
      vehicle.occupantId = "";
    }

    attacker.kills += 1;
    this.addScore(attacker, KILL_SCORE * 0.9);
    this.broadcast("combat", {
      type: "vehicleDestroyed",
      actorId: attacker.id,
      vehicleId: vehicle.id,
      vehicleType: vehicle.type as VehicleTypeId,
      team: vehicle.team as TeamId,
      at: now
    });
    this.broadcast("combat", {
      type: "impact",
      actorId: attacker.id,
      targetId: vehicle.id,
      team: attacker.team as TeamId,
      classId,
      style: "explosion",
      hit: true,
      blood: false,
      x: vehicle.x,
      y: vehicle.y,
      radius: definition.radius * 2.5,
      at: now
    });
  }

  private addScore(player: PlayerState, amount: number): void {
    const score = Math.max(0, amount * getUnderdogMultiplier(this.getHumanCount(player.team as TeamId), this.getHumanCount(otherTeam(player.team as TeamId))));
    player.combatScore += score;
    player.careerScore += score;
    const nextTier = getUnlockTier(player.combatScore);
    if (nextTier > player.unlockedMeleeTier) {
      player.unlockedMeleeTier = nextTier;
      player.unlockedRangedTier = nextTier;
    }
  }

  private recordDamage(targetId: string, attackerId: string, amount: number, now: number): void {
    const ledger = this.damageLedger.get(targetId) ?? new Map<string, DamageEntry>();
    const existing = ledger.get(attackerId);
    ledger.set(attackerId, {
      amount: (existing?.amount ?? 0) + amount,
      at: now
    });
    this.damageLedger.set(targetId, ledger);
  }

  private getHumanCount(team: TeamId): number {
    return Array.from(this.state.players.values()).filter((player) => !player.isBot && player.team === team).length;
  }

  private findAirTarget(team: TeamId, x: number, y: number, direction: { x: number; y: number }): string {
    const candidate = Array.from(this.state.vehicles.values())
      .filter((vehicle) => vehicle.alive && vehicle.team !== team && vehicle.airborne)
      .map((vehicle) => ({
        id: vehicle.id,
        distance: Math.hypot(vehicle.x - x, vehicle.y - y),
        dot: normalizeVector(vehicle.x - x, vehicle.y - y).x * direction.x + normalizeVector(vehicle.x - x, vehicle.y - y).y * direction.y
      }))
      .filter((candidate) => candidate.distance < 900 && candidate.dot > 0.5)
      .sort((left, right) => left.distance - right.distance)[0];

    return candidate?.id ?? "";
  }

  private spawnProjectile(config: {
    ownerId: string;
    ownerType: "player" | "vehicle";
    team: TeamId;
    classId: WeaponClassId;
    x: number;
    y: number;
    dirX: number;
    dirY: number;
    speed: number;
    radius: number;
    damage: number;
    range: number;
    splashRadius: number;
    sourceVehicleId: string;
    altitudeMode: "ground" | "air";
    ignoreObstacles: boolean;
    targetEntityId: string;
    targetType: string;
    homingStrength: number;
    splitCount: number;
    splitAtRange: number;
    spawnHazardKind: string;
    statusPower: number;
  }): void {
    const projectile = new ProjectileState();
    projectile.id = `proj-${++this.projectileSequence}`;
    projectile.ownerId = config.ownerId;
    projectile.ownerType = config.ownerType;
    projectile.team = config.team;
    projectile.sourceVehicleId = config.sourceVehicleId;
    projectile.x = config.x;
    projectile.y = config.y;
    projectile.prevX = config.x;
    projectile.prevY = config.y;
    projectile.dirX = config.dirX;
    projectile.dirY = config.dirY;
    projectile.speed = config.speed;
    projectile.radius = config.radius;
    projectile.damage = config.damage;
    projectile.classId = config.classId;
    projectile.splashRadius = config.splashRadius;
    projectile.remainingRange = config.range;
    projectile.expiresAt = Date.now() + 4000;
    projectile.targetEntityId = config.targetEntityId;
    projectile.targetType = config.targetType;
    projectile.homingStrength = config.homingStrength;
    projectile.altitudeMode = config.altitudeMode;
    projectile.ignoreObstacles = config.ignoreObstacles;
    projectile.splitCount = config.splitCount;
    projectile.splitAtRange = config.splitAtRange;
    projectile.spawnHazardKind = config.spawnHazardKind;
    projectile.statusPower = config.statusPower;
    this.state.projectiles.set(projectile.id, projectile);
  }

  private updateVehicleSalvos(now: number): void {
    for (const [salvoKey, salvo] of this.pendingVehicleSalvos) {
      const vehicle = this.state.vehicles.get(salvo.vehicleId);
      const occupant = this.state.players.get(salvo.occupantId);
      if (!vehicle || !vehicle.alive || !occupant || !occupant.alive || vehicle.occupantId !== occupant.id || occupant.currentVehicleId !== vehicle.id) {
        this.pendingVehicleSalvos.delete(salvoKey);
        continue;
      }

      const definition = VEHICLE_DEFS[vehicle.type as VehicleTypeId];
      const weapon = salvo.slot === "primary" ? definition.primary : definition.secondary;
      const interval = weapon?.salvoIntervalMs ?? 0;
      if (!weapon || interval <= 0) {
        this.pendingVehicleSalvos.delete(salvoKey);
        continue;
      }

      while (salvo.remaining > 0 && now >= salvo.nextAt) {
        const side = weapon.alternatingBarrels ? salvo.side : 0;
        this.spawnVehicleProjectile(vehicle, occupant, weapon, salvo.slot, side);
        salvo.remaining -= 1;
        salvo.side = salvo.side === 1 ? -1 : 1;
        salvo.nextAt += interval;
      }

      if (salvo.remaining <= 0) {
        this.pendingVehicleSalvos.delete(salvoKey);
      }
    }
  }

  private spawnVehicleProjectile(
    vehicle: VehicleState,
    occupant: PlayerState,
    weapon: NonNullable<VehicleDefinition["primary"]>,
    slot: VehicleWeaponSlot,
    barrelSide: number
  ): void {
    const angleOffset = (Math.random() - 0.5) * weapon.spread;
    const forward = normalizeVector(vehicle.aimX, vehicle.aimY);
    const direction = rotateVector(forward, angleOffset);
    const perpendicular = normalizeVector(-direction.y, direction.x);
    const lateralOffset = barrelSide * Math.max(12, Math.round(vehicle.radius * 0.4));
    const targetAirOnly = weapon.targetAirOnly ?? false;
    const homingTarget = weapon.homingStrength ? this.findAirTarget(vehicle.team as TeamId, vehicle.x, vehicle.y, direction) : "";
    const classId = getVehicleWeaponClassId(vehicle.type as VehicleTypeId, slot);
    let spawnHazardKind = "";
    let statusPower = 0;
    if (vehicle.type === "flame-tank" && slot === "secondary") {
      spawnHazardKind = "napalm";
    }
    if ((vehicle.type === "artillery-carrier" && slot === "secondary") || (vehicle.type === "aa-buggy" && slot === "secondary")) {
      statusPower = EMP_DURATION_MS;
    }
    this.spawnProjectile({
      ownerId: occupant.id,
      ownerType: "vehicle",
      team: vehicle.team as TeamId,
      classId,
      x: vehicle.x + direction.x * (vehicle.radius + 8) + perpendicular.x * lateralOffset,
      y: vehicle.y + direction.y * (vehicle.radius + 8) + perpendicular.y * lateralOffset,
      dirX: direction.x,
      dirY: direction.y,
      speed: weapon.projectileSpeed,
      radius: weapon.radius,
      damage: weapon.damage,
      range: weapon.range,
      splashRadius: weapon.splashRadius,
      sourceVehicleId: vehicle.id,
      altitudeMode: vehicle.airborne ? "air" : "ground",
      ignoreObstacles: weapon.ignoreObstacles ?? false,
      targetEntityId: targetAirOnly || homingTarget ? homingTarget : "",
      targetType: homingTarget ? "vehicle" : "",
      homingStrength: weapon.homingStrength ?? 0,
      splitCount: 0,
      splitAtRange: -1,
      spawnHazardKind,
      statusPower
    });
  }

  private getVehicleSalvoKey(vehicleId: string, slot: VehicleWeaponSlot): string {
    return `${vehicleId}:${slot}`;
  }

  private findObstacleIntersection(fromX: number, fromY: number, toX: number, toY: number): { x: number; y: number } | undefined {
    for (const obstacle of this.state.obstacles.values()) {
      if (segmentIntersectsObstacle(fromX, fromY, toX, toY, obstacle)) {
        return { x: toX, y: toY };
      }
    }

    return undefined;
  }

  private resolveGroundCollision(entity: { x: number; y: number }, radius: number): void {
    for (const obstacle of this.state.obstacles.values()) {
      resolveEntityAgainstObstacle(entity, radius, obstacle);
    }
  }

  private hasLineOfSight(fromX: number, fromY: number, toX: number, toY: number, altitudeMode: "ground" | "air"): boolean {
    if (altitudeMode === "air") {
      return true;
    }

    for (const obstacle of this.state.obstacles.values()) {
      if (segmentIntersectsObstacle(fromX, fromY, toX, toY, obstacle)) {
        return false;
      }
    }

    return true;
  }
}

function sanitizePlayerName(value: string | undefined, fallbackIndex: number): string {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim().slice(0, 24);
  return normalized || `Operative ${fallbackIndex}`;
}

function getUpgradeLevelKey(stat: UpgradeStat): UpgradeLevelKey {
  switch (stat) {
    case "damage":
      return "meleeDamageLevel";
    case "speed":
      return "meleeSpeedLevel";
    case "range":
      return "meleeRangeLevel";
    case "rate":
      return "rangedRateLevel";
    case "accuracy":
      return "rangedAccuracyLevel";
    case "health":
      return "healthLevel";
    case "armor":
      return "armorLevel";
    case "mobility":
      return "movementLevel";
    default:
      return "movementLevel";
  }
}

function sanitizeInput(message: InputMessage | undefined): InputMessage {
  return {
    moveX: normalizeComponent(message?.moveX ?? 0),
    moveY: normalizeComponent(message?.moveY ?? 0),
    aimX: normalizeComponent(message?.aimX ?? 1),
    aimY: normalizeComponent(message?.aimY ?? 0),
    cursorWorldX: Number.isFinite(message?.cursorWorldX) ? clamp(message?.cursorWorldX ?? 0, 0, MAP_WIDTH) : 0,
    cursorWorldY: Number.isFinite(message?.cursorWorldY) ? clamp(message?.cursorWorldY ?? 0, 0, MAP_HEIGHT) : 0,
    primary: Boolean(message?.primary),
    secondary: Boolean(message?.secondary),
    utility: Boolean(message?.utility),
    dash: Boolean(message?.dash),
    interact: Boolean(message?.interact)
  };
}

function otherTeam(team: TeamId): TeamId {
  return team === "germany" ? "france" : "germany";
}

function pickRandom<T>(items: readonly T[]): T | undefined {
  if (items.length === 0) {
    return undefined;
  }
  return items[Math.floor(Math.random() * items.length)];
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function getVehicleWeaponClassId(type: VehicleTypeId, slot: VehicleWeaponSlot): WeaponClassId {
  if (type === "heavy-mg") {
    return "machine-gun";
  }
  if (type === "rocket-truck") {
    return "rocket-launcher";
  }
  if (type === "aa-buggy") {
    return slot === "primary" ? "machine-gun" : "emp-launcher";
  }
  if (type === "flame-tank") {
    return slot === "primary" ? "flamethrower" : "rocket-launcher";
  }
  if (type === "artillery-carrier") {
    return slot === "primary" ? "rocket-launcher" : "emp-launcher";
  }
  if (type === "gunship-plane") {
    return slot === "primary" ? "machine-gun" : "rocket-launcher";
  }
  if (type === "drone-carrier") {
    return slot === "primary" ? "smg" : "emp-launcher";
  }
  if (type === "tank") {
    return slot === "primary" ? "rocket-launcher" : "machine-gun";
  }
  return slot === "primary" ? "machine-gun" : "rocket-launcher";
}

function resolveEntityAgainstObstacle(entity: { x: number; y: number }, radius: number, obstacle: ObstacleState): void {
  if (obstacle.shape === "circle") {
    const deltaX = entity.x - obstacle.x;
    const deltaY = entity.y - obstacle.y;
    const distance = Math.hypot(deltaX, deltaY);
    const minDistance = obstacle.radius + radius;
    if (distance > 0 && distance < minDistance) {
      const push = (minDistance - distance) / distance;
      entity.x += deltaX * push;
      entity.y += deltaY * push;
    }
    return;
  }

  const halfWidth = obstacle.width / 2;
  const halfHeight = obstacle.height / 2;
  const nearestX = clamp(entity.x, obstacle.x - halfWidth, obstacle.x + halfWidth);
  const nearestY = clamp(entity.y, obstacle.y - halfHeight, obstacle.y + halfHeight);
  const deltaX = entity.x - nearestX;
  const deltaY = entity.y - nearestY;
  const distance = Math.hypot(deltaX, deltaY);
  if (distance > 0 && distance < radius) {
    const push = (radius - distance) / distance;
    entity.x += deltaX * push;
    entity.y += deltaY * push;
  }
}

function segmentIntersectsObstacle(fromX: number, fromY: number, toX: number, toY: number, obstacle: ObstacleState): boolean {
  if (obstacle.shape === "circle") {
    return distancePointToSegment(obstacle.x, obstacle.y, fromX, fromY, toX, toY) <= obstacle.radius;
  }
  return segmentIntersectsRect(
    fromX,
    fromY,
    toX,
    toY,
    obstacle.x - obstacle.width / 2,
    obstacle.y - obstacle.height / 2,
    obstacle.width,
    obstacle.height
  );
}

function segmentIntersectsRect(fromX: number, fromY: number, toX: number, toY: number, x: number, y: number, width: number, height: number): boolean {
  const minX = Math.min(fromX, toX);
  const maxX = Math.max(fromX, toX);
  const minY = Math.min(fromY, toY);
  const maxY = Math.max(fromY, toY);
  if (maxX < x || minX > x + width || maxY < y || minY > y + height) {
    return false;
  }
  return true;
}

function distancePointToSegment(pointX: number, pointY: number, fromX: number, fromY: number, toX: number, toY: number): number {
  const deltaX = toX - fromX;
  const deltaY = toY - fromY;
  if (deltaX === 0 && deltaY === 0) {
    return Math.hypot(pointX - fromX, pointY - fromY);
  }
  const projection = clamp(((pointX - fromX) * deltaX + (pointY - fromY) * deltaY) / (deltaX * deltaX + deltaY * deltaY), 0, 1);
  const closestX = fromX + deltaX * projection;
  const closestY = fromY + deltaY * projection;
  return Math.hypot(pointX - closestX, pointY - closestY);
}

function rotateVector(vector: { x: number; y: number }, radians: number): { x: number; y: number } {
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return {
    x: vector.x * cosine - vector.y * sine,
    y: vector.x * sine + vector.y * cosine
  };
}

function normalizeComponent(value: number): number {
  return clamp(Number.isFinite(value) ? value : 0, -1, 1);
}

function clampEntityToMap(entity: { x: number; y: number }, radius: number): void {
  entity.x = clamp(entity.x, radius, MAP_WIDTH - radius);
  entity.y = clamp(entity.y, radius, MAP_HEIGHT - radius);
}

function friendlyUpgradeName(stat: UpgradeStat): string {
  switch (stat) {
    case "damage":
      return "Melee Damage";
    case "speed":
      return "Melee Speed";
    case "range":
      return "Range";
    case "rate":
      return "Ranged Rate";
    case "accuracy":
      return "Accuracy";
    case "health":
      return "Health";
    case "armor":
      return "Armor";
    case "mobility":
      return "Mobility";
    default:
      return "Upgrade";
  }
}
