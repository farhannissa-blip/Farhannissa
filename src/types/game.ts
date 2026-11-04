export type DivisionCategoryId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface SpaceEnvironmentTheme {
  arenaName: string;
  arenaSubtitle: string;
  skyColor: string;
  fogColor: string;
  nebulaColor: string;
  planetPrimary: string;
  planetSecondary: string;
  planetAtmosphere: string;
  planetScale: number;
  hasRings?: boolean;
  ringColor?: string;
  hasStation?: boolean;
  hasPortal?: boolean;
  keyLightColor: string;
  hemiSkyColor: string;
  hemiGroundColor: string;
}

export interface DivisionCategory {
  id: DivisionCategoryId;
  code: string;
  title: string;
  subtitle: string;
  description: string;
  examples: string[];
  hasRemainder: 'none' | 'always' | 'mixed';
  dividendDigits: 1 | 2 | 3 | 4;
  divisorDigits: 1 | 2;
  baseTimeSeconds: number;
  scoreMultiplier: number;
  badgeColor: string;
  environment: SpaceEnvironmentTheme;
}

export interface GasingStep {
  label: string;
  equation: string;
  explanation: string;
}

export interface MathQuestion {
  id: string;
  categoryId: DivisionCategoryId;
  dividend: number;
  divisor: number;
  quotient: number;
  remainder: number;
  hasRemainder: boolean;
  displayText: string;
  correctOptionText: string;
  options: {
    labelPrefix: string; // 'A', 'B', 'C', 'D'
    text: string;
    quotient: number;
    remainder: number;
    isCorrect: boolean;
  }[];
  gasingSteps: GasingStep[];
  gasingSummary: string;
  visualGroupCount: number;
  visualItemsPerGroup: number;
  visualRemainder: number;
}

export interface QuestionAttempt {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
  categoryId: DivisionCategoryId;
}

export interface PlanetConfig {
  id: number;
  name: string;
  subtitle: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  atmosphereColor: string;
  fogColor: string;
  hasRings?: boolean;
  ringColor?: string;
  hasStation?: boolean;
  bossName: string;
  bossUfoId: string;
  bossAlienId: string;
  levelRange: [number, number];
  missionObjective: string;
}

export interface UfoTypeConfig {
  id: string;
  index: number;
  name: string;
  alienId: string;
  alienName: string;
  description: string;
  color: string;
  accentColor: string;
  hp: number;
  speed: number;
  scale: number;
  ability:
    | 'speed'
    | 'twin_laser'
    | 'plasma'
    | 'shield'
    | 'heavy'
    | 'stealth'
    | 'spider'
    | 'crystal'
    | 'fire'
    | 'ice'
    | 'royal'
    | 'mothership';
  coinReward: number;
  scoreReward: number;
}

export interface AlienTypeConfig {
  id: string;
  index: number;
  name: string;
  title: string;
  bodyColor: string;
  eyeColor: string;
  feature:
    | 'antennae'
    | 'horns'
    | 'crest'
    | 'four_arms'
    | 'cyber_visor'
    | 'crystal_crown'
    | 'flame_aura'
    | 'ice_spikes'
    | 'shadow_cloak'
    | 'wings'
    | 'colossus'
    | 'supreme_crown';
  description: string;
}

export interface SpaceshipConfig {
  id: string;
  index: number;
  name: string;
  fullName: string;
  title: string;
  description: string;
  specialFeature: string;
  unlockCostCoins: number;
  requiredScore: number;
  isPremium?: boolean;
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  engineColor: string;
  baseSpeed: number;
  baseAttack: number;
  baseArmor: number;
  wingStyle:
    | 'swept'
    | 'falcon'
    | 'twin_boom'
    | 'plasma_ring'
    | 'quantum_x'
    | 'legend_phoenix'
    | 'phantom_x9'
    | 'titan_destroyer'
    | 'quantum_phoenix';
}

export interface PlayerUpgrades {
  laserLevel: number; // 1 to 5
  armorLevel: number; // 1 to 5
  maxHealth: number; // 3 to 5
  speedLevel: number; // 1 to 5
  megaBombs: number;
  shieldCharges: number;
}

export interface PlayerProfile {
  name: string;
  school: string;
  className: string;
  coins: number;
  highScore: number;
  unlockedShips: string[];
  selectedShipId: string;
  upgrades: PlayerUpgrades;
  highestPlanet: number;
  highestLevel: number;
}

export interface ActiveEnemyInstance {
  instanceId: string;
  ufoId: string;
  alienId: string;
  maxHp: number;
  currentHp: number;
  x: number;
  y: number;
  z: number;
  speed: number;
  isBoss: boolean;
}

export interface ActiveEnemy3D {
  instanceId: string;
  ufoType: UfoTypeConfig;
  alienType: AlienTypeConfig;
  maxHp: number;
  hp: number;
  shieldHp: number;
  x: number;
  y: number;
  z: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  phaseOffset: number;
  isBoss: boolean;
  isStealthed: boolean;
  expression: 'normal' | 'laugh' | 'shocked';
  expressionTimer: number;
  hitFlashTimer: number;
  attackCharge: number;
}

export interface LeaderboardEntry {
  id: string;
  sessionId: string;
  playerName: string;
  school: string;
  className: string;
  score: number;
  correctCount: number;
  ufosDestroyed: number;
  highestPlanet: number;
  highestLevel: number;
  categoryId: DivisionCategoryId;
  playTimeSeconds: number;
  timestamp: number;
  selectedShipId?: string;
  ownedShipsCount?: number;
  totalUpgrades?: number;
  totalCoins?: number;
}

export type GameScreenState =
  | 'MAIN_MENU'
  | 'PLAYING'
  | 'HYPERSPACE'
  | 'GAME_OVER'
  | 'CHAMPION';

export type ModalType =
  | 'NONE'
  | 'CATEGORY_SELECT'
  | 'LEADERBOARD'
  | 'HOW_TO_PLAY'
  | 'SPACE_GARAGE'
  | 'SETTINGS'
  | 'GASING_TUTORIAL';

export interface GameSettings {
  soundEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  graphicsQuality: 'low' | 'medium' | 'high';
  inputMode: 'choices' | 'keypad';
  deviceLayoutMode?: 'auto' | 'mobile' | 'tablet_laptop' | 'tv_ifp';
}
