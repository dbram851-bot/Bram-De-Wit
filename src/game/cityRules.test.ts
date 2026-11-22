import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BRIDGE_COST,
  GRID_SIZE,
  VICTORY_POPULATION,
} from '../constants';
import {
  buildRuleBasedAdvisorReport,
  canPlaceOnTile,
  computeCityMetrics,
  computeNextAutoBuildAction,
  createInitialCityState,
  decodeCitySharePayload,
  encodeCitySharePayload,
  getRoadNeighborsMask,
  getTile,
  getTileDataOverlayColor,
  paintTerrainBrush,
  placeToolOnTile,
  stepCityCycle,
  triggerDisaster,
} from './cityRules';
import {REGIONS, RegionVault} from './regionPresets';

test('initial starter town has 16x16 terrain, townhall, roads, and starter metrics', () => {
  const state = createInitialCityState({mapPreset: 'river', mapSeed: 101});
  assert.equal(GRID_SIZE, 16);
  assert.equal(state.tiles.length, 256);

  const cMid = Math.floor(GRID_SIZE / 2) - 1;
  assert.equal(getTile(state, cMid, cMid)?.building, 'townhall');

  const metrics = computeCityMetrics(state);
  assert.ok(metrics.population >= 25);
  assert.ok(metrics.hasPower);
  assert.ok(metrics.waterTileCount > 0, 'river preset should generate water tiles');
  assert.ok(metrics.rci && typeof metrics.rci.residential === 'number');
  assert.ok(Array.isArray(metrics.specializations));
});

test('bridges can be placed on water while houses/mountains follow terrain rules', () => {
  const state = createInitialCityState({mapPreset: 'polder'});
  const waterTile = state.tiles.find((t) => t.terrain === 'water' && !t.building);
  assert.ok(waterTile, 'expected a water tile in polder preset');

  const houseCheck = canPlaceOnTile(state, waterTile!.col, waterTile!.row, 'house');
  assert.equal(houseCheck.ok, false);

  const budgetBefore = state.budget;
  const bridgeRes = placeToolOnTile(state, waterTile!.col, waterTile!.row, 'road');
  assert.equal(bridgeRes.ok, true);
  assert.equal(bridgeRes.costDelta, -BRIDGE_COST);
  assert.equal(state.budget, budgetBefore - BRIDGE_COST);

  paintTerrainBrush(state, 1, 1, 'terrain_mountain', 1, true);
  assert.equal(canPlaceOnTile(state, 1, 1, 'road').ok, false);
});

test('road neighbor bitmask encodes N/E/S/W connections', () => {
  const state = createInitialCityState({mapPreset: 'polder'});
  for (const t of state.tiles) {
    if (!t.locked) {
      t.building = null;
      t.terrain = 'grass';
    }
  }
  placeToolOnTile(state, 2, 2, 'road');
  placeToolOnTile(state, 2, 1, 'road');
  placeToolOnTile(state, 3, 2, 'road');
  placeToolOnTile(state, 2, 3, 'road');
  placeToolOnTile(state, 1, 2, 'road');
  assert.equal(getRoadNeighborsMask(state, 2, 2), 1 | 2 | 4 | 8);
});

test('civic buildings, taxes, ordinances, and neighbor trade affect metrics and RCI', () => {
  const state = createInitialCityState({mapPreset: 'polder'});
  state.budget = 5000;
  for (const t of state.tiles) {
    if (!t.locked) {
      t.building = null;
      t.terrain = 'grass';
    }
  }
  placeToolOnTile(state, 3, 3, 'road');
  placeToolOnTile(state, 3, 4, 'house');
  placeToolOnTile(state, 4, 4, 'watertower');
  placeToolOnTile(state, 2, 4, 'police');
  placeToolOnTile(state, 4, 3, 'school');
  placeToolOnTile(state, 2, 3, 'hospital');
  placeToolOnTile(state, 5, 3, 'firestation');
  placeToolOnTile(state, 5, 4, 'landmark');

  const base = computeCityMetrics(state);
  assert.ok(base.safety >= 65);
  assert.ok(base.education >= 65);
  assert.ok(base.health >= 70);

  state.taxes.residential = 12;
  const highTax = computeCityMetrics(state);
  assert.ok(highTax.rci.residential < base.rci.residential);
  assert.ok(highTax.budgetBreakdown.taxResidential > base.budgetBreakdown.taxResidential);

  state.neighborTradeMw = 10;
  const imported = computeCityMetrics(state);
  assert.equal(imported.powerSupply, highTax.powerSupply + 10);
  assert.equal(imported.budgetBreakdown.neighborTrade, -30);

  state.ordinances = ['solar_subsidy', 'neighborhood_watch'];
  const withOrd = computeCityMetrics(state);
  assert.equal(withOrd.budgetBreakdown.upkeepOrdinances, 11);

  assert.ok(getTileDataOverlayColor(state, 3, 4, 'landValue'));
  assert.ok(getTileDataOverlayColor(state, 3, 4, 'services'));
  assert.ok(getTileDataOverlayColor(state, 3, 4, 'pollution'));
});

test('new SimCity buildings unlock specializations and boost power/services', () => {
  const state = createInitialCityState({mapPreset: 'polder'});
  state.budget = 10000;
  for (const t of state.tiles) {
    if (!t.locked) {
      t.building = null;
      t.terrain = 'grass';
    }
  }

  assert.equal(placeToolOnTile(state, 1, 1, 'nuclear').ok, true);
  assert.equal(placeToolOnTile(state, 2, 1, 'solarplant').ok, true);
  assert.equal(placeToolOnTile(state, 3, 1, 'windmill').ok, true);
  assert.equal(placeToolOnTile(state, 4, 1, 'trainstation').ok, true);
  assert.equal(placeToolOnTile(state, 5, 1, 'seaport').ok, true);
  assert.equal(placeToolOnTile(state, 6, 1, 'airport').ok, true);
  assert.equal(placeToolOnTile(state, 7, 1, 'university').ok, true);
  assert.equal(placeToolOnTile(state, 8, 1, 'stadium').ok, true);

  const metrics = computeCityMetrics(state);
  assert.ok(metrics.powerSupply >= 174);
  assert.ok(metrics.specializations.includes('Zeehandel'));
  assert.ok(metrics.specializations.includes('Luchtvaarthub'));
  assert.ok(metrics.specializations.includes('Kennisstad'));
  assert.ok(metrics.specializations.includes('Toerisme & Sport'));
  assert.ok(metrics.specializations.includes('Energiecentrum'));
  assert.ok(metrics.specializations.includes('Spoorwegknoop'));
  assert.ok(metrics.specializations.includes('Groene Stad'));
});

test('zone density evolves from 1 to 2 when water, power, and RCI demand are high', () => {
  const state = createInitialCityState({mapPreset: 'polder'});
  state.budget = 5000;
  for (const t of state.tiles) {
    if (!t.locked) {
      t.building = null;
      t.terrain = 'grass';
    }
  }
  placeToolOnTile(state, 0, 0, 'powerplant');
  placeToolOnTile(state, 4, 4, 'watertower');
  placeToolOnTile(state, 4, 3, 'road');
  placeToolOnTile(state, 5, 3, 'road');
  placeToolOnTile(state, 6, 4, 'park');
  placeToolOnTile(state, 1, 0, 'factory');
  placeToolOnTile(state, 5, 4, 'house');
  placeToolOnTile(state, 3, 3, 'shop');
  state.taxes.residential = 3;

  for (let i = 0; i < 6; i++) {
    stepCityCycle(state);
  }
  const house = getTile(state, 5, 4)!;
  assert.ok(house.density >= 2, `expected house density to upgrade, got ${house.density}`);
});

test('three 4x3 SimCity-4 regions provide 36 adjacent plots and neighbor synergy via RegionVault', () => {
  assert.equal(REGIONS.length, 3);
  const vault = new RegionVault();
  let totalPlots = 0;

  for (const reg of REGIONS) {
    assert.equal(reg.cols, 4);
    assert.equal(reg.rows, 3);
    assert.equal(reg.plots.length, 12);
    totalPlots += reg.plots.length;

    const summaries = vault.listRegionPlots(reg.id, reg.plots[0].plotId);
    assert.equal(summaries.length, 12);
    assert.ok(vault.getTotalRegionPopulation(reg.id) > 150);

    for (const s of summaries) {
      assert.ok(s.rx >= 0 && s.rx <= 3);
      assert.ok(s.ry >= 0 && s.ry <= 2);
      assert.equal(s.miniPreviewColors.length, 16);
      assert.ok(s.neighborCount >= 2 && s.neighborCount <= 4);
    }
  }
  assert.equal(totalPlots, 36);

  const synergy = vault.getNeighborSynergyForPlot('delta-nieuw-amsterdam');
  assert.equal(synergy.connectedNeighbors, 4);
  assert.ok(synergy.commuterIncomeBonus > 0);
  assert.ok(synergy.demandBoost > 0);

  const metropolis = vault.getOrCreatePlot('arch-maxima');
  const metMetrics = computeCityMetrics(
    metropolis,
    vault.getNeighborSynergyForPlot('arch-maxima')
  );
  assert.ok(metMetrics.population >= 200);
  assert.ok(metropolis.tiles.some((t) => t.density === 3));
  assert.ok(metropolis.tiles.some((t) => t.building === 'landmark'));
  assert.ok(metMetrics.specializations.length >= 2);

  const advisor = buildRuleBasedAdvisorReport(metropolis, metMetrics);
  assert.ok(advisor.headline.length > 5);
});

test('auto-build planner, earthquake/storm disasters, victory at 380 pop, and share roundtrip v4 + legacy 14x14', () => {
  const state = createInitialCityState({mapPreset: 'islands', difficulty: 'normal'});
  state.budget = 25000;

  for (let i = 0; i < 5; i++) {
    const step = computeNextAutoBuildAction(state);
    assert.ok(step);
    assert.equal(
      placeToolOnTile(state, step!.col, step!.row, step!.tool, step!.rotation).ok,
      true
    );
  }

  for (let r = 1; r < GRID_SIZE - 1; r += 2) {
    for (let c = 1; c < GRID_SIZE - 1; c++) {
      const tile = getTile(state, c, r);
      if (tile && tile.terrain !== 'mountain' && tile.terrain !== 'water' && !tile.building) {
        placeToolOnTile(state, c, r, 'road');
      }
    }
  }
  placeToolOnTile(state, 1, 2, 'nuclear');
  placeToolOnTile(state, 2, 2, 'nuclear');
  placeToolOnTile(state, 3, 2, 'park');
  placeToolOnTile(state, 4, 2, 'stadium');
  placeToolOnTile(state, 5, 2, 'watertower');
  placeToolOnTile(state, 6, 2, 'police');

  for (let r = 2; r < GRID_SIZE - 1; r += 2) {
    for (let c = 1; c < GRID_SIZE - 1; c++) {
      const m = computeCityMetrics(state);
      if (m.population >= VICTORY_POPULATION && m.happiness >= 75) break;
      if (canPlaceOnTile(state, c, r, 'house').ok) {
        placeToolOnTile(state, c, r, 'house');
      }
    }
  }

  const preCycle = computeCityMetrics(state);
  assert.ok(
    preCycle.population >= VICTORY_POPULATION,
    `expected pop >= ${VICTORY_POPULATION}, got ${preCycle.population}`
  );
  assert.ok(preCycle.happiness >= 75, `expected happiness >= 75, got ${preCycle.happiness}`);

  const cycleRes = stepCityCycle(state);
  assert.equal(cycleRes.gameOverReason, 'victory');

  const stormMsg = triggerDisaster(state, 'storm');
  assert.ok(stormMsg.includes('Zomerstorm'));

  const quakeMsg = triggerDisaster(state, 'earthquake');
  assert.ok(quakeMsg.includes('Aardbeving'));

  state.taxes.commercial = 9;
  state.ordinances = ['free_transit'];
  const encoded = encodeCitySharePayload(state);
  const decoded = decodeCitySharePayload(encoded);
  assert.ok(decoded);
  assert.equal(decoded!.gridSize, 16);
  assert.equal(decoded!.settings.mapPreset, 'islands');
  assert.equal(decoded!.taxes.commercial, 9);
  assert.deepEqual(decoded!.ordinances, ['free_transit']);
  assert.equal(
    computeCityMetrics(decoded!).population,
    computeCityMetrics(state).population
  );

  // Legacy 14x14 city share payload auto-centers into 16x16
  const legacyTiles = Array.from({length: 196}, (_, idx) =>
    idx === 90 ? ['grass', 'townhall', 0, 1, 1] : ['grass', '', 0, 0, 1]
  );
  const legacyJson = JSON.stringify({
    v: 3,
    settings: {cityName: 'Oude Stad', mapPreset: 'polder'},
    budget: 1400,
    tiles: legacyTiles,
  });
  const legacyDecoded = decodeCitySharePayload(legacyJson);
  assert.ok(legacyDecoded);
  assert.equal(legacyDecoded!.gridSize, 16);
  assert.equal(legacyDecoded!.tiles.length, 256);
  assert.equal(legacyDecoded!.settings.cityName, 'Oude Stad');
  assert.ok(legacyDecoded!.tiles.some((t) => t.building === 'townhall'));
});
