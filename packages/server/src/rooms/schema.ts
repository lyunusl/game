import { MapSchema, Schema, type } from "@colyseus/schema";

export class ObjectiveState extends Schema {
  @type("string") id = "";
  @type("string") lane = "";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") radius = 0;
  @type("number") progress = 0;
  @type("string") owner = "neutral";
}

export class PlayerState extends Schema {
  @type("string") id = "";
  @type("string") name = "";
  @type("string") team = "";
  @type("string") preferredLane = "middle";
  @type("string") activePath = "ranged";
  @type("string") activeClassId = "pistol";
  @type("string") currentVehicleId = "";
  @type("boolean") isBot = false;
  @type("boolean") alive = true;
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") aimX = 1;
  @type("number") aimY = 0;
  @type("number") velocityX = 0;
  @type("number") velocityY = 0;
  @type("number") health = 100;
  @type("number") maxHealth = 100;
  @type("number") armor = 0;
  @type("number") maxArmor = 0;
  @type("number") combatScore = 0;
  @type("number") careerScore = 0;
  @type("number") regenBlockedUntil = 0;
  @type("number") shieldUntil = 0;
  @type("number") respawnAt = 0;
  @type("number") dashUntil = 0;
  @type("number") unlockedMeleeTier = 0;
  @type("number") unlockedRangedTier = 0;
  @type("number") healthLevel = 0;
  @type("number") armorLevel = 0;
  @type("number") meleeDamageLevel = 0;
  @type("number") meleeSpeedLevel = 0;
  @type("number") meleeRangeLevel = 0;
  @type("number") rangedRateLevel = 0;
  @type("number") rangedRangeLevel = 0;
  @type("number") rangedAccuracyLevel = 0;
  @type("number") movementLevel = 0;
  @type("number") burnUntil = 0;
  @type("number") empUntil = 0;
  @type("number") overdriveUntil = 0;
  @type("number") spinUp = 0;
  @type("string") utilityKind = "";
  @type("number") utilityCharges = 0;
  @type("number") utilityExpiresAt = 0;
  @type("number") lastMeleeAt = 0;
  @type("number") lastRangedAt = 0;
  @type("number") lastDamageAt = 0;
  @type("number") lastInteractAt = 0;
  @type("number") dashCooldownUntil = 0;
  @type("number") stuckUntil = 0;
  @type("number") kills = 0;
  @type("number") assists = 0;
  @type("number") deaths = 0;
}

export class VehicleState extends Schema {
  @type("string") id = "";
  @type("string") type = "";
  @type("string") team = "";
  @type("string") occupantId = "";
  @type("boolean") alive = true;
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") aimX = 1;
  @type("number") aimY = 0;
  @type("number") velocityX = 0;
  @type("number") velocityY = 0;
  @type("number") health = 0;
  @type("number") maxHealth = 0;
  @type("number") armor = 0;
  @type("number") maxArmor = 0;
  @type("number") radius = 0;
  @type("boolean") mobile = false;
  @type("boolean") airborne = false;
  @type("number") respawnAt = 0;
  @type("number") lastPrimaryAt = 0;
  @type("number") lastSecondaryAt = 0;
  @type("number") regenBlockedUntil = 0;
  @type("number") burnUntil = 0;
  @type("number") empUntil = 0;
  @type("number") overdriveUntil = 0;
  @type("number") spinUp = 0;
  @type("number") spawnX = 0;
  @type("number") spawnY = 0;
}

export class PickupState extends Schema {
  @type("string") id = "";
  @type("string") kind = "";
  @type("string") label = "";
  @type("string") weaponClassId = "";
  @type("string") utilityKind = "";
  @type("string") upgradeStat = "";
  @type("number") upgradeAmount = 0;
  @type("number") bonusHealth = 0;
  @type("number") bonusArmor = 0;
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") radius = 18;
  @type("number") expiresAt = 0;
}

export class ZoneState extends Schema {
  @type("string") id = "";
  @type("string") kind = "";
  @type("string") team = "";
  @type("boolean") active = true;
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") radius = 0;
  @type("number") healPerSecond = 0;
  @type("number") armorPerSecond = 0;
  @type("number") expiresAt = 0;
}

export class ObstacleState extends Schema {
  @type("string") id = "";
  @type("string") kind = "";
  @type("string") shape = "circle";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") width = 0;
  @type("number") height = 0;
  @type("number") radius = 0;
}

export class ProjectileState extends Schema {
  @type("string") id = "";
  @type("string") ownerId = "";
  @type("string") team = "";
  @type("string") ownerType = "player";
  @type("string") sourceVehicleId = "";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") prevX = 0;
  @type("number") prevY = 0;
  @type("number") dirX = 1;
  @type("number") dirY = 0;
  @type("number") speed = 0;
  @type("number") radius = 0;
  @type("number") damage = 0;
  @type("string") classId = "pistol";
  @type("number") splashRadius = 0;
  @type("number") remainingRange = 0;
  @type("number") expiresAt = 0;
  @type("string") targetEntityId = "";
  @type("string") targetType = "";
  @type("number") homingStrength = 0;
  @type("string") altitudeMode = "ground";
  @type("boolean") ignoreObstacles = false;
  @type("number") splitCount = 0;
  @type("number") splitAtRange = -1;
  @type("string") spawnHazardKind = "";
  @type("number") statusPower = 0;
}

export class HazardState extends Schema {
  @type("string") id = "";
  @type("string") kind = "";
  @type("string") team = "";
  @type("string") ownerId = "";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") radius = 0;
  @type("number") damagePerSecond = 0;
  @type("number") expiresAt = 0;
  @type("number") armedAt = 0;
}

export class DroneState extends Schema {
  @type("string") id = "";
  @type("string") team = "";
  @type("string") ownerId = "";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") aimX = 1;
  @type("number") aimY = 0;
  @type("string") targetId = "";
  @type("number") health = 0;
  @type("number") maxHealth = 0;
  @type("number") radius = 0;
  @type("number") lastAttackAt = 0;
  @type("number") expiresAt = 0;
}

export class MatchState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type({ map: VehicleState }) vehicles = new MapSchema<VehicleState>();
  @type({ map: PickupState }) pickups = new MapSchema<PickupState>();
  @type({ map: ZoneState }) zones = new MapSchema<ZoneState>();
  @type({ map: ObstacleState }) obstacles = new MapSchema<ObstacleState>();
  @type({ map: HazardState }) hazards = new MapSchema<HazardState>();
  @type({ map: DroneState }) drones = new MapSchema<DroneState>();
  @type({ map: ObjectiveState }) objectives = new MapSchema<ObjectiveState>();
  @type({ map: ProjectileState }) projectiles = new MapSchema<ProjectileState>();
  @type("number") germanyScore = 0;
  @type("number") franceScore = 0;
  @type("number") frontlineShift = 0;
  @type("number") startedAt = Date.now();

  constructor() {
    super();
    this.players = new MapSchema<PlayerState>();
    this.vehicles = new MapSchema<VehicleState>();
    this.pickups = new MapSchema<PickupState>();
    this.zones = new MapSchema<ZoneState>();
    this.obstacles = new MapSchema<ObstacleState>();
    this.hazards = new MapSchema<HazardState>();
    this.drones = new MapSchema<DroneState>();
    this.objectives = new MapSchema<ObjectiveState>();
    this.projectiles = new MapSchema<ProjectileState>();
  }
}
