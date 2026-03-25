import type { VehicleTypeId, WeaponRenderKind } from "../../shared/src";

type TextureDefinition = {
  url: string;
  fallbackKey?: string;
  baseAngle?: number;
  scaleMultiplier?: number;
};

export const ASSET_MANIFEST = {
  "soldier-base": {
    url: "/assets/characters/soldier-base.svg"
  },
  "soldier-shadow": {
    url: "/assets/characters/soldier-shadow.svg"
  },
  "weapon-blade": {
    url: "/assets/characters/weapon-blade.svg",
    baseAngle: 90
  },
  "weapon-blunt": {
    url: "/assets/characters/weapon-blunt.svg",
    baseAngle: 90
  },
  "weapon-chain": {
    url: "/assets/characters/weapon-chain.svg",
    baseAngle: 90
  },
  "weapon-pistol": {
    url: "/assets/characters/weapon-pistol.svg"
  },
  "weapon-rifle": {
    url: "/assets/characters/weapon-rifle.svg"
  },
  "weapon-shotgun": {
    url: "/assets/characters/weapon-shotgun.svg"
  },
  "weapon-smg": {
    url: "/assets/characters/weapon-smg.svg"
  },
  "weapon-heavy": {
    url: "/assets/characters/weapon-heavy.svg"
  },
  "weapon-launcher": {
    url: "/assets/characters/weapon-launcher.svg"
  },
  "weapon-flame": {
    url: "/assets/characters/weapon-flame.svg"
  },
  "weapon-emp": {
    url: "/assets/characters/weapon-emp.svg"
  },
  "vehicle-heavy-mg": {
    url: "/assets/vehicles/heavy-mg.svg"
  },
  "vehicle-rocket-truck": {
    url: "/assets/vehicles/rocket-truck.svg"
  },
  "vehicle-tank": {
    url: "/assets/vehicles/tank.svg"
  },
  "vehicle-plane": {
    url: "/assets/vehicles/plane.svg",
    baseAngle: 90
  },
  "vehicle-aa-buggy": {
    url: "/assets/vehicles/aa-buggy.svg"
  },
  "vehicle-flame-tank": {
    url: "/assets/vehicles/flame-tank.svg"
  },
  "vehicle-artillery-carrier": {
    url: "/assets/vehicles/artillery-carrier.svg"
  },
  "vehicle-gunship-plane": {
    url: "/assets/vehicles/gunship-plane.svg",
    baseAngle: 90
  },
  "vehicle-drone-carrier": {
    url: "/assets/vehicles/drone-carrier.svg"
  },
  "vehicle-drone": {
    url: "/assets/vehicles/drone.svg"
  },
  "prop-rock": {
    url: "/assets/props/rock.svg"
  },
  "prop-sandbag": {
    url: "/assets/props/sandbag.svg"
  },
  "prop-house": {
    url: "/assets/props/house.svg"
  },
  "prop-wall": {
    url: "/assets/props/wall.svg"
  },
  "prop-terrain-patch": {
    url: "/assets/props/terrain-patch.svg"
  },
  "effect-heal-cross": {
    url: "/assets/effects/heal-cross.svg"
  },
  "effect-pickup-crate": {
    url: "/assets/effects/pickup-crate.svg"
  },
  "effect-pickup-skill": {
    url: "/assets/effects/pickup-skill.svg"
  },
  "effect-pickup-mine": {
    url: "/assets/effects/pickup-mine.svg"
  },
  "effect-pickup-napalm": {
    url: "/assets/effects/pickup-napalm.svg"
  },
  "effect-pickup-overdrive": {
    url: "/assets/effects/pickup-overdrive.svg"
  },
  "effect-hazard-mine": {
    url: "/assets/effects/hazard-mine.svg"
  },
  "effect-hazard-napalm": {
    url: "/assets/effects/hazard-napalm.svg"
  },
  "effect-muzzle-flash": {
    url: "/assets/imported/effects/muzzle-flash.png",
    fallbackKey: "effect-muzzle-flash-legacy",
    baseAngle: 90,
    scaleMultiplier: 0.95
  },
  "effect-muzzle-flash-legacy": {
    url: "/assets/effects/muzzle-flash.svg"
  },
  "effect-explosion-burst": {
    url: "/assets/imported/effects/explosion-burst.png",
    fallbackKey: "effect-explosion-burst-legacy",
    baseAngle: 90,
    scaleMultiplier: 1.05
  },
  "effect-explosion-burst-legacy": {
    url: "/assets/effects/explosion-burst.svg"
  },
  "effect-shell-light": {
    url: "/assets/imported/effects/shell-light.png",
    baseAngle: 90,
    scaleMultiplier: 0.92
  },
  "effect-shell-medium": {
    url: "/assets/imported/effects/shell-medium.png",
    baseAngle: 90,
    scaleMultiplier: 0.95
  },
  "effect-shell-heavy": {
    url: "/assets/imported/effects/shell-heavy.png",
    baseAngle: 90,
    scaleMultiplier: 1
  },
  "effect-laser": {
    url: "/assets/imported/effects/laser.png",
    baseAngle: 90,
    scaleMultiplier: 0.94
  },
  "effect-plasma": {
    url: "/assets/imported/effects/plasma.png",
    baseAngle: 90,
    scaleMultiplier: 0.92
  },
  "effect-flame-shot": {
    url: "/assets/imported/effects/flame-shot.png",
    baseAngle: 90,
    scaleMultiplier: 0.98
  },
  "vehicle-heavy-mg-upgrade": {
    url: "/assets/imported/vehicles/heavy-mg.png",
    fallbackKey: "vehicle-heavy-mg",
    baseAngle: 90,
    scaleMultiplier: 0.4
  },
  "vehicle-rocket-truck-upgrade": {
    url: "/assets/imported/vehicles/rocket-truck.png",
    fallbackKey: "vehicle-rocket-truck",
    baseAngle: 90,
    scaleMultiplier: 0.42
  },
  "vehicle-tank-upgrade": {
    url: "/assets/imported/vehicles/tank.png",
    fallbackKey: "vehicle-tank",
    baseAngle: 90,
    scaleMultiplier: 0.42
  },
  "vehicle-aa-buggy-upgrade": {
    url: "/assets/imported/vehicles/aa-buggy.png",
    fallbackKey: "vehicle-aa-buggy",
    baseAngle: 90,
    scaleMultiplier: 0.42
  },
  "vehicle-flame-tank-upgrade": {
    url: "/assets/imported/vehicles/flame-tank.png",
    fallbackKey: "vehicle-flame-tank",
    baseAngle: 90,
    scaleMultiplier: 0.42
  },
  "vehicle-artillery-carrier-upgrade": {
    url: "/assets/imported/vehicles/artillery-carrier.png",
    fallbackKey: "vehicle-artillery-carrier",
    baseAngle: 90,
    scaleMultiplier: 0.42
  },
  "vehicle-drone-carrier-upgrade": {
    url: "/assets/imported/vehicles/drone-carrier.png",
    fallbackKey: "vehicle-drone-carrier",
    baseAngle: 90,
    scaleMultiplier: 0.4
  }
} as const satisfies Record<string, TextureDefinition>;

export type SpriteTextureKey = keyof typeof ASSET_MANIFEST;

export const SPRITE_ASSET_URLS = {} as Record<SpriteTextureKey, string>;
for (const key of Object.keys(ASSET_MANIFEST) as SpriteTextureKey[]) {
  SPRITE_ASSET_URLS[key] = ASSET_MANIFEST[key].url;
}

export const WEAPON_TEXTURE_KEYS: Record<WeaponRenderKind, SpriteTextureKey> = {
  knife: "weapon-blade",
  sword: "weapon-blade",
  katana: "weapon-blade",
  mace: "weapon-blunt",
  hammer: "weapon-blunt",
  morningstar: "weapon-blunt",
  chainblade: "weapon-chain",
  pistol: "weapon-pistol",
  carbine: "weapon-rifle",
  shotgun: "weapon-shotgun",
  flame: "weapon-flame",
  smg: "weapon-smg",
  launcher: "weapon-launcher",
  machinegun: "weapon-heavy",
  minigun: "weapon-heavy",
  emp: "weapon-emp",
  rocket: "weapon-launcher"
};

export const VEHICLE_TEXTURE_KEYS: Record<VehicleTypeId, SpriteTextureKey> = {
  "heavy-mg": "vehicle-heavy-mg-upgrade",
  "rocket-truck": "vehicle-rocket-truck-upgrade",
  tank: "vehicle-tank-upgrade",
  plane: "vehicle-plane",
  "aa-buggy": "vehicle-aa-buggy-upgrade",
  "flame-tank": "vehicle-flame-tank-upgrade",
  "artillery-carrier": "vehicle-artillery-carrier-upgrade",
  "gunship-plane": "vehicle-gunship-plane",
  "drone-carrier": "vehicle-drone-carrier-upgrade"
};

export function getTextureFallback(key: SpriteTextureKey): SpriteTextureKey | undefined {
  const definition = ASSET_MANIFEST[key] as TextureDefinition;
  return definition.fallbackKey as SpriteTextureKey | undefined;
}

export function getTextureBaseAngle(key: SpriteTextureKey): number {
  const definition = ASSET_MANIFEST[key] as TextureDefinition;
  return definition.baseAngle ?? 0;
}

export function getTextureScaleMultiplier(key: SpriteTextureKey): number {
  const definition = ASSET_MANIFEST[key] as TextureDefinition;
  return definition.scaleMultiplier ?? 1;
}
