export type GamePhase =
  | 'title'
  | 'mapmaker'
  | 'playing'
  | 'paused'
  | 'gameover';

export type TerrainType =
  | 'grass'
  | 'water'
  | 'sand'
  | 'forest'
  | 'hill'
  | 'mountain';

export type MapPresetId =
  | 'polder'
  | 'river'
  | 'islands'
  | 'valley'
  | 'random';

export type RegionId = 'delta' | 'alpine' | 'archipelago';

export type DifficultyMode = 'sandbox' | 'normal' | 'hard';
export type TimeOfDay = 'morning' | 'day' | 'sunset' | 'night';
export type TrafficDensity = 'low' | 'normal' | 'busy';
export type DataOverlayMode = 'none' | 'landValue' | 'pollution' | 'services';
export type SettlementKind = 'gehucht' | 'dorp' | 'stad' | 'metropool';
export type DockCategory = 'zones' | 'power' | 'civic' | 'terrain';

export type BuildingType =
  | 'townhall'
  | 'road'
  | 'trainstation'
  | 'house'
  | 'shop'
  | 'park'
  | 'factory'
  | 'seaport'
  | 'airport'
  | 'windmill'
  | 'solarplant'
  | 'powerplant'
  | 'nuclear'
  | 'watertower'
  | 'police'
  | 'firestation'
  | 'school'
  | 'university'
  | 'hospital'
  | 'stadium'
  | 'landmark';

export type TerrainToolId =
  | 'terrain_grass'
  | 'terrain_water'
  | 'terrain_forest'
  | 'terrain_hill'
  | 'terrain_mountain';

export type ToolId =
  | 'road'
  | 'trainstation'
  | 'house'
  | 'shop'
  | 'park'
  | 'factory'
  | 'seaport'
  | 'airport'
  | 'windmill'
  | 'solarplant'
  | 'powerplant'
  | 'nuclear'
  | 'watertower'
  | 'police'
  | 'firestation'
  | 'school'
  | 'university'
  | 'hospital'
  | 'stadium'
  | 'landmark'
  | 'bulldoze'
  | TerrainToolId;

export type OrdinanceId =
  | 'solar_subsidy'
  | 'neighborhood_watch'
  | 'free_transit'
  | 'clean_industry'
  | 'city_festival';

export type DisasterKind = 'storm' | 'fire' | 'ufo' | 'earthquake';

export interface TaxRates {
  residential: number; // 0..15 (%)
  commercial: number; // 0..15 (%)
  industrial: number; // 0..15 (%)
}

export interface BuildingDef {
  id: ToolId;
  category: 'infra' | 'zone' | 'civic' | 'terrain';
  dockTab: DockCategory;
  buildingType?: BuildingType;
  terrainTarget?: TerrainType;
  label: string;
  shortRole: string;
  cost: number;
  powerDelta: number; // positive = supply, negative = demand
  population: number;
  baseIncome: number; // positive = income, negative = upkeep
  accentHex: string;
  hotkey: string;
}

export interface TileData {
  col: number;
  row: number;
  terrain: TerrainType;
  elevation: number; // 0=water, 1=sand/low, 2=grass/forest, 3=hill, 4=mountain
  building: BuildingType | null;
  rotation: number; // 0, 1, 2, 3 (90 deg steps)
  variant: number; // 0, 1, 2
  density: 1 | 2 | 3; // SimCity 3000/4 zone density evolution
  locked: boolean;
}

export interface RciDemand {
  residential: number; // -100..100
  commercial: number; // -100..100
  industrial: number; // -100..100
}

export interface BudgetBreakdown {
  taxResidential: number;
  taxCommercial: number;
  taxIndustrial: number;
  neighborTrade: number;
  upkeepInfra: number;
  upkeepCivic: number;
  upkeepOrdinances: number;
}

export interface NeighborSynergy {
  connectedNeighbors: number;
  adjacentPopTotal: number;
  commuterIncomeBonus: number;
  demandBoost: number;
  links: {
    north: string | null;
    east: string | null;
    south: string | null;
    west: string | null;
  };
}

export interface CityMetrics {
  population: number;
  happiness: number;
  landValue: number;
  pollution: number;
  safety: number;
  health: number;
  education: number;
  powerSupply: number;
  powerDemand: number;
  powerBalance: number;
  hasPower: boolean;
  netIncome: number;
  buildingCount: number;
  roadCount: number;
  bridgeCount: number;
  waterTileCount: number;
  tierName: string;
  nextTierTarget: number | null;
  specializations: string[];
  rci: RciDemand;
  budgetBreakdown: BudgetBreakdown;
  neighborSynergy: NeighborSynergy;
}

export type GameOverReason = 'victory' | 'bankrupt' | 'unhappy' | null;

export interface GameSettings {
  cityName: string;
  regionId: RegionId;
  plotId: string;
  difficulty: DifficultyMode;
  mapPreset: MapPresetId;
  mapSeed: number;
  timeOfDay: TimeOfDay;
  trafficDensity: TrafficDensity;
  disastersEnabled: boolean;
  autoBuildEnabled: boolean;
  autoBuildIntervalSec: number;
}

export interface CityState {
  gridSize: number;
  tiles: TileData[];
  budget: number;
  cycleCount: number;
  lowHappinessCycles: number;
  selectedTool: ToolId;
  buildRotation: number;
  mapBrushSize: 1 | 2;
  speedMultiplier: 1 | 2 | 3;
  dataOverlay: DataOverlayMode;
  taxes: TaxRates;
  ordinances: OrdinanceId[];
  neighborTradeMw: number; // positive = importing MW, negative = exporting MW
  settings: GameSettings;
  victoryAchieved: boolean;
  victoryDismissed: boolean;
  gameOverReason: GameOverReason;
  bestPopulation: number;
  lastCycleDelta: number;
  newsTicker: string;
}

export interface PlacementResult {
  ok: boolean;
  reason?: string;
  costDelta: number;
  action: 'placed' | 'demolished' | 'terrain' | 'none';
  col: number;
  row: number;
  building: BuildingType | null;
}

export interface CycleStepResult {
  incomeApplied: number;
  metrics: CityMetrics;
  tierChangedTo: string | null;
  upgradedCount: number;
  gameOverReason: GameOverReason;
  disasterNote: string | null;
}

export interface AdvisorReport {
  advisorName: string;
  role: string;
  mood: 'positive' | 'caution' | 'urgent';
  headline: string;
  summary: string;
  tips: string[];
  recommendedTool: ToolId;
  source: 'rules' | 'gemini';
}

export interface AiCityPlan {
  cityName: string;
  concept: string;
  placements: Array<{
    col: number;
    row: number;
    building: BuildingType;
    rotation: number;
  }>;
}

export interface PeerInfo {
  id: string;
  name: string;
  color: string;
  rtcConnected?: boolean;
}

export interface ChatMessageEntry {
  id: string;
  author: string;
  color: string;
  text: string;
  timestamp: number;
}

export interface P2PStatus {
  connected: boolean;
  roomCode: string | null;
  isPublic: boolean;
  selfPeerId: string | null;
  transportMode: 'offline' | 'ws-relay' | 'webrtc-p2p';
  peers: PeerInfo[];
  lastEventText: string;
}

export interface OnlineRoomSummary {
  roomCode: string;
  cityName: string;
  regionName: string;
  hostName: string;
  peerCount: number;
  maxPeers: number;
  population: number;
  tierName: string;
  updatedAt: number;
}

export interface PublishedCitySummary {
  id: string;
  cityName: string;
  authorName: string;
  regionName: string;
  tierName: string;
  population: number;
  happiness: number;
  likes: number;
  createdAt: number;
  encoded: string;
}

export interface RegionPlotBlueprint {
  plotId: string;
  regionId: RegionId;
  rx: number; // 0..3 column in 4x3 SimCity 4 region grid
  ry: number; // 0..2 row in 4x3 SimCity 4 region grid
  name: string;
  kind: SettlementKind;
  mapPreset: MapPresetId;
  mapSeed: number;
  tagline: string;
  startBudget: number;
  timeOfDay: TimeOfDay;
}

export interface RegionDefinition {
  id: RegionId;
  name: string;
  cols: number;
  rows: number;
  subtitle: string;
  climateNote: string;
  plots: RegionPlotBlueprint[];
}

export interface RegionPlotSummary {
  plotId: string;
  regionId: RegionId;
  rx: number;
  ry: number;
  name: string;
  kind: SettlementKind;
  tierName: string;
  population: number;
  happiness: number;
  budget: number;
  powerBalance: number;
  tagline: string;
  isActive: boolean;
  miniPreviewColors: string[]; // 16-entry 4x4 terrain+zone color preview
  neighborCount: number;
}
