import type {
  BuildingDef,
  DataOverlayMode,
  DifficultyMode,
  DockCategory,
  GameSettings,
  MapPresetId,
  OrdinanceId,
  TaxRates,
  TerrainToolId,
  TerrainType,
  TimeOfDay,
  ToolId,
} from './types';

export const GRID_SIZE = 16;
export const TILE_SIZE = 0.084; // 1.344m x 1.344m architectural tabletop (256 tiles)
export const BOARD_SPAN = GRID_SIZE * TILE_SIZE;
export const PLINTH_SIZE = BOARD_SPAN + 0.14;
export const PLINTH_HEIGHT = 0.095;

export const INITIAL_BUDGET = 1650;
export const BRIDGE_COST = 45;
export const CYCLE_INTERVAL_SEC = 3.5;
export const VICTORY_POPULATION = 380;
export const VICTORY_HAPPINESS = 75;
export const BANKRUPT_BUDGET_LIMIT = -350;
export const UNHAPPY_THRESHOLD = 15;
export const UNHAPPY_CYCLES_LIMIT = 3;

export const TERRAIN_HEIGHTS: Record<TerrainType, number> = {
  water: 0.002,
  sand: 0.009,
  grass: 0.014,
  forest: 0.015,
  hill: 0.036,
  mountain: 0.072,
};

export const BUILDING_TOOL_ORDER: ToolId[] = [
  'road',
  'trainstation',
  'house',
  'shop',
  'factory',
  'seaport',
  'airport',
  'park',
  'windmill',
  'solarplant',
  'powerplant',
  'nuclear',
  'watertower',
  'police',
  'firestation',
  'school',
  'university',
  'hospital',
  'stadium',
  'landmark',
  'bulldoze',
];

export const TERRAIN_TOOL_ORDER: TerrainToolId[] = [
  'terrain_grass',
  'terrain_water',
  'terrain_forest',
  'terrain_hill',
  'terrain_mountain',
];

export const TOOL_ORDER: ToolId[] = [...BUILDING_TOOL_ORDER];

export const DOCK_TAB_ORDER: DockCategory[] = [
  'zones',
  'power',
  'civic',
  'terrain',
];

export const DOCK_TAB_LABELS: Record<DockCategory, string> = {
  zones: 'Zones & Vervoer',
  power: 'Energie & Water',
  civic: 'Diensten & Wonders',
  terrain: 'God-Mode Terrein',
};

export const DOCK_TOOLS_BY_TAB: Record<DockCategory, ToolId[]> = {
  zones: [
    'road',
    'trainstation',
    'house',
    'shop',
    'factory',
    'seaport',
    'airport',
    'bulldoze',
  ],
  power: [
    'windmill',
    'solarplant',
    'powerplant',
    'nuclear',
    'watertower',
    'park',
    'bulldoze',
  ],
  civic: [
    'police',
    'firestation',
    'school',
    'university',
    'hospital',
    'stadium',
    'landmark',
    'bulldoze',
  ],
  terrain: [...TERRAIN_TOOL_ORDER, 'bulldoze'],
};

export const BUILDING_CATALOG: Record<ToolId, BuildingDef> = {
  road: {
    id: 'road',
    category: 'infra',
    dockTab: 'zones',
    buildingType: 'road',
    label: 'Weg / Brug',
    shortRole: 'Verbindt & brug (€45)',
    cost: 20,
    powerDelta: 0,
    population: 0,
    baseIncome: 0,
    accentHex: '#94a3b8',
    hotkey: '1',
  },
  trainstation: {
    id: 'trainstation',
    category: 'infra',
    dockTab: 'zones',
    buildingType: 'trainstation',
    label: 'Treinstation',
    shortRole: 'OV · +Groei & -Rook',
    cost: 160,
    powerDelta: -2,
    population: 4,
    baseIncome: -6,
    accentHex: '#38bdf8',
    hotkey: 'T',
  },
  house: {
    id: 'house',
    category: 'zone',
    dockTab: 'zones',
    buildingType: 'house',
    label: 'Woonzone',
    shortRole: 'Groeit laag→hoogbouw',
    cost: 95,
    powerDelta: -2,
    population: 10,
    baseIncome: 16,
    accentHex: '#34d399',
    hotkey: '2',
  },
  shop: {
    id: 'shop',
    category: 'zone',
    dockTab: 'zones',
    buildingType: 'shop',
    label: 'Commercie',
    shortRole: 'Winkels & kantoortorens',
    cost: 150,
    powerDelta: -3,
    population: 5,
    baseIncome: 25,
    accentHex: '#38bdf8',
    hotkey: '3',
  },
  factory: {
    id: 'factory',
    category: 'zone',
    dockTab: 'zones',
    buildingType: 'factory',
    label: 'Industrie',
    shortRole: '+€60 · Werk & export',
    cost: 220,
    powerDelta: -6,
    population: 4,
    baseIncome: 60,
    accentHex: '#f59e0b',
    hotkey: '4',
  },
  seaport: {
    id: 'seaport',
    category: 'infra',
    dockTab: 'zones',
    buildingType: 'seaport',
    label: 'Zeehaven',
    shortRole: '+€88 · Kust & export',
    cost: 280,
    powerDelta: -4,
    population: 4,
    baseIncome: 88,
    accentHex: '#0ea5e9',
    hotkey: 'P',
  },
  airport: {
    id: 'airport',
    category: 'infra',
    dockTab: 'zones',
    buildingType: 'airport',
    label: 'Luchthaven',
    shortRole: '+€55 · C-Boom & Toerisme',
    cost: 420,
    powerDelta: -6,
    population: 6,
    baseIncome: 55,
    accentHex: '#a5b4fc',
    hotkey: 'V',
  },
  park: {
    id: 'park',
    category: 'civic',
    dockTab: 'power',
    buildingType: 'park',
    label: 'Stadspark',
    shortRole: '+Geluk · -Rook',
    cost: 80,
    powerDelta: 0,
    population: 0,
    baseIncome: -4,
    accentHex: '#4ade80',
    hotkey: '5',
  },
  windmill: {
    id: 'windmill',
    category: 'infra',
    dockTab: 'power',
    buildingType: 'windmill',
    label: 'Windmolen',
    shortRole: '+18 MW · Groen',
    cost: 185,
    powerDelta: 18,
    population: 0,
    baseIncome: -5,
    accentHex: '#a7f3d0',
    hotkey: '6',
  },
  solarplant: {
    id: 'solarplant',
    category: 'infra',
    dockTab: 'power',
    buildingType: 'solarplant',
    label: 'Zonnepark',
    shortRole: '+36 MW · Schoon & stil',
    cost: 245,
    powerDelta: 36,
    population: 0,
    baseIncome: -7,
    accentHex: '#fde047',
    hotkey: 'Z',
  },
  powerplant: {
    id: 'powerplant',
    category: 'infra',
    dockTab: 'power',
    buildingType: 'powerplant',
    label: 'Centrale',
    shortRole: '+48 MW · Krachtwerk',
    cost: 320,
    powerDelta: 48,
    population: 2,
    baseIncome: -12,
    accentHex: '#fb7185',
    hotkey: '7',
  },
  nuclear: {
    id: 'nuclear',
    category: 'infra',
    dockTab: 'power',
    buildingType: 'nuclear',
    label: 'Kerncentrale',
    shortRole: '+120 MW · Ultra-stroom',
    cost: 520,
    powerDelta: 120,
    population: 6,
    baseIncome: -18,
    accentHex: '#c084fc',
    hotkey: 'K',
  },
  watertower: {
    id: 'watertower',
    category: 'infra',
    dockTab: 'power',
    buildingType: 'watertower',
    label: 'Watertoren',
    shortRole: '+Dichtheid & Waarde',
    cost: 170,
    powerDelta: -2,
    population: 0,
    baseIncome: -6,
    accentHex: '#60a5fa',
    hotkey: '8',
  },
  police: {
    id: 'police',
    category: 'civic',
    dockTab: 'civic',
    buildingType: 'police',
    label: 'Politie',
    shortRole: '+Veiligheid & Waarde',
    cost: 190,
    powerDelta: -2,
    population: 1,
    baseIncome: -8,
    accentHex: '#3b82f6',
    hotkey: '9',
  },
  firestation: {
    id: 'firestation',
    category: 'civic',
    dockTab: 'civic',
    buildingType: 'firestation',
    label: 'Brandweer',
    shortRole: 'Ramp-bescherming',
    cost: 180,
    powerDelta: -2,
    population: 1,
    baseIncome: -7,
    accentHex: '#ef4444',
    hotkey: 'F',
  },
  school: {
    id: 'school',
    category: 'civic',
    dockTab: 'civic',
    buildingType: 'school',
    label: 'School',
    shortRole: '+Onderwijs & Hoogbouw',
    cost: 210,
    powerDelta: -2,
    population: 2,
    baseIncome: -9,
    accentHex: '#eab308',
    hotkey: 'C',
  },
  university: {
    id: 'university',
    category: 'civic',
    dockTab: 'civic',
    buildingType: 'university',
    label: 'Universiteit',
    shortRole: '+Tech · Hoogbouw-boost',
    cost: 290,
    powerDelta: -3,
    population: 4,
    baseIncome: -12,
    accentHex: '#fbbf24',
    hotkey: 'U',
  },
  hospital: {
    id: 'hospital',
    category: 'civic',
    dockTab: 'civic',
    buildingType: 'hospital',
    label: 'Ziekenhuis',
    shortRole: '+Gezondheid & Groei',
    cost: 250,
    powerDelta: -3,
    population: 3,
    baseIncome: -11,
    accentHex: '#f43f5e',
    hotkey: 'H',
  },
  stadium: {
    id: 'stadium',
    category: 'civic',
    dockTab: 'civic',
    buildingType: 'stadium',
    label: 'Stadion',
    shortRole: '+18 Geluk · +€28',
    cost: 340,
    powerDelta: -5,
    population: 5,
    baseIncome: 28,
    accentHex: '#22c55e',
    hotkey: 'S',
  },
  landmark: {
    id: 'landmark',
    category: 'civic',
    dockTab: 'civic',
    buildingType: 'landmark',
    label: 'Monument',
    shortRole: '+Toerisme & Prestige',
    cost: 360,
    powerDelta: -2,
    population: 0,
    baseIncome: 18,
    accentHex: '#f5b942',
    hotkey: 'L',
  },
  bulldoze: {
    id: 'bulldoze',
    category: 'infra',
    dockTab: 'zones',
    label: 'Sloop',
    shortRole: '50% teruggave',
    cost: 0,
    powerDelta: 0,
    population: 0,
    baseIncome: 0,
    accentHex: '#ef4444',
    hotkey: '0',
  },
  terrain_grass: {
    id: 'terrain_grass',
    category: 'terrain',
    dockTab: 'terrain',
    terrainTarget: 'grass',
    label: 'Vlak Land',
    shortRole: 'Grasvlak maken',
    cost: 15,
    powerDelta: 0,
    population: 0,
    baseIncome: 0,
    accentHex: '#6ba34a',
    hotkey: '1',
  },
  terrain_water: {
    id: 'terrain_water',
    category: 'terrain',
    dockTab: 'terrain',
    terrainTarget: 'water',
    label: 'Rivier / Water',
    shortRole: 'Water graven',
    cost: 20,
    powerDelta: 0,
    population: 0,
    baseIncome: 0,
    accentHex: '#38bdf8',
    hotkey: '2',
  },
  terrain_forest: {
    id: 'terrain_forest',
    category: 'terrain',
    dockTab: 'terrain',
    terrainTarget: 'forest',
    label: 'Bos',
    shortRole: 'Bomen planten',
    cost: 18,
    powerDelta: 0,
    population: 0,
    baseIncome: 0,
    accentHex: '#2e7d32',
    hotkey: '3',
  },
  terrain_hill: {
    id: 'terrain_hill',
    category: 'terrain',
    dockTab: 'terrain',
    terrainTarget: 'hill',
    label: 'Heuvel',
    shortRole: 'Terrein ophogen',
    cost: 25,
    powerDelta: 0,
    population: 0,
    baseIncome: 0,
    accentHex: '#84a955',
    hotkey: '4',
  },
  terrain_mountain: {
    id: 'terrain_mountain',
    category: 'terrain',
    dockTab: 'terrain',
    terrainTarget: 'mountain',
    label: 'Bergtop',
    shortRole: 'Rotsberg plaatsen',
    cost: 35,
    powerDelta: 0,
    population: 0,
    baseIncome: 0,
    accentHex: '#94a3b8',
    hotkey: '5',
  },
};

export interface OrdinanceDef {
  id: OrdinanceId;
  label: string;
  desc: string;
  costPerCycle: number;
}

export const ORDINANCES: OrdinanceDef[] = [
  {
    id: 'solar_subsidy',
    label: 'Zonnepaneel-Subsidie',
    desc: '-20% uitstoot & +4% geluk in de hele stad',
    costPerCycle: 6,
  },
  {
    id: 'neighborhood_watch',
    label: 'Buurtpreventie',
    desc: '+18 veiligheid & hogere grondwaarde in woonwijken',
    costPerCycle: 5,
  },
  {
    id: 'free_transit',
    label: 'Gratis Openbaar Vervoer',
    desc: '+8% grondwaarde en schonere straten',
    costPerCycle: 8,
  },
  {
    id: 'clean_industry',
    label: 'Schone Industrie-Norm',
    desc: '-30% fabrieksrook zonder productieverlies',
    costPerCycle: 7,
  },
  {
    id: 'city_festival',
    label: 'Stadsfeest & Cultuur',
    desc: '+8% geluk en sterke boost op R/C-vraag',
    costPerCycle: 6,
  },
];

export const DATA_OVERLAY_LABELS: Record<DataOverlayMode, string> = {
  none: 'Normaal',
  landValue: 'Grondwaarde',
  pollution: 'Vervuiling',
  services: 'Stadsdiensten',
};

export interface CityTier {
  minPop: number;
  name: string;
}

export const CITY_TIERS: CityTier[] = [
  {minPop: 0, name: 'Gehucht'},
  {minPop: 35, name: 'Dorp'},
  {minPop: 90, name: 'Marktstad'},
  {minPop: 175, name: 'Bloeiende Stad'},
  {minPop: 290, name: 'Metropool'},
  {minPop: 460, name: 'Megastad'},
  {minPop: 680, name: 'Wereldmetropool'},
];

export const MAP_PRESET_LABELS: Record<
  MapPresetId,
  {label: string; desc: string}
> = {
  polder: {
    label: 'Polder & Rivier',
    desc: 'Vruchtbare vlakte met slingerende rivier en bossen',
  },
  river: {
    label: 'Rivierdelta',
    desc: 'Brede rivierarmen met vruchtbare oevers voor bruggen',
  },
  islands: {
    label: 'Eilandenarchipel',
    desc: 'Groene eilanden verbonden door toekomstige bruggen',
  },
  valley: {
    label: 'Bergvallei',
    desc: 'Beschutte vallei omringd door heuvels en dennenbossen',
  },
  random: {
    label: 'Willekeurige Zaadkaart',
    desc: 'Procedureel gegenereerd landschap met unieke vormen',
  },
};

export const DIFFICULTY_LABELS: Record<
  DifficultyMode,
  {label: string; startBudget: number; incomeMult: number; upkeepMult: number}
> = {
  sandbox: {
    label: 'Sandbox (Vrij Bouwen)',
    startBudget: 99999,
    incomeMult: 1.5,
    upkeepMult: 0.25,
  },
  normal: {
    label: 'Normaal (SimCity Klassiek)',
    startBudget: INITIAL_BUDGET,
    incomeMult: 1.0,
    upkeepMult: 1.0,
  },
  hard: {
    label: 'Uitdagend (Burgemeester Pro)',
    startBudget: 950,
    incomeMult: 0.85,
    upkeepMult: 1.25,
  },
};

export const TIME_OF_DAY_LABELS: Record<TimeOfDay, string> = {
  morning: 'Ochtendgloed',
  day: 'Heldere Dag',
  sunset: 'Gouden Schemering',
  night: 'Verlichte Nacht',
};

export function createDefaultTaxRates(): TaxRates {
  return {
    residential: 7,
    commercial: 7,
    industrial: 7,
  };
}

export function createDefaultSettings(): GameSettings {
  return {
    cityName: 'Nieuw-Amsterdam',
    regionId: 'delta',
    plotId: 'delta-nieuw-amsterdam',
    difficulty: 'normal',
    mapPreset: 'polder',
    mapSeed: 3000,
    timeOfDay: 'day',
    trafficDensity: 'normal',
    disastersEnabled: true,
    autoBuildEnabled: false,
    autoBuildIntervalSec: 2.2,
  };
}
