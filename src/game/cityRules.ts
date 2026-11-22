import {
  BANKRUPT_BUDGET_LIMIT,
  BRIDGE_COST,
  BUILDING_CATALOG,
  CITY_TIERS,
  createDefaultSettings,
  createDefaultTaxRates,
  DIFFICULTY_LABELS,
  GRID_SIZE,
  ORDINANCES,
  TERRAIN_HEIGHTS,
  UNHAPPY_CYCLES_LIMIT,
  UNHAPPY_THRESHOLD,
  VICTORY_HAPPINESS,
  VICTORY_POPULATION,
} from '../constants';
import type {
  AdvisorReport,
  BuildingType,
  CityMetrics,
  CityState,
  CycleStepResult,
  DataOverlayMode,
  DisasterKind,
  GameSettings,
  MapPresetId,
  NeighborSynergy,
  OrdinanceId,
  PlacementResult,
  TerrainToolId,
  TerrainType,
  TileData,
  ToolId,
} from '../types';

export function tileIndex(
  col: number,
  row: number,
  gridSize = GRID_SIZE
): number {
  return row * gridSize + col;
}

export function isInBounds(
  col: number,
  row: number,
  gridSize = GRID_SIZE
): boolean {
  return col >= 0 && col < gridSize && row >= 0 && row < gridSize;
}

export function getTile(
  state: CityState,
  col: number,
  row: number
): TileData | null {
  if (!isInBounds(col, row, state.gridSize)) return null;
  return state.tiles[tileIndex(col, row, state.gridSize)] ?? null;
}

export function isTerrainTool(tool: ToolId): tool is TerrainToolId {
  return tool.startsWith('terrain_');
}

function seededRand(seed: number): () => number {
  let s = Math.abs(Math.floor(seed)) % 2147483647;
  if (s <= 0) s = 123457;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hash2D(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

function smoothNoise2D(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);

  const a = hash2D(ix, iy, seed);
  const b = hash2D(ix + 1, iy, seed);
  const c = hash2D(ix, iy + 1, seed);
  const d = hash2D(ix + 1, iy + 1, seed);

  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

export function terrainToElevation(terrain: TerrainType): number {
  switch (terrain) {
    case 'water':
      return 0;
    case 'sand':
      return 1;
    case 'grass':
    case 'forest':
      return 2;
    case 'hill':
      return 3;
    case 'mountain':
      return 4;
  }
}

export function getTerrainHeightY(terrain: TerrainType): number {
  return TERRAIN_HEIGHTS[terrain];
}

export function generateTerrainGrid(
  preset: MapPresetId,
  seed: number,
  gridSize = GRID_SIZE
): TileData[] {
  const rand = seededRand(seed);
  const tiles: TileData[] = [];
  const half = (gridSize - 1) / 2;

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const ny = row / gridSize;
      const distCenter = Math.hypot(col - half, row - half) / (gridSize * 0.5);
      const n =
        smoothNoise2D(col * 0.36, row * 0.36, seed) * 0.65 +
        smoothNoise2D(col * 0.75, row * 0.75, seed + 17) * 0.35;

      let terrain: TerrainType = 'grass';

      if (preset === 'polder') {
        const riverCurve =
          gridSize * 0.72 + Math.sin(row * 0.45 + (seed % 7)) * 1.4;
        if (Math.abs(col - riverCurve) < 0.85) {
          terrain = 'water';
        } else if (n > 0.78 && distCenter > 0.45) {
          terrain = 'hill';
        } else if (n > 0.6 && distCenter > 0.38) {
          terrain = 'forest';
        }
      } else if (preset === 'river') {
        const riverCenter =
          half + Math.sin(ny * Math.PI * 1.8 + (seed % 5) * 0.4) * 2.1;
        if (Math.abs(col - riverCenter) < 1.15 && Math.abs(row - half) > 1.8) {
          terrain = 'water';
        } else if (Math.abs(col - riverCenter) < 1.15 && row < half - 1.5) {
          terrain = 'water';
        } else if (Math.abs(col - riverCenter) < 1.15 && row > half + 1.5) {
          terrain = 'water';
        } else if (n > 0.74 && distCenter > 0.52) {
          terrain = 'hill';
        } else if (n > 0.58 && distCenter > 0.35) {
          terrain = 'forest';
        }
      } else if (preset === 'islands') {
        const islandScore = 1 - distCenter * 0.85 + (n - 0.5) * 0.75;
        if (islandScore < 0.36 && distCenter > 0.42) {
          terrain = 'water';
        } else if (n > 0.74 && distCenter < 0.5) {
          terrain = 'hill';
        } else if (n > 0.58 && rand() > 0.35) {
          terrain = 'forest';
        }
      } else if (preset === 'valley') {
        if (distCenter > 0.92 && n > 0.42) {
          terrain = 'mountain';
        } else if (distCenter > 0.68 && n > 0.38) {
          terrain = 'hill';
        } else if (n > 0.62 && distCenter > 0.32) {
          terrain = 'forest';
        } else if (col <= 2 && row >= gridSize - 4) {
          terrain = 'water';
        }
      } else {
        if (n < 0.25 && distCenter > 0.36) {
          terrain = 'water';
        } else if (n > 0.84 && distCenter > 0.55) {
          terrain = 'mountain';
        } else if (n > 0.69 && distCenter > 0.35) {
          terrain = 'hill';
        } else if (n > 0.53 && rand() > 0.25) {
          terrain = 'forest';
        }
      }

      tiles.push({
        col,
        row,
        terrain,
        elevation: terrainToElevation(terrain),
        building: null,
        rotation: 0,
        variant: (col * 3 + row * 7) % 3,
        density: 1,
        locked: false,
      });
    }
  }

  applyCoastalSand(tiles, gridSize);
  return tiles;
}

export function applyCoastalSand(tiles: TileData[], gridSize: number): void {
  const isWater = (c: number, r: number) =>
    isInBounds(c, r, gridSize) &&
    tiles[tileIndex(c, r, gridSize)].terrain === 'water';

  for (const tile of tiles) {
    if (tile.terrain === 'grass' && !tile.building) {
      const touchesWater =
        isWater(tile.col + 1, tile.row) ||
        isWater(tile.col - 1, tile.row) ||
        isWater(tile.col, tile.row + 1) ||
        isWater(tile.col, tile.row - 1);
      if (touchesWater) {
        tile.terrain = 'sand';
        tile.elevation = terrainToElevation('sand');
      }
    } else if (tile.terrain === 'sand') {
      const touchesWater =
        isWater(tile.col + 1, tile.row) ||
        isWater(tile.col - 1, tile.row) ||
        isWater(tile.col, tile.row + 1) ||
        isWater(tile.col, tile.row - 1);
      if (!touchesWater) {
        tile.terrain = 'grass';
        tile.elevation = terrainToElevation('grass');
      }
    }
  }
}

export function placeStarterTown(state: CityState): void {
  const cMid = Math.floor(state.gridSize / 2) - 1;
  const rMid = Math.floor(state.gridSize / 2) - 1;

  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const t = getTile(state, cMid + dc, rMid + dr);
      if (t) {
        if (
          t.terrain === 'water' ||
          t.terrain === 'mountain' ||
          t.terrain === 'forest'
        ) {
          t.terrain = 'grass';
          t.elevation = terrainToElevation('grass');
        }
        t.building = null;
        t.density = 1;
        t.locked = false;
      }
    }
  }
  applyCoastalSand(state.tiles, state.gridSize);

  const setStarter = (
    col: number,
    row: number,
    building: BuildingType,
    rotation = 0,
    locked = false,
    density: 1 | 2 | 3 = 1
  ) => {
    const t = getTile(state, col, row);
    if (!t) return;
    if (
      t.terrain === 'water' ||
      t.terrain === 'mountain' ||
      t.terrain === 'forest'
    ) {
      t.terrain = 'grass';
      t.elevation = terrainToElevation('grass');
    }
    t.building = building;
    t.rotation = rotation;
    t.density = density;
    t.locked = locked;
  };

  setStarter(cMid, rMid, 'townhall', 0, true);

  const roadLoop: Array<[number, number]> = [
    [cMid - 1, rMid - 1],
    [cMid, rMid - 1],
    [cMid + 1, rMid - 1],
    [cMid + 2, rMid - 1],
    [cMid - 1, rMid],
    [cMid + 2, rMid],
    [cMid - 1, rMid + 1],
    [cMid, rMid + 1],
    [cMid + 1, rMid + 1],
    [cMid + 2, rMid + 1],
  ];
  for (const [c, r] of roadLoop) {
    setStarter(c, r, 'road', 0, false);
  }

  setStarter(cMid, rMid - 2, 'house', 2, false);
  setStarter(cMid + 1, rMid - 2, 'house', 2, false);
  setStarter(cMid + 1, rMid, 'park', 0, false);
  setStarter(cMid - 2, rMid, 'shop', 1, false);
  setStarter(cMid + 3, rMid - 1, 'windmill', 0, false);
}

export function createInitialCityState(
  settingsOverride?: Partial<GameSettings>
): CityState {
  const settings: GameSettings = {
    ...createDefaultSettings(),
    ...settingsOverride,
  };
  const tiles = generateTerrainGrid(
    settings.mapPreset,
    settings.mapSeed,
    GRID_SIZE
  );

  const diff = DIFFICULTY_LABELS[settings.difficulty];

  const state: CityState = {
    gridSize: GRID_SIZE,
    tiles,
    budget: diff.startBudget,
    cycleCount: 0,
    lowHappinessCycles: 0,
    selectedTool: 'house',
    buildRotation: 0,
    mapBrushSize: 1,
    speedMultiplier: 1,
    dataOverlay: 'none',
    taxes: createDefaultTaxRates(),
    ordinances: [],
    neighborTradeMw: 0,
    settings,
    victoryAchieved: false,
    victoryDismissed: false,
    gameOverReason: null,
    bestPopulation: 32,
    lastCycleDelta: 0,
    newsTicker:
      'Welkom burgemeester! Beheer RCI-vraag, verordeningen, regiohandel en bouw jouw eigen 3D-metropool.',
  };

  placeStarterTown(state);
  const m = computeCityMetrics(state);
  state.bestPopulation = m.population;
  return state;
}

export function getCostForToolOnTile(
  tile: TileData,
  tool: ToolId
): number {
  if (tool === 'road' && tile.terrain === 'water') {
    return BRIDGE_COST;
  }
  return BUILDING_CATALOG[tool].cost;
}

export function getCostForBuilding(building: BuildingType): number {
  if (building === 'townhall') return 0;
  return BUILDING_CATALOG[building].cost;
}

export function getRoadNeighborsMask(
  state: CityState,
  col: number,
  row: number
): number {
  let mask = 0;
  if (getTile(state, col, row - 1)?.building === 'road') mask |= 1;
  if (getTile(state, col + 1, row)?.building === 'road') mask |= 2;
  if (getTile(state, col, row + 1)?.building === 'road') mask |= 4;
  if (getTile(state, col - 1, row)?.building === 'road') mask |= 8;
  return mask;
}

export function hasAdjacentRoad(
  state: CityState,
  col: number,
  row: number
): boolean {
  return (
    getTile(state, col, row - 1)?.building === 'road' ||
    getTile(state, col + 1, row)?.building === 'road' ||
    getTile(state, col, row + 1)?.building === 'road' ||
    getTile(state, col - 1, row)?.building === 'road' ||
    getTile(state, col, row - 1)?.building === 'townhall' ||
    getTile(state, col + 1, row)?.building === 'townhall' ||
    getTile(state, col, row + 1)?.building === 'townhall' ||
    getTile(state, col - 1, row)?.building === 'townhall'
  );
}

export function countAdjacentBuilding(
  state: CityState,
  col: number,
  row: number,
  target: BuildingType
): number {
  let count = 0;
  const dirs = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];
  for (const [dc, dr] of dirs) {
    if (getTile(state, col + dc, row + dr)?.building === target) {
      count++;
    }
  }
  return count;
}

export function countBuildingsInRadius(
  state: CityState,
  col: number,
  row: number,
  target: BuildingType,
  radius: number
): number {
  let count = 0;
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      if (dc === 0 && dr === 0) continue;
      if (getTile(state, col + dc, row + dr)?.building === target) {
        count++;
      }
    }
  }
  return count;
}

export function canPlaceOnTile(
  state: CityState,
  col: number,
  row: number,
  tool: ToolId,
  freeMode = false
): {ok: boolean; reason?: string} {
  const tile = getTile(state, col, row);
  if (!tile) {
    return {ok: false, reason: 'Buiten het bouwveld'};
  }

  if (isTerrainTool(tool)) {
    if (tile.locked || tile.building === 'townhall') {
      return {ok: false, reason: 'Stadhuisgrond is beschermd'};
    }
    const targetTerrain = BUILDING_CATALOG[tool].terrainTarget!;
    if (tile.terrain === targetTerrain && !tile.building) {
      return {ok: false, reason: 'Dit terrein ligt hier al'};
    }
    const cost =
      freeMode || state.settings.difficulty === 'sandbox'
        ? 0
        : BUILDING_CATALOG[tool].cost;
    if (state.budget < cost) {
      return {ok: false, reason: `Te weinig budget (€${cost} nodig)`};
    }
    return {ok: true};
  }

  if (tool === 'bulldoze') {
    if (!tile.building) {
      return {ok: false, reason: 'Tegel is al leeg'};
    }
    if (tile.locked || tile.building === 'townhall') {
      return {ok: false, reason: 'Stadhuis kan niet gesloopt worden'};
    }
    return {ok: true};
  }

  if (tile.building !== null) {
    return {ok: false, reason: 'Tegel is al bezet'};
  }

  if (tile.terrain === 'mountain') {
    return {ok: false, reason: 'Bergtop is te steil om op te bouwen'};
  }

  if (tile.terrain === 'water' && tool !== 'road') {
    return {
      ok: false,
      reason: 'Alleen wegen (bruggen) kunnen over water gebouwd worden',
    };
  }

  const cost =
    freeMode || state.settings.difficulty === 'sandbox'
      ? 0
      : getCostForToolOnTile(tile, tool);
  if (state.budget < cost) {
    return {ok: false, reason: `Te weinig budget (€${cost} nodig)`};
  }

  return {ok: true};
}

export function placeToolOnTile(
  state: CityState,
  col: number,
  row: number,
  tool: ToolId = state.selectedTool,
  rotation: number = state.buildRotation,
  freeMode = false
): PlacementResult {
  const check = canPlaceOnTile(state, col, row, tool, freeMode);
  if (!check.ok) {
    return {
      ok: false,
      reason: check.reason,
      costDelta: 0,
      action: 'none',
      col,
      row,
      building: null,
    };
  }

  const tile = getTile(state, col, row)!;

  if (isTerrainTool(tool)) {
    const target = BUILDING_CATALOG[tool].terrainTarget!;
    const cost =
      freeMode || state.settings.difficulty === 'sandbox'
        ? 0
        : BUILDING_CATALOG[tool].cost;
    let refund = 0;
    if (tile.building && (target === 'water' || target === 'mountain')) {
      refund = Math.round(getCostForBuilding(tile.building) * 0.5);
      tile.building = null;
      tile.rotation = 0;
      tile.density = 1;
    }
    tile.terrain = target;
    tile.elevation = terrainToElevation(target);
    applyCoastalSand(state.tiles, state.gridSize);
    state.budget = state.budget - cost + refund;
    return {
      ok: true,
      costDelta: refund - cost,
      action: 'terrain',
      col,
      row,
      building: tile.building,
    };
  }

  if (tool === 'bulldoze') {
    const oldBuilding = tile.building!;
    const refund = Math.round(getCostForBuilding(oldBuilding) * 0.5);
    tile.building = null;
    tile.rotation = 0;
    tile.density = 1;
    state.budget += refund;
    return {
      ok: true,
      costDelta: refund,
      action: 'demolished',
      col,
      row,
      building: oldBuilding,
    };
  }

  const def = BUILDING_CATALOG[tool];
  const buildingType = def.buildingType!;
  const actualCost =
    freeMode || state.settings.difficulty === 'sandbox'
      ? 0
      : getCostForToolOnTile(tile, tool);

  state.budget -= actualCost;
  tile.building = buildingType;
  tile.rotation = ((rotation % 4) + 4) % 4;
  tile.variant = (col * 5 + row * 3 + state.cycleCount) % 3;
  tile.density = 1;
  if (tile.terrain === 'forest') {
    tile.terrain = 'grass';
    tile.elevation = terrainToElevation('grass');
  }

  const metrics = computeCityMetrics(state);
  if (metrics.population > state.bestPopulation) {
    state.bestPopulation = metrics.population;
  }

  return {
    ok: true,
    costDelta: -actualCost,
    action: 'placed',
    col,
    row,
    building: buildingType,
  };
}

export function paintTerrainBrush(
  state: CityState,
  centerCol: number,
  centerRow: number,
  tool: TerrainToolId,
  brushSize: 1 | 2,
  freeMode = true
): number {
  let changed = 0;
  const radius = brushSize === 2 ? 1 : 0;
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      const c = centerCol + dc;
      const r = centerRow + dr;
      const res = placeToolOnTile(state, c, r, tool, 0, freeMode);
      if (res.ok) changed++;
    }
  }
  return changed;
}

export function getTierForPopulation(population: number): {
  name: string;
  nextTierTarget: number | null;
} {
  let current = CITY_TIERS[0];
  let next: number | null = CITY_TIERS[1]?.minPop ?? null;
  for (let i = 0; i < CITY_TIERS.length; i++) {
    if (population >= CITY_TIERS[i].minPop) {
      current = CITY_TIERS[i];
      next = CITY_TIERS[i + 1]?.minPop ?? null;
    }
  }
  return {name: current.name, nextTierTarget: next};
}

function hasOrdinance(state: CityState, id: OrdinanceId): boolean {
  return state.ordinances?.includes(id) ?? false;
}

export function createEmptyNeighborSynergy(): NeighborSynergy {
  return {
    connectedNeighbors: 0,
    adjacentPopTotal: 0,
    commuterIncomeBonus: 0,
    demandBoost: 0,
    links: {north: null, east: null, south: null, west: null},
  };
}

export function computeCityMetrics(
  state: CityState,
  neighborSynergy: NeighborSynergy = createEmptyNeighborSynergy()
): CityMetrics {
  let population = 0;
  let powerSupply = Math.max(0, state.neighborTradeMw || 0);
  let powerDemand = Math.max(0, -(state.neighborTradeMw || 0));

  let taxResidential = 0;
  let taxCommercial = 0;
  let taxIndustrial = 0;
  let upkeepInfra = 0;
  let upkeepCivic = 0;
  let upkeepOrdinances = 0;

  let happiness = 68;
  let pollution = 0;
  let landValue = 54;
  let safety = 52;
  let health = 56;
  let education = 48;

  let buildingCount = 0;
  let roadCount = 0;
  let bridgeCount = 0;
  let waterTileCount = 0;

  let housesCount = 0;
  let shopsCount = 0;
  let factoriesCount = 0;
  let transitCount = 0;
  let universityCount = 0;
  let seaportCount = 0;
  let airportCount = 0;
  let stadiumCount = 0;
  let cleanPowerCount = 0;
  let nuclearCount = 0;
  let landmarkCount = 0;

  const taxes = state.taxes || createDefaultTaxRates();
  const resTaxMult = taxes.residential / 7;
  const comTaxMult = taxes.commercial / 7;
  const indTaxMult = taxes.industrial / 7;

  const solarOn = hasOrdinance(state, 'solar_subsidy');
  const watchOn = hasOrdinance(state, 'neighborhood_watch');
  const transitOn = hasOrdinance(state, 'free_transit');
  const cleanIndOn = hasOrdinance(state, 'clean_industry');
  const festOn = hasOrdinance(state, 'city_festival');

  if (watchOn) safety += 18;
  if (transitOn) {
    landValue += 8;
    pollution -= 4;
  }
  if (solarOn) {
    happiness += 4;
  }
  if (festOn) {
    happiness += 8;
  }

  for (const ordId of state.ordinances || []) {
    const def = ORDINANCES.find((o) => o.id === ordId);
    if (def) upkeepOrdinances += def.costPerCycle;
  }

  for (const tile of state.tiles) {
    if (tile.terrain === 'water') waterTileCount++;
    if (tile.terrain === 'forest') {
      happiness += 0.25;
      landValue += 0.35;
    }

    const b = tile.building;
    if (!b) continue;

    if (b === 'road') {
      roadCount++;
      if (tile.terrain === 'water') {
        bridgeCount++;
        upkeepInfra += 2;
      }
      continue;
    }

    buildingCount++;
    const density = tile.density || 1;
    const densityMult = density === 3 ? 2.4 : density === 2 ? 1.65 : 1.0;

    if (b === 'townhall') {
      population += 8;
      powerSupply += 6;
      taxResidential += 12;
      happiness += 5;
      landValue += 5;
      safety += 6;
      continue;
    }

    const def = BUILDING_CATALOG[b];
    const connected = hasAdjacentRoad(state, tile.col, tile.row);

    if (def.powerDelta > 0) {
      powerSupply += def.powerDelta;
    } else if (def.powerDelta < 0) {
      const scaledDemand =
        b === 'house' || b === 'shop' || b === 'factory'
          ? Math.round(Math.abs(def.powerDelta) * (density === 3 ? 1.8 : density === 2 ? 1.4 : 1))
          : Math.abs(def.powerDelta);
      powerDemand += scaledDemand;
    }

    if (b === 'house') {
      housesCount += density;
      const nearbyWater = countBuildingsInRadius(
        state,
        tile.col,
        tile.row,
        'watertower',
        3
      );
      const nearbySchool =
        countBuildingsInRadius(state, tile.col, tile.row, 'school', 3) +
        countBuildingsInRadius(state, tile.col, tile.row, 'university', 4);
      const nearbyHospital = countBuildingsInRadius(
        state,
        tile.col,
        tile.row,
        'hospital',
        3
      );
      const nearbyPolice = countBuildingsInRadius(
        state,
        tile.col,
        tile.row,
        'police',
        3
      );
      const nearbyTransit = countBuildingsInRadius(
        state,
        tile.col,
        tile.row,
        'trainstation',
        4
      );
      const scenicCoast =
        tile.terrain === 'sand' ||
        getTile(state, tile.col + 1, tile.row)?.terrain === 'water' ||
        getTile(state, tile.col - 1, tile.row)?.terrain === 'water' ||
        getTile(state, tile.col, tile.row + 1)?.terrain === 'water' ||
        getTile(state, tile.col, tile.row - 1)?.terrain === 'water'
          ? 2
          : 0;

      const civicPopBonus =
        (nearbyWater > 0 ? 2 : 0) +
        (nearbyHospital > 0 ? 2 : 0) +
        (nearbySchool > 0 ? 1 : 0) +
        (nearbyTransit > 0 ? 2 : 0);

      const tilePop = Math.round(
        (connected ? def.population * densityMult + civicPopBonus : def.population * 0.5)
      );
      population += tilePop;

      const baseTileTax =
        (connected ? def.baseIncome * densityMult + civicPopBonus * 1.5 + scenicCoast : def.baseIncome * 0.5) *
        resTaxMult;
      taxResidential += baseTileTax;

      if (connected) happiness += 1;
      if (nearbyPolice > 0) safety += 2;
      if (nearbyTransit > 0) landValue += 2;
      landValue += scenicCoast + (nearbyWater > 0 ? 3 : 0) + (nearbySchool > 0 ? 2 : 0);

      const nearbyFactories = countBuildingsInRadius(
        state,
        tile.col,
        tile.row,
        'factory',
        2
      );
      const nearbyPlants = countBuildingsInRadius(
        state,
        tile.col,
        tile.row,
        'powerplant',
        3
      );
      const nearbyParks = countBuildingsInRadius(
        state,
        tile.col,
        tile.row,
        'park',
        2
      );
      const unmitigatedHazards = Math.max(
        0,
        nearbyFactories + nearbyPlants * 2 - nearbyParks
      );
      happiness -= unmitigatedHazards * 7;
    } else if (b === 'shop') {
      shopsCount += density;
      population += Math.round(def.population * densityMult);
      const adjacentHouses = countAdjacentBuilding(
        state,
        tile.col,
        tile.row,
        'house'
      );
      const nearbyTransit = countBuildingsInRadius(
        state,
        tile.col,
        tile.row,
        'trainstation',
        4
      );
      const bonus = Math.min(3, adjacentHouses) * 9 + (nearbyTransit > 0 ? 8 : 0);
      taxCommercial +=
        (connected ? def.baseIncome * densityMult + bonus : 10) * comTaxMult;
      if (connected && adjacentHouses > 0) happiness += 2;
      landValue += 2 + density + (nearbyTransit > 0 ? 2 : 0);
    } else if (b === 'factory') {
      factoriesCount += density;
      population += Math.round(def.population * densityMult);
      const portMult = seaportCount > 0 || airportCount > 0 ? 1.15 : 1.0;
      taxIndustrial +=
        (connected ? def.baseIncome * densityMult : def.baseIncome * 0.7) *
        indTaxMult *
        portMult;
      happiness -= 2;
      pollution += cleanIndOn ? 9 * densityMult : 13 * densityMult;
      landValue -= 3;
    } else if (b === 'trainstation') {
      transitCount++;
      population += def.population;
      upkeepInfra += Math.abs(def.baseIncome);
      happiness += 5;
      pollution -= 6;
      landValue += 8;
    } else if (b === 'seaport') {
      seaportCount++;
      population += def.population;
      const nearWater =
        tile.terrain === 'sand' ||
        getTile(state, tile.col + 1, tile.row)?.terrain === 'water' ||
        getTile(state, tile.col - 1, tile.row)?.terrain === 'water' ||
        getTile(state, tile.col, tile.row + 1)?.terrain === 'water' ||
        getTile(state, tile.col, tile.row - 1)?.terrain === 'water';
      taxIndustrial += nearWater ? def.baseIncome : Math.round(def.baseIncome * 0.55);
      pollution += 7;
      happiness += 3;
      landValue += 4;
    } else if (b === 'airport') {
      airportCount++;
      population += def.population;
      taxCommercial += def.baseIncome;
      pollution += 9;
      happiness += 6;
      landValue += 10;
    } else if (b === 'park') {
      upkeepCivic += Math.abs(def.baseIncome);
      const adjacentHouses = countAdjacentBuilding(
        state,
        tile.col,
        tile.row,
        'house'
      );
      happiness += 4 + Math.min(2, adjacentHouses) * 3;
      pollution -= 7;
      landValue += 5;
    } else if (b === 'windmill') {
      cleanPowerCount++;
      upkeepInfra += Math.abs(def.baseIncome);
      happiness += 2;
    } else if (b === 'solarplant') {
      cleanPowerCount++;
      upkeepInfra += Math.abs(def.baseIncome);
      happiness += 4;
      landValue += 3;
    } else if (b === 'powerplant') {
      population += def.population;
      upkeepInfra += Math.abs(def.baseIncome);
      happiness -= 4;
      pollution += solarOn ? 15 : 21;
      landValue -= 5;
    } else if (b === 'nuclear') {
      nuclearCount++;
      population += def.population;
      upkeepInfra += Math.abs(def.baseIncome);
      safety -= 4;
      landValue -= 2;
    } else if (b === 'watertower') {
      upkeepInfra += Math.abs(def.baseIncome);
      happiness += 5;
      landValue += 6;
    } else if (b === 'police') {
      population += def.population;
      upkeepCivic += Math.abs(def.baseIncome);
      safety += 18;
      happiness += 4;
      landValue += 5;
    } else if (b === 'firestation') {
      population += def.population;
      upkeepCivic += Math.abs(def.baseIncome);
      safety += 12;
      happiness += 3;
      landValue += 4;
    } else if (b === 'school') {
      population += def.population;
      upkeepCivic += Math.abs(def.baseIncome);
      education += 24;
      happiness += 4;
      landValue += 6;
    } else if (b === 'university') {
      universityCount++;
      population += def.population;
      upkeepCivic += Math.abs(def.baseIncome);
      education += 36;
      happiness += 7;
      landValue += 11;
      taxCommercial += 14;
    } else if (b === 'hospital') {
      population += def.population;
      upkeepCivic += Math.abs(def.baseIncome);
      health += 26;
      happiness += 6;
      landValue += 6;
    } else if (b === 'stadium') {
      stadiumCount++;
      population += def.population;
      taxCommercial += def.baseIncome;
      happiness += 16;
      landValue += 12;
    } else if (b === 'landmark') {
      landmarkCount++;
      taxCommercial += def.baseIncome;
      happiness += 8;
      landValue += 14;
    }
  }

  const powerBalance = powerSupply - powerDemand;
  const hasPower = powerBalance >= 0;

  if (!hasPower) {
    happiness -= 22;
  }
  if (state.budget < 0) {
    happiness -= 15;
  }

  // Tax rate happiness & demand pressure (7% is neutral)
  const avgTax = (taxes.residential + taxes.commercial + taxes.industrial) / 3;
  happiness -= (avgTax - 7) * 2.2;

  if (solarOn) {
    pollution *= 0.8;
  }
  pollution = Math.max(0, Math.min(100, Math.round(pollution)));
  safety = Math.max(15, Math.min(100, Math.round(safety - housesCount * 1.1)));
  health = Math.max(
    15,
    Math.min(100, Math.round(health - pollution * 0.25))
  );
  education = Math.max(15, Math.min(100, Math.round(education)));
  happiness = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        happiness -
          pollution * 0.12 +
          (safety - 50) * 0.1 +
          (health - 50) * 0.1
      )
    )
  );
  landValue = Math.max(
    10,
    Math.min(100, Math.round(landValue - pollution * 0.22 + (safety - 50) * 0.12))
  );

  // Neighbor trade revenue/cost (€3 per MW exported/imported) + SimCity 4 regional commuter trade
  const neighborTrade =
    -(state.neighborTradeMw || 0) * 3 + neighborSynergy.commuterIncomeBonus;

  const diff = DIFFICULTY_LABELS[state.settings.difficulty];
  const powerPenalty = hasPower ? 1 : 0.5;
  const happyBonus = happiness >= 80 ? 1.12 : 1.0;

  const finalResTax = Math.round(taxResidential * powerPenalty * happyBonus * diff.incomeMult);
  const finalComTax = Math.round(taxCommercial * powerPenalty * happyBonus * diff.incomeMult);
  const finalIndTax = Math.round(taxIndustrial * powerPenalty * happyBonus * diff.incomeMult);

  const finalUpkeepInfra = Math.round(upkeepInfra * diff.upkeepMult);
  const finalUpkeepCivic = Math.round(upkeepCivic * diff.upkeepMult);
  const finalUpkeepOrd = Math.round(upkeepOrdinances * diff.upkeepMult);

  const netIncome =
    finalResTax +
    finalComTax +
    finalIndTax +
    neighborTrade -
    finalUpkeepInfra -
    finalUpkeepCivic -
    finalUpkeepOrd;

  // Classic SimCity 3000/4 R/C/I Demand Calculation (-100 .. +100)
  const jobsBalance = (shopsCount * 1.3 + factoriesCount * 1.8) - housesCount * 1.1;
  const festBonus = festOn ? 18 : 0;
  const regBoost = neighborSynergy.demandBoost;
  const rciResidential = Math.max(
    -100,
    Math.min(
      100,
      Math.round(
        38 +
          jobsBalance * 14 +
          (happiness - 65) * 0.9 -
          (taxes.residential - 7) * 9 +
          (hasPower ? 10 : -45) +
          festBonus +
          regBoost +
          transitCount * 8
      )
    )
  );
  const rciCommercial = Math.max(
    -100,
    Math.min(
      100,
      Math.round(
        26 +
          (housesCount - shopsCount * 2.2) * 16 +
          (education - 45) * 0.5 -
          (taxes.commercial - 7) * 9 +
          (hasPower ? 8 : -40) +
          festBonus * 0.8 +
          regBoost +
          airportCount * 22 +
          stadiumCount * 16 +
          transitCount * 10
      )
    )
  );
  const rciIndustrial = Math.max(
    -100,
    Math.min(
      100,
      Math.round(
        30 +
          (housesCount - factoriesCount * 2.6) * 14 -
          (taxes.industrial - 7) * 9 +
          (hasPower ? 10 : -35) +
          regBoost * 0.7 +
          seaportCount * 24 +
          universityCount * 10
      )
    )
  );

  const specializations: string[] = [];
  if (seaportCount > 0) specializations.push('Zeehandel');
  if (airportCount > 0) specializations.push('Luchtvaarthub');
  if (universityCount > 0) specializations.push('Kennisstad');
  if (stadiumCount > 0 || landmarkCount > 0) specializations.push('Toerisme & Sport');
  if (cleanPowerCount >= 2 && pollution <= 25) specializations.push('Groene Stad');
  if (nuclearCount > 0) specializations.push('Energiecentrum');
  if (transitCount > 0) specializations.push('Spoorwegknoop');

  const tier = getTierForPopulation(population);

  return {
    population,
    happiness,
    landValue,
    pollution,
    safety,
    health,
    education,
    powerSupply,
    powerDemand,
    powerBalance,
    hasPower,
    netIncome,
    buildingCount,
    roadCount,
    bridgeCount,
    waterTileCount,
    tierName: tier.name,
    nextTierTarget: tier.nextTierTarget,
    specializations,
    rci: {
      residential: rciResidential,
      commercial: rciCommercial,
      industrial: rciIndustrial,
    },
    budgetBreakdown: {
      taxResidential: finalResTax,
      taxCommercial: finalComTax,
      taxIndustrial: finalIndTax,
      neighborTrade,
      upkeepInfra: finalUpkeepInfra,
      upkeepCivic: finalUpkeepCivic,
      upkeepOrdinances: finalUpkeepOrd,
    },
    neighborSynergy,
  };
}

/**
 * SimCity 3000 Zone Density Evolution:
 * Upgrades connected zones from Density 1 -> 2 -> 3 when civic services & RCI demand allow.
 */
function upgradeZoneDensities(state: CityState, metrics: CityMetrics): number {
  if (!metrics.hasPower || metrics.happiness < 58) return 0;

  let upgraded = 0;
  for (const tile of state.tiles) {
    if (upgraded >= 2) break;
    const b = tile.building;
    if (b !== 'house' && b !== 'shop' && b !== 'factory') continue;
    const currentDensity = tile.density || 1;
    if (currentDensity >= 3) continue;
    if (!hasAdjacentRoad(state, tile.col, tile.row)) continue;

    const hasWater =
      countBuildingsInRadius(state, tile.col, tile.row, 'watertower', 3) > 0;
    const hasCivic =
      countBuildingsInRadius(state, tile.col, tile.row, 'school', 3) > 0 ||
      countBuildingsInRadius(state, tile.col, tile.row, 'university', 4) > 0 ||
      countBuildingsInRadius(state, tile.col, tile.row, 'hospital', 3) > 0 ||
      countBuildingsInRadius(state, tile.col, tile.row, 'park', 2) > 0 ||
      countBuildingsInRadius(state, tile.col, tile.row, 'stadium', 4) > 0 ||
      countBuildingsInRadius(state, tile.col, tile.row, 'landmark', 4) > 0;

    const demand =
      b === 'house'
        ? metrics.rci.residential
        : b === 'shop'
          ? metrics.rci.commercial
          : metrics.rci.industrial;

    if (currentDensity === 1 && hasWater && demand >= 20 && metrics.powerBalance >= 4) {
      if ((tile.col * 7 + tile.row * 13 + state.cycleCount) % 5 === 0) {
        tile.density = 2;
        upgraded++;
      }
    } else if (
      currentDensity === 2 &&
      hasWater &&
      hasCivic &&
      metrics.landValue >= 65 &&
      demand >= 32 &&
      metrics.powerBalance >= 8
    ) {
      if ((tile.col * 11 + tile.row * 5 + state.cycleCount) % 7 === 0) {
        tile.density = 3;
        upgraded++;
      }
    }
  }
  return upgraded;
}

export function triggerDisaster(
  state: CityState,
  kind: DisasterKind = 'storm'
): string {
  const metrics = computeCityMetrics(state);
  const fireStations = state.tiles.filter((t) => t.building === 'firestation').length;

  if (kind === 'fire') {
    const flammable = state.tiles.filter(
      (t) =>
        t.building === 'house' ||
        t.building === 'shop' ||
        t.building === 'factory'
    );
    const unprotected = flammable.filter(
      (t) => countBuildingsInRadius(state, t.col, t.row, 'firestation', 3) === 0
    );
    if (unprotected.length > 0 && fireStations < 2) {
      const target = unprotected[state.cycleCount % unprotected.length];
      target.building = null;
      target.density = 1;
      const msg = `Stadsbrand op tegel (${target.col + 1},${target.row + 1})! Brandweerkazernes beschermen buurten in straal van 3 tegels.`;
      state.newsTicker = msg;
      return msg;
    }
    const fee = 35;
    state.budget -= fee;
    const msg = `Kleine brand snel geblust door jouw Brandweer! Bluskosten: -€${fee}.`;
    state.newsTicker = msg;
    return msg;
  }

  if (kind === 'ufo') {
    const targets = state.tiles.filter(
      (t) => t.building && t.building !== 'townhall' && t.building !== 'road'
    );
    if (targets.length > 0) {
      const target = targets[(state.cycleCount * 3) % targets.length];
      const oldLabel =
        BUILDING_CATALOG[target.building as ToolId]?.label || 'Gebouw';
      target.building = null;
      target.density = 1;
      const msg = `UFO-straal ontvoerde ${oldLabel} op (${target.col + 1},${target.row + 1})!`;
      state.newsTicker = msg;
      return msg;
    }
  }

  if (kind === 'earthquake') {
    const zoneTargets = state.tiles.filter(
      (t) =>
        t.building === 'house' ||
        t.building === 'shop' ||
        t.building === 'factory'
    );
    let damaged = 0;
    for (let i = 0; i < Math.min(2, zoneTargets.length); i++) {
      const t = zoneTargets[(state.cycleCount * 5 + i * 3) % zoneTargets.length];
      if (t.density > 1) {
        t.density = 1;
      } else {
        t.building = null;
      }
      damaged++;
    }
    const fee = Math.min(120, Math.max(40, damaged * 45));
    state.budget -= fee;
    const msg = `Aardbeving (SimCity-ramp) trof ${state.settings.cityName}! ${damaged} gebouw(en) beschadigd · Herstel: -€${fee}.`;
    state.newsTicker = msg;
    return msg;
  }

  const fee = Math.min(90, Math.max(25, Math.round(metrics.population * 0.35)));
  state.budget -= fee;
  const msg = `Zomerstorm trof ${state.settings.cityName}! Herstelkosten: -€${fee}.`;
  state.newsTicker = msg;
  return msg;
}

export function stepCityCycle(
  state: CityState,
  neighborSynergy: NeighborSynergy = createEmptyNeighborSynergy()
): CycleStepResult {
  const preMetrics = computeCityMetrics(state, neighborSynergy);
  const prevTier = preMetrics.tierName;

  state.budget += preMetrics.netIncome;
  state.lastCycleDelta = preMetrics.netIncome;
  state.cycleCount += 1;

  const upgradedCount = upgradeZoneDensities(state, preMetrics);
  const metrics =
    upgradedCount > 0 ? computeCityMetrics(state, neighborSynergy) : preMetrics;

  if (metrics.population > state.bestPopulation) {
    state.bestPopulation = metrics.population;
  }

  if (metrics.happiness <= UNHAPPY_THRESHOLD) {
    state.lowHappinessCycles += 1;
  } else {
    state.lowHappinessCycles = 0;
  }

  let disasterNote: string | null = null;
  if (
    state.settings.disastersEnabled &&
    state.settings.difficulty !== 'sandbox' &&
    state.cycleCount > 5 &&
    state.cycleCount % 16 === 0
  ) {
    disasterNote = triggerDisaster(
      state,
      state.cycleCount % 32 === 0 ? 'fire' : 'storm'
    );
  } else if (upgradedCount > 0) {
    state.newsTicker = `Hoogbouw-boom in ${state.settings.cityName}! ${upgradedCount} wijk(en) opgewaardeerd naar hogere dichtheid.`;
  } else if (state.cycleCount % 3 === 0) {
    state.newsTicker = buildNewsHeadline(state, metrics);
  }

  let gameOverReason = state.gameOverReason;

  if (
    state.settings.difficulty !== 'sandbox' &&
    state.budget <= BANKRUPT_BUDGET_LIMIT
  ) {
    gameOverReason = 'bankrupt';
  } else if (
    state.settings.difficulty !== 'sandbox' &&
    state.lowHappinessCycles >= UNHAPPY_CYCLES_LIMIT
  ) {
    gameOverReason = 'unhappy';
  } else if (
    !state.victoryAchieved &&
    metrics.population >= VICTORY_POPULATION &&
    metrics.happiness >= VICTORY_HAPPINESS
  ) {
    state.victoryAchieved = true;
    gameOverReason = 'victory';
  }

  state.gameOverReason = gameOverReason;
  const tierChangedTo =
    metrics.tierName !== prevTier ? metrics.tierName : null;

  return {
    incomeApplied: preMetrics.netIncome,
    metrics,
    tierChangedTo,
    upgradedCount,
    gameOverReason,
    disasterNote,
  };
}

function buildNewsHeadline(state: CityState, m: CityMetrics): string {
  const name = state.settings.cityName || 'Stad';
  if (!m.hasPower) {
    return `${name} kampt met stroomuitval! Bouw snel een Windmolen of sluit Buurhandel aan.`;
  }
  if (m.pollution > 45) {
    return `Milieurapport ${name}: inwoners vragen om Stadsparken of de Schone Industrie-verordening.`;
  }
  if (m.safety < 45) {
    return `Politiebulletin ${name}: wijken vragen om extra Politiebureaus of Buurtpreventie.`;
  }
  if (m.bridgeCount > 0 && state.cycleCount % 6 === 0) {
    return `Forensen prijzen de vlotte brugverbindingen en het openbaar vervoer van ${name}.`;
  }
  if (m.happiness >= 85) {
    return `Krant van ${name}: "Gouden tijden! Grondwaarde stijgt naar ${m.landValue}%, onderwijs ${m.education}%."`;
  }
  return `${name} (${m.tierName}) telt ${m.population} inwoners · Geluk ${m.happiness}% · RCI (${m.rci.residential}/${m.rci.commercial}/${m.rci.industrial}).`;
}

export function getTileDataOverlayColor(
  state: CityState,
  col: number,
  row: number,
  mode: DataOverlayMode
): {color: number; opacity: number} | null {
  if (mode === 'none') return null;
  const tile = getTile(state, col, row);
  if (!tile) return null;

  if (mode === 'landValue') {
    if (tile.terrain === 'water') return {color: 0x38bdf8, opacity: 0.35};
    const parks = countBuildingsInRadius(state, col, row, 'park', 2);
    const waterTower = countBuildingsInRadius(state, col, row, 'watertower', 3);
    const school =
      countBuildingsInRadius(state, col, row, 'school', 3) +
      countBuildingsInRadius(state, col, row, 'university', 4) * 2;
    const prestige =
      countBuildingsInRadius(state, col, row, 'landmark', 4) * 3 +
      countBuildingsInRadius(state, col, row, 'stadium', 4) * 2 +
      countBuildingsInRadius(state, col, row, 'trainstation', 4);
    const factories = countBuildingsInRadius(state, col, row, 'factory', 2);
    const score = parks * 2 + waterTower * 2 + school + prestige - factories * 2;
    if (score >= 4) return {color: 0x10b981, opacity: 0.68};
    if (score >= 1) return {color: 0x84cc16, opacity: 0.52};
    if (score < 0) return {color: 0xef4444, opacity: 0.56};
    return {color: 0xf59e0b, opacity: 0.36};
  }

  if (mode === 'pollution') {
    const factories = countBuildingsInRadius(state, col, row, 'factory', 2);
    const plants = countBuildingsInRadius(state, col, row, 'powerplant', 3);
    const airports = countBuildingsInRadius(state, col, row, 'airport', 2);
    const parks =
      countBuildingsInRadius(state, col, row, 'park', 2) +
      countBuildingsInRadius(state, col, row, 'trainstation', 3);
    const selfPoll =
      tile.building === 'factory' ||
      tile.building === 'powerplant' ||
      tile.building === 'airport'
        ? 3
        : 0;
    const smog = selfPoll + factories * 2 + plants * 3 + airports - parks;
    if (smog >= 4) return {color: 0xdc2626, opacity: 0.72};
    if (smog >= 2) return {color: 0xf97316, opacity: 0.58};
    if (smog >= 1) return {color: 0xfacc15, opacity: 0.42};
    return {color: 0x22c55e, opacity: 0.3};
  }

  // services coverage (police, fire, school/university, hospital/stadium)
  const cov =
    (countBuildingsInRadius(state, col, row, 'police', 3) > 0 ||
    tile.building === 'police'
      ? 1
      : 0) +
    (countBuildingsInRadius(state, col, row, 'firestation', 3) > 0 ||
    tile.building === 'firestation'
      ? 1
      : 0) +
    (countBuildingsInRadius(state, col, row, 'school', 3) > 0 ||
    countBuildingsInRadius(state, col, row, 'university', 4) > 0 ||
    tile.building === 'school' ||
    tile.building === 'university'
      ? 1
      : 0) +
    (countBuildingsInRadius(state, col, row, 'hospital', 3) > 0 ||
    tile.building === 'hospital'
      ? 1
      : 0);

  if (cov >= 3) return {color: 0x3b82f6, opacity: 0.68};
  if (cov >= 1) return {color: 0x38bdf8, opacity: 0.48};
  return {color: 0x475569, opacity: 0.34};
}

export function buildRuleBasedAdvisorReport(
  state: CityState,
  metrics: CityMetrics
): AdvisorReport {
  if (!metrics.hasPower) {
    return {
      advisorName: 'Ir. Karel Vonk',
      role: 'Hoofd Energie & Netbeheer',
      mood: 'urgent',
      headline: `Stroomtekort (${metrics.powerBalance} MW) verlamt de stad!`,
      summary:
        'Zonder stroom halveren belastinginkomsten en stopt wijkontwikkeling. Bouw direct extra energie of activeer Buurhandel in de Begroting.',
      tips: [
        'Plaats een Windmolen (+18 MW) of Energiecentrale (+48 MW).',
        'Of koop direct stroom bij een buurstad via Begroting & Wetten.',
      ],
      recommendedTool:
        state.budget >= 320 && metrics.powerBalance < -15
          ? 'powerplant'
          : 'windmill',
      source: 'rules',
    };
  }

  if (metrics.safety < 50) {
    return {
      advisorName: 'Commissaris Rick Vermeer',
      role: 'Adviseur Veiligheid & Hulpdiensten',
      mood: 'caution',
      headline: `Veiligheid daalt naar ${metrics.safety}%`,
      summary:
        'Groeiende wijken hebben politie en brandweer nodig om criminaliteit en brandgevaar te bedwingen.',
      tips: [
        'Bouw een Politiebureau of Brandweer centraal tussen woonwijken.',
        'Schakel de verordening Buurtpreventie in bij Begroting & Wetten.',
      ],
      recommendedTool: 'police',
      source: 'rules',
    };
  }

  if (metrics.pollution >= 35 || metrics.happiness < 62) {
    return {
      advisorName: 'Drs. Sofie Groen',
      role: 'Adviseur Leefbaarheid & Milieu',
      mood: 'caution',
      headline: 'Inwoners vragen om groen, water en ziekenhuizen',
      summary: `Geluk is ${metrics.happiness}% bij ${metrics.pollution}% uitstoot. Parken, watertorens en ziekenhuizen tillen woonwijken naar hoogbouw.`,
      tips: [
        'Plaats een Stadspark tussen fabrieken en huizen.',
        'Voeg een Watertoren of Ziekenhuis toe om dichtheid te laten groeien.',
      ],
      recommendedTool: metrics.pollution >= 35 ? 'park' : 'hospital',
      source: 'rules',
    };
  }

  if (metrics.education < 62 && metrics.population >= 60) {
    return {
      advisorName: 'Prof. Elena Bakker',
      role: 'Adviseur Onderwijs & Cultuur',
      mood: 'caution',
      headline: 'Bouw een School voor kantoortorens en hoogbouw!',
      summary: `Met ${metrics.population} inwoners en onderwijs op ${metrics.education}% zijn burgers klaar voor hoogwaardige commercie.`,
      tips: [
        'Plaats een School naast woonwijken voor hoogbouw-groei.',
        'Een Kroonmonument verhoogt direct de grondwaarde en toerisme.',
      ],
      recommendedTool: 'school',
      source: 'rules',
    };
  }

  return {
    advisorName: 'Arch. Lotte van Dijk',
    role: 'Hoofd Stedenbouw',
    mood: 'positive',
    headline: `${state.settings.cityName} bloeit als ${metrics.tierName}!`,
    summary: `Stroom +${metrics.powerBalance} MW · Grondwaarde ${metrics.landValue}% · Veiligheid ${metrics.safety}%. Volg de RCI-vraag (${metrics.rci.residential}/${metrics.rci.commercial}/${metrics.rci.industrial}).`,
    tips: [
      'Leg nieuwe wegen of bruggen aan en volg de hoogste RCI-vraagbalk.',
      'Bezoek ook andere dorpen & steden in het Regio-overzicht!',
    ],
    recommendedTool:
      metrics.rci.commercial > metrics.rci.residential + 12 ? 'shop' : 'house',
    source: 'rules',
  };
}

export function computeNextAutoBuildAction(
  state: CityState
): {col: number; row: number; tool: ToolId; rotation: number} | null {
  const metrics = computeCityMetrics(state);
  const candidates = state.tiles.filter(
    (t) => !t.building && t.terrain !== 'mountain'
  );
  if (candidates.length === 0) return null;

  const dryCandidates = candidates.filter((t) => t.terrain !== 'water');
  const canAfford = (tool: ToolId) =>
    state.settings.difficulty === 'sandbox' ||
    state.budget >= BUILDING_CATALOG[tool].cost;

  // 1. Power emergency
  if (metrics.powerBalance <= 4) {
    const powerTool: ToolId | null =
      metrics.powerBalance < -12 && canAfford('powerplant')
        ? 'powerplant'
        : canAfford('windmill')
          ? 'windmill'
          : null;
    if (powerTool && dryCandidates.length > 0) {
      const sorted = [...dryCandidates].sort((a, b) => {
        const aH = countBuildingsInRadius(state, a.col, a.row, 'house', 2);
        const bH = countBuildingsInRadius(state, b.col, b.row, 'house', 2);
        return aH - bH;
      });
      return {col: sorted[0].col, row: sorted[0].row, tool: powerTool, rotation: 0};
    }
  }

  // 2. Happiness / Pollution -> Park
  if ((metrics.happiness < 72 || metrics.pollution >= 28) && canAfford('park')) {
    const parkSpot = dryCandidates.find(
      (t) =>
        hasAdjacentRoad(state, t.col, t.row) &&
        countBuildingsInRadius(state, t.col, t.row, 'house', 2) >= 1
    );
    if (parkSpot) {
      return {col: parkSpot.col, row: parkSpot.row, tool: 'park', rotation: 0};
    }
  }

  // 3. Watertower / Civic services for growing cities
  const housesCount = state.tiles.filter((t) => t.building === 'house').length;
  const waterTowers = state.tiles.filter((t) => t.building === 'watertower').length;
  if (housesCount >= 4 && waterTowers * 6 < housesCount && canAfford('watertower')) {
    const wtSpot = dryCandidates.find(
      (t) => countBuildingsInRadius(state, t.col, t.row, 'house', 2) >= 2
    );
    if (wtSpot) {
      return {col: wtSpot.col, row: wtSpot.row, tool: 'watertower', rotation: 0};
    }
  }

  const policeCount = state.tiles.filter((t) => t.building === 'police').length;
  if (housesCount >= 6 && policeCount === 0 && canAfford('police')) {
    const spot = dryCandidates.find((t) => hasAdjacentRoad(state, t.col, t.row));
    if (spot) return {col: spot.col, row: spot.row, tool: 'police', rotation: 0};
  }

  const schoolCount = state.tiles.filter((t) => t.building === 'school').length;
  if (housesCount >= 7 && schoolCount === 0 && canAfford('school')) {
    const spot = dryCandidates.find((t) => hasAdjacentRoad(state, t.col, t.row));
    if (spot) return {col: spot.col, row: spot.row, tool: 'school', rotation: 0};
  }

  const stationCount = state.tiles.filter((t) => t.building === 'trainstation').length;
  if (housesCount >= 9 && stationCount === 0 && canAfford('trainstation')) {
    const spot = dryCandidates.find((t) => hasAdjacentRoad(state, t.col, t.row));
    if (spot) return {col: spot.col, row: spot.row, tool: 'trainstation', rotation: 0};
  }

  const uniCount = state.tiles.filter((t) => t.building === 'university').length;
  if (housesCount >= 12 && uniCount === 0 && canAfford('university')) {
    const spot = dryCandidates.find((t) => hasAdjacentRoad(state, t.col, t.row));
    if (spot) return {col: spot.col, row: spot.row, tool: 'university', rotation: 0};
  }

  const stadiumCount = state.tiles.filter((t) => t.building === 'stadium').length;
  if (housesCount >= 15 && stadiumCount === 0 && canAfford('stadium')) {
    const spot = dryCandidates.find((t) => hasAdjacentRoad(state, t.col, t.row));
    if (spot) return {col: spot.col, row: spot.row, tool: 'stadium', rotation: 0};
  }

  // 4. Follow RCI demand between Shops, Houses, and Industry
  const shopsCount = state.tiles.filter((t) => t.building === 'shop').length;
  if (
    (metrics.rci.commercial >= metrics.rci.residential || housesCount >= (shopsCount + 1) * 3) &&
    canAfford('shop')
  ) {
    const shopSpots = dryCandidates
      .filter((t) => hasAdjacentRoad(state, t.col, t.row))
      .sort(
        (a, b) =>
          countAdjacentBuilding(state, b.col, b.row, 'house') -
          countAdjacentBuilding(state, a.col, a.row, 'house')
      );
    if (
      shopSpots.length > 0 &&
      countAdjacentBuilding(state, shopSpots[0].col, shopSpots[0].row, 'house') > 0
    ) {
      return {
        col: shopSpots[0].col,
        row: shopSpots[0].row,
        tool: 'shop',
        rotation: (shopSpots[0].col + shopSpots[0].row) % 4,
      };
    }
  }

  // 5. Houses along existing roads
  if (canAfford('house')) {
    const roadAdjacentDry = dryCandidates
      .filter((t) => hasAdjacentRoad(state, t.col, t.row))
      .sort((a, b) => {
        const penaltyA = countBuildingsInRadius(state, a.col, a.row, 'factory', 2);
        const penaltyB = countBuildingsInRadius(state, b.col, b.row, 'factory', 2);
        return penaltyA - penaltyB;
      });
    if (roadAdjacentDry.length > 0) {
      const spot = roadAdjacentDry[0];
      return {
        col: spot.col,
        row: spot.row,
        tool: 'house',
        rotation: (spot.col + spot.row) % 4,
      };
    }
  }

  // 6. Extend road network (including bridges across water)
  if (state.budget >= BRIDGE_COST || state.settings.difficulty === 'sandbox') {
    const half = state.gridSize / 2;
    const roadExtensions = candidates
      .filter((t) => countAdjacentBuilding(state, t.col, t.row, 'road') >= 1)
      .sort((a, b) => {
        const da = Math.hypot(a.col - half, a.row - half);
        const db = Math.hypot(b.col - half, b.row - half);
        return da - db;
      });
    if (roadExtensions.length > 0) {
      const spot = roadExtensions[0];
      return {col: spot.col, row: spot.row, tool: 'road', rotation: 0};
    }
  }

  return null;
}

export function serializeTerrainRowsForAI(state: CityState): string[] {
  const charForTile = (t: TileData): string => {
    if (t.building === 'townhall') return 'T';
    if (t.building) return 'B';
    switch (t.terrain) {
      case 'water':
        return 'W';
      case 'sand':
        return 'S';
      case 'forest':
        return 'F';
      case 'hill':
        return 'H';
      case 'mountain':
        return 'M';
      default:
        return 'G';
    }
  };
  const rows: string[] = [];
  for (let r = 0; r < state.gridSize; r++) {
    let rowStr = '';
    for (let c = 0; c < state.gridSize; c++) {
      rowStr += charForTile(state.tiles[tileIndex(c, r, state.gridSize)]);
    }
    rows.push(rowStr);
  }
  return rows;
}

export function encodeCitySharePayload(state: CityState): string {
  const compact = {
    v: 4,
    gridSize: state.gridSize,
    settings: state.settings,
    budget: Math.round(state.budget),
    taxes: state.taxes,
    ordinances: state.ordinances,
    neighborTradeMw: state.neighborTradeMw,
    tiles: state.tiles.map((t) => [
      t.terrain,
      t.building || '',
      t.rotation,
      t.locked ? 1 : 0,
      t.density || 1,
    ]),
  };
  const json = JSON.stringify(compact);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function decodeCitySharePayload(raw: string): CityState | null {
  try {
    const trimmed = raw.trim();
    const json = trimmed.startsWith('{')
      ? trimmed
      : new TextDecoder().decode(
          Uint8Array.from(atob(trimmed), (c) => c.charCodeAt(0))
        );
    const parsed = JSON.parse(json) as {
      v?: number;
      gridSize?: number;
      settings?: Partial<GameSettings>;
      budget?: number;
      taxes?: Partial<CityState['taxes']>;
      ordinances?: OrdinanceId[];
      neighborTradeMw?: number;
      tiles?: Array<[TerrainType, string, number, number, number?]>;
    };
    if (!parsed || !Array.isArray(parsed.tiles)) {
      return null;
    }

    const srcSize = Math.round(Math.sqrt(parsed.tiles.length));
    if (
      srcSize * srcSize !== parsed.tiles.length ||
      (srcSize !== GRID_SIZE && srcSize !== 14)
    ) {
      return null;
    }

    const base = createInitialCityState(parsed.settings);
    if (typeof parsed.budget === 'number' && Number.isFinite(parsed.budget)) {
      base.budget = parsed.budget;
    }
    if (parsed.taxes) {
      base.taxes = {
        residential: Number(parsed.taxes.residential ?? 7),
        commercial: Number(parsed.taxes.commercial ?? 7),
        industrial: Number(parsed.taxes.industrial ?? 7),
      };
    }
    if (Array.isArray(parsed.ordinances)) {
      base.ordinances = parsed.ordinances;
    }
    if (typeof parsed.neighborTradeMw === 'number') {
      base.neighborTradeMw = parsed.neighborTradeMw;
    }

    if (srcSize === GRID_SIZE) {
      parsed.tiles.forEach((entry, idx) => {
        const tile = base.tiles[idx];
        if (!tile || !Array.isArray(entry)) return;
        const [terr, bld, rot, locked, density] = entry;
        tile.terrain = terr || 'grass';
        tile.elevation = terrainToElevation(tile.terrain);
        tile.building = (bld ? bld : null) as BuildingType | null;
        tile.rotation = Number(rot) || 0;
        tile.locked = Boolean(locked);
        tile.density = density === 2 || density === 3 ? density : 1;
      });
    } else {
      // Center legacy 14x14 city cleanly inside 16x16 grid
      for (const t of base.tiles) {
        t.building = null;
        t.locked = false;
        t.density = 1;
      }
      const offset = Math.floor((GRID_SIZE - srcSize) / 2);
      for (let sr = 0; sr < srcSize; sr++) {
        for (let sc = 0; sc < srcSize; sc++) {
          const entry = parsed.tiles[sr * srcSize + sc];
          const tile = getTile(base, sc + offset, sr + offset);
          if (!tile || !Array.isArray(entry)) continue;
          const [terr, bld, rot, locked, density] = entry;
          tile.terrain = terr || 'grass';
          tile.elevation = terrainToElevation(tile.terrain);
          tile.building = (bld ? bld : null) as BuildingType | null;
          tile.rotation = Number(rot) || 0;
          tile.locked = Boolean(locked);
          tile.density = density === 2 || density === 3 ? density : 1;
        }
      }
    }
    return base;
  } catch {
    return null;
  }
}
