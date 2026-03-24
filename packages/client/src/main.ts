import "./style.css";

import { Client as ColyseusClient, type Room } from "colyseus.js";
import Phaser from "phaser";

import {
  CLASS_IDS_BY_PATH,
  DASH_COOLDOWN_MS,
  MAP_HEIGHT,
  MAP_WIDTH,
  MAX_UPGRADE_LEVEL,
  OBSTACLE_LAYOUT,
  OBJECTIVE_LAYOUT,
  PRIVATE_ROOM_NAME,
  TEAM_CONFIG,
  TEAM_IDS,
  type RoomVisibility,
  getSpawnPoint,
  getUpgradeCost,
  getWeaponClass,
  isClassUnlocked,
  type CombatEvent,
  type InputMessage,
  type LaneId,
  type SelectClassChoice,
  type TeamId,
  type UpgradeChoice,
  type VehicleTypeId,
  type WeaponClassId,
  type WeaponRenderKind
} from "../../shared/src";

type SnapshotPlayer = {
  id: string;
  name: string;
  team: TeamId;
  preferredLane: LaneId;
  activePath: "melee" | "ranged";
  activeClassId: WeaponClassId;
  currentVehicleId: string;
  isBot: boolean;
  alive: boolean;
  x: number;
  y: number;
  aimX: number;
  aimY: number;
  velocityX: number;
  velocityY: number;
  health: number;
  maxHealth: number;
  armor: number;
  maxArmor: number;
  combatScore: number;
  careerScore: number;
  regenBlockedUntil: number;
  shieldUntil: number;
  respawnAt: number;
  dashUntil: number;
  unlockedMeleeTier: number;
  unlockedRangedTier: number;
  healthLevel: number;
  armorLevel: number;
  meleeDamageLevel: number;
  meleeSpeedLevel: number;
  meleeRangeLevel: number;
  rangedRateLevel: number;
  rangedRangeLevel: number;
  rangedAccuracyLevel: number;
  movementLevel: number;
  burnUntil: number;
  empUntil: number;
  overdriveUntil: number;
  spinUp: number;
  utilityKind: string;
  utilityCharges: number;
  utilityExpiresAt: number;
  lastMeleeAt: number;
  lastRangedAt: number;
  lastDamageAt: number;
  kills: number;
  assists: number;
  deaths: number;
};

type SnapshotObjective = {
  id: string;
  lane: string;
  x: number;
  y: number;
  radius: number;
  progress: number;
  owner: string;
};

type SnapshotProjectile = {
  id: string;
  ownerId: string;
  team: TeamId;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  dirX: number;
  dirY: number;
  radius: number;
  classId: WeaponClassId;
  splashRadius: number;
};

type SnapshotVehicle = {
  id: string;
  type: VehicleTypeId;
  team: TeamId;
  occupantId: string;
  alive: boolean;
  x: number;
  y: number;
  aimX: number;
  aimY: number;
  velocityX: number;
  velocityY: number;
  health: number;
  maxHealth: number;
  armor: number;
  maxArmor: number;
  radius: number;
  mobile: boolean;
  airborne: boolean;
  burnUntil: number;
  empUntil: number;
  overdriveUntil: number;
  spinUp: number;
};

type SnapshotPickup = {
  id: string;
  kind: "weapon" | "skill" | "mine-crate" | "napalm-canister" | "ammo-overdrive";
  label: string;
  weaponClassId: string;
  utilityKind: string;
  x: number;
  y: number;
  radius: number;
};

type SnapshotZone = {
  id: string;
  kind: "base-heal" | "field-heal";
  team: string;
  active: boolean;
  x: number;
  y: number;
  radius: number;
};

type SnapshotObstacle = {
  id: string;
  kind: string;
  shape: "circle" | "rect";
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
};

type SnapshotHazard = {
  id: string;
  kind: "mine" | "napalm";
  team: string;
  ownerId: string;
  x: number;
  y: number;
  radius: number;
  expiresAt: number;
  armedAt: number;
};

type SnapshotDrone = {
  id: string;
  team: TeamId;
  ownerId: string;
  x: number;
  y: number;
  aimX: number;
  aimY: number;
  health: number;
  maxHealth: number;
  radius: number;
  expiresAt: number;
};

type MatchSnapshot = {
  players: SnapshotPlayer[];
  vehicles: SnapshotVehicle[];
  pickups: SnapshotPickup[];
  zones: SnapshotZone[];
  obstacles: SnapshotObstacle[];
  hazards: SnapshotHazard[];
  drones: SnapshotDrone[];
  objectives: SnapshotObjective[];
  projectiles: SnapshotProjectile[];
  germanyScore: number;
  franceScore: number;
  frontlineShift: number;
};

const SPRITE_ASSET_URLS = {
  "soldier-base": "/assets/characters/soldier-base.svg",
  "soldier-shadow": "/assets/characters/soldier-shadow.svg",
  "weapon-blade": "/assets/characters/weapon-blade.svg",
  "weapon-blunt": "/assets/characters/weapon-blunt.svg",
  "weapon-chain": "/assets/characters/weapon-chain.svg",
  "weapon-pistol": "/assets/characters/weapon-pistol.svg",
  "weapon-rifle": "/assets/characters/weapon-rifle.svg",
  "weapon-shotgun": "/assets/characters/weapon-shotgun.svg",
  "weapon-smg": "/assets/characters/weapon-smg.svg",
  "weapon-heavy": "/assets/characters/weapon-heavy.svg",
  "weapon-launcher": "/assets/characters/weapon-launcher.svg",
  "weapon-flame": "/assets/characters/weapon-flame.svg",
  "weapon-emp": "/assets/characters/weapon-emp.svg",
  "vehicle-heavy-mg": "/assets/vehicles/heavy-mg.svg",
  "vehicle-rocket-truck": "/assets/vehicles/rocket-truck.svg",
  "vehicle-tank": "/assets/vehicles/tank.svg",
  "vehicle-plane": "/assets/vehicles/plane.svg",
  "vehicle-aa-buggy": "/assets/vehicles/aa-buggy.svg",
  "vehicle-flame-tank": "/assets/vehicles/flame-tank.svg",
  "vehicle-artillery-carrier": "/assets/vehicles/artillery-carrier.svg",
  "vehicle-gunship-plane": "/assets/vehicles/gunship-plane.svg",
  "vehicle-drone-carrier": "/assets/vehicles/drone-carrier.svg",
  "vehicle-drone": "/assets/vehicles/drone.svg",
  "prop-rock": "/assets/props/rock.svg",
  "prop-sandbag": "/assets/props/sandbag.svg",
  "prop-house": "/assets/props/house.svg",
  "prop-wall": "/assets/props/wall.svg",
  "prop-terrain-patch": "/assets/props/terrain-patch.svg",
  "effect-heal-cross": "/assets/effects/heal-cross.svg",
  "effect-pickup-crate": "/assets/effects/pickup-crate.svg",
  "effect-pickup-skill": "/assets/effects/pickup-skill.svg",
  "effect-pickup-mine": "/assets/effects/pickup-mine.svg",
  "effect-pickup-napalm": "/assets/effects/pickup-napalm.svg",
  "effect-pickup-overdrive": "/assets/effects/pickup-overdrive.svg",
  "effect-hazard-mine": "/assets/effects/hazard-mine.svg",
  "effect-hazard-napalm": "/assets/effects/hazard-napalm.svg",
  "effect-muzzle-flash": "/assets/effects/muzzle-flash.svg",
  "effect-explosion-burst": "/assets/effects/explosion-burst.svg"
} as const;

type SpriteTextureKey = keyof typeof SPRITE_ASSET_URLS;

const WEAPON_TEXTURE_KEYS: Record<WeaponRenderKind, SpriteTextureKey> = {
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

const VEHICLE_TEXTURE_KEYS: Record<VehicleTypeId, SpriteTextureKey> = {
  "heavy-mg": "vehicle-heavy-mg",
  "rocket-truck": "vehicle-rocket-truck",
  tank: "vehicle-tank",
  plane: "vehicle-plane",
  "aa-buggy": "vehicle-aa-buggy",
  "flame-tank": "vehicle-flame-tank",
  "artillery-carrier": "vehicle-artillery-carrier",
  "gunship-plane": "vehicle-gunship-plane",
  "drone-carrier": "vehicle-drone-carrier"
};

const OBSTACLE_TEXTURE_KEYS: Record<string, SpriteTextureKey> = {
  rock: "prop-rock",
  sandbag: "prop-sandbag",
  house: "prop-house",
  wall: "prop-wall"
};

const PICKUP_TEXTURE_KEYS: Record<SnapshotPickup["kind"], SpriteTextureKey> = {
  weapon: "effect-pickup-crate",
  skill: "effect-pickup-skill",
  "mine-crate": "effect-pickup-mine",
  "napalm-canister": "effect-pickup-napalm",
  "ammo-overdrive": "effect-pickup-overdrive"
};

const HAZARD_TEXTURE_KEYS: Record<SnapshotHazard["kind"], SpriteTextureKey> = {
  mine: "effect-hazard-mine",
  napalm: "effect-hazard-napalm"
};

const WEAPON_TEXTURE_BASE_ANGLES: Partial<Record<SpriteTextureKey, number>> = {
  "weapon-blade": 90,
  "weapon-blunt": 90,
  "weapon-chain": 90
};

const VEHICLE_TEXTURE_BASE_ANGLES: Partial<Record<VehicleTypeId, number>> = {
  plane: 90,
  "gunship-plane": 90
};

const TERRAIN_PATCHES = [
  { x: 430, y: 336, scale: 0.84, alpha: 0.64 },
  { x: 920, y: 520, scale: 0.9, alpha: 0.58 },
  { x: 1420, y: 346, scale: 0.78, alpha: 0.6 },
  { x: 2620, y: 410, scale: 0.88, alpha: 0.56 },
  { x: 380, y: 830, scale: 0.92, alpha: 0.58 },
  { x: 1020, y: 990, scale: 1.04, alpha: 0.62 },
  { x: 1980, y: 812, scale: 0.96, alpha: 0.6 },
  { x: 2700, y: 980, scale: 0.86, alpha: 0.56 },
  { x: 540, y: 1360, scale: 0.94, alpha: 0.62 },
  { x: 1380, y: 1480, scale: 0.82, alpha: 0.58 },
  { x: 2250, y: 1340, scale: 0.9, alpha: 0.56 }
] as const;

type RenderPose = {
  x: number;
  y: number;
  aimX: number;
  aimY: number;
  velocityX: number;
  velocityY: number;
  lastSeenAt: number;
};

type LaunchMode = "private" | "public" | "invite";

type RoomSession = {
  roomId: string;
  visibility: RoomVisibility;
};

const playerNameStorageKey = "war-swarm-player-name";
const inviteBaseStorageKey = "war-swarm-invite-base-url";
const inviteRoomParam = new URL(window.location.href).searchParams.get("room")?.trim() ?? "";
const serverEndpoint = getServerEndpoint();
const serverHttpOrigin = getServerHttpOrigin();
const defaultInviteBaseUrl = getStoredInviteBaseUrl();
const defaultPlayerName = getStoredPlayerName();

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="shell">
    <section class="battlefield">
      <div id="game-root"></div>
      <div class="overlay">
        <div class="battlefield-ui">
          <div class="minimap-shell">
            <canvas id="minimap" width="220" height="150"></canvas>
            <div id="minimap-caption" class="minimap-caption">Live frontline</div>
          </div>
          <div id="vehicle-hud" class="vehicle-hud hidden">
            <div id="vehicle-title" class="vehicle-title">No Vehicle</div>
            <div class="status-row"><span>Health</span><span id="vehicle-health-text">0 / 0</span></div>
            <div class="bar"><span id="vehicle-health-fill"></span></div>
            <div class="status-row"><span>Armor</span><span id="vehicle-armor-text">0 / 0</span></div>
            <div class="bar armor-bar"><span id="vehicle-armor-fill"></span></div>
          </div>
        </div>
        <div id="launch-card" class="launch-card">
          <h2>War Swarm</h2>
          <p class="muted">Basit gir, ordunun parcasi ol, cephede yuksel.</p>
          <label class="launch-setting launch-setting-stack" for="player-name">
            <span>Player Name</span>
            <input id="player-name" type="text" maxlength="24" placeholder="Enter your name" />
          </label>
          <label class="launch-setting" for="team-select">
            <span>Team</span>
            <select id="team-select">
              <option value="auto">Auto Balance</option>
              <option value="germany">Germany</option>
              <option value="france">France</option>
            </select>
          </label>
          <label class="launch-setting" for="bot-count">
            <span>Bots / Team</span>
            <input id="bot-count" type="range" min="0" max="12" step="1" value="4" />
            <strong id="bot-count-value">4</strong>
          </label>
          <p id="bot-count-note" class="muted compact-note">Only used when creating a private room.</p>
          <label class="launch-setting launch-setting-stack" for="invite-base-url">
            <span>Invite Base URL</span>
            <input id="invite-base-url" type="text" placeholder="https://your-ngrok-url.ngrok-free.app" />
          </label>
          <label class="launch-setting launch-setting-stack" for="invite-room-id">
            <span>Invite Room ID</span>
            <input id="invite-room-id" type="text" placeholder="Paste invite room id" />
          </label>
          <div class="buttons launch-actions" style="margin: 16px 0 12px;">
            <button id="create-private-room">Create Private Room</button>
            <button id="join-public-room">Join Public War</button>
            <button id="join-invite-room">Join Invite</button>
            <button id="return-home" class="ghost-button hidden">Return Home</button>
          </div>
          <p id="connection-status" class="muted">Sunucu bekleniyor...</p>
        </div>
      </div>
    </section>
    <aside class="hud">
      <section class="brand">
        <h1>WAR SWARM</h1>
        <p>Kalabalik cephede hizli dog, carpismaya karis, puan kazan, guclen ve hatti it.</p>
      </section>

      <section class="panel">
        <h2>Operative</h2>
        <div id="team-chip" class="team-chip">No squad</div>
        <div class="stack" style="margin-top: 10px;">
          <div class="status-row"><span>Health</span><span id="health-text">0 / 0</span></div>
          <div class="bar"><span id="health-fill"></span></div>
          <div class="status-row"><span>Armor</span><span id="armor-text">0 / 0</span></div>
          <div class="bar armor-bar"><span id="armor-fill"></span></div>
          <div class="status-row"><span>Combat score</span><span id="score-text">0</span></div>
          <div class="status-row"><span>Match score</span><span id="career-text">0</span></div>
          <div class="status-row"><span>Path</span><span id="path-text">ranged</span></div>
          <div class="status-row"><span>Class</span><span id="class-text">pistol</span></div>
          <div class="status-row"><span>Mount</span><span id="mount-text">infantry</span></div>
          <div class="status-row"><span>Regen</span><span id="regen-text">unknown</span></div>
          <div class="status-row"><span>Zone</span><span id="zone-text">none</span></div>
          <div class="status-row"><span>Pickup</span><span id="pickup-text">none nearby</span></div>
          <div class="status-row"><span>Status</span><span id="status-text">offline</span></div>
          <div id="skill-badges" class="badge-row"></div>
        </div>
      </section>

      <section class="panel">
        <h2>Frontline</h2>
        <div class="stack">
          <div class="score-row"><span>Germany</span><span id="germany-score">0</span></div>
          <div class="score-row"><span>France</span><span id="france-score">0</span></div>
          <div class="score-row"><span>Shift</span><span id="frontline-text">0</span></div>
          <div id="objectives" class="stack"></div>
        </div>
      </section>

      <section class="panel">
        <div class="status-row">
          <div>
            <h2>Session</h2>
            <p id="session-summary" class="muted">No active room.</p>
          </div>
          <button id="copy-invite" class="ghost-button hidden">Copy Invite</button>
        </div>
        <div class="stack">
          <div class="status-row"><span>Mode</span><span id="room-mode-text">offline</span></div>
          <div class="status-row"><span>Room</span><span id="room-id-text">none</span></div>
        </div>
      </section>

      <section class="panel">
        <div class="status-row">
          <div>
            <h2>Armory</h2>
            <p id="armory-summary" class="muted">Open live class and skill menu.</p>
          </div>
          <button id="armory-toggle" class="ghost-button">Open</button>
        </div>
      </section>

      <section class="panel">
        <h2>Scoreboard</h2>
        <div id="scoreboard" class="stack"></div>
      </section>

      <section class="panel">
        <h2>Combat Feed</h2>
        <div id="combat-feed" class="feed"></div>
      </section>

      <section class="panel">
        <h2>Controls</h2>
        <div class="stack muted">
          <div>WASD: move</div>
          <div>Mouse: aim</div>
          <div>Left click: primary attack</div>
          <div>Right click: alt / rockets</div>
          <div>Space: dash / burst</div>
          <div>E: mount / unmount / use</div>
        </div>
      </section>

      <div id="armory-drawer" class="armory-drawer hidden">
        <div class="armory-card">
          <div class="armory-header">
            <div>
              <h2>Armory</h2>
              <p class="muted">Classes and upgrades apply instantly. Death resets the build.</p>
            </div>
            <button id="armory-close" class="ghost-button">Close</button>
          </div>
          <div class="armory-section">
            <h3>Upgrades</h3>
            <div class="controls-grid">
              <button data-upgrade="melee:damage">Melee Damage</button>
              <button data-upgrade="melee:speed">Melee Speed</button>
              <button data-upgrade="melee:range">Melee Range</button>
              <button data-upgrade="ranged:rate">Ranged Rate</button>
              <button data-upgrade="ranged:range">Ranged Range</button>
              <button data-upgrade="ranged:accuracy">Ranged Accuracy</button>
              <button data-upgrade="general:health">Health</button>
              <button data-upgrade="general:armor">Armor</button>
              <button data-upgrade="general:mobility">Mobility</button>
            </div>
          </div>
          <div class="armory-section">
            <h3>Classes</h3>
            <div id="class-grid" class="class-grid"></div>
          </div>
        </div>
      </div>
    </aside>
  </div>
`;

const elements = {
  launchCard: document.querySelector<HTMLDivElement>("#launch-card")!,
  connectionStatus: document.querySelector<HTMLParagraphElement>("#connection-status")!,
  minimap: document.querySelector<HTMLCanvasElement>("#minimap")!,
  minimapCaption: document.querySelector<HTMLDivElement>("#minimap-caption")!,
  playerName: document.querySelector<HTMLInputElement>("#player-name")!,
  teamSelect: document.querySelector<HTMLSelectElement>("#team-select")!,
  botCount: document.querySelector<HTMLInputElement>("#bot-count")!,
  botCountValue: document.querySelector<HTMLElement>("#bot-count-value")!,
  botCountNote: document.querySelector<HTMLParagraphElement>("#bot-count-note")!,
  inviteBaseUrl: document.querySelector<HTMLInputElement>("#invite-base-url")!,
  inviteRoomId: document.querySelector<HTMLInputElement>("#invite-room-id")!,
  createPrivateRoom: document.querySelector<HTMLButtonElement>("#create-private-room")!,
  joinPublicRoom: document.querySelector<HTMLButtonElement>("#join-public-room")!,
  joinInviteRoom: document.querySelector<HTMLButtonElement>("#join-invite-room")!,
  returnHome: document.querySelector<HTMLButtonElement>("#return-home")!,
  teamChip: document.querySelector<HTMLDivElement>("#team-chip")!,
  healthText: document.querySelector<HTMLSpanElement>("#health-text")!,
  healthFill: document.querySelector<HTMLSpanElement>("#health-fill")!,
  armorText: document.querySelector<HTMLSpanElement>("#armor-text")!,
  armorFill: document.querySelector<HTMLSpanElement>("#armor-fill")!,
  scoreText: document.querySelector<HTMLSpanElement>("#score-text")!,
  careerText: document.querySelector<HTMLSpanElement>("#career-text")!,
  pathText: document.querySelector<HTMLSpanElement>("#path-text")!,
  classText: document.querySelector<HTMLSpanElement>("#class-text")!,
  mountText: document.querySelector<HTMLSpanElement>("#mount-text")!,
  statusText: document.querySelector<HTMLSpanElement>("#status-text")!,
  skillBadges: document.querySelector<HTMLDivElement>("#skill-badges")!,
  armorySummary: document.querySelector<HTMLParagraphElement>("#armory-summary")!,
  armoryDrawer: document.querySelector<HTMLDivElement>("#armory-drawer")!,
  armoryToggle: document.querySelector<HTMLButtonElement>("#armory-toggle")!,
  armoryClose: document.querySelector<HTMLButtonElement>("#armory-close")!,
  vehicleHud: document.querySelector<HTMLDivElement>("#vehicle-hud")!,
  vehicleTitle: document.querySelector<HTMLDivElement>("#vehicle-title")!,
  vehicleHealthText: document.querySelector<HTMLSpanElement>("#vehicle-health-text")!,
  vehicleHealthFill: document.querySelector<HTMLSpanElement>("#vehicle-health-fill")!,
  vehicleArmorText: document.querySelector<HTMLSpanElement>("#vehicle-armor-text")!,
  vehicleArmorFill: document.querySelector<HTMLSpanElement>("#vehicle-armor-fill")!,
  germanyScore: document.querySelector<HTMLSpanElement>("#germany-score")!,
  franceScore: document.querySelector<HTMLSpanElement>("#france-score")!,
  frontlineText: document.querySelector<HTMLSpanElement>("#frontline-text")!,
  objectives: document.querySelector<HTMLDivElement>("#objectives")!,
  sessionSummary: document.querySelector<HTMLParagraphElement>("#session-summary")!,
  roomModeText: document.querySelector<HTMLSpanElement>("#room-mode-text")!,
  roomIdText: document.querySelector<HTMLSpanElement>("#room-id-text")!,
  copyInvite: document.querySelector<HTMLButtonElement>("#copy-invite")!,
  classGrid: document.querySelector<HTMLDivElement>("#class-grid")!,
  scoreboard: document.querySelector<HTMLDivElement>("#scoreboard")!,
  combatFeed: document.querySelector<HTMLDivElement>("#combat-feed")!,
  regenText: document.querySelector<HTMLSpanElement>("#regen-text")!,
  zoneText: document.querySelector<HTMLSpanElement>("#zone-text")!,
  pickupText: document.querySelector<HTMLSpanElement>("#pickup-text")!
};

const appState = {
  room: undefined as Room | undefined,
  snapshot: undefined as MatchSnapshot | undefined,
  localId: "",
  combatFeed: [] as string[],
  lastDashAt: 0,
  lastHudSignature: "",
  terrainSignature: "",
  minimapSignature: "",
  scene: undefined as BattlefieldScene | undefined,
  classSelectLockedUntil: 0,
  roomSession: undefined as RoomSession | undefined,
  inviteBaseUrl: defaultInviteBaseUrl,
  renderPlayers: new Map<string, RenderPose>(),
  effects: Array.from({ length: 84 }, () => ({
    active: false,
    kind: "impact" as "impact" | "blood" | "explosion" | "miss" | "flame" | "shock",
    x: 0,
    y: 0,
    radius: 0,
    color: 0xffffff,
    secondary: 0xffffff,
    rotation: 0,
    expiresAt: 0
  }))
};

class BattlefieldScene extends Phaser.Scene {
  private terrainGraphics!: Phaser.GameObjects.Graphics;
  private terrainSpriteLayer!: Phaser.GameObjects.RenderTexture;
  private spriteLayer!: Phaser.GameObjects.RenderTexture;
  private graphics!: Phaser.GameObjects.Graphics;
  private effectGraphics!: Phaser.GameObjects.Graphics;
  private playerNameplates = new Map<string, Phaser.GameObjects.Text>();
  private cursors!: Record<"up" | "down" | "left" | "right", Phaser.Input.Keyboard.Key>;
  private dashKey!: Phaser.Input.Keyboard.Key;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private utilityKey!: Phaser.Input.Keyboard.Key;
  private lastInputAt = 0;
  private lastRenderAt = 0;
  private queuedInteractUntil = 0;
  private queuedUtilityUntil = 0;

  constructor() {
    super("battlefield");
  }

  preload(): void {
    for (const [key, url] of Object.entries(SPRITE_ASSET_URLS)) {
      this.load.image(key, url);
    }
  }

  create(): void {
    appState.scene = this;
    this.terrainGraphics = this.add.graphics();
    this.terrainSpriteLayer = this.add.renderTexture(0, 0, MAP_WIDTH, MAP_HEIGHT).setOrigin(0, 0);
    this.spriteLayer = this.add.renderTexture(0, 0, MAP_WIDTH, MAP_HEIGHT).setOrigin(0, 0);
    this.graphics = this.add.graphics();
    this.effectGraphics = this.add.graphics();
    this.cameras.main.setBackgroundColor(0x1b2218);
    this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    this.cameras.main.setZoom(0.72);
    this.cursors = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };
    this.dashKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.utilityKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q);

    this.input.mouse?.disableContextMenu();
    this.drawTerrain();
  }

  override update(_time: number): void {
    const snapshot = appState.snapshot;
    if (snapshot && this.time.now - this.lastRenderAt > 33) {
      this.lastRenderAt = this.time.now;
      const localPlayer = snapshot.players.find((player) => player.id === appState.localId);
      if (localPlayer && localPlayer.alive) {
        const localPose = getRenderPose(localPlayer, true);
        this.cameras.main.centerOn(localPose.x, localPose.y);
      }

      this.drawWorld(snapshot);
      renderMinimap(snapshot);
    }

    if (appState.room && this.time.now - this.lastInputAt > 50) {
      this.lastInputAt = this.time.now;
      const payload = this.buildInputPayload();
      appState.room.send("input", payload);
    }
  }

  private buildInputPayload(): InputMessage {
    const localPlayer = appState.snapshot?.players.find((player) => player.id === appState.localId);
    const pointer = this.input.activePointer;
    const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const aim = localPlayer ? normalize(point.x - localPlayer.x, point.y - localPlayer.y) : { x: 1, y: 0 };
    const moveX = Number(this.cursors.right.isDown) - Number(this.cursors.left.isDown);
    const moveY = Number(this.cursors.down.isDown) - Number(this.cursors.up.isDown);

    let dash = Phaser.Input.Keyboard.JustDown(this.dashKey);
    if (dash && this.time.now - appState.lastDashAt < DASH_COOLDOWN_MS * 0.6) {
      dash = false;
    }

    if (dash) {
      appState.lastDashAt = this.time.now;
    }

    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.queuedInteractUntil = this.time.now + 150;
    }
    if (Phaser.Input.Keyboard.JustDown(this.utilityKey)) {
      this.queuedUtilityUntil = this.time.now + 150;
    }

    return {
      moveX,
      moveY,
      aimX: aim.x,
      aimY: aim.y,
      cursorWorldX: point.x,
      cursorWorldY: point.y,
      primary: pointer.leftButtonDown(),
      secondary: pointer.rightButtonDown(),
      utility: this.time.now < this.queuedUtilityUntil,
      dash,
      interact: this.time.now < this.queuedInteractUntil
    };
  }

  private drawTerrain(): void {
    this.terrainGraphics.clear();
    this.terrainSpriteLayer.clear();
    this.terrainGraphics.fillStyle(0x263124, 1);
    this.terrainGraphics.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    this.terrainGraphics.fillStyle(0x39462e, 0.28);
    this.terrainGraphics.fillRect(0, 260, MAP_WIDTH, 340);
    this.terrainGraphics.fillRect(0, 730, MAP_WIDTH, 340);
    this.terrainGraphics.fillRect(0, 1200, MAP_WIDTH, 340);

    this.terrainGraphics.fillStyle(0x5c5532, 0.16);
    this.terrainGraphics.fillRect(0, 395, MAP_WIDTH, 44);
    this.terrainGraphics.fillRect(0, 865, MAP_WIDTH, 44);
    this.terrainGraphics.fillRect(0, 1335, MAP_WIDTH, 44);

    drawTrenchBand(this.terrainGraphics, MAP_WIDTH / 2 - 160, 180, 320, MAP_HEIGHT - 360);
    drawObstacleTerrain(this.terrainGraphics, OBSTACLE_LAYOUT);
    drawTerrainSprites(this, this.terrainSpriteLayer);
  }

  private drawWorld(snapshot: MatchSnapshot): void {
    this.spriteLayer.clear();
    this.graphics.clear();
    this.effectGraphics.clear();
    for (const label of this.playerNameplates.values()) {
      label.setVisible(false);
    }

    const now = Date.now();
    const localPlayer = snapshot.players.find((player) => player.id === appState.localId);
    const localPose = localPlayer ? getRenderPose(localPlayer, true) : undefined;

    this.graphics.lineStyle(2, 0xdbc789, 0.25);
    this.graphics.lineBetween(MAP_WIDTH / 2 + snapshot.frontlineShift, 0, MAP_WIDTH / 2 + snapshot.frontlineShift, MAP_HEIGHT);

    const worldView = this.cameras.main.worldView;
    const viewportBounds = new Phaser.Geom.Rectangle(worldView.x - 140, worldView.y - 140, worldView.width + 280, worldView.height + 280);

    for (const objective of snapshot.objectives) {
      if (!viewportBounds.contains(objective.x, objective.y)) {
        continue;
      }

      const fill = objective.owner === "germany" ? TEAM_CONFIG.germany.color : objective.owner === "france" ? TEAM_CONFIG.france.color : 0x6b6d67;
      this.graphics.fillStyle(fill, 0.22);
      this.graphics.fillCircle(objective.x, objective.y, objective.radius);
      this.graphics.lineStyle(4, fill, 0.9);
      this.graphics.strokeCircle(objective.x, objective.y, 24 + Math.abs(objective.progress) * 0.2);
      this.graphics.fillStyle(0xa89261, 0.2);
      this.graphics.fillRoundedRect(objective.x - 48, objective.y - 22, 96, 44, 10);
      this.graphics.fillStyle(0x594c2f, 0.7);
      this.graphics.fillRoundedRect(objective.x - 38, objective.y - 10, 76, 20, 7);
    }

    for (const zone of snapshot.zones) {
      if (!zone.active || !viewportBounds.contains(zone.x, zone.y)) {
        continue;
      }
      const zoneColor = zone.team === "germany" ? TEAM_CONFIG.germany.color : zone.team === "france" ? TEAM_CONFIG.france.color : 0x70cb83;
      const pulse = 0.92 + Math.sin(now / 220 + zone.x * 0.002 + zone.y * 0.002) * 0.12;
      this.graphics.fillStyle(zoneColor, zone.kind === "base-heal" ? 0.12 : 0.18);
      this.graphics.fillCircle(zone.x, zone.y, zone.radius);
      this.graphics.lineStyle(2, zoneColor, 0.5);
      this.graphics.strokeCircle(zone.x, zone.y, zone.radius);
      drawMedicalMark(
        this.graphics,
        zone.x,
        zone.y + Math.sin(now / 180 + zone.x * 0.01) * 4,
        (zone.kind === "base-heal" ? 12 : 9) * pulse,
        zone.kind === "base-heal" ? 0xe8f7ec : 0xc9ffd9
      );
      renderZoneSprite(this, this.spriteLayer, zone, now);
    }

    for (const pickup of snapshot.pickups) {
      if (!viewportBounds.contains(pickup.x, pickup.y)) {
        continue;
      }
      if (!renderPickupSprite(this, this.spriteLayer, pickup, now)) {
        renderPickup(this.graphics, pickup, now);
      }
    }

    for (const hazard of snapshot.hazards) {
      if (!viewportBounds.contains(hazard.x, hazard.y)) {
        continue;
      }
      if (!renderHazardSprite(this, this.spriteLayer, hazard, now)) {
        renderHazard(this.graphics, hazard, now);
      }
    }

    for (const vehicle of snapshot.vehicles) {
      if (!vehicle.alive || !viewportBounds.contains(vehicle.x, vehicle.y)) {
        continue;
      }
      const distanceToLocal = localPose ? Math.hypot(vehicle.x - localPose.x, vehicle.y - localPose.y) : 0;
      if (!renderVehicleSprite(this, this.spriteLayer, vehicle, now, vehicle.occupantId === appState.localId, distanceToLocal > 680)) {
        renderVehicle(this.graphics, vehicle, now, vehicle.occupantId === appState.localId, distanceToLocal > 680);
      } else {
        renderVehicleBar(this.graphics, vehicle);
      }
    }

    for (const player of snapshot.players) {
      if (!player.alive || player.currentVehicleId) {
        continue;
      }

      const renderPlayer = withRenderPose(player);

      if (!viewportBounds.contains(renderPlayer.x, renderPlayer.y)) {
        continue;
      }

      const distanceToLocal = localPose ? Math.hypot(renderPlayer.x - localPose.x, renderPlayer.y - localPose.y) : 0;
      if (!renderSoldierSprite(this, this.spriteLayer, this.graphics, renderPlayer, now, player.id === appState.localId, distanceToLocal > 520)) {
        renderSoldier(this.graphics, renderPlayer, now, player.id === appState.localId, distanceToLocal > 520);
      }
      if (!renderPlayer.isBot) {
        renderHealthBar(this.graphics, renderPlayer);
        this.renderPlayerNameplate(renderPlayer.id, renderPlayer.name, renderPlayer.team, renderPlayer.x, renderPlayer.y - 34);
      }

      if (now < renderPlayer.shieldUntil) {
        this.graphics.lineStyle(2, 0xa7e5ae, 0.8);
        this.graphics.strokeCircle(renderPlayer.x, renderPlayer.y, 24);
      }
    }

    for (const drone of snapshot.drones) {
      if (!viewportBounds.contains(drone.x, drone.y)) {
        continue;
      }
      if (!renderDroneSprite(this, this.spriteLayer, drone, now)) {
        renderDrone(this.graphics, drone, now);
      }
    }

    for (const player of snapshot.players) {
      if (!player.alive || player.isBot || !player.currentVehicleId) {
        continue;
      }

      const mountedVehicle = snapshot.vehicles.find((vehicle) => vehicle.id === player.currentVehicleId && vehicle.alive);
      if (!mountedVehicle || !viewportBounds.contains(mountedVehicle.x, mountedVehicle.y)) {
        continue;
      }

      this.renderPlayerNameplate(player.id, player.name, player.team, mountedVehicle.x, mountedVehicle.y - mountedVehicle.radius - 18);
    }

    const humanIds = new Set(snapshot.players.filter((player) => !player.isBot).map((player) => player.id));
    for (const [playerId, label] of this.playerNameplates) {
      if (!humanIds.has(playerId)) {
        label.destroy();
        this.playerNameplates.delete(playerId);
      }
    }

    let visibleProjectiles = 0;
    for (const projectile of snapshot.projectiles) {
      if (!viewportBounds.contains(projectile.x, projectile.y) && !viewportBounds.contains(projectile.prevX, projectile.prevY)) {
        continue;
      }

      renderProjectile(this.graphics, projectile);
      visibleProjectiles += 1;
      if (visibleProjectiles >= 48) {
        break;
      }
    }

    renderEffects(this.effectGraphics, viewportBounds, now);
  }

  private renderPlayerNameplate(playerId: string, name: string, team: TeamId, x: number, y: number): void {
    const label = this.getPlayerNameplate(playerId);
    label.setText(name);
    label.setColor(team === "germany" ? "#f2d788" : "#eef5ff");
    label.setPosition(x, y);
    label.setVisible(true);
  }

  private getPlayerNameplate(playerId: string): Phaser.GameObjects.Text {
    const existing = this.playerNameplates.get(playerId);
    if (existing) {
      return existing;
    }

    const label = this.add.text(0, 0, "", {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: "12px",
      fontStyle: "700",
      color: "#f4ecd4",
      stroke: "#11150f",
      strokeThickness: 3
    });
    label.setOrigin(0.5, 1);
    label.setDepth(30);
    label.setVisible(false);
    this.playerNameplates.set(playerId, label);
    return label;
  }

  clearPlayerNameplates(): void {
    for (const label of this.playerNameplates.values()) {
      label.destroy();
    }
    this.playerNameplates.clear();
  }
}

function drawTerrainSprites(scene: Phaser.Scene, layer: Phaser.GameObjects.RenderTexture): void {
  for (const patch of TERRAIN_PATCHES) {
    stampTexture(scene, layer, "prop-terrain-patch", patch.x, patch.y, {
      scale: patch.scale,
      alpha: patch.alpha,
      tint: 0x7d8964
    });
  }

  for (const obstacle of OBSTACLE_LAYOUT) {
    const textureKey = OBSTACLE_TEXTURE_KEYS[obstacle.kind];
    if (!textureKey) {
      continue;
    }

    if (obstacle.kind === "rock") {
      const radius = obstacle.radius ?? 56;
      stampTexture(scene, layer, textureKey, obstacle.x, obstacle.y, {
        scale: Math.max(0.65, (radius * 2) / 140),
        alpha: 0.96
      });
      continue;
    }

    const fallbackRadius = obstacle.radius ?? 48;
    const width = obstacle.width || fallbackRadius * 2;
    const height = obstacle.height || fallbackRadius * 2;
    const angle = obstacle.kind === "wall" && height > width ? 90 : 0;
    const sourceWidth = obstacle.kind === "sandbag" ? 180 : obstacle.kind === "house" ? 180 : 180;
    const sourceHeight = obstacle.kind === "sandbag" ? 80 : obstacle.kind === "house" ? 160 : 60;
    stampTexture(scene, layer, textureKey, obstacle.x, obstacle.y, {
      angle,
      scaleX: Math.max(0.45, width / sourceWidth),
      scaleY: Math.max(0.45, height / sourceHeight),
      alpha: obstacle.kind === "wall" ? 0.92 : 0.96
    });
  }
}

function renderZoneSprite(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.RenderTexture,
  zone: SnapshotZone,
  now: number
): boolean {
  const tint = zone.team === "germany" ? 0xf2d788 : zone.team === "france" ? 0xeef5ff : 0xd8ffe4;
  return stampTexture(scene, layer, "effect-heal-cross", zone.x, zone.y + Math.sin(now / 180 + zone.x * 0.01) * 4, {
    scale: (zone.kind === "base-heal" ? 1.12 : 0.88) + Math.sin(now / 200 + zone.y * 0.004) * 0.05,
    alpha: zone.kind === "base-heal" ? 0.94 : 0.84,
    tint
  });
}

function renderPickupSprite(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.RenderTexture,
  pickup: SnapshotPickup,
  now: number
): boolean {
  const textureKey = PICKUP_TEXTURE_KEYS[pickup.kind];
  if (!stampTexture(scene, layer, textureKey, pickup.x, pickup.y + Math.sin(now / 220 + pickup.x * 0.02) * 5, {
    scale: 0.58 + Math.sin(now / 240 + pickup.y * 0.014) * 0.04,
    alpha: 0.95
  })) {
    return false;
  }

  if (pickup.kind === "weapon") {
    const weaponKey = getWeaponTextureKey(pickup.weaponClassId as WeaponClassId);
    stampTexture(scene, layer, weaponKey, pickup.x, pickup.y, {
      scale: 0.22,
      alpha: 0.96
    });
  }

  return true;
}

function renderHazardSprite(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.RenderTexture,
  hazard: SnapshotHazard,
  now: number
): boolean {
  const armed = now >= hazard.armedAt;
  return stampTexture(scene, layer, HAZARD_TEXTURE_KEYS[hazard.kind], hazard.x, hazard.y, {
    scale: hazard.kind === "mine" ? 0.44 + (armed ? Math.sin(now / 160 + hazard.x * 0.01) * 0.03 : 0) : Math.max(0.65, hazard.radius / 24),
    alpha: armed ? 0.95 : 0.68,
    tint: hazard.kind === "mine" ? 0xffffff : 0xffc38f
  });
}

function renderVehicleSprite(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.RenderTexture,
  vehicle: SnapshotVehicle,
  now: number,
  isLocal: boolean,
  lowDetail: boolean
): boolean {
  const textureKey = VEHICLE_TEXTURE_KEYS[vehicle.type];
  const aim = normalize(vehicle.aimX, vehicle.aimY);
  const angle = Phaser.Math.RadToDeg(Math.atan2(aim.y, aim.x)) + (VEHICLE_TEXTURE_BASE_ANGLES[vehicle.type] ?? 0);
  const teamTint = vehicle.team === "germany" ? 0xe5d6ad : 0xe3edf6;
  const bodyScale = Math.max(0.44, vehicle.radius / (vehicle.airborne ? 54 : 44)) * (lowDetail ? 0.92 : 1);

  if (!stampTexture(scene, layer, "soldier-shadow", vehicle.x, vehicle.y + vehicle.radius * 0.48, {
    scaleX: bodyScale * (vehicle.airborne ? 1.4 : 1.6),
    scaleY: bodyScale * 0.48,
    alpha: vehicle.airborne ? 0.18 : 0.28
  })) {
    return false;
  }

  if (!stampTexture(scene, layer, textureKey, vehicle.x, vehicle.y, {
    angle,
    scale: bodyScale,
    tint: teamTint,
    alpha: vehicle.empUntil > now ? 0.72 : 0.98
  })) {
    return false;
  }

  if (vehicle.burnUntil > now) {
    stampTexture(scene, layer, "effect-muzzle-flash", vehicle.x - aim.x * vehicle.radius * 0.2, vehicle.y - aim.y * vehicle.radius * 0.2, {
      scale: 0.24 + Math.sin(now / 80) * 0.03,
      alpha: 0.58,
      tint: 0xff9a5e
    });
  }

  if (isLocal) {
    stampTexture(scene, layer, "effect-explosion-burst", vehicle.x, vehicle.y, {
      scale: bodyScale * 0.72,
      alpha: 0.08,
      tint: vehicle.team === "germany" ? 0xf6d37f : 0xd7ebff
    });
  }
  return true;
}

function renderSoldierSprite(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.RenderTexture,
  overlayGraphics: Phaser.GameObjects.Graphics,
  player: SnapshotPlayer,
  now: number,
  isLocal: boolean,
  lowDetail: boolean
): boolean {
  const bodyKey: SpriteTextureKey = "soldier-base";
  const shadowKey: SpriteTextureKey = "soldier-shadow";
  if (!hasTexture(scene, bodyKey) || !hasTexture(scene, shadowKey)) {
    return false;
  }

  const weaponClass = getWeaponClass(player.activeClassId);
  const weaponKey = getWeaponTextureKey(player.activeClassId);
  const moveHeading = Math.hypot(player.velocityX, player.velocityY) > 6 ? normalize(player.velocityX, player.velocityY) : normalize(player.aimX, player.aimY);
  const facing = Math.hypot(player.aimX, player.aimY) > 0.01 ? normalize(player.aimX, player.aimY) : moveHeading;
  const meleeAge = now - player.lastMeleeAt;
  const meleeActive = isMeleeWeaponKind(weaponClass.renderKind as WeaponProfile["kind"]) && meleeAge >= 0 && meleeAge < 220;
  const swingAngle = meleeActive ? Phaser.Math.Linear(-0.88, 0.84, clamp01(meleeAge / 220)) : 0;
  const weaponFacing = meleeActive ? rotateFacing(facing, swingAngle) : facing;
  const teamTint = player.team === "germany" ? mixColor(TEAM_CONFIG.germany.color, 0xffffff, 0.72) : mixColor(TEAM_CONFIG.france.color, 0xffffff, 0.8);
  const bodyScale = (player.activePath === "melee" ? 0.58 : 0.55) * (lowDetail ? 0.92 : 1);
  const bodyAngle = Phaser.Math.RadToDeg(Math.atan2(facing.y, facing.x)) + 90;
  const weaponAngle = Phaser.Math.RadToDeg(Math.atan2(weaponFacing.y, weaponFacing.x)) + (WEAPON_TEXTURE_BASE_ANGLES[weaponKey] ?? 0);

  stampTexture(scene, layer, shadowKey, player.x, player.y + 12, {
    scaleX: bodyScale * 1.18,
    scaleY: bodyScale * 0.54,
    alpha: lowDetail ? 0.18 : 0.24
  });

  stampTexture(scene, layer, bodyKey, player.x, player.y, {
    angle: bodyAngle,
    scale: bodyScale,
    tint: teamTint,
    alpha: player.empUntil > now ? 0.74 : 0.98
  });

  stampTexture(scene, layer, weaponKey, player.x + weaponFacing.x * 12, player.y + weaponFacing.y * 6, {
    angle: weaponAngle,
    scale: bodyScale * (weaponClass.path === "melee" ? 0.62 : 0.72),
    alpha: 0.96,
    tint: weaponClass.path === "melee" ? 0xf0e6d0 : 0xffffff
  });

  if (weaponClass.path === "ranged" && now - player.lastRangedAt < 70) {
    stampTexture(scene, layer, "effect-muzzle-flash", player.x + weaponFacing.x * 26, player.y + weaponFacing.y * 17, {
      angle: weaponAngle,
      scale: 0.22 + (lowDetail ? 0 : 0.04),
      alpha: 0.9,
      tint: weaponClass.impactStyle === "flame" ? 0xff8e4c : weaponClass.impactStyle === "shock" ? 0x9cd9ff : 0xffda8f
    });
  }

  if (meleeActive) {
    drawMeleeArc(overlayGraphics, player.x, player.y, weaponFacing, weaponClass.impactStyle === "flame" ? 0xff8e4c : 0xf3d487, 26);
  }

  if (isLocal) {
    stampTexture(scene, layer, "effect-explosion-burst", player.x, player.y, {
      scale: 0.34,
      alpha: 0.06,
      tint: 0xf5e0a0
    });
  }

  return true;
}

function renderDroneSprite(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.RenderTexture,
  drone: SnapshotDrone,
  now: number
): boolean {
  const facing = Math.hypot(drone.aimX, drone.aimY) > 0.01 ? normalize(drone.aimX, drone.aimY) : { x: 1, y: 0 };
  return stampTexture(scene, layer, "vehicle-drone", drone.x, drone.y, {
    angle: Phaser.Math.RadToDeg(Math.atan2(facing.y, facing.x)),
    scale: Math.max(0.26, drone.radius / 24) + Math.sin(now / 140 + drone.x * 0.01) * 0.01,
    alpha: 0.96,
    tint: drone.team === "germany" ? 0xe5d6ad : 0xd8ecff
  });
}

function getWeaponTextureKey(classId: WeaponClassId): SpriteTextureKey {
  return WEAPON_TEXTURE_KEYS[getWeaponClass(classId).renderKind];
}

function getClassPreviewUrl(classId: WeaponClassId): string {
  return SPRITE_ASSET_URLS[getWeaponTextureKey(classId)];
}

function stampTexture(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.RenderTexture,
  key: SpriteTextureKey,
  x: number,
  y: number,
  config: Phaser.Types.Textures.StampConfig
): boolean {
  if (!hasTexture(scene, key)) {
    return false;
  }
  layer.stamp(key, undefined, x, y, config);
  return true;
}

function hasTexture(scene: Phaser.Scene, key: SpriteTextureKey): boolean {
  return scene.textures.exists(key);
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game-root",
  width: window.innerWidth - 340,
  height: window.innerHeight,
  backgroundColor: "#11150f",
  scene: [BattlefieldScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
});

window.addEventListener("resize", () => {
  game.scale.resize(document.querySelector<HTMLElement>("#game-root")!.clientWidth, document.querySelector<HTMLElement>("#game-root")!.clientHeight);
});

elements.botCountValue.textContent = elements.botCount.value;
elements.inviteBaseUrl.value = defaultInviteBaseUrl;
elements.inviteRoomId.value = inviteRoomParam;
elements.playerName.value = defaultPlayerName;
elements.connectionStatus.textContent = inviteRoomParam ? "Invite link detected. Enter your name and join." : "Sunucu bekleniyor...";
syncLaunchControls();
updateRoomSessionUi();

elements.botCount.addEventListener("input", () => {
  elements.botCountValue.textContent = elements.botCount.value;
});

elements.playerName.addEventListener("input", () => {
  syncLaunchControls();
});

elements.inviteBaseUrl.addEventListener("change", () => {
  appState.inviteBaseUrl = normalizeInviteBaseUrl(elements.inviteBaseUrl.value);
  elements.inviteBaseUrl.value = appState.inviteBaseUrl;
  localStorage.setItem(inviteBaseStorageKey, appState.inviteBaseUrl);
  updateRoomSessionUi();
});

elements.inviteRoomId.addEventListener("input", () => {
  syncLaunchControls();
});

elements.createPrivateRoom.addEventListener("click", () => {
  void connect("private");
});

elements.joinPublicRoom.addEventListener("click", () => {
  void connect("public");
});

elements.joinInviteRoom.addEventListener("click", () => {
  void connect("invite");
});

elements.returnHome.addEventListener("click", () => {
  setRoomQuery(undefined);
  elements.inviteRoomId.value = "";
  elements.connectionStatus.textContent = "Invite cleared. You can create a room or join public war.";
  syncLaunchControls();
});

elements.copyInvite.addEventListener("click", async () => {
  if (!appState.roomSession || appState.roomSession.visibility !== "private") {
    return;
  }

  const inviteLink = buildInviteLink(appState.roomSession.roomId);
  try {
    await navigator.clipboard.writeText(inviteLink);
    const previousLabel = elements.copyInvite.textContent;
    elements.copyInvite.textContent = "Copied";
    window.setTimeout(() => {
      elements.copyInvite.textContent = previousLabel;
    }, 1200);
  } catch {
    elements.sessionSummary.textContent = `Copy failed. Share this room id instead: ${appState.roomSession.roomId}`;
  }
});

document.querySelectorAll<HTMLButtonElement>("[data-upgrade]").forEach((button) => {
  button.addEventListener("click", () => {
    const code = button.dataset.upgrade;
    if (!code || !appState.room) {
      return;
    }

    const [category, stat] = code.split(":");
    if (!category || !stat) {
      return;
    }

    appState.room.send("upgrade", {
      category: category as UpgradeChoice["category"],
      stat: stat as UpgradeChoice["stat"]
    } satisfies UpgradeChoice);
  });
});

elements.classGrid.addEventListener("click", (event) => {
  if (Date.now() < appState.classSelectLockedUntil) {
    event.preventDefault();
    return;
  }

  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-class-id]");
  if (!button || !appState.room) {
    return;
  }

  const classId = button.dataset.classId as WeaponClassId | undefined;
  if (!classId) {
    return;
  }

  appState.classSelectLockedUntil = Date.now() + 500;
  elements.classGrid.style.pointerEvents = "none";
  appState.room.send("selectClass", { classId } satisfies SelectClassChoice);
  elements.armoryDrawer.classList.add("hidden");
  window.setTimeout(() => {
    elements.classGrid.style.pointerEvents = "";
  }, 520);
});

elements.classGrid.addEventListener("dblclick", (event) => {
  event.preventDefault();
  event.stopPropagation();
});

elements.armoryToggle.addEventListener("click", () => {
  elements.armoryDrawer.classList.remove("hidden");
});

elements.armoryClose.addEventListener("click", () => {
  elements.armoryDrawer.classList.add("hidden");
});

async function connect(mode: LaunchMode): Promise<void> {
  const playerName = getDesiredPlayerName();
  const preferredTeam = elements.teamSelect.value as TeamId | "auto";
  const botCountPerTeam = Number(elements.botCount.value);
  const inviteRoomId = elements.inviteRoomId.value.trim();
  if (!playerName) {
    elements.connectionStatus.textContent = "Player name gerekli.";
    syncLaunchControls();
    return;
  }
  if (mode === "invite" && !inviteRoomId) {
    elements.connectionStatus.textContent = "Invite room id gerekli.";
    syncLaunchControls();
    return;
  }

  localStorage.setItem(playerNameStorageKey, playerName);
  elements.playerName.value = playerName;
  setLaunchBusy(true);
  elements.connectionStatus.textContent =
    mode === "private"
      ? "Private room olusturuluyor..."
      : mode === "public"
        ? "Public war odasi aliniyor..."
        : "Invite room'a baglaniliyor...";

  const client = new ColyseusClient(serverEndpoint);
  let room: Room;
  let visibility: RoomVisibility;

  try {
    if (mode === "private") {
      room = await client.create(PRIVATE_ROOM_NAME, {
        visibility: "private",
        playerName,
        preferredTeam,
        botCountPerTeam
      });
      visibility = "private";
      elements.inviteRoomId.value = room.roomId;
      setRoomQuery(room.roomId);
    } else if (mode === "public") {
      const publicRoomId = await fetchPublicRoomId();
      room = await client.joinById(publicRoomId, { playerName, preferredTeam });
      visibility = "public";
      elements.inviteRoomId.value = "";
      setRoomQuery(undefined);
    } else {
      room = await client.joinById(inviteRoomId, { playerName, preferredTeam });
      visibility = "private";
      setRoomQuery(inviteRoomId);
    }
  } catch (error) {
    elements.connectionStatus.textContent = humanizeConnectionError(mode, error);
    setLaunchBusy(false);
    syncLaunchControls();
    return;
  }

  appState.room = room;
  appState.roomSession = {
    roomId: room.roomId,
    visibility
  };
  appState.localId = room.sessionId;
  appState.renderPlayers.clear();
  appState.scene?.clearPlayerNameplates();
  elements.armoryDrawer.classList.add("hidden");
  elements.launchCard.classList.add("hidden");
  elements.connectionStatus.textContent = `${visibility === "private" ? "Private" : "Public"} room joined: ${room.roomId}`;
  elements.statusText.textContent = "engaged";
  updateRoomSessionUi();
  setLaunchBusy(false);

  room.onStateChange((state) => {
    appState.snapshot = snapshotState(state);
    pruneRenderPoses(appState.snapshot);
    updateHud(appState.snapshot);
  });

  room.onMessage("combat", (event: CombatEvent) => {
    pushCombatEffects(event);
    const feedMessage = formatCombatEvent(event, appState.snapshot);
    if (feedMessage) {
      appState.combatFeed.unshift(feedMessage);
      appState.combatFeed = appState.combatFeed.slice(0, 8);
      renderCombatFeed();
    }
  });

  room.onLeave(() => {
    if (appState.room?.roomId !== room.roomId) {
      return;
    }

    appState.room = undefined;
    appState.roomSession = undefined;
    appState.snapshot = undefined;
    appState.localId = "";
    elements.launchCard.classList.remove("hidden");
    elements.connectionStatus.textContent = "Baglanti koptu";
    elements.statusText.textContent = "offline";
    appState.renderPlayers.clear();
    appState.scene?.clearPlayerNameplates();
    updateRoomSessionUi();
    syncLaunchControls();
  });
}

function setLaunchBusy(busy: boolean): void {
  elements.createPrivateRoom.disabled = busy;
  elements.joinPublicRoom.disabled = busy;
  elements.joinInviteRoom.disabled = busy || !elements.inviteRoomId.value.trim() || !getDesiredPlayerName();
  elements.returnHome.disabled = busy;
  elements.playerName.disabled = busy;
  elements.teamSelect.disabled = busy;
  elements.inviteRoomId.disabled = busy;
  elements.inviteBaseUrl.disabled = busy;
  const hostControlsDisabled = busy || Boolean(elements.inviteRoomId.value.trim());
  elements.botCount.disabled = hostControlsDisabled;
}

function syncLaunchControls(): void {
  const hasInviteRoomId = Boolean(elements.inviteRoomId.value.trim());
  const hasPlayerName = Boolean(getDesiredPlayerName());
  elements.botCount.disabled = hasInviteRoomId;
  elements.botCountNote.textContent = hasInviteRoomId
    ? "Invite joins use the host room settings."
    : "Only used when creating a private room.";
  elements.createPrivateRoom.disabled = !hasPlayerName;
  elements.joinPublicRoom.disabled = !hasPlayerName;
  elements.joinInviteRoom.disabled = !hasInviteRoomId || !hasPlayerName;
  elements.returnHome.classList.toggle("hidden", !hasInviteRoomId);
}

function updateRoomSessionUi(): void {
  const roomSession = appState.roomSession;
  if (!roomSession) {
    elements.sessionSummary.textContent = "No active room.";
    elements.roomModeText.textContent = "offline";
    elements.roomIdText.textContent = "none";
    elements.copyInvite.classList.add("hidden");
    return;
  }

  elements.roomModeText.textContent = roomSession.visibility;
  elements.roomIdText.textContent = roomSession.roomId;
  if (roomSession.visibility === "private") {
    elements.sessionSummary.textContent = `Private invite ready. Share ${buildInviteLink(roomSession.roomId)}`;
    elements.copyInvite.classList.remove("hidden");
  } else {
    elements.sessionSummary.textContent = "Connected to the public war room.";
    elements.copyInvite.classList.add("hidden");
  }
}

async function fetchPublicRoomId(): Promise<string> {
  const response = await fetch(`${serverHttpOrigin}/matchmaking/public-room`);
  if (!response.ok) {
    throw new Error("Public room unavailable");
  }

  const payload = (await response.json()) as { roomId?: string };
  if (!payload.roomId) {
    throw new Error("Public room id missing");
  }

  return payload.roomId;
}

function buildInviteLink(roomId: string): string {
  return `${normalizeInviteBaseUrl(elements.inviteBaseUrl.value)}/?room=${encodeURIComponent(roomId)}`;
}

function setRoomQuery(roomId?: string): void {
  const url = new URL(window.location.href);
  if (roomId) {
    url.searchParams.set("room", roomId);
  } else {
    url.searchParams.delete("room");
  }
  window.history.replaceState({}, "", url);
}

function normalizeInviteBaseUrl(value: string): string {
  const rawValue = value.trim();
  if (!rawValue) {
    return window.location.origin;
  }

  try {
    const parsed = new URL(rawValue.includes("://") ? rawValue : `https://${rawValue}`);
    return parsed.origin;
  } catch {
    return window.location.origin;
  }
}

function getStoredInviteBaseUrl(): string {
  return normalizeInviteBaseUrl(localStorage.getItem(inviteBaseStorageKey) ?? window.location.origin);
}

function getStoredPlayerName(): string {
  return (localStorage.getItem(playerNameStorageKey) ?? "").replace(/\s+/g, " ").trim().slice(0, 24);
}

function getDesiredPlayerName(): string {
  return elements.playerName.value.replace(/\s+/g, " ").trim().slice(0, 24);
}

function getServerEndpoint(): string {
  const override = import.meta.env.VITE_SERVER_URL as string | undefined;
  if (override) {
    return override;
  }

  if (import.meta.env.DEV) {
    return `ws://${window.location.hostname}:2567`;
  }

  return `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`;
}

function getServerHttpOrigin(): string {
  const override = import.meta.env.VITE_SERVER_URL as string | undefined;
  if (override) {
    if (override.startsWith("ws://")) {
      return `http://${override.slice("ws://".length)}`;
    }
    if (override.startsWith("wss://")) {
      return `https://${override.slice("wss://".length)}`;
    }
    return override;
  }

  if (import.meta.env.DEV) {
    return `http://${window.location.hostname}:2567`;
  }

  return window.location.origin;
}

function humanizeConnectionError(mode: LaunchMode, error: unknown): string {
  const message = error instanceof Error ? error.message : "Baglanti basarisiz";
  if (mode === "invite") {
    return `Invite room unavailable. Join Public War or Return Home. (${message})`;
  }
  if (mode === "public") {
    return `Public room unavailable or full. (${message})`;
  }
  return message;
}

function snapshotState(state: any): MatchSnapshot {
  const players: SnapshotPlayer[] = [];
  state.players?.forEach((player: any) => {
    players.push({
      id: player.id,
      name: player.name,
      team: player.team,
      preferredLane: player.preferredLane,
      activePath: player.activePath,
      activeClassId: player.activeClassId,
      currentVehicleId: player.currentVehicleId,
      isBot: player.isBot,
      alive: player.alive,
      x: player.x,
      y: player.y,
      aimX: player.aimX,
      aimY: player.aimY,
      velocityX: player.velocityX,
      velocityY: player.velocityY,
      health: player.health,
      maxHealth: player.maxHealth,
      armor: player.armor,
      maxArmor: player.maxArmor,
      combatScore: player.combatScore,
      careerScore: player.careerScore,
      regenBlockedUntil: player.regenBlockedUntil,
      shieldUntil: player.shieldUntil,
      respawnAt: player.respawnAt,
      dashUntil: player.dashUntil,
      unlockedMeleeTier: player.unlockedMeleeTier,
      unlockedRangedTier: player.unlockedRangedTier,
      healthLevel: player.healthLevel,
      armorLevel: player.armorLevel,
      meleeDamageLevel: player.meleeDamageLevel,
      meleeSpeedLevel: player.meleeSpeedLevel,
      meleeRangeLevel: player.meleeRangeLevel,
      rangedRateLevel: player.rangedRateLevel,
      rangedRangeLevel: player.rangedRangeLevel,
      rangedAccuracyLevel: player.rangedAccuracyLevel,
      movementLevel: player.movementLevel,
      burnUntil: player.burnUntil,
      empUntil: player.empUntil,
      overdriveUntil: player.overdriveUntil,
      spinUp: player.spinUp,
      utilityKind: player.utilityKind,
      utilityCharges: player.utilityCharges,
      utilityExpiresAt: player.utilityExpiresAt,
      lastMeleeAt: player.lastMeleeAt,
      lastRangedAt: player.lastRangedAt,
      lastDamageAt: player.lastDamageAt,
      kills: player.kills,
      assists: player.assists,
      deaths: player.deaths
    });
  });

  const vehicles: SnapshotVehicle[] = [];
  state.vehicles?.forEach((vehicle: any) => {
    vehicles.push({
      id: vehicle.id,
      type: vehicle.type,
      team: vehicle.team,
      occupantId: vehicle.occupantId,
      alive: vehicle.alive,
      x: vehicle.x,
      y: vehicle.y,
      aimX: vehicle.aimX,
      aimY: vehicle.aimY,
      velocityX: vehicle.velocityX,
      velocityY: vehicle.velocityY,
      health: vehicle.health,
      maxHealth: vehicle.maxHealth,
      armor: vehicle.armor,
      maxArmor: vehicle.maxArmor,
      radius: vehicle.radius,
      mobile: vehicle.mobile,
      airborne: vehicle.airborne,
      burnUntil: vehicle.burnUntil,
      empUntil: vehicle.empUntil,
      overdriveUntil: vehicle.overdriveUntil,
      spinUp: vehicle.spinUp
    });
  });

  const pickups: SnapshotPickup[] = [];
  state.pickups?.forEach((pickup: any) => {
    pickups.push({
      id: pickup.id,
      kind: pickup.kind,
      label: pickup.label,
      weaponClassId: pickup.weaponClassId,
      utilityKind: pickup.utilityKind,
      x: pickup.x,
      y: pickup.y,
      radius: pickup.radius
    });
  });

  const zones: SnapshotZone[] = [];
  state.zones?.forEach((zone: any) => {
    zones.push({
      id: zone.id,
      kind: zone.kind,
      team: zone.team,
      active: zone.active,
      x: zone.x,
      y: zone.y,
      radius: zone.radius
    });
  });

  const obstacles: SnapshotObstacle[] = [];
  state.obstacles?.forEach((obstacle: any) => {
    obstacles.push({
      id: obstacle.id,
      kind: obstacle.kind,
      shape: obstacle.shape,
      x: obstacle.x,
      y: obstacle.y,
      width: obstacle.width,
      height: obstacle.height,
      radius: obstacle.radius
    });
  });

  const objectives: SnapshotObjective[] = [];
  state.objectives?.forEach((objective: any) => {
    objectives.push({
      id: objective.id,
      lane: objective.lane,
      x: objective.x,
      y: objective.y,
      radius: objective.radius,
      progress: objective.progress,
      owner: objective.owner
    });
  });

  const hazards: SnapshotHazard[] = [];
  state.hazards?.forEach((hazard: any) => {
    hazards.push({
      id: hazard.id,
      kind: hazard.kind,
      team: hazard.team,
      ownerId: hazard.ownerId,
      x: hazard.x,
      y: hazard.y,
      radius: hazard.radius,
      expiresAt: hazard.expiresAt,
      armedAt: hazard.armedAt
    });
  });

  const drones: SnapshotDrone[] = [];
  state.drones?.forEach((drone: any) => {
    drones.push({
      id: drone.id,
      team: drone.team,
      ownerId: drone.ownerId,
      x: drone.x,
      y: drone.y,
      aimX: drone.aimX,
      aimY: drone.aimY,
      health: drone.health,
      maxHealth: drone.maxHealth,
      radius: drone.radius,
      expiresAt: drone.expiresAt
    });
  });

  const projectiles: SnapshotProjectile[] = [];
  state.projectiles?.forEach((projectile: any) => {
    projectiles.push({
      id: projectile.id,
      ownerId: projectile.ownerId,
      team: projectile.team,
      x: projectile.x,
      y: projectile.y,
      prevX: projectile.prevX,
      prevY: projectile.prevY,
      dirX: projectile.dirX,
      dirY: projectile.dirY,
      radius: projectile.radius,
      classId: projectile.classId,
      splashRadius: projectile.splashRadius
    });
  });

  return {
    players,
    vehicles,
    pickups,
    zones,
    obstacles,
    hazards,
    drones,
    objectives,
    projectiles,
    germanyScore: state.germanyScore,
    franceScore: state.franceScore,
    frontlineShift: state.frontlineShift
  };
}

function pruneRenderPoses(snapshot: MatchSnapshot): void {
  const liveIds = new Set(snapshot.players.map((player) => player.id));
  for (const playerId of appState.renderPlayers.keys()) {
    if (!liveIds.has(playerId)) {
      appState.renderPlayers.delete(playerId);
    }
  }
}

function getRenderPose(player: SnapshotPlayer, prioritize = false): RenderPose {
  let pose = appState.renderPlayers.get(player.id);
  if (!pose) {
    pose = {
      x: player.x,
      y: player.y,
      aimX: player.aimX,
      aimY: player.aimY,
      velocityX: player.velocityX,
      velocityY: player.velocityY,
      lastSeenAt: Date.now()
    };
    appState.renderPlayers.set(player.id, pose);
    return pose;
  }

  const positionLerp = prioritize ? 0.42 : 0.28;
  const aimLerp = prioritize ? 0.38 : 0.24;
  pose.x += (player.x - pose.x) * positionLerp;
  pose.y += (player.y - pose.y) * positionLerp;
  pose.aimX += (player.aimX - pose.aimX) * aimLerp;
  pose.aimY += (player.aimY - pose.aimY) * aimLerp;
  pose.velocityX += (player.velocityX - pose.velocityX) * 0.3;
  pose.velocityY += (player.velocityY - pose.velocityY) * 0.3;
  pose.lastSeenAt = Date.now();

  const normalizedAim = normalize(pose.aimX, pose.aimY);
  pose.aimX = normalizedAim.x;
  pose.aimY = normalizedAim.y;
  return pose;
}

function withRenderPose(player: SnapshotPlayer): SnapshotPlayer {
  const pose = getRenderPose(player, player.id === appState.localId);
  return {
    ...player,
    x: pose.x,
    y: pose.y,
    aimX: pose.aimX,
    aimY: pose.aimY,
    velocityX: pose.velocityX,
    velocityY: pose.velocityY
  };
}

function updateHud(snapshot: MatchSnapshot): void {
  const localPlayer = snapshot.players.find((player) => player.id === appState.localId);
  const mountedVehicle = localPlayer?.currentVehicleId ? snapshot.vehicles.find((vehicle) => vehicle.id === localPlayer.currentVehicleId) : undefined;
  const localZone = localPlayer ? getZoneContext(snapshot, localPlayer) : undefined;
  const nearbyPickup = localPlayer ? getNearestPickup(snapshot, localPlayer) : undefined;
  const regenState = localPlayer ? getRegenState(localPlayer) : "offline";
  const scoreboard = [...snapshot.players]
    .sort((left, right) => right.careerScore - left.careerScore)
    .slice(0, 8);
  const hudSignature = JSON.stringify({
    localId: appState.localId,
    local: localPlayer
      ? {
          team: localPlayer.team,
          health: Math.round(localPlayer.health),
          maxHealth: localPlayer.maxHealth,
          armor: Math.round(localPlayer.armor),
          maxArmor: localPlayer.maxArmor,
          score: Math.round(localPlayer.combatScore),
          career: Math.round(localPlayer.careerScore),
          path: localPlayer.activePath,
          activeClassId: localPlayer.activeClassId,
          currentVehicleId: localPlayer.currentVehicleId,
          regenBlockedUntil: localPlayer.regenBlockedUntil,
          burnUntil: localPlayer.burnUntil,
          empUntil: localPlayer.empUntil,
          overdriveUntil: localPlayer.overdriveUntil,
          utilityKind: localPlayer.utilityKind,
          utilityCharges: localPlayer.utilityCharges,
          spinUp: localPlayer.spinUp,
          alive: localPlayer.alive,
          respawnAt: localPlayer.respawnAt,
          meleeTier: localPlayer.unlockedMeleeTier,
          rangedTier: localPlayer.unlockedRangedTier,
          levels: [
            localPlayer.healthLevel,
            localPlayer.armorLevel,
            localPlayer.meleeDamageLevel,
            localPlayer.meleeSpeedLevel,
            localPlayer.meleeRangeLevel,
            localPlayer.rangedRateLevel,
            localPlayer.rangedRangeLevel,
            localPlayer.rangedAccuracyLevel,
            localPlayer.movementLevel
          ]
        }
      : null,
    mountedVehicle: mountedVehicle
      ? {
          id: mountedVehicle.id,
          health: Math.round(mountedVehicle.health),
          armor: Math.round(mountedVehicle.armor)
        }
      : null,
    context: {
      regenState,
      zone: localZone?.id ?? "",
      pickup: nearbyPickup?.id ?? ""
    },
    germanyScore: Math.round(snapshot.germanyScore),
    franceScore: Math.round(snapshot.franceScore),
    frontlineShift: Math.round(snapshot.frontlineShift),
    objectives: snapshot.objectives.map((objective) => `${objective.id}:${objective.owner}:${Math.round(objective.progress)}`).join("|"),
    scoreboard: scoreboard.map((player) => `${player.id}:${Math.round(player.combatScore)}:${player.kills}:${player.assists}:${player.deaths}`).join("|")
  });

  if (hudSignature === appState.lastHudSignature) {
    return;
  }

  appState.lastHudSignature = hudSignature;

  if (localPlayer) {
    const teamStyle = TEAM_CONFIG[localPlayer.team];
    elements.teamChip.textContent = `${teamStyle.name} ${localPlayer.isBot ? "BOT" : "INFANTRY"}`;
    elements.teamChip.style.borderColor = `${teamStyle.accent}55`;
    elements.teamChip.style.color = teamStyle.accent;
    elements.healthText.textContent = `${Math.round(localPlayer.health)} / ${localPlayer.maxHealth}`;
    elements.healthFill.style.width = `${Math.max(0, (localPlayer.health / localPlayer.maxHealth) * 100)}%`;
    elements.armorText.textContent = `${Math.round(localPlayer.armor)} / ${localPlayer.maxArmor}`;
    elements.armorFill.style.width = `${Math.max(0, (localPlayer.armor / Math.max(1, localPlayer.maxArmor)) * 100)}%`;
    elements.scoreText.textContent = `${Math.round(localPlayer.combatScore)}`;
    elements.careerText.textContent = `${Math.round(localPlayer.careerScore)}`;
    elements.pathText.textContent = localPlayer.activePath;
    elements.classText.textContent = getWeaponClass(localPlayer.activeClassId).name;
    elements.mountText.textContent = mountedVehicle ? friendlyVehicleName(mountedVehicle.type) : "infantry";
    elements.regenText.textContent = regenState;
    elements.zoneText.textContent = localZone ? formatZoneLabel(localZone) : "no zone";
    elements.pickupText.textContent = nearbyPickup ? formatPickupLabel(nearbyPickup) : "none nearby";
    elements.statusText.textContent = localPlayer.alive
      ? [localPlayer.burnUntil > Date.now() ? "burning" : "", localPlayer.empUntil > Date.now() ? "emp" : "", localPlayer.overdriveUntil > Date.now() ? "overdrive" : ""].filter(Boolean).join(" | ") || "alive"
      : `respawn ${(Math.max(0, localPlayer.respawnAt - Date.now()) / 1000).toFixed(1)}s`;
    elements.armorySummary.textContent = `${getWeaponClass(localPlayer.activeClassId).name} live | ${localPlayer.activePath} | util ${localPlayer.utilityKind || "none"} x${localPlayer.utilityCharges} | build resets on death`;
    elements.skillBadges.innerHTML = renderSkillBadges(localPlayer);
    updateUpgradeButtons(localPlayer);
    renderClassGrid(localPlayer);

    if (mountedVehicle) {
      elements.vehicleHud.classList.remove("hidden");
      elements.vehicleTitle.textContent = friendlyVehicleName(mountedVehicle.type);
      elements.vehicleHealthText.textContent = `${Math.round(mountedVehicle.health)} / ${mountedVehicle.maxHealth}`;
      elements.vehicleHealthFill.style.width = `${Math.max(0, (mountedVehicle.health / Math.max(1, mountedVehicle.maxHealth)) * 100)}%`;
      elements.vehicleArmorText.textContent = `${Math.round(mountedVehicle.armor)} / ${mountedVehicle.maxArmor}`;
      elements.vehicleArmorFill.style.width = `${Math.max(0, (mountedVehicle.armor / Math.max(1, mountedVehicle.maxArmor)) * 100)}%`;
    } else {
      elements.vehicleHud.classList.add("hidden");
    }
  } else {
    elements.vehicleHud.classList.add("hidden");
  }

  elements.germanyScore.textContent = `${Math.round(snapshot.germanyScore)}`;
  elements.franceScore.textContent = `${Math.round(snapshot.franceScore)}`;
  elements.frontlineText.textContent = `${Math.round(snapshot.frontlineShift)}`;

  elements.objectives.innerHTML = snapshot.objectives
    .map((objective) => {
      const ownerLabel = objective.owner === "neutral" ? "Neutral" : TEAM_CONFIG[objective.owner as TeamId].name;
      return `
        <div class="objective-row">
          <span>${friendlyObjectiveName(objective.id)}</span>
          <span>${ownerLabel} ${Math.round(objective.progress)}</span>
        </div>
      `;
    })
    .join("");

  elements.scoreboard.innerHTML = scoreboard
    .map((player) => `
      <div class="score-row">
        <span>${player.name}${player.id === appState.localId ? " (you)" : ""}</span>
        <span>${Math.round(player.careerScore)} | ${player.kills}/${player.assists}/${player.deaths}</span>
      </div>
    `)
    .join("");
}

function renderCombatFeed(): void {
  elements.combatFeed.innerHTML = appState.combatFeed.map((item) => `<div class="feed-item">${item}</div>`).join("");
}

function renderSkillBadges(player: SnapshotPlayer): string {
  const badges = [
    ["HP", player.healthLevel],
    ["AR", player.armorLevel],
    ["MD", player.meleeDamageLevel],
    ["MS", player.meleeSpeedLevel],
    ["MR", player.meleeRangeLevel],
    ["RR", player.rangedRateLevel],
    ["RG", player.rangedRangeLevel],
    ["RA", player.rangedAccuracyLevel],
    ["MV", player.movementLevel]
  ];
  if (player.utilityKind && player.utilityCharges > 0) {
    badges.push([player.utilityKind.toUpperCase(), player.utilityCharges]);
  }
  if (player.overdriveUntil > Date.now()) {
    badges.push(["OD", 1]);
  }
  if (player.activeClassId === "minigun") {
    badges.push(["SPIN", Math.round(player.spinUp * 10)]);
  }

  return badges
    .map(([label, level]) => `<span class="skill-badge">${label} ${level}</span>`)
    .join("");
}

function updateUpgradeButtons(player: SnapshotPlayer): void {
  const specs = [
    { code: "general:health", label: "Health", level: player.healthLevel },
    { code: "general:armor", label: "Armor", level: player.armorLevel },
    { code: "melee:damage", label: "Melee Dmg", level: player.meleeDamageLevel },
    { code: "melee:speed", label: "Melee Spd", level: player.meleeSpeedLevel },
    { code: "melee:range", label: "Melee Rng", level: player.meleeRangeLevel },
    { code: "ranged:rate", label: "Rate", level: player.rangedRateLevel },
    { code: "ranged:range", label: "Range", level: player.rangedRangeLevel },
    { code: "ranged:accuracy", label: "Accuracy", level: player.rangedAccuracyLevel },
    { code: "general:mobility", label: "Mobility", level: player.movementLevel }
  ] as const;

  for (const spec of specs) {
    const button = document.querySelector<HTMLButtonElement>(`[data-upgrade="${spec.code}"]`);
    if (!button) {
      continue;
    }

    const maxed = spec.level >= MAX_UPGRADE_LEVEL;
    const cost = getUpgradeCost(spec.level);
    button.disabled = maxed || player.combatScore < cost;
    button.innerHTML = `
      <span>${spec.label}</span>
      <small>Lv ${spec.level}/${MAX_UPGRADE_LEVEL} ${maxed ? "MAX" : `• ${cost}`}</small>
    `;
  }
}

function renderClassGrid(player: SnapshotPlayer): void {
  const classIds = [...CLASS_IDS_BY_PATH.melee, ...CLASS_IDS_BY_PATH.ranged];
  const grouped = new Map<number, WeaponClassId[]>();
  for (const classId of classIds) {
    const tier = getWeaponClass(classId).tier;
    grouped.set(tier, [...(grouped.get(tier) ?? []), classId]);
  }
  elements.classGrid.innerHTML = [...grouped.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([tier, ids]) => `
      <div class="class-tier">
        <div class="tier-label">Tier ${tier + 1}</div>
        <div class="class-tier-grid">
          ${ids
            .map((classId) => {
              const weaponClass = getWeaponClass(classId);
              const unlocked = isClassUnlocked(classId, player.combatScore);
              const active = classId === player.activeClassId;
              const stateLabel = !unlocked ? `Unlock ${weaponClass.unlockScore}` : active ? "Active" : "Equip";
              const stateClass = !unlocked ? "locked" : active ? "active" : "";
              return `
                <button class="class-card ${stateClass}" data-class-id="${classId}" ${unlocked ? "" : "disabled"}>
                  <span class="class-preview">
                    <img src="${getClassPreviewUrl(classId)}" alt="" />
                  </span>
                  <strong>${weaponClass.name}</strong>
                  <small>${weaponClass.path.toUpperCase()} T${weaponClass.tier + 1}</small>
                  <small>${stateLabel}</small>
                </button>
              `;
            })
            .join("")}
        </div>
      </div>
    `)
    .join("");
}

function getRegenState(player: SnapshotPlayer): string {
  if (!player.alive) {
    return "respawning";
  }
  if (player.currentVehicleId) {
    return "mounted";
  }
  const remaining = Math.max(0, player.regenBlockedUntil - Date.now());
  return remaining > 0 ? `blocked ${(remaining / 1000).toFixed(1)}s` : "active";
}

function getZoneContext(snapshot: MatchSnapshot, player: SnapshotPlayer): SnapshotZone | undefined {
  return snapshot.zones.find((zone) => zone.active && (!zone.team || zone.team === player.team) && Math.hypot(zone.x - player.x, zone.y - player.y) <= zone.radius + 24);
}

function getNearestPickup(snapshot: MatchSnapshot, player: SnapshotPlayer): (SnapshotPickup & { distance: number }) | undefined {
  const nearest = snapshot.pickups
    .map((pickup) => ({ ...pickup, distance: Math.hypot(pickup.x - player.x, pickup.y - player.y) }))
    .sort((left, right) => left.distance - right.distance)[0];
  return nearest && nearest.distance < 240 ? nearest : undefined;
}

function formatZoneLabel(zone: SnapshotZone): string {
  return zone.kind === "base-heal" ? "rear med zone" : "field heal";
}

function formatPickupLabel(pickup: SnapshotPickup & { distance?: number }): string {
  const kind =
    pickup.kind === "weapon"
      ? `${getWeaponClass(pickup.weaponClassId as WeaponClassId).name} crate`
      : pickup.kind === "skill"
        ? "skill pack"
        : pickup.kind === "mine-crate"
          ? "mine crate"
          : pickup.kind === "napalm-canister"
            ? "napalm canister"
            : "ammo overdrive";
  return pickup.distance !== undefined ? `${kind} ${Math.round(pickup.distance)}m` : kind;
}

function renderMinimap(snapshot: MatchSnapshot): void {
  const localPlayer = snapshot.players.find((player) => player.id === appState.localId);
  const objectiveSignature = snapshot.objectives.map((objective) => `${objective.id}:${objective.owner}:${Math.round(objective.progress)}`).join("|");
  const signature = `${snapshot.players.length}:${snapshot.projectiles.length}:${snapshot.vehicles.length}:${snapshot.hazards.length}:${snapshot.drones.length}:${Math.round(snapshot.frontlineShift)}:${objectiveSignature}:${localPlayer?.preferredLane ?? "middle"}:${localPlayer?.x ?? 0}:${localPlayer?.y ?? 0}`;
  if (signature === appState.minimapSignature) {
    return;
  }

  appState.minimapSignature = signature;
  const context = elements.minimap.getContext("2d");
  if (!context) {
    return;
  }

  context.clearRect(0, 0, elements.minimap.width, elements.minimap.height);
  context.fillStyle = "rgba(10, 14, 12, 0.88)";
  context.fillRect(0, 0, elements.minimap.width, elements.minimap.height);

  context.strokeStyle = "rgba(219, 199, 137, 0.25)";
  context.strokeRect(1, 1, elements.minimap.width - 2, elements.minimap.height - 2);
  context.strokeStyle = "rgba(219, 199, 137, 0.18)";
  const frontLineX = ((MAP_WIDTH / 2 + snapshot.frontlineShift) / MAP_WIDTH) * elements.minimap.width;
  context.beginPath();
  context.moveTo(frontLineX, 0);
  context.lineTo(frontLineX, elements.minimap.height);
  context.stroke();

  for (const objective of snapshot.objectives) {
    const x = (objective.x / MAP_WIDTH) * elements.minimap.width;
    const y = (objective.y / MAP_HEIGHT) * elements.minimap.height;
    context.fillStyle = objective.owner === "germany" ? "#d5b64d" : objective.owner === "france" ? "#f4f6ff" : "#7d7d73";
    context.beginPath();
    context.arc(x, y, 6, 0, Math.PI * 2);
    context.fill();
  }

  for (const zone of snapshot.zones) {
    const x = (zone.x / MAP_WIDTH) * elements.minimap.width;
    const y = (zone.y / MAP_HEIGHT) * elements.minimap.height;
    context.strokeStyle = zone.kind === "base-heal" ? "rgba(120, 210, 146, 0.55)" : "rgba(120, 210, 146, 0.9)";
    context.beginPath();
    context.arc(x, y, Math.max(4, (zone.radius / MAP_WIDTH) * elements.minimap.width), 0, Math.PI * 2);
    context.stroke();
  }

  for (const vehicle of snapshot.vehicles) {
    if (!vehicle.alive) {
      continue;
    }
    const x = (vehicle.x / MAP_WIDTH) * elements.minimap.width;
    const y = (vehicle.y / MAP_HEIGHT) * elements.minimap.height;
    context.fillStyle = vehicle.team === "germany" ? "#d5b64d" : "#f4f6ff";
    context.fillRect(x - 2, y - 2, 4, 4);
  }

  for (const pickup of snapshot.pickups) {
    const x = (pickup.x / MAP_WIDTH) * elements.minimap.width;
    const y = (pickup.y / MAP_HEIGHT) * elements.minimap.height;
    context.fillStyle =
      pickup.kind === "weapon"
        ? "#e2b758"
        : pickup.kind === "skill"
          ? "#79c88a"
          : pickup.kind === "mine-crate"
            ? "#c99252"
            : pickup.kind === "napalm-canister"
              ? "#ff8a47"
              : "#79b9ff";
    context.fillRect(x - 1.5, y - 1.5, 3, 3);
  }

  for (const hazard of snapshot.hazards) {
    const x = (hazard.x / MAP_WIDTH) * elements.minimap.width;
    const y = (hazard.y / MAP_HEIGHT) * elements.minimap.height;
    context.strokeStyle = hazard.kind === "mine" ? "rgba(228, 197, 129, 0.85)" : "rgba(255, 127, 76, 0.85)";
    context.beginPath();
    context.arc(x, y, Math.max(2, (hazard.radius / MAP_WIDTH) * elements.minimap.width), 0, Math.PI * 2);
    context.stroke();
  }

  for (const drone of snapshot.drones) {
    const x = (drone.x / MAP_WIDTH) * elements.minimap.width;
    const y = (drone.y / MAP_HEIGHT) * elements.minimap.height;
    context.fillStyle = drone.team === "germany" ? "#e7c96f" : "#d9ebff";
    context.fillRect(x - 1, y - 1, 2, 2);
  }

  for (const player of snapshot.players) {
    if (!player.alive) {
      continue;
    }

    const x = (player.x / MAP_WIDTH) * elements.minimap.width;
    const y = (player.y / MAP_HEIGHT) * elements.minimap.height;
    context.fillStyle = player.id === appState.localId ? "#ff8f4d" : player.team === "germany" ? "rgba(213, 182, 77, 0.8)" : "rgba(244, 246, 255, 0.75)";
    context.fillRect(x - (player.id === appState.localId ? 2 : 1), y - (player.id === appState.localId ? 2 : 1), player.id === appState.localId ? 4 : 2, player.id === appState.localId ? 4 : 2);
  }

  if (localPlayer) {
    const spawn = getSpawnPoint(localPlayer.team, localPlayer.preferredLane, snapshot.frontlineShift);
    const x = (spawn.x / MAP_WIDTH) * elements.minimap.width;
    const y = (spawn.y / MAP_HEIGHT) * elements.minimap.height;
    context.strokeStyle = localPlayer.team === "germany" ? "#d5b64d" : "#f4f6ff";
    context.strokeRect(x - 4, y - 4, 8, 8);
    elements.minimapCaption.textContent = `${localPlayer.preferredLane.toUpperCase()} lane - ${localPlayer.currentVehicleId ? "Mounted" : getWeaponClass(localPlayer.activeClassId).name}`;
  }
}

function pushCombatEffects(event: CombatEvent): void {
  if (event.type === "impact") {
    if (event.hit) {
      const kind = event.style === "explosion" ? "explosion" : event.style === "flame" ? "flame" : event.style === "shock" ? "shock" : "impact";
      acquireEffect(
        kind,
        event.x,
        event.y,
        event.radius ?? 18,
        event.style === "explosion" ? 0xffb060 : event.style === "flame" ? 0xff8e45 : event.style === "shock" ? 0x7fcbff : 0xffe4b0,
        event.style === "shock" ? 0xcceeff : 0xfff5d4
      );
      if (event.blood) {
        acquireEffect("blood", event.x, event.y, event.style === "explosion" ? 24 : 16, 0xc5483f, 0x701919);
      }
      if (event.actorId === appState.localId) {
        appState.scene?.cameras.main.shake(55, event.style === "explosion" ? 0.005 : 0.0022);
      }
    } else {
      acquireEffect("miss", event.x, event.y, 18, 0xdad4c2, 0xffffff);
    }
  }

  if (event.type === "explosion") {
    acquireEffect("explosion", event.x, event.y, event.radius, 0xff8e45, 0xffd77a);
    const localPlayer = appState.snapshot?.players.find((player) => player.id === appState.localId);
    if (localPlayer && Math.hypot(localPlayer.x - event.x, localPlayer.y - event.y) < event.radius + 120) {
      appState.scene?.cameras.main.shake(120, 0.006);
    }
  }

  if (event.type === "impactObstacle") {
    acquireEffect("impact", event.x, event.y, 18, 0xd2c7b1, 0xffffff);
  }

  if (event.type === "clusterSplit") {
    acquireEffect("explosion", event.x, event.y, 42, 0xffb46c, 0xffefb0);
  }

  if (event.type === "minePlaced") {
    acquireEffect("impact", event.x, event.y, 16, 0xd6bb73, 0xf7edd3);
  }

  if (event.type === "mineTriggered") {
    acquireEffect("explosion", event.x, event.y, 56, 0xffb36b, 0xffeeaa);
  }

  if (event.type === "hazardSpawn") {
    acquireEffect(event.hazardKind === "napalm" ? "flame" : "impact", event.x, event.y, event.radius, event.hazardKind === "napalm" ? 0xff8f54 : 0xd8c177, 0xfff0ca);
  }

  if (event.type === "droneLaunch" || event.type === "droneDestroyed") {
    acquireEffect(event.type === "droneLaunch" ? "shock" : "explosion", event.x, event.y, event.type === "droneLaunch" ? 20 : 36, 0x90d8ff, 0xeaf6ff);
  }
}

function acquireEffect(
  kind: "impact" | "blood" | "explosion" | "miss" | "flame" | "shock",
  x: number,
  y: number,
  radius: number,
  color: number,
  secondary: number
): void {
  const now = Date.now();
  const slot = appState.effects.find((effect) => !effect.active || effect.expiresAt <= now) ?? appState.effects[0]!;
  slot.active = true;
  slot.kind = kind;
  slot.x = x;
  slot.y = y;
  slot.radius = radius;
  slot.color = color;
  slot.secondary = secondary;
  slot.rotation = Math.random() * Math.PI * 2;
  slot.expiresAt = now + (kind === "blood" ? 650 : kind === "explosion" ? 360 : kind === "flame" ? 280 : kind === "shock" ? 240 : 180);
}

function renderEffects(graphics: Phaser.GameObjects.Graphics, viewportBounds: Phaser.Geom.Rectangle, now: number): void {
  for (const effect of appState.effects) {
    if (!effect.active || effect.expiresAt <= now) {
      effect.active = false;
      continue;
    }

    if (!viewportBounds.contains(effect.x, effect.y)) {
      continue;
    }

    const duration = effect.kind === "blood" ? 650 : effect.kind === "explosion" ? 360 : effect.kind === "flame" ? 280 : effect.kind === "shock" ? 240 : 180;
    const progress = 1 - (effect.expiresAt - now) / duration;
    switch (effect.kind) {
      case "impact":
        graphics.lineStyle(2, effect.color, 0.8 - progress * 0.55);
        graphics.strokeCircle(effect.x, effect.y, effect.radius * (0.4 + progress));
        drawImpactSpark(graphics, effect.x, effect.y, { x: Math.cos(effect.rotation), y: Math.sin(effect.rotation) }, effect.secondary);
        break;
      case "blood":
        graphics.fillStyle(effect.color, 0.5 - progress * 0.25);
        graphics.fillCircle(effect.x, effect.y, effect.radius * 0.25);
        graphics.fillCircle(effect.x + Math.cos(effect.rotation) * effect.radius * 0.45, effect.y + Math.sin(effect.rotation) * effect.radius * 0.35, effect.radius * 0.18);
        graphics.fillCircle(effect.x - Math.sin(effect.rotation) * effect.radius * 0.3, effect.y + Math.cos(effect.rotation) * effect.radius * 0.24, effect.radius * 0.12);
        break;
      case "explosion":
        graphics.fillStyle(effect.color, 0.28 - progress * 0.12);
        graphics.fillCircle(effect.x, effect.y, effect.radius * (0.35 + progress * 0.75));
        graphics.lineStyle(2.2, effect.secondary, 0.85 - progress * 0.6);
        graphics.strokeCircle(effect.x, effect.y, effect.radius * (0.25 + progress));
        break;
      case "miss":
        graphics.lineStyle(2, effect.color, 0.7 - progress * 0.45);
        graphics.beginPath();
        graphics.arc(effect.x, effect.y, effect.radius * (0.75 + progress * 0.45), effect.rotation - 0.65, effect.rotation + 0.65);
        graphics.strokePath();
        break;
      case "flame":
        graphics.fillStyle(effect.color, 0.32 - progress * 0.14);
        graphics.fillCircle(effect.x, effect.y, effect.radius * (0.35 + progress * 0.5));
        graphics.fillStyle(effect.secondary, 0.24 - progress * 0.12);
        graphics.fillCircle(effect.x + Math.cos(effect.rotation) * effect.radius * 0.25, effect.y + Math.sin(effect.rotation) * effect.radius * 0.22, effect.radius * 0.3);
        break;
      case "shock":
        graphics.lineStyle(2, effect.color, 0.8 - progress * 0.4);
        graphics.strokeCircle(effect.x, effect.y, effect.radius * (0.45 + progress * 0.75));
        graphics.lineStyle(1.5, effect.secondary, 0.75 - progress * 0.5);
        graphics.beginPath();
        graphics.arc(effect.x, effect.y, effect.radius * (0.3 + progress * 0.4), effect.rotation - 0.95, effect.rotation + 0.95);
        graphics.strokePath();
        break;
    }
  }
}

type WeaponProfile = {
  name: string;
  kind:
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
    | "smg"
    | "machinegun"
    | "minigun"
    | "launcher"
    | "flame"
    | "emp"
    | "rocket";
  length: number;
  bladeLength: number;
  coat: number;
  trim: number;
  helmet: number;
  leather: number;
  metal: number;
  flash: number;
  smoke: number;
};

function getWeaponProfile(player: SnapshotPlayer): WeaponProfile {
  const weaponClass = getWeaponClass(player.activeClassId);
  const coat = player.team === "germany" ? 0x5d6457 : 0x506b92;
  const trim = player.team === "germany" ? 0xd5b64d : 0xe9ecf7;
  const helmet = player.team === "germany" ? 0x262a2b : 0x334761;
  const leather = player.team === "germany" ? 0x6d5130 : 0x7b5b39;
  const metal = player.team === "germany" ? 0xbab6a8 : 0xd8dbe3;
  const flash = player.team === "germany" ? 0xffc369 : 0xffe0a5;

  const byKind: Record<WeaponProfile["kind"], Pick<WeaponProfile, "length" | "bladeLength">> = {
    knife: { length: 12, bladeLength: 8 },
    sword: { length: 24, bladeLength: 18 },
    katana: { length: 26, bladeLength: 20 },
    mace: { length: 22, bladeLength: 0 },
    hammer: { length: 24, bladeLength: 0 },
    morningstar: { length: 26, bladeLength: 0 },
    chainblade: { length: 30, bladeLength: 20 },
    pistol: { length: 12, bladeLength: 0 },
    carbine: { length: 25, bladeLength: 0 },
    shotgun: { length: 27, bladeLength: 0 },
    smg: { length: 21, bladeLength: 0 },
    machinegun: { length: 30, bladeLength: 0 },
    minigun: { length: 34, bladeLength: 0 },
    launcher: { length: 30, bladeLength: 0 },
    flame: { length: 24, bladeLength: 0 },
    emp: { length: 28, bladeLength: 0 },
    rocket: { length: 30, bladeLength: 0 }
  };
  const shape = byKind[weaponClass.renderKind];

  return {
    name: weaponClass.name,
    kind: weaponClass.renderKind,
    length: shape.length,
    bladeLength: shape.bladeLength,
    coat,
    trim,
    helmet,
    leather,
    metal,
    flash,
    smoke: 0xc9c4b7
  };
}

function renderSoldier(graphics: Phaser.GameObjects.Graphics, player: SnapshotPlayer, now: number, isLocal: boolean, lowDetail: boolean): void {
  if ((player.isBot || lowDetail) && !isLocal) {
    renderBotSoldier(graphics, player, now, isLocal);
    return;
  }

  const facing = normalize(player.aimX, player.aimY);
  const perpendicular = { x: -facing.y, y: facing.x };
  const weapon = getWeaponProfile(player);
  const skin = getSkinTone(player.id);
  const movementSpeed = Math.hypot(player.velocityX, player.velocityY);
  const moveRatio = clamp01(movementSpeed / 260);
  const moveFacing = movementSpeed > 18 ? normalize(player.velocityX, player.velocityY) : facing;
  const walkPhase = now / Math.max(90, 180 - movementSpeed * 0.15) + player.x * 0.012 + player.y * 0.009;
  const stride = Math.sin(walkPhase) * (0.35 + moveRatio * 1.45);
  const bob = Math.sin(walkPhase * 2) * (0.2 + moveRatio * 1.15);
  const shotKick = 1 - clamp01((now - player.lastRangedAt) / 120);
  const meleeKick = 1 - clamp01((now - player.lastMeleeAt) / 180);
  const dashKick = clamp01((player.dashUntil - now) / 190);
  const damageKick = 1 - clamp01((now - player.lastDamageAt) / 220);
  const bodyX = player.x - facing.x * (shotKick * 2 + meleeKick * 4.2) - moveFacing.x * (moveRatio * 5.5 + dashKick * 11);
  const bodyY = player.y - facing.y * (shotKick * 2 + meleeKick * 4.2) - moveFacing.y * (moveRatio * 5.5 + dashKick * 11) + bob + damageKick * 1.4;

  graphics.fillStyle(0x0a0c0a, 0.24);
  graphics.fillEllipse(bodyX - facing.x * 8, bodyY + 12, 30, 13);

  drawOrientedRect(
    graphics,
    bodyX - facing.x * 9 - perpendicular.x * stride * 2.3,
    bodyY - facing.y * 9 - perpendicular.y * stride * 2.3,
    10,
    4.2,
    facing,
    perpendicular,
    0x1a1d1b,
    1
  );
  drawOrientedRect(
    graphics,
    bodyX - facing.x * 8 + perpendicular.x * stride * 2.3,
    bodyY - facing.y * 8 + perpendicular.y * stride * 2.3,
    10,
    4.2,
    facing,
    perpendicular,
    0x1a1d1b,
    1
  );
  drawOrientedRect(
    graphics,
    bodyX - facing.x * 10,
    bodyY - facing.y * 10,
    9,
    10,
    facing,
    perpendicular,
    mixColor(weapon.leather, 0x22150b, 0.18),
    0.95
  );
  drawOrientedRect(
    graphics,
    bodyX + perpendicular.x * 7 - facing.x * 1.5,
    bodyY + perpendicular.y * 7 - facing.y * 1.5,
    11,
    3.2,
    facing,
    perpendicular,
    weapon.leather,
    0.95
  );
  drawOrientedRect(graphics, bodyX, bodyY, 18, 13, facing, perpendicular, weapon.coat, 1);
  drawOrientedRect(
    graphics,
    bodyX + facing.x * 2.8,
    bodyY + facing.y * 2.8,
    10,
    8.2,
    facing,
    perpendicular,
    mixColor(weapon.coat, weapon.trim, 0.18),
    0.98
  );
  graphics.lineStyle(1.5, mixColor(weapon.trim, 0xf3ebd2, 0.3), 0.65);
  graphics.lineBetween(bodyX - perpendicular.x * 4.5, bodyY - perpendicular.y * 4.5, bodyX + perpendicular.x * 4.5, bodyY + perpendicular.y * 4.5);
  graphics.lineStyle(1.6, mixColor(weapon.leather, 0x20140b, 0.15), 0.75);
  graphics.lineBetween(bodyX - perpendicular.x * 6 + facing.x * 5, bodyY - perpendicular.y * 6 + facing.y * 5, bodyX + perpendicular.x * 6 - facing.x * 4, bodyY + perpendicular.y * 6 - facing.y * 4);

  const headX = bodyX + facing.x * 11;
  const headY = bodyY + facing.y * 11;
  graphics.fillStyle(skin, 1);
  graphics.fillCircle(headX, headY, 4.8);
  drawOrientedRect(graphics, headX - facing.x * 0.5, headY - facing.y * 0.7, 8.4, 6.2, facing, perpendicular, weapon.helmet, 1);
  drawOrientedRect(
    graphics,
    headX - facing.x * 1.8 + perpendicular.x * 0.2,
    headY - facing.y * 1.8 + perpendicular.y * 0.2,
    6.2,
    2.3,
    facing,
    perpendicular,
    weapon.trim,
    0.75
  );
  drawOrientedRect(
    graphics,
    headX + facing.x * 1.8,
    headY + facing.y * 1.8,
    3.6,
    6.8,
    facing,
    perpendicular,
    mixColor(weapon.helmet, 0x0c0c0c, 0.25),
    0.95
  );

  const leftHandX = bodyX + facing.x * 3.6 + perpendicular.x * (1.8 + stride * 0.7);
  const leftHandY = bodyY + facing.y * 3.6 + perpendicular.y * (1.8 + stride * 0.7);
  const rightHandX = bodyX + facing.x * 1.7 - perpendicular.x * (1.9 - stride * 0.5);
  const rightHandY = bodyY + facing.y * 1.7 - perpendicular.y * (1.9 - stride * 0.5);
  graphics.fillStyle(skin, 1);
  graphics.fillCircle(leftHandX, leftHandY, 2.2);
  graphics.fillCircle(rightHandX, rightHandY, 2.2);
  graphics.lineStyle(1.2, mixColor(weapon.coat, 0x17191a, 0.3), 0.9);
  graphics.lineBetween(bodyX + perpendicular.x * 3.5, bodyY + perpendicular.y * 3.5, leftHandX, leftHandY);
  graphics.lineBetween(bodyX - perpendicular.x * 3.5, bodyY - perpendicular.y * 3.5, rightHandX, rightHandY);

  drawWeapon(graphics, player, weapon, facing, perpendicular, now, { x: bodyX, y: bodyY }, { x: leftHandX, y: leftHandY }, { x: rightHandX, y: rightHandY });

  if (isLocal) {
    graphics.lineStyle(2.5, 0xf6f3e4, 0.9);
    graphics.strokeCircle(bodyX, bodyY, 20);
  }
}

function renderBotSoldier(graphics: Phaser.GameObjects.Graphics, player: SnapshotPlayer, now: number, isLocal: boolean): void {
  const facing = normalize(player.aimX, player.aimY);
  const moveFacing = Math.hypot(player.velocityX, player.velocityY) > 16 ? normalize(player.velocityX, player.velocityY) : facing;
  const perpendicular = { x: -facing.y, y: facing.x };
  const weapon = getWeaponProfile(player);
  const dashKick = clamp01((player.dashUntil - now) / 190);
  const x = player.x - moveFacing.x * dashKick * 8;
  const y = player.y - moveFacing.y * dashKick * 8;

  graphics.fillStyle(0x0b0d0c, 0.2);
  graphics.fillEllipse(x - 6, y + 9, 22, 10);
  drawOrientedRect(graphics, x, y, 15, 10, facing, perpendicular, weapon.coat, 0.95);
  drawOrientedRect(graphics, x + facing.x * 10, y + facing.y * 10, 7, 6, facing, perpendicular, weapon.helmet, 1);
  drawOrientedRect(graphics, x + facing.x * 10, y + facing.y * 10, 5, 4, facing, perpendicular, mixColor(weapon.trim, 0xffffff, 0.12), 0.9);
  drawOrientedRect(
    graphics,
    x + facing.x * 7,
    y + facing.y * 7,
    weapon.length * 0.65,
    2.4,
    facing,
    perpendicular,
    weapon.kind === "pistol" ||
      weapon.kind === "carbine" ||
      weapon.kind === "shotgun" ||
      weapon.kind === "smg" ||
      weapon.kind === "machinegun" ||
      weapon.kind === "minigun" ||
      weapon.kind === "launcher" ||
      weapon.kind === "flame" ||
      weapon.kind === "emp" ||
      weapon.kind === "rocket"
      ? weapon.metal
      : weapon.leather,
    0.95
  );

  if (nowWithin(player.lastRangedAt, 110)) {
    const tipX = x + facing.x * (8 + weapon.length * 0.65);
    const tipY = y + facing.y * (8 + weapon.length * 0.65);
    drawMuzzleFlash(graphics, tipX, tipY, facing, perpendicular, weapon.flash);
  }

  if (
    nowWithin(player.lastMeleeAt, 180) &&
    weapon.kind !== "pistol" &&
    weapon.kind !== "carbine" &&
    weapon.kind !== "shotgun" &&
    weapon.kind !== "smg" &&
    weapon.kind !== "machinegun" &&
    weapon.kind !== "minigun" &&
    weapon.kind !== "launcher" &&
    weapon.kind !== "flame" &&
    weapon.kind !== "emp" &&
    weapon.kind !== "rocket"
  ) {
    drawMeleeArc(graphics, x, y, facing, weapon.flash, 24);
  }

  if (isLocal) {
    graphics.lineStyle(2.5, 0xf6f3e4, 0.9);
    graphics.strokeCircle(x, y, 20);
  }
}

function renderHealthBar(graphics: Phaser.GameObjects.Graphics, player: SnapshotPlayer): void {
  const barWidth = 30;
  const barHeight = 5;
  const x = player.x - barWidth / 2;
  const y = player.y - 28;
  const healthRatio = clamp01(player.health / Math.max(1, player.maxHealth));
  const teamColor = TEAM_CONFIG[player.team].color;

  graphics.fillStyle(0x101310, 0.82);
  graphics.fillRoundedRect(x - 1, y - 1, barWidth + 2, barHeight + 2, 3);
  graphics.fillStyle(mixColor(teamColor, 0xffffff, 0.12), 0.45);
  graphics.fillRoundedRect(x, y, barWidth, barHeight, 3);
  graphics.fillStyle(healthRatio > 0.45 ? 0x8ecf74 : healthRatio > 0.2 ? 0xd7ab48 : 0xd96a5e, 0.95);
  graphics.fillRoundedRect(x, y, Math.max(3, barWidth * healthRatio), barHeight, 3);
}

function renderProjectile(graphics: Phaser.GameObjects.Graphics, projectile: SnapshotProjectile): void {
  const weaponClass = getWeaponClass(projectile.classId);
  const teamColor = TEAM_CONFIG[projectile.team].color;
  const glowColor =
    weaponClass.impactStyle === "explosion"
      ? mixColor(teamColor, 0xff9b58, 0.42)
      : weaponClass.impactStyle === "flame"
        ? mixColor(teamColor, 0xff8f54, 0.5)
        : weaponClass.impactStyle === "shock"
          ? mixColor(teamColor, 0x87d3ff, 0.56)
          : mixColor(teamColor, 0xfde5a0, 0.42);
  const trailWidth = weaponClass.impactStyle === "explosion" ? 6 : weaponClass.impactStyle === "flame" ? 5.2 : weaponClass.impactStyle === "shock" ? 4.8 : 4.5;
  const coreWidth = weaponClass.impactStyle === "explosion" ? 3.2 : weaponClass.impactStyle === "flame" ? 2.8 : weaponClass.impactStyle === "shock" ? 2.6 : 2.1;
  const coreColor = weaponClass.impactStyle === "explosion" ? 0xffb05c : weaponClass.impactStyle === "flame" ? 0xffd27a : weaponClass.impactStyle === "shock" ? 0xd4f2ff : 0xfff0c2;

  graphics.lineStyle(trailWidth, teamColor, 0.16);
  graphics.lineBetween(projectile.prevX, projectile.prevY, projectile.x, projectile.y);
  graphics.lineStyle(coreWidth, glowColor, 0.8);
  graphics.lineBetween(projectile.prevX, projectile.prevY, projectile.x, projectile.y);
  graphics.fillStyle(coreColor, 0.96);
  graphics.fillCircle(projectile.x, projectile.y, Math.max(2.4, projectile.radius * (weaponClass.impactStyle === "explosion" ? 0.75 : 0.55)));
  graphics.fillStyle(glowColor, 0.35);
  graphics.fillCircle(projectile.x, projectile.y, projectile.radius + 2.5);
}

function renderPickup(graphics: Phaser.GameObjects.Graphics, pickup: SnapshotPickup, now: number): void {
  const pulse = 0.82 + Math.sin(now / 180 + hashString(pickup.id) * 0.01) * 0.14;
  const color =
    pickup.kind === "weapon"
      ? 0xe2b758
      : pickup.kind === "skill"
        ? 0x7fd29a
        : pickup.kind === "mine-crate"
          ? 0xc99252
          : pickup.kind === "napalm-canister"
            ? 0xff8a47
            : 0x79b9ff;
  const floatY = Math.sin(now / 220 + hashString(pickup.id) * 0.02) * 3;
  const centerY = pickup.y + floatY;
  graphics.fillStyle(color, 0.24);
  graphics.fillCircle(pickup.x, centerY, pickup.radius * 1.6);
  graphics.lineStyle(2, color, 0.85);
  graphics.strokeCircle(pickup.x, centerY, pickup.radius * pulse);
  graphics.fillStyle(mixColor(color, 0x10130f, 0.22), 0.96);
  graphics.fillRoundedRect(pickup.x - 9, centerY - 9, 18, 18, 4);
  graphics.lineStyle(1.5, color, 0.95);
  graphics.strokeRoundedRect(pickup.x - 9, centerY - 9, 18, 18, 4);
  if (pickup.kind === "weapon") {
    drawPickupWeaponGlyph(graphics, pickup.x, centerY, pickup.weaponClassId as WeaponClassId, color);
  } else if (pickup.kind === "skill") {
    drawMedicalMark(graphics, pickup.x, centerY, 5, color);
  } else if (pickup.kind === "mine-crate") {
    graphics.fillStyle(mixColor(color, 0x23160f, 0.3), 0.95);
    graphics.fillCircle(pickup.x, centerY, 4.5);
    graphics.lineStyle(1.6, color, 0.95);
    graphics.lineBetween(pickup.x - 5, centerY + 5, pickup.x + 5, centerY - 5);
    graphics.lineBetween(pickup.x - 5, centerY - 5, pickup.x + 5, centerY + 5);
  } else if (pickup.kind === "napalm-canister") {
    graphics.fillStyle(0xff9b57, 0.95);
    graphics.fillRoundedRect(pickup.x - 4, centerY - 6, 8, 12, 3);
    graphics.fillStyle(0x2f1b12, 0.9);
    graphics.fillRect(pickup.x - 1, centerY - 9, 2, 3);
  } else {
    graphics.lineStyle(2, color, 0.95);
    graphics.lineBetween(pickup.x - 5, centerY, pickup.x + 5, centerY);
    graphics.lineBetween(pickup.x, centerY - 5, pickup.x, centerY + 5);
    graphics.fillStyle(color, 0.2);
    graphics.fillCircle(pickup.x, centerY, 6.5);
  }
}

function renderHazard(graphics: Phaser.GameObjects.Graphics, hazard: SnapshotHazard, now: number): void {
  const pulse = 0.82 + Math.sin(now / 150 + hashString(hazard.id) * 0.014) * 0.16;
  if (hazard.kind === "mine") {
    const armed = hazard.armedAt <= now;
    const color = armed ? 0xd7c06f : 0x827454;
    graphics.fillStyle(color, armed ? 0.18 : 0.1);
    graphics.fillCircle(hazard.x, hazard.y, hazard.radius * 1.3);
    graphics.lineStyle(2, color, armed ? 0.9 : 0.55);
    graphics.strokeCircle(hazard.x, hazard.y, hazard.radius * pulse);
    graphics.fillStyle(0x2c2416, 0.95);
    graphics.fillCircle(hazard.x, hazard.y, hazard.radius * 0.58);
    graphics.lineStyle(1.8, 0xf5e3ad, 0.95);
    graphics.lineBetween(hazard.x - 7, hazard.y + 7, hazard.x + 7, hazard.y - 7);
    graphics.lineBetween(hazard.x - 7, hazard.y - 7, hazard.x + 7, hazard.y + 7);
    return;
  }

  const flicker = 0.78 + Math.sin(now / 90 + hazard.x * 0.01) * 0.18;
  graphics.fillStyle(0xff7f42, 0.14);
  graphics.fillCircle(hazard.x, hazard.y, hazard.radius);
  graphics.lineStyle(2, 0xffb067, 0.6);
  graphics.strokeCircle(hazard.x, hazard.y, hazard.radius * (0.78 + Math.sin(now / 220) * 0.06));
  for (let index = 0; index < 4; index += 1) {
    const angle = now / 280 + index * (Math.PI / 2);
    const flameX = hazard.x + Math.cos(angle) * hazard.radius * 0.34;
    const flameY = hazard.y + Math.sin(angle) * hazard.radius * 0.25;
    graphics.fillStyle(index % 2 === 0 ? 0xff954e : 0xffc364, 0.34 * flicker);
    graphics.fillEllipse(flameX, flameY, hazard.radius * 0.42, hazard.radius * 0.58);
  }
}

function renderDrone(graphics: Phaser.GameObjects.Graphics, drone: SnapshotDrone, now: number): void {
  const facing = normalize(drone.aimX, drone.aimY);
  const perpendicular = { x: -facing.y, y: facing.x };
  const bodyColor = drone.team === "germany" ? 0x5a6458 : 0x5c7392;
  const trim = drone.team === "germany" ? 0xe1c46e : 0xdfeeff;
  const bob = Math.sin(now / 160 + hashString(drone.id) * 0.01) * 2.8;

  graphics.fillStyle(0x090c0b, 0.22);
  graphics.fillEllipse(drone.x, drone.y + drone.radius * 0.7, drone.radius * 2, drone.radius * 0.8);
  drawOrientedRect(graphics, drone.x, drone.y + bob, drone.radius * 1.25, drone.radius * 0.7, facing, perpendicular, bodyColor, 1);
  drawOrientedRect(graphics, drone.x - perpendicular.x * 8, drone.y + bob - perpendicular.y * 8, drone.radius * 1.2, 2.2, facing, perpendicular, trim, 0.95);
  drawOrientedRect(graphics, drone.x + perpendicular.x * 8, drone.y + bob + perpendicular.y * 8, drone.radius * 1.2, 2.2, facing, perpendicular, trim, 0.95);
  graphics.fillStyle(0x9be7ff, 0.82);
  graphics.fillCircle(drone.x + facing.x * 4, drone.y + bob + facing.y * 4, 3.2);
  graphics.lineStyle(1.2, 0x99d8ff, 0.85);
  graphics.lineBetween(drone.x, drone.y + bob - drone.radius, drone.x, drone.y + bob + drone.radius);
  renderDroneBar(graphics, drone);
}

function renderVehicle(
  graphics: Phaser.GameObjects.Graphics,
  vehicle: SnapshotVehicle,
  now: number,
  isLocal: boolean,
  lowDetail: boolean
): void {
  const facing = normalize(vehicle.aimX, vehicle.aimY);
  const perpendicular = { x: -facing.y, y: facing.x };
  const baseColor = vehicle.team === "germany" ? 0x4d5546 : 0x4d6485;
  const trim = vehicle.team === "germany" ? 0xd5b64d : 0xf4f6ff;
  const bodyX = vehicle.x - vehicle.velocityX * 0.02;
  const bodyY = vehicle.y - vehicle.velocityY * 0.02;

  graphics.fillStyle(0x090b09, 0.22);
  graphics.fillEllipse(bodyX, bodyY + vehicle.radius * 0.55, vehicle.radius * 2.2, vehicle.radius * 0.9);

  switch (vehicle.type) {
    case "heavy-mg":
      drawOrientedRect(graphics, bodyX, bodyY + 8, vehicle.radius * 1.5, vehicle.radius * 0.8, { x: 1, y: 0 }, { x: 0, y: 1 }, 0x5d5432, 0.95);
      drawOrientedRect(graphics, bodyX, bodyY, vehicle.radius * 1.8, vehicle.radius * 0.6, facing, perpendicular, baseColor, 1);
      drawOrientedRect(graphics, bodyX + facing.x * 16, bodyY + facing.y * 16, vehicle.radius * 1.35, 5, facing, perpendicular, 0xc2c5cc, 1);
      break;
    case "aa-buggy":
      drawOrientedRect(graphics, bodyX, bodyY, vehicle.radius * 2.1, vehicle.radius * 1.02, facing, perpendicular, mixColor(baseColor, 0x161817, 0.08), 1);
      drawOrientedRect(graphics, bodyX - facing.x * 6, bodyY - facing.y * 6, vehicle.radius * 1.02, vehicle.radius * 0.72, facing, perpendicular, mixColor(baseColor, 0xd5d8de, 0.08), 1);
      drawOrientedRect(graphics, bodyX + facing.x * 10 + perpendicular.x * 6, bodyY + facing.y * 10 + perpendicular.y * 6, vehicle.radius * 1.05, 3.4, facing, perpendicular, 0xd4dae1, 1);
      drawOrientedRect(graphics, bodyX + facing.x * 10 - perpendicular.x * 6, bodyY + facing.y * 10 - perpendicular.y * 6, vehicle.radius * 1.05, 3.4, facing, perpendicular, 0xd4dae1, 1);
      drawWheelSet(graphics, bodyX, bodyY, facing, perpendicular, vehicle.radius * 0.96, 0x1a1d1a);
      break;
    case "rocket-truck":
      drawOrientedRect(graphics, bodyX, bodyY, vehicle.radius * 2.45, vehicle.radius * 1.18, facing, perpendicular, baseColor, 1);
      drawOrientedRect(graphics, bodyX - facing.x * 12, bodyY - facing.y * 12, vehicle.radius * 0.92, vehicle.radius * 1.02, facing, perpendicular, mixColor(baseColor, 0x1b1d1c, 0.25), 1);
      drawOrientedRect(graphics, bodyX + facing.x * 11, bodyY + facing.y * 11, vehicle.radius * 1.15, vehicle.radius * 0.88, facing, perpendicular, mixColor(baseColor, trim, 0.08), 0.98);
      drawOrientedRect(graphics, bodyX + facing.x * 10, bodyY + facing.y * 10, vehicle.radius * 1.2, vehicle.radius * 0.74, facing, perpendicular, 0x5a5f68, 0.96);
      for (let row = -1; row <= 1; row += 1) {
        for (let col = 0; col < 2; col += 1) {
          const offsetForward = 8 + col * 8;
          const offsetSide = row * 7;
          graphics.fillStyle(0x313338, 0.98);
          graphics.fillCircle(bodyX + facing.x * offsetForward + perpendicular.x * offsetSide, bodyY + facing.y * offsetForward + perpendicular.y * offsetSide, 3.2);
          graphics.fillStyle(0xffb565, 0.88);
          graphics.fillCircle(bodyX + facing.x * (offsetForward + 1.5) + perpendicular.x * offsetSide, bodyY + facing.y * (offsetForward + 1.5) + perpendicular.y * offsetSide, 1.2);
        }
      }
      drawWheelSet(graphics, bodyX, bodyY, facing, perpendicular, vehicle.radius * 1.12, 0x171917);
      break;
    case "tank":
      drawTrackSet(graphics, bodyX, bodyY, facing, perpendicular, vehicle.radius * 1.02, mixColor(baseColor, 0x161616, 0.24));
      drawOrientedRect(graphics, bodyX, bodyY, vehicle.radius * 2.05, vehicle.radius * 1.42, facing, perpendicular, baseColor, 1);
      drawOrientedRect(graphics, bodyX, bodyY, vehicle.radius * 1.3, vehicle.radius * 1.05, facing, perpendicular, mixColor(baseColor, 0xffffff, 0.08), 1);
      drawOrientedRect(graphics, bodyX + facing.x * 16, bodyY + facing.y * 16, vehicle.radius * 1.55, 6, facing, perpendicular, 0xc5c8cf, 1);
      break;
    case "flame-tank":
      drawTrackSet(graphics, bodyX, bodyY, facing, perpendicular, vehicle.radius * 1.1, mixColor(baseColor, 0x161616, 0.24));
      drawOrientedRect(graphics, bodyX, bodyY, vehicle.radius * 2.08, vehicle.radius * 1.5, facing, perpendicular, baseColor, 1);
      drawOrientedRect(graphics, bodyX + facing.x * 2, bodyY + facing.y * 2, vehicle.radius * 1.28, vehicle.radius * 1.05, facing, perpendicular, mixColor(baseColor, 0xff8e49, 0.08), 1);
      drawOrientedRect(graphics, bodyX + facing.x * 16, bodyY + facing.y * 16, vehicle.radius * 1.35, 7, facing, perpendicular, 0xcfc8b6, 1);
      graphics.fillStyle(0xff8a47, 0.92);
      graphics.fillCircle(bodyX + facing.x * 24, bodyY + facing.y * 24, 4.2);
      break;
    case "artillery-carrier":
      drawWheelSet(graphics, bodyX, bodyY, facing, perpendicular, vehicle.radius * 1.08, 0x191a18);
      drawOrientedRect(graphics, bodyX, bodyY, vehicle.radius * 2.55, vehicle.radius * 1.14, facing, perpendicular, baseColor, 1);
      drawOrientedRect(graphics, bodyX - facing.x * 8, bodyY - facing.y * 8, vehicle.radius * 0.95, vehicle.radius * 0.96, facing, perpendicular, mixColor(baseColor, 0x1e1f1c, 0.18), 1);
      drawOrientedRect(graphics, bodyX + facing.x * 14, bodyY + facing.y * 14, vehicle.radius * 1.75, 6.4, facing, perpendicular, 0xc6c1b0, 1);
      drawOrientedRect(graphics, bodyX + facing.x * 2, bodyY + facing.y * 2, vehicle.radius * 1.1, vehicle.radius * 0.76, facing, perpendicular, mixColor(baseColor, trim, 0.08), 1);
      break;
    case "plane":
      drawPlane(graphics, bodyX, bodyY, facing, perpendicular, baseColor, trim, vehicle.radius);
      break;
    case "gunship-plane":
      drawPlane(graphics, bodyX, bodyY, facing, perpendicular, mixColor(baseColor, 0x111419, 0.05), trim, vehicle.radius);
      drawOrientedRect(graphics, bodyX - facing.x * 5, bodyY - facing.y * 5, vehicle.radius * 0.92, vehicle.radius * 2.95, perpendicular, { x: -facing.x, y: -facing.y }, mixColor(baseColor, 0xdde7f7, 0.04), 0.98);
      drawOrientedRect(graphics, bodyX + facing.x * 11 + perpendicular.x * 10, bodyY + facing.y * 11 + perpendicular.y * 10, vehicle.radius * 0.72, 3, facing, perpendicular, 0xdde2ea, 0.95);
      drawOrientedRect(graphics, bodyX + facing.x * 11 - perpendicular.x * 10, bodyY + facing.y * 11 - perpendicular.y * 10, vehicle.radius * 0.72, 3, facing, perpendicular, 0xdde2ea, 0.95);
      break;
    case "drone-carrier":
      drawWheelSet(graphics, bodyX, bodyY, facing, perpendicular, vehicle.radius * 1.02, 0x181917);
      drawOrientedRect(graphics, bodyX, bodyY, vehicle.radius * 2.35, vehicle.radius * 1.14, facing, perpendicular, baseColor, 1);
      drawOrientedRect(graphics, bodyX + facing.x * 6, bodyY + facing.y * 6, vehicle.radius * 1.18, vehicle.radius * 0.86, facing, perpendicular, mixColor(baseColor, 0xaed8f8, 0.08), 1);
      graphics.fillStyle(0x99dfff, 0.88);
      graphics.fillCircle(bodyX + perpendicular.x * 11, bodyY + perpendicular.y * 11, 3.2);
      graphics.fillCircle(bodyX - perpendicular.x * 11, bodyY - perpendicular.y * 11, 3.2);
      graphics.fillCircle(bodyX + facing.x * 5, bodyY + facing.y * 5, 3.2);
      break;
  }

  if (!lowDetail) {
    graphics.lineStyle(2, trim, 0.65);
    graphics.lineBetween(bodyX - perpendicular.x * (vehicle.radius * 0.5), bodyY - perpendicular.y * (vehicle.radius * 0.5), bodyX + perpendicular.x * (vehicle.radius * 0.5), bodyY + perpendicular.y * (vehicle.radius * 0.5));
    if (nowWithin((vehicle as unknown as { lastPrimaryAt?: number }).lastPrimaryAt ?? 0, 110)) {
      drawMuzzleFlash(graphics, bodyX + facing.x * (vehicle.radius + 8), bodyY + facing.y * (vehicle.radius + 8), facing, perpendicular, 0xffdba0);
    }
  }

  renderVehicleBar(graphics, vehicle);
  if (isLocal) {
    graphics.lineStyle(2.5, 0xf6f3e4, 0.9);
    graphics.strokeCircle(bodyX, bodyY, vehicle.radius + 6);
  }
}

function renderVehicleBar(graphics: Phaser.GameObjects.Graphics, vehicle: SnapshotVehicle): void {
  const width = 38;
  const x = vehicle.x - width / 2;
  const y = vehicle.y - vehicle.radius - 16;
  graphics.fillStyle(0x11130f, 0.8);
  graphics.fillRoundedRect(x - 1, y - 1, width + 2, 10, 3);
  graphics.fillStyle(0x76bf79, 0.95);
  graphics.fillRoundedRect(x, y, width * clamp01(vehicle.health / Math.max(1, vehicle.maxHealth)), 4, 2);
  graphics.fillStyle(0x7eaed7, 0.9);
  graphics.fillRoundedRect(x, y + 5, width * clamp01(vehicle.armor / Math.max(1, vehicle.maxArmor)), 3, 2);
}

function renderDroneBar(graphics: Phaser.GameObjects.Graphics, drone: SnapshotDrone): void {
  const width = 24;
  const x = drone.x - width / 2;
  const y = drone.y - drone.radius - 12;
  graphics.fillStyle(0x11130f, 0.7);
  graphics.fillRoundedRect(x - 1, y - 1, width + 2, 6, 2);
  graphics.fillStyle(0x86cfdc, 0.95);
  graphics.fillRoundedRect(x, y, width * clamp01(drone.health / Math.max(1, drone.maxHealth)), 4, 2);
}

function drawWheelSet(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  facing: { x: number; y: number },
  perpendicular: { x: number; y: number },
  offset: number,
  color: number
): void {
  for (const side of [-1, 1]) {
    for (const row of [-1, 0, 1]) {
      const wheelX = x + perpendicular.x * offset * side + facing.x * row * 12;
      const wheelY = y + perpendicular.y * offset * side + facing.y * row * 12;
      graphics.fillStyle(color, 0.95);
      graphics.fillCircle(wheelX, wheelY, 4.5);
    }
  }
}

function drawTrackSet(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  facing: { x: number; y: number },
  perpendicular: { x: number; y: number },
  offset: number,
  color: number
): void {
  drawOrientedRect(graphics, x + perpendicular.x * offset, y + perpendicular.y * offset, 48, 8, facing, perpendicular, color, 1);
  drawOrientedRect(graphics, x - perpendicular.x * offset, y - perpendicular.y * offset, 48, 8, facing, perpendicular, color, 1);
}

function drawWeapon(
  graphics: Phaser.GameObjects.Graphics,
  player: SnapshotPlayer,
  weapon: WeaponProfile,
  facing: { x: number; y: number },
  perpendicular: { x: number; y: number },
  now: number,
  origin: { x: number; y: number },
  leftHand: { x: number; y: number },
  rightHand: { x: number; y: number }
): void {
  const shotKick = 1 - clamp01((now - player.lastRangedAt) / 120);
  const dashKick = clamp01((player.dashUntil - now) / 190);
  const meleeAge = now - player.lastMeleeAt;
  const meleeActive = isMeleeWeaponKind(weapon.kind) && meleeAge < 220;
  const swingSide = (hashString(player.id) & 1) === 0 ? 1 : -1;
  const swingAngle = meleeActive ? getSwingAngle(meleeAge / 220, swingSide) : 0;
  const weaponFacing = meleeActive ? rotateFacing(facing, swingAngle) : facing;
  const weaponPerpendicular = { x: -weaponFacing.y, y: weaponFacing.x };
  const gripReach = 6 - shotKick * 1.8 + (meleeActive ? 6 : 0) + dashKick * 3;
  const gripX = origin.x + weaponFacing.x * gripReach + weaponPerpendicular.x * 1.3;
  const gripY = origin.y + weaponFacing.y * gripReach + weaponPerpendicular.y * 1.3;
  const stockX = gripX - weaponFacing.x * 8;
  const stockY = gripY - weaponFacing.y * 8;
  const tipX = gripX + weaponFacing.x * (weapon.length + (meleeActive ? 6 : 0));
  const tipY = gripY + weaponFacing.y * (weapon.length + (meleeActive ? 6 : 0));

  switch (weapon.kind) {
    case "pistol":
      drawOrientedRect(graphics, gripX + weaponFacing.x * 3, gripY + weaponFacing.y * 3, 9, 4.4, weaponFacing, weaponPerpendicular, weapon.metal, 1);
      drawOrientedRect(graphics, stockX + weaponFacing.x * 6, stockY + weaponFacing.y * 6, 6.5, 2.8, weaponFacing, weaponPerpendicular, weapon.leather, 1);
      if (now - player.lastRangedAt < 120) {
        drawMuzzleFlash(graphics, tipX, tipY, weaponFacing, weaponPerpendicular, weapon.flash);
        drawTracer(graphics, tipX, tipY, weaponFacing, weapon.flash);
      }
      break;
    case "carbine":
    case "shotgun":
    case "smg":
    case "machinegun":
    case "minigun":
    case "launcher":
    case "flame":
    case "emp":
    case "rocket":
      drawOrientedRect(graphics, stockX + weaponFacing.x * 4, stockY + weaponFacing.y * 4, 11, 4.2, weaponFacing, weaponPerpendicular, weapon.leather, 1);
      drawOrientedRect(graphics, gripX + weaponFacing.x * (weapon.length * 0.45), gripY + weaponFacing.y * (weapon.length * 0.45), weapon.length, 2.8, weaponFacing, weaponPerpendicular, weapon.metal, 1);
      drawOrientedRect(graphics, gripX + weaponFacing.x * 5, gripY + weaponFacing.y * 5, 12, 2.6, weaponFacing, weaponPerpendicular, weapon.leather, 1);
      drawOrientedRect(graphics, gripX + weaponFacing.x * 10, gripY + weaponFacing.y * 10, 5.5, 4.2, weaponFacing, weaponPerpendicular, mixColor(weapon.metal, 0x3d3d3d, 0.25), 1);
      drawOrientedRect(graphics, tipX - weaponFacing.x * 5, tipY - weaponFacing.y * 5, 4, 3.2, weaponFacing, weaponPerpendicular, mixColor(weapon.metal, 0xf0efe7, 0.15), 1);
      if (weapon.kind === "shotgun") {
        drawOrientedRect(graphics, gripX + weaponFacing.x * 2, gripY + weaponFacing.y * 2, 14, 3.8, weaponFacing, weaponPerpendicular, weapon.leather, 1);
      } else if (weapon.kind === "smg") {
        drawOrientedRect(graphics, gripX + weaponFacing.x * 2, gripY + weaponFacing.y * 2, 6, 5.4, weaponFacing, weaponPerpendicular, weapon.metal, 1);
      } else if (weapon.kind === "machinegun" || weapon.kind === "minigun") {
        drawOrientedRect(graphics, gripX + weaponFacing.x * 14, gripY + weaponFacing.y * 14, 10, 3.6, weaponFacing, weaponPerpendicular, weapon.metal, 1);
      } else if (weapon.kind === "rocket" || weapon.kind === "launcher" || weapon.kind === "emp") {
        drawOrientedRect(graphics, gripX + weaponFacing.x * 10, gripY + weaponFacing.y * 10, weapon.length + 2, 5.2, weaponFacing, weaponPerpendicular, mixColor(weapon.metal, 0x5e6d64, 0.2), 1);
      } else if (weapon.kind === "flame") {
        drawOrientedRect(graphics, gripX + weaponFacing.x * 9, gripY + weaponFacing.y * 9, weapon.length - 3, 4.2, weaponFacing, weaponPerpendicular, mixColor(0xb18452, weapon.metal, 0.15), 1);
        graphics.fillStyle(0xff944d, 0.95);
        graphics.fillCircle(tipX - weaponFacing.x * 2, tipY - weaponFacing.y * 2, 3.2);
      }
      graphics.lineStyle(1, mixColor(weapon.leather, 0x1b120a, 0.2), 0.85);
      graphics.lineBetween(stockX + weaponPerpendicular.x * 2, stockY + weaponPerpendicular.y * 2, gripX + weaponFacing.x * 9, gripY + weaponFacing.y * 9);
      graphics.lineBetween(leftHand.x, leftHand.y, gripX + weaponFacing.x * 7, gripY + weaponFacing.y * 7);
      graphics.lineBetween(rightHand.x, rightHand.y, gripX + weaponFacing.x * 2, gripY + weaponFacing.y * 2);
      if (now - player.lastRangedAt < 120) {
        drawMuzzleFlash(graphics, tipX, tipY, weaponFacing, weaponPerpendicular, weapon.flash);
        drawTracer(graphics, tipX, tipY, weaponFacing, weapon.flash);
        drawSmoke(graphics, tipX + weaponFacing.x * 6, tipY + weaponFacing.y * 6, weaponPerpendicular, weapon.smoke, shotKick);
        if (weapon.kind === "flame") {
          drawMeleeArc(graphics, tipX, tipY, weaponFacing, 0xff924f, 22);
        }
      }
      break;
    case "knife":
    case "sword":
    case "katana":
    case "chainblade":
      drawOrientedRect(graphics, gripX - weaponFacing.x * 3, gripY - weaponFacing.y * 3, 8, 2.8, weaponFacing, weaponPerpendicular, weapon.leather, 1);
      drawOrientedRect(graphics, gripX + weaponPerpendicular.x * 1.6, gripY + weaponPerpendicular.y * 1.6, 2.6, 7.8, weaponFacing, weaponPerpendicular, weapon.metal, 1);
      drawBlade(graphics, tipX + weaponFacing.x * 1.5, tipY + weaponFacing.y * 1.5, weaponFacing, weaponPerpendicular, weapon.bladeLength + (meleeActive ? 5 : 0), weapon.metal);
      if (weapon.kind === "chainblade") {
        graphics.lineStyle(1.4, mixColor(weapon.metal, 0x2c2c2c, 0.3), 0.95);
        graphics.lineBetween(gripX, gripY, tipX - weaponFacing.x * 4, tipY - weaponFacing.y * 4);
      }
      graphics.lineStyle(1.6, mixColor(weapon.metal, 0xffffff, 0.4), 0.72);
      graphics.lineBetween(gripX + weaponFacing.x * 5, gripY + weaponFacing.y * 5, tipX + weaponFacing.x * 2, tipY + weaponFacing.y * 2);
      if (meleeActive) {
        drawMeleeArc(graphics, origin.x, origin.y, weaponFacing, weapon.flash, 30 + weapon.bladeLength * 0.45);
        drawImpactSpark(graphics, tipX, tipY, weaponPerpendicular, weapon.flash);
      }
      break;
    case "mace":
      drawOrientedRect(graphics, gripX + weaponFacing.x * 4, gripY + weaponFacing.y * 4, 18, 2.8, weaponFacing, weaponPerpendicular, weapon.leather, 1);
      graphics.fillStyle(weapon.metal, 0.95);
      graphics.fillCircle(tipX - weaponFacing.x * 3, tipY - weaponFacing.y * 3, 5.5);
      if (meleeActive) {
        drawMeleeArc(graphics, origin.x, origin.y, weaponFacing, weapon.flash, 30);
        drawImpactSpark(graphics, tipX, tipY, weaponPerpendicular, weapon.flash);
      }
      break;
    case "hammer":
      drawOrientedRect(graphics, gripX + weaponFacing.x * 8, gripY + weaponFacing.y * 8, 26, 3.2, weaponFacing, weaponPerpendicular, weapon.leather, 1);
      drawOrientedRect(graphics, tipX - weaponFacing.x * 2, tipY - weaponFacing.y * 2, 10, 8, weaponFacing, weaponPerpendicular, weapon.metal, 1);
      if (meleeActive) {
        drawMeleeArc(graphics, origin.x, origin.y, weaponFacing, weapon.flash, 34);
        drawImpactSpark(graphics, tipX, tipY, weaponPerpendicular, weapon.flash);
      }
      break;
    case "morningstar":
      drawOrientedRect(graphics, gripX + weaponFacing.x * 8, gripY + weaponFacing.y * 8, 26, 2.6, weaponFacing, weaponPerpendicular, weapon.leather, 1);
      graphics.lineStyle(1.4, weapon.metal, 0.95);
      graphics.lineBetween(tipX - weaponFacing.x * 4, tipY - weaponFacing.y * 4, tipX, tipY);
      graphics.fillStyle(weapon.metal, 0.95);
      graphics.fillCircle(tipX, tipY, 5.2);
      if (meleeActive) {
        drawMeleeArc(graphics, origin.x, origin.y, weaponFacing, weapon.flash, 32);
        drawImpactSpark(graphics, tipX, tipY, weaponPerpendicular, weapon.flash);
      }
      break;
  }
}

function isMeleeWeaponKind(kind: WeaponProfile["kind"]): boolean {
  return kind === "knife" || kind === "sword" || kind === "katana" || kind === "mace" || kind === "hammer" || kind === "morningstar" || kind === "chainblade";
}

function getSwingAngle(progress: number, side: number): number {
  const clamped = clamp01(progress);
  const eased = clamped < 0.32
    ? -1 + clamped / 0.32
    : Math.sin(((clamped - 0.32) / 0.68) * Math.PI * 0.5) * 1.2;
  return eased * side;
}

function rotateFacing(vector: { x: number; y: number }, radians: number): { x: number; y: number } {
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return {
    x: vector.x * cosine - vector.y * sine,
    y: vector.x * sine + vector.y * cosine
  };
}

function drawOrientedRect(
  graphics: Phaser.GameObjects.Graphics,
  centerX: number,
  centerY: number,
  length: number,
  width: number,
  facing: { x: number; y: number },
  perpendicular: { x: number; y: number },
  color: number,
  alpha = 1
): void {
  const halfLength = length / 2;
  const halfWidth = width / 2;
  const points = [
    new Phaser.Geom.Point(centerX - facing.x * halfLength - perpendicular.x * halfWidth, centerY - facing.y * halfLength - perpendicular.y * halfWidth),
    new Phaser.Geom.Point(centerX + facing.x * halfLength - perpendicular.x * halfWidth, centerY + facing.y * halfLength - perpendicular.y * halfWidth),
    new Phaser.Geom.Point(centerX + facing.x * halfLength + perpendicular.x * halfWidth, centerY + facing.y * halfLength + perpendicular.y * halfWidth),
    new Phaser.Geom.Point(centerX - facing.x * halfLength + perpendicular.x * halfWidth, centerY - facing.y * halfLength + perpendicular.y * halfWidth)
  ];

  graphics.fillStyle(color, alpha);
  graphics.fillPoints(points, true);
}

function drawBlade(
  graphics: Phaser.GameObjects.Graphics,
  tipX: number,
  tipY: number,
  facing: { x: number; y: number },
  perpendicular: { x: number; y: number },
  length: number,
  color: number
): void {
  const points = [
    new Phaser.Geom.Point(tipX, tipY),
    new Phaser.Geom.Point(tipX - facing.x * length + perpendicular.x * 2.2, tipY - facing.y * length + perpendicular.y * 2.2),
    new Phaser.Geom.Point(tipX - facing.x * length - perpendicular.x * 2.2, tipY - facing.y * length - perpendicular.y * 2.2)
  ];
  graphics.fillStyle(color, 0.95);
  graphics.fillPoints(points, true);
}

function drawAxeHead(
  graphics: Phaser.GameObjects.Graphics,
  tipX: number,
  tipY: number,
  facing: { x: number; y: number },
  perpendicular: { x: number; y: number },
  color: number
): void {
  const points = [
    new Phaser.Geom.Point(tipX + perpendicular.x * 2, tipY + perpendicular.y * 2),
    new Phaser.Geom.Point(tipX + perpendicular.x * 9 - facing.x * 2, tipY + perpendicular.y * 9 - facing.y * 2),
    new Phaser.Geom.Point(tipX + perpendicular.x * 2 - facing.x * 10, tipY + perpendicular.y * 2 - facing.y * 10),
    new Phaser.Geom.Point(tipX - facing.x * 3, tipY - facing.y * 3)
  ];
  graphics.fillStyle(color, 0.95);
  graphics.fillPoints(points, true);
}

function drawMuzzleFlash(
  graphics: Phaser.GameObjects.Graphics,
  tipX: number,
  tipY: number,
  facing: { x: number; y: number },
  perpendicular: { x: number; y: number },
  color: number
): void {
  const points = [
    new Phaser.Geom.Point(tipX + facing.x * 12, tipY + facing.y * 12),
    new Phaser.Geom.Point(tipX - perpendicular.x * 5, tipY - perpendicular.y * 5),
    new Phaser.Geom.Point(tipX + perpendicular.x * 5, tipY + perpendicular.y * 5)
  ];
  graphics.fillStyle(color, 0.92);
  graphics.fillPoints(points, true);
}

function drawTracer(
  graphics: Phaser.GameObjects.Graphics,
  tipX: number,
  tipY: number,
  facing: { x: number; y: number },
  color: number
): void {
  graphics.lineStyle(1.8, color, 0.48);
  graphics.lineBetween(tipX, tipY, tipX + facing.x * 42, tipY + facing.y * 42);
}

function drawSmoke(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  perpendicular: { x: number; y: number },
  color: number,
  strength: number
): void {
  graphics.fillStyle(color, 0.16 + strength * 0.12);
  graphics.fillCircle(x, y, 4 + strength * 3);
  graphics.fillCircle(x + perpendicular.x * 4, y + perpendicular.y * 4, 3 + strength * 2);
  graphics.fillCircle(x - perpendicular.x * 3, y - perpendicular.y * 3, 2.5 + strength * 1.8);
}

function drawMeleeArc(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  facing: { x: number; y: number },
  color: number,
  radius: number
): void {
  const angle = Math.atan2(facing.y, facing.x);
  graphics.lineStyle(3, color, 0.75);
  graphics.beginPath();
  graphics.arc(x, y, radius, angle - 0.65, angle + 0.65);
  graphics.strokePath();
}

function drawImpactSpark(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  perpendicular: { x: number; y: number },
  color: number
): void {
  graphics.lineStyle(1.5, color, 0.82);
  graphics.lineBetween(x - perpendicular.x * 5, y - perpendicular.y * 5, x + perpendicular.x * 5, y + perpendicular.y * 5);
  graphics.lineBetween(x - perpendicular.y * 4, y + perpendicular.x * 4, x + perpendicular.y * 4, y - perpendicular.x * 4);
}

function drawMedicalMark(graphics: Phaser.GameObjects.Graphics, x: number, y: number, size: number, color: number): void {
  graphics.lineStyle(2, color, 0.92);
  graphics.lineBetween(x - size, y, x + size, y);
  graphics.lineBetween(x, y - size, x, y + size);
}

function drawPickupWeaponGlyph(graphics: Phaser.GameObjects.Graphics, x: number, y: number, classId: WeaponClassId, color: number): void {
  const weapon = getWeaponClass(classId);
  const metal = mixColor(color, 0xf4ecd4, 0.45);
  const dark = mixColor(color, 0x10130f, 0.5);
  switch (weapon.renderKind) {
    case "knife":
    case "sword":
    case "katana":
      graphics.lineStyle(2, metal, 0.95);
      graphics.lineBetween(x - 4, y + 4, x + 4, y - 4);
      graphics.lineStyle(1.6, dark, 0.95);
      graphics.lineBetween(x - 6, y + 6, x - 2, y + 2);
      break;
    case "mace":
    case "hammer":
    case "morningstar":
    case "chainblade":
      graphics.lineStyle(2, dark, 0.95);
      graphics.lineBetween(x - 4, y + 4, x + 3, y - 3);
      graphics.fillStyle(metal, 0.95);
      graphics.fillCircle(x + 4, y - 4, 3);
      break;
    case "pistol":
      graphics.fillStyle(metal, 0.95);
      graphics.fillRoundedRect(x - 5, y - 2, 9, 4, 2);
      graphics.fillRoundedRect(x - 2, y + 1, 3, 5, 1);
      break;
    case "carbine":
    case "shotgun":
    case "smg":
    case "machinegun":
    case "minigun":
    case "launcher":
    case "flame":
    case "emp":
    case "rocket":
      graphics.lineStyle(2, metal, 0.95);
      graphics.lineBetween(x - 6, y + 3, x + 6, y - 3);
      graphics.lineStyle(1.6, dark, 0.95);
      graphics.lineBetween(x - 2, y + 5, x + 1, y + 1);
      if (weapon.renderKind === "rocket" || weapon.renderKind === "launcher" || weapon.renderKind === "emp") {
        graphics.fillStyle(color, 0.95);
        graphics.fillTriangle(x + 6, y - 3, x + 10, y - 3, x + 8, y - 7);
      } else if (weapon.renderKind === "flame") {
        graphics.fillStyle(0xff8e48, 0.95);
        graphics.fillCircle(x + 6, y - 3, 2.8);
      }
      break;
  }
}

function drawPlane(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  facing: { x: number; y: number },
  perpendicular: { x: number; y: number },
  bodyColor: number,
  trim: number,
  radius: number
): void {
  drawOrientedRect(graphics, x, y, radius * 2.35, radius * 0.62, facing, perpendicular, mixColor(bodyColor, trim, 0.2), 1);
  drawOrientedRect(graphics, x - facing.x * 3, y - facing.y * 3, radius * 0.82, radius * 2.55, perpendicular, { x: -facing.x, y: -facing.y }, mixColor(bodyColor, 0xdce2ea, 0.08), 0.98);
  drawOrientedRect(graphics, x + facing.x * 7, y + facing.y * 7, radius * 0.52, radius * 1.1, facing, perpendicular, mixColor(bodyColor, 0x0d1115, 0.25), 1);
  drawOrientedRect(graphics, x - facing.x * 18, y - facing.y * 18, radius * 0.48, radius * 0.9, facing, perpendicular, trim, 0.95);
  drawOrientedRect(graphics, x - facing.x * 22 + perpendicular.x * 7, y - facing.y * 22 + perpendicular.y * 7, radius * 0.65, radius * 0.18, facing, perpendicular, mixColor(trim, 0xffffff, 0.12), 0.92);
  drawOrientedRect(graphics, x - facing.x * 22 - perpendicular.x * 7, y - facing.y * 22 - perpendicular.y * 7, radius * 0.65, radius * 0.18, facing, perpendicular, mixColor(trim, 0xffffff, 0.12), 0.92);
  graphics.fillStyle(0xa8d6ff, 0.82);
  graphics.fillEllipse(x + facing.x * 8, y + facing.y * 8, radius * 0.72, radius * 0.34);
  graphics.lineStyle(1.5, trim, 0.85);
  graphics.lineBetween(x - perpendicular.x * (radius * 0.95), y - perpendicular.y * (radius * 0.95), x + perpendicular.x * (radius * 0.95), y + perpendicular.y * (radius * 0.95));
}

function drawTrenchBand(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  graphics.fillStyle(0x4b4128, 0.18);
  graphics.fillRoundedRect(x, y, width, height, 18);
  graphics.lineStyle(2, 0x6c5c37, 0.22);
  graphics.strokeRoundedRect(x, y, width, height, 18);
}

function drawObstacleTerrain(
  graphics: Phaser.GameObjects.Graphics,
  obstacles: Array<{ kind: string; shape: "circle" | "rect"; x: number; y: number; width?: number; height?: number; radius?: number }>
): void {
  for (const obstacle of obstacles) {
    if (obstacle.kind === "rock") {
      const radius = obstacle.radius ?? 20;
      graphics.fillStyle(0x5b635c, 0.96);
      graphics.fillCircle(obstacle.x, obstacle.y, radius);
      graphics.fillStyle(0x6d756d, 0.82);
      graphics.fillCircle(obstacle.x - radius * 0.28, obstacle.y - radius * 0.2, radius * 0.58);
      graphics.fillStyle(0x495148, 0.75);
      graphics.fillCircle(obstacle.x + radius * 0.34, obstacle.y + radius * 0.18, radius * 0.42);
      graphics.lineStyle(2, 0x414940, 0.5);
      graphics.strokeCircle(obstacle.x, obstacle.y, radius);
      continue;
    }

    if (obstacle.kind === "sandbag") {
      const width = obstacle.width ?? 40;
      const height = obstacle.height ?? 18;
      const segmentCount = Math.max(3, Math.floor(width / 20));
      const startX = obstacle.x - width / 2;
      for (let index = 0; index < segmentCount; index += 1) {
        const segmentX = startX + index * (width / segmentCount);
        const bagWidth = width / segmentCount + 4;
        graphics.fillStyle(index % 2 === 0 ? 0x8b7953 : 0x7f6c49, 0.95);
        graphics.fillRoundedRect(segmentX, obstacle.y - height / 2, bagWidth, height, 6);
        graphics.lineStyle(1, 0x5a4d36, 0.34);
        graphics.strokeRoundedRect(segmentX, obstacle.y - height / 2, bagWidth, height, 6);
      }
      continue;
    }

    if (obstacle.kind === "house") {
      const width = obstacle.width ?? 60;
      const height = obstacle.height ?? 60;
      graphics.fillStyle(0x685b49, 0.96);
      graphics.fillRoundedRect(obstacle.x - width / 2, obstacle.y - height / 2, width, height, 7);
      graphics.fillStyle(0x523c31, 0.98);
      graphics.fillTriangle(
        obstacle.x - width / 2 - 6,
        obstacle.y - height / 2 + 10,
        obstacle.x + width / 2 + 6,
        obstacle.y - height / 2 + 10,
        obstacle.x,
        obstacle.y - height / 2 - 18
      );
      graphics.fillStyle(0x89a3b8, 0.65);
      graphics.fillRect(obstacle.x - width * 0.24, obstacle.y - height * 0.18, width * 0.16, height * 0.18);
      graphics.fillRect(obstacle.x + width * 0.08, obstacle.y - height * 0.18, width * 0.16, height * 0.18);
      graphics.fillStyle(0x3a2b22, 0.92);
      graphics.fillRect(obstacle.x - width * 0.08, obstacle.y + height * 0.08, width * 0.16, height * 0.32);
      graphics.lineStyle(2, 0x3d3227, 0.55);
      graphics.strokeRoundedRect(obstacle.x - width / 2, obstacle.y - height / 2, width, height, 7);
      continue;
    }

    if (obstacle.kind === "wall") {
      const width = obstacle.width ?? 80;
      const height = obstacle.height ?? 18;
      graphics.fillStyle(0x756f61, 0.96);
      graphics.fillRoundedRect(obstacle.x - width / 2, obstacle.y - height / 2, width, height, 4);
      graphics.lineStyle(1.2, 0x575349, 0.45);
      for (let row = 0; row < 2; row += 1) {
        const rowY = obstacle.y - height / 4 + row * (height / 2);
        graphics.lineBetween(obstacle.x - width / 2, rowY, obstacle.x + width / 2, rowY);
      }
      for (let col = -2; col <= 2; col += 1) {
        const colX = obstacle.x + col * (width / 5);
        graphics.lineBetween(colX, obstacle.y - height / 2, colX, obstacle.y + height / 2);
      }
      continue;
    }
  }
}

function mixColor(base: number, highlight: number, amount: number): number {
  const baseR = (base >> 16) & 255;
  const baseG = (base >> 8) & 255;
  const baseB = base & 255;
  const hiR = (highlight >> 16) & 255;
  const hiG = (highlight >> 8) & 255;
  const hiB = highlight & 255;

  const r = Math.round(baseR + (hiR - baseR) * amount);
  const g = Math.round(baseG + (hiG - baseG) * amount);
  const b = Math.round(baseB + (hiB - baseB) * amount);

  return (r << 16) | (g << 8) | b;
}

function getSkinTone(seed: string): number {
  const value = hashString(seed);
  const tones = [0xf0cfaa, 0xe0bb92, 0xcfaa82, 0xb88d69, 0x8d6548];
  return tones[Math.abs(value) % tones.length] ?? 0xcfaa82;
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return hash;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function nowWithin(at: number, durationMs: number): boolean {
  return Date.now() - at < durationMs;
}

function formatCombatEvent(event: CombatEvent, snapshot?: MatchSnapshot): string {
  const playerById = new Map(snapshot?.players.map((player) => [player.id, player.name]));
  if (event.type === "kill") {
    return `${playerById.get(event.actorId) ?? event.actorId} dropped ${playerById.get(event.targetId ?? "") ?? event.targetId ?? "enemy"}`;
  }

  if (event.type === "capture") {
    return `${event.team ? TEAM_CONFIG[event.team].name : "A faction"} secured ${friendlyObjectiveName(event.objectiveId ?? "")}`;
  }

  if (event.type === "select") {
    return `${playerById.get(event.actorId) ?? event.actorId} switched to ${getWeaponClass(event.classId).name}`;
  }

  if (event.type === "unlock") {
    return `${playerById.get(event.actorId) ?? event.actorId} unlocked ${getWeaponClass(event.classId).name}`;
  }

  if (event.type === "pickup") {
    return `${playerById.get(event.actorId) ?? event.actorId} grabbed ${event.label}`;
  }

  if (event.type === "mount") {
    return `${playerById.get(event.actorId) ?? event.actorId} mounted ${friendlyVehicleName(event.vehicleType)}`;
  }

  if (event.type === "vehicleDestroyed") {
    return `${playerById.get(event.actorId) ?? event.actorId} destroyed ${friendlyVehicleName(event.vehicleType)}`;
  }

  if (event.type === "vehicleRespawn") {
    return `${friendlyVehicleName(event.vehicleType)} redeployed`;
  }

  if (event.type === "healZoneSpawn") {
    return `Temporary heal field active at ${Math.round(event.x)}, ${Math.round(event.y)}`;
  }

  if (event.type === "healZoneExpire") {
    return "Temporary heal field expired";
  }

  if (event.type === "statusApplied") {
    return `${playerById.get(event.actorId) ?? event.actorId} applied ${friendlyStatusName(event.status)}`;
  }

  if (event.type === "statusExpired") {
    return `${friendlyStatusName(event.status)} expired`;
  }

  if (event.type === "clusterSplit") {
    return "Cluster rocket split";
  }

  if (event.type === "minePlaced") {
    return `${playerById.get(event.actorId) ?? event.actorId} armed a mine`;
  }

  if (event.type === "mineTriggered") {
    return "Mine triggered";
  }

  if (event.type === "hazardSpawn") {
    return event.hazardKind === "napalm" ? "Napalm field ignited" : "Mine deployed";
  }

  if (event.type === "hazardExpire") {
    return event.hazardKind === "napalm" ? "Napalm field burned out" : "Mine expired";
  }

  if (event.type === "droneLaunch") {
    return `${playerById.get(event.actorId) ?? event.actorId} launched drones`;
  }

  if (event.type === "droneDestroyed") {
    return "Attack drone lost";
  }

  return "";
}

function friendlyObjectiveName(id: string): string {
  return OBJECTIVE_LAYOUT.find((objective) => objective.id === id)?.id.replace("-", " ") ?? id;
}

function friendlyVehicleName(type: VehicleTypeId): string {
  switch (type) {
    case "heavy-mg":
      return "Heavy MG";
    case "rocket-truck":
      return "Rocket Truck";
    case "tank":
      return "Tank";
    case "plane":
      return "Plane";
    case "aa-buggy":
      return "AA Buggy";
    case "flame-tank":
      return "Flame Tank";
    case "artillery-carrier":
      return "Artillery Carrier";
    case "gunship-plane":
      return "Gunship";
    case "drone-carrier":
      return "Drone Carrier";
    default:
      return type;
  }
}

function friendlyStatusName(status: "burn" | "emp" | "overdrive"): string {
  switch (status) {
    case "burn":
      return "burn";
    case "emp":
      return "EMP";
    case "overdrive":
      return "overdrive";
    default:
      return status;
  }
}

function normalize(x: number, y: number): { x: number; y: number } {
  const length = Math.hypot(x, y);
  if (!length) {
    return { x: 1, y: 0 };
  }

  return { x: x / length, y: y / length };
}

for (const teamId of TEAM_IDS) {
  TEAM_CONFIG[teamId];
}
