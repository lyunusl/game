import type { WeaponClassId, WeaponPath } from "./arsenal";
import type { LaneId, TeamId } from "./constants";
import type { AltitudeMode, PickupKind, VehicleTypeId } from "./world";

export type ProgressionPath = WeaponPath;

export type RoomVisibility = "public" | "private";

export const PUBLIC_ROOM_NAME = "war-swarm-public";
export const PRIVATE_ROOM_NAME = "war-swarm-private";

export type JoinPayload = {
  visibility?: RoomVisibility;
  playerName?: string;
  preferredTeam?: TeamId | "auto";
  botCountPerTeam?: number;
};

export type InputMessage = {
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
  cursorWorldX: number;
  cursorWorldY: number;
  primary: boolean;
  secondary: boolean;
  utility: boolean;
  dash: boolean;
  interact: boolean;
};

export type UpgradeCategory = "melee" | "ranged" | "general";

export type UpgradeStat =
  | "damage"
  | "speed"
  | "range"
  | "rate"
  | "accuracy"
  | "health"
  | "armor"
  | "mobility";

export type UpgradeChoice = {
  category: UpgradeCategory;
  stat: UpgradeStat;
};

export type RespawnChoice = {
  lane: LaneId;
};

export type QueueClassChoice = {
  classId: WeaponClassId;
};

export type SelectClassChoice = {
  classId: WeaponClassId;
};

export type CombatEvent =
  | {
      type: "kill";
      actorId: string;
      targetId: string;
      team?: TeamId;
      classId?: WeaponClassId;
      at: number;
    }
  | {
      type: "capture";
      actorId: string;
      team?: TeamId;
      objectiveId?: string;
      at: number;
    }
  | {
      type: "impact";
      actorId: string;
      targetId?: string;
      team?: TeamId;
      classId: WeaponClassId;
      style: "melee" | "bullet" | "explosion" | "flame" | "shock";
      hit: boolean;
      blood: boolean;
      x: number;
      y: number;
      radius?: number;
      at: number;
    }
  | {
      type: "explosion";
      actorId: string;
      team?: TeamId;
      classId: WeaponClassId;
      x: number;
      y: number;
      radius: number;
      at: number;
    }
  | {
      type: "select";
      actorId: string;
      classId: WeaponClassId;
      at: number;
    }
  | {
      type: "unlock";
      actorId: string;
      classId: WeaponClassId;
      at: number;
    }
  | {
      type: "pickup";
      actorId: string;
      pickupKind: PickupKind;
      label: string;
      at: number;
    }
  | {
      type: "mount";
      actorId: string;
      vehicleId: string;
      vehicleType: VehicleTypeId;
      at: number;
    }
  | {
      type: "vehicleDestroyed";
      actorId: string;
      vehicleId: string;
      vehicleType: VehicleTypeId;
      team?: TeamId;
      at: number;
    }
  | {
      type: "vehicleRespawn";
      vehicleId: string;
      vehicleType: VehicleTypeId;
      team?: TeamId;
      at: number;
    }
  | {
      type: "healZoneSpawn";
      zoneId: string;
      x: number;
      y: number;
      radius: number;
      at: number;
    }
  | {
      type: "healZoneExpire";
      zoneId: string;
      at: number;
    }
  | {
      type: "impactObstacle";
      x: number;
      y: number;
      altitudeMode: AltitudeMode;
      at: number;
    }
  | {
      type: "statusApplied" | "statusExpired";
      actorId: string;
      status: "burn" | "emp" | "overdrive";
      targetId?: string;
      at: number;
    }
  | {
      type: "clusterSplit";
      actorId: string;
      x: number;
      y: number;
      at: number;
    }
  | {
      type: "minePlaced" | "mineTriggered";
      actorId: string;
      team?: TeamId;
      x: number;
      y: number;
      at: number;
    }
  | {
      type: "hazardSpawn" | "hazardExpire";
      actorId?: string;
      hazardKind: "mine" | "napalm";
      x: number;
      y: number;
      radius: number;
      at: number;
    }
  | {
      type: "droneLaunch" | "droneDestroyed";
      actorId: string;
      droneId: string;
      team?: TeamId;
      x: number;
      y: number;
      at: number;
    };
