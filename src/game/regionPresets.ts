import type {
  BuildingType,
  CityState,
  NeighborSynergy,
  RegionDefinition,
  RegionId,
  RegionPlotBlueprint,
  RegionPlotSummary,
  SettlementKind,
} from '../types';
import {
  applyCoastalSand,
  computeCityMetrics,
  createEmptyNeighborSynergy,
  createInitialCityState,
  getTile,
  terrainToElevation,
} from './cityRules';

export const REGIONS: RegionDefinition[] = [
  {
    id: 'delta',
    name: 'Lage Landen Delta (12 Kavels)',
    cols: 4,
    rows: 3,
    subtitle: 'SimCity 4 Regiokaart: 12 aangrenzende polderdorpen, brugsteden, zeehavens & kennissteden',
    climateNote: 'Buursteden delen forensen, RCI-vraag en regionale handel via snelwegen & spoor.',
    plots: [
      {
        plotId: 'delta-windmeer',
        regionId: 'delta',
        rx: 0,
        ry: 0,
        name: 'Windmeer',
        kind: 'dorp',
        mapPreset: 'polder',
        mapSeed: 2104,
        tagline: 'Noordwestelijk ecologisch windmolendorp langs het meer.',
        startBudget: 1650,
        timeOfDay: 'morning',
      },
      {
        plotId: 'delta-korenveld',
        regionId: 'delta',
        rx: 1,
        ry: 0,
        name: 'Korenveld',
        kind: 'dorp',
        mapPreset: 'polder',
        mapSeed: 4120,
        tagline: 'Sfeervol boerendorp met station, huisjes en dorpspark.',
        startBudget: 1550,
        timeOfDay: 'morning',
      },
      {
        plotId: 'delta-ijsselburg',
        regionId: 'delta',
        rx: 2,
        ry: 0,
        name: 'IJsselburg',
        kind: 'stad',
        mapPreset: 'river',
        mapSeed: 5280,
        tagline: 'Volwassen brugstad met treinstation, universiteit, hoogbouw & centrale.',
        startBudget: 2450,
        timeOfDay: 'sunset',
      },
      {
        plotId: 'delta-rijnpoort',
        regionId: 'delta',
        rx: 3,
        ry: 0,
        name: 'Rijnpoort',
        kind: 'stad',
        mapPreset: 'river',
        mapSeed: 5890,
        tagline: 'Oostelijke handelsknoop met regionale luchthaven & kantoortorens.',
        startBudget: 2600,
        timeOfDay: 'day',
      },
      {
        plotId: 'delta-polderzijl',
        regionId: 'delta',
        rx: 0,
        ry: 1,
        name: 'Polderzijl',
        kind: 'gehucht',
        mapPreset: 'river',
        mapSeed: 6390,
        tagline: 'Westelijke groeipolder direct grenzend aan Nieuw-Amsterdam.',
        startBudget: 1950,
        timeOfDay: 'day',
      },
      {
        plotId: 'delta-nieuw-amsterdam',
        regionId: 'delta',
        rx: 1,
        ry: 1,
        name: 'Nieuw-Amsterdam',
        kind: 'stad',
        mapPreset: 'polder',
        mapSeed: 3000,
        tagline: 'Het kloppende hart van de Delta met treinstation, bruggen & woonwijken.',
        startBudget: 1850,
        timeOfDay: 'day',
      },
      {
        plotId: 'delta-delftshaven',
        regionId: 'delta',
        rx: 2,
        ry: 1,
        name: 'Delftshaven',
        kind: 'metropool',
        mapPreset: 'river',
        mapSeed: 3488,
        tagline: 'Kennis- & havenmetropool met Universiteit, Zeehaven, Stadion & wolkenkrabbers.',
        startBudget: 3600,
        timeOfDay: 'day',
      },
      {
        plotId: 'delta-vechtoord',
        regionId: 'delta',
        rx: 3,
        ry: 1,
        name: 'Vechtoord',
        kind: 'dorp',
        mapPreset: 'polder',
        mapSeed: 4722,
        tagline: 'Groene forensenwijk met zonnepark & snelle treinverbinding.',
        startBudget: 1700,
        timeOfDay: 'morning',
      },
      {
        plotId: 'delta-maasmond',
        regionId: 'delta',
        rx: 0,
        ry: 2,
        name: 'Maasmond',
        kind: 'stad',
        mapPreset: 'islands',
        mapSeed: 6812,
        tagline: 'Drukke zeehavenstad met containers, zware industrie & zonne-energie.',
        startBudget: 2350,
        timeOfDay: 'sunset',
      },
      {
        plotId: 'delta-bruggeveld',
        regionId: 'delta',
        rx: 1,
        ry: 2,
        name: 'Bruggeveld',
        kind: 'dorp',
        mapPreset: 'river',
        mapSeed: 7021,
        tagline: 'Schattig kanaaldorp met bruggen, school en buurtwinkels.',
        startBudget: 1600,
        timeOfDay: 'day',
      },
      {
        plotId: 'delta-goudkust',
        regionId: 'delta',
        rx: 2,
        ry: 2,
        name: 'Goudkust',
        kind: 'stad',
        mapPreset: 'islands',
        mapSeed: 7510,
        tagline: 'Zonnige badplaats met stadion, parken en hoge grondwaarde.',
        startBudget: 2250,
        timeOfDay: 'morning',
      },
      {
        plotId: 'delta-klaverhoek',
        regionId: 'delta',
        rx: 3,
        ry: 2,
        name: 'Klaverhoek',
        kind: 'gehucht',
        mapPreset: 'polder',
        mapSeed: 7999,
        tagline: 'Maagdelijk landbouwperceel in de zuidoosthoek klaar voor jouw plan.',
        startBudget: 2100,
        timeOfDay: 'day',
      },
    ],
  },
  {
    id: 'alpine',
    name: 'Alpendal & Meren (12 Kavels)',
    cols: 4,
    rows: 3,
    subtitle: 'SimCity 4 Regiokaart: 12 bergvalleien, meren, hooglanddorpen & energiecentra',
    climateNote: 'Schone berglucht en hoge grondwaarde rond dennenbossen en kristalmeren.',
    plots: [
      {
        plotId: 'alpine-kristaltop',
        regionId: 'alpine',
        rx: 0,
        ry: 0,
        name: 'Kristaltop',
        kind: 'gehucht',
        mapPreset: 'valley',
        mapSeed: 7001,
        tagline: 'Hoogste noordelijke pas op weg naar de vallei.',
        startBudget: 2050,
        timeOfDay: 'morning',
      },
      {
        plotId: 'alpine-bergbeek',
        regionId: 'alpine',
        rx: 1,
        ry: 0,
        name: 'Bergbeek',
        kind: 'dorp',
        mapPreset: 'valley',
        mapSeed: 8211,
        tagline: 'Knus alpendal-dorp met houten huisjes te midden van dennenbossen.',
        startBudget: 1650,
        timeOfDay: 'day',
      },
      {
        plotId: 'alpine-zilvermeer',
        regionId: 'alpine',
        rx: 2,
        ry: 0,
        name: 'Zilvermeer',
        kind: 'stad',
        mapPreset: 'valley',
        mapSeed: 7104,
        tagline: 'Stijlvolle bergstad met schone stroom, ziekenhuis, monument & parken.',
        startBudget: 2300,
        timeOfDay: 'morning',
      },
      {
        plotId: 'alpine-adelaarsnest',
        regionId: 'alpine',
        rx: 3,
        ry: 0,
        name: 'Adelaarsnest',
        kind: 'dorp',
        mapPreset: 'valley',
        mapSeed: 7490,
        tagline: 'Bergstation en toeristenoord hoog boven de rivier.',
        startBudget: 1750,
        timeOfDay: 'sunset',
      },
      {
        plotId: 'alpine-sparrenbos',
        regionId: 'alpine',
        rx: 0,
        ry: 1,
        name: 'Sparrenbos',
        kind: 'dorp',
        mapPreset: 'valley',
        mapSeed: 8503,
        tagline: 'Bosrijk houthakkersdorp met frisse lucht en zonnepanelen.',
        startBudget: 1650,
        timeOfDay: 'day',
      },
      {
        plotId: 'alpine-koperwijk',
        regionId: 'alpine',
        rx: 1,
        ry: 1,
        name: 'Koperwijk',
        kind: 'stad',
        mapPreset: 'random',
        mapSeed: 9322,
        tagline: 'Energiek werkers- & krachtwerkdorp dat de regio van stroom voorziet.',
        startBudget: 2250,
        timeOfDay: 'sunset',
      },
      {
        plotId: 'alpine-alpenmetropool',
        regionId: 'alpine',
        rx: 2,
        ry: 1,
        name: 'Alpenstad Centraal',
        kind: 'metropool',
        mapPreset: 'valley',
        mapSeed: 8888,
        tagline: 'Centrale bergmetropool met kerncentrale, luchthaven, stadion & torens.',
        startBudget: 3500,
        timeOfDay: 'day',
      },
      {
        plotId: 'alpine-zonnekamp',
        regionId: 'alpine',
        rx: 3,
        ry: 1,
        name: 'Zonnekamp',
        kind: 'gehucht',
        mapPreset: 'valley',
        mapSeed: 9444,
        tagline: 'Zonnige oostelijke alpenweide klaar voor uitbreiding.',
        startBudget: 2000,
        timeOfDay: 'day',
      },
      {
        plotId: 'alpine-hoogdal',
        regionId: 'alpine',
        rx: 0,
        ry: 2,
        name: 'Hoogdal',
        kind: 'dorp',
        mapPreset: 'river',
        mapSeed: 9601,
        tagline: 'Helder gletsjerrivierdorp met boogbrug en basisschool.',
        startBudget: 1650,
        timeOfDay: 'morning',
      },
      {
        plotId: 'alpine-ijsgrot',
        regionId: 'alpine',
        rx: 1,
        ry: 2,
        name: 'IJsgrot',
        kind: 'gehucht',
        mapPreset: 'valley',
        mapSeed: 9712,
        tagline: 'Onontgonnen dal vol bergtoppen en schone waterbronnen.',
        startBudget: 2050,
        timeOfDay: 'day',
      },
      {
        plotId: 'alpine-gletsjerpoort',
        regionId: 'alpine',
        rx: 2,
        ry: 2,
        name: 'Gletsjerpoort',
        kind: 'stad',
        mapPreset: 'valley',
        mapSeed: 9833,
        tagline: 'Kennis- & universiteitsstad aan het zuidelijke bergmeer.',
        startBudget: 2450,
        timeOfDay: 'sunset',
      },
      {
        plotId: 'alpine-kloofburg',
        regionId: 'alpine',
        rx: 3,
        ry: 2,
        name: 'Kloofburg',
        kind: 'dorp',
        mapPreset: 'river',
        mapSeed: 9944,
        tagline: 'Schilderachtig kloofdorp met windmolens op de heuvels.',
        startBudget: 1700,
        timeOfDay: 'day',
      },
    ],
  },
  {
    id: 'archipelago',
    name: 'Zonnebaai Archipel (12 Kavels)',
    cols: 4,
    rows: 3,
    subtitle: 'SimCity 4 Regiokaart: 12 zonnige eilanden, zeehavens, luchthavens & megapolen',
    climateNote: 'Hoogste toerisme- & kustgrondwaarde van het hele rijk.',
    plots: [
      {
        plotId: 'arch-vuurtorenbaai',
        regionId: 'archipelago',
        rx: 0,
        ry: 0,
        name: 'Vuurtorenbaai',
        kind: 'dorp',
        mapPreset: 'islands',
        mapSeed: 1024,
        tagline: 'Kustdorp op de noordwestkaap met brug en vissershaven.',
        startBudget: 1700,
        timeOfDay: 'morning',
      },
      {
        plotId: 'arch-palmstad',
        regionId: 'archipelago',
        rx: 1,
        ry: 0,
        name: 'Palmstad',
        kind: 'stad',
        mapPreset: 'islands',
        mapSeed: 1140,
        tagline: 'Luxe resortstad met zonnepark, monument en hoge woontorens.',
        startBudget: 2400,
        timeOfDay: 'day',
      },
      {
        plotId: 'arch-molenwaard',
        regionId: 'archipelago',
        rx: 2,
        ry: 0,
        name: 'Molenwaard',
        kind: 'dorp',
        mapPreset: 'islands',
        mapSeed: 3550,
        tagline: 'Ecologisch eiland met schone windenergie, bossen en watertoren.',
        startBudget: 1800,
        timeOfDay: 'morning',
      },
      {
        plotId: 'arch-kliphoek',
        regionId: 'archipelago',
        rx: 3,
        ry: 0,
        name: 'Kliphoek',
        kind: 'gehucht',
        mapPreset: 'islands',
        mapSeed: 1990,
        tagline: 'Rustig oostelijk rotseiland wachtend op bruggen.',
        startBudget: 2100,
        timeOfDay: 'day',
      },
      {
        plotId: 'arch-koraaldorp',
        regionId: 'archipelago',
        rx: 0,
        ry: 1,
        name: 'Koraaldorp',
        kind: 'dorp',
        mapPreset: 'islands',
        mapSeed: 2419,
        tagline: 'Kleurrijk vissers- en stranddorp verbonden door een stalen brug.',
        startBudget: 1650,
        timeOfDay: 'day',
      },
      {
        plotId: 'arch-maxima',
        regionId: 'archipelago',
        rx: 1,
        ry: 1,
        name: 'Havenstad Maxima',
        kind: 'metropool',
        mapPreset: 'islands',
        mapSeed: 1208,
        tagline: 'Schitterende eiland-metropool met zeehaven, stadion, luchthaven & torens.',
        startBudget: 3600,
        timeOfDay: 'night',
      },
      {
        plotId: 'arch-lagunestad',
        regionId: 'archipelago',
        rx: 2,
        ry: 1,
        name: 'Lagunestad',
        kind: 'stad',
        mapPreset: 'islands',
        mapSeed: 2920,
        tagline: 'Centrale handelsstad met treinstation, universiteit & winkelcentra.',
        startBudget: 2500,
        timeOfDay: 'sunset',
      },
      {
        plotId: 'arch-zeester',
        regionId: 'archipelago',
        rx: 3,
        ry: 1,
        name: 'Zeester',
        kind: 'dorp',
        mapPreset: 'islands',
        mapSeed: 3111,
        tagline: 'Ontspannen stranddorp naast de grote brug naar Lagunestad.',
        startBudget: 1700,
        timeOfDay: 'day',
      },
      {
        plotId: 'arch-visserspunt',
        regionId: 'archipelago',
        rx: 0,
        ry: 2,
        name: 'Visserspunt',
        kind: 'gehucht',
        mapPreset: 'islands',
        mapSeed: 4002,
        tagline: 'Zuidwestelijke kaap ideaal voor een nieuwe zeehaven.',
        startBudget: 2050,
        timeOfDay: 'morning',
      },
      {
        plotId: 'arch-duinkerk',
        regionId: 'archipelago',
        rx: 1,
        ry: 2,
        name: 'Duinkerk',
        kind: 'stad',
        mapPreset: 'river',
        mapSeed: 4310,
        tagline: 'Industriële overslagstad met zeehaven & schone centrale.',
        startBudget: 2350,
        timeOfDay: 'day',
      },
      {
        plotId: 'arch-ankerbaai',
        regionId: 'archipelago',
        rx: 2,
        ry: 2,
        name: 'Ankerbaai',
        kind: 'gehucht',
        mapPreset: 'islands',
        mapSeed: 4888,
        tagline: 'Maagdelijk eiland voor jouw volgende kustparadijs.',
        startBudget: 2100,
        timeOfDay: 'day',
      },
      {
        plotId: 'arch-zonnekroon',
        regionId: 'archipelago',
        rx: 3,
        ry: 2,
        name: 'Zonnekroon',
        kind: 'metropool',
        mapPreset: 'islands',
        mapSeed: 5500,
        tagline: 'Kroonjuweel van de archipel met hoogbouw, monument & kerncentrale.',
        startBudget: 3800,
        timeOfDay: 'night',
      },
    ],
  },
];

export function getRegionById(regionId: RegionId): RegionDefinition {
  return REGIONS.find((r) => r.id === regionId) || REGIONS[0];
}

export function findPlotBlueprint(plotId: string): RegionPlotBlueprint | null {
  for (const reg of REGIONS) {
    const found = reg.plots.find((p) => p.plotId === plotId);
    if (found) return found;
  }
  return null;
}

function forceBuilding(
  state: CityState,
  col: number,
  row: number,
  building: BuildingType,
  rotation = 0,
  density: 1 | 2 | 3 = 1
): void {
  const tile = getTile(state, col, row);
  if (!tile) return;
  if (building !== 'road') {
    if (
      tile.terrain === 'water' ||
      tile.terrain === 'mountain' ||
      tile.terrain === 'forest'
    ) {
      tile.terrain = 'grass';
      tile.elevation = terrainToElevation('grass');
    }
  } else if (tile.terrain === 'mountain') {
    tile.terrain = 'grass';
    tile.elevation = terrainToElevation('grass');
  }
  tile.building = building;
  tile.rotation = rotation;
  tile.density = density;
}

function populateSettlement(
  state: CityState,
  kind: SettlementKind,
  blueprint: RegionPlotBlueprint
): void {
  const cMid = Math.floor(state.gridSize / 2) - 1; // 7 on 16x16 grid
  const rMid = Math.floor(state.gridSize / 2) - 1;

  if (kind === 'gehucht') {
    state.newsTicker = `Welkom in ${state.settings.cityName}! Dit jonge gehucht grenst direct aan zijn buursteden.`;
    return;
  }

  if (kind === 'dorp') {
    const extraRoads: Array<[number, number]> = [
      [cMid - 2, rMid - 1],
      [cMid - 3, rMid - 1],
      [cMid + 3, rMid],
      [cMid + 3, rMid + 1],
      [cMid + 2, rMid + 2],
      [cMid + 1, rMid + 2],
    ];
    extraRoads.forEach(([c, r]) => forceBuilding(state, c, r, 'road'));

    forceBuilding(state, cMid - 1, rMid - 2, 'house', 2, 1);
    forceBuilding(state, cMid + 2, rMid - 2, 'house', 2, 1);
    forceBuilding(state, cMid - 2, rMid + 1, 'house', 1, 1);
    forceBuilding(state, cMid + 1, rMid + 3, 'shop', 0, 1);
    forceBuilding(state, cMid - 3, rMid, 'park', 0, 1);
    forceBuilding(state, cMid, rMid + 2, 'watertower', 0, 1);
    forceBuilding(state, cMid + 4, rMid + 1, 'solarplant', 0, 1);
    if (blueprint.mapSeed % 2 === 0) {
      forceBuilding(state, cMid - 2, rMid - 2, 'trainstation', 0, 1);
    }
    applyCoastalSand(state.tiles, state.gridSize);
    state.newsTicker = `Dorpsraad ${state.settings.cityName}: "Rustig wonen en schone zonne- & windenergie in de regio."`;
    return;
  }

  if (kind === 'stad') {
    const ringRoads: Array<[number, number]> = [
      [cMid - 2, rMid - 1],
      [cMid - 3, rMid - 1],
      [cMid - 3, rMid],
      [cMid - 3, rMid + 1],
      [cMid - 3, rMid + 2],
      [cMid - 2, rMid + 2],
      [cMid - 1, rMid + 2],
      [cMid, rMid + 2],
      [cMid + 1, rMid + 2],
      [cMid + 2, rMid + 2],
      [cMid + 3, rMid + 1],
      [cMid + 3, rMid],
      [cMid + 3, rMid - 1],
      [cMid + 3, rMid - 2],
      [cMid + 2, rMid - 3],
      [cMid + 1, rMid - 3],
      [cMid, rMid - 3],
    ];
    ringRoads.forEach(([c, r]) => forceBuilding(state, c, r, 'road'));

    forceBuilding(state, cMid - 1, rMid - 2, 'house', 2, 2);
    forceBuilding(state, cMid + 2, rMid - 2, 'house', 2, 2);
    forceBuilding(state, cMid - 2, rMid + 1, 'house', 1, 2);
    forceBuilding(state, cMid + 1, rMid + 3, 'house', 0, 1);
    forceBuilding(state, cMid - 1, rMid + 3, 'house', 0, 2);
    forceBuilding(state, cMid, rMid - 4, 'shop', 2, 2);
    forceBuilding(state, cMid + 1, rMid - 4, 'shop', 2, 1);
    forceBuilding(state, cMid + 4, rMid - 1, 'factory', 3, 1);
    forceBuilding(state, cMid + 4, rMid, 'solarplant', 0, 1);
    forceBuilding(state, cMid + 4, rMid + 2, 'watertower', 0, 1);
    forceBuilding(state, cMid - 4, rMid, 'police', 1, 1);
    forceBuilding(state, cMid - 4, rMid + 1, 'school', 1, 1);
    forceBuilding(state, cMid + 2, rMid + 3, 'firestation', 0, 1);
    forceBuilding(state, cMid, rMid + 3, 'trainstation', 0, 1);

    if (blueprint.plotId.includes('maasmond') || blueprint.plotId.includes('duinkerk')) {
      forceBuilding(state, cMid + 5, rMid + 1, 'seaport', 0, 1);
    } else if (blueprint.plotId.includes('rijnpoort')) {
      forceBuilding(state, cMid + 5, rMid - 2, 'airport', 0, 1);
    } else if (blueprint.plotId.includes('goudkust')) {
      forceBuilding(state, cMid - 2, rMid - 3, 'stadium', 0, 1);
    } else if (blueprint.plotId.includes('gletsjerpoort') || blueprint.plotId.includes('lagunestad')) {
      forceBuilding(state, cMid - 4, rMid + 2, 'university', 0, 1);
    } else {
      forceBuilding(state, cMid - 4, rMid + 2, 'park', 0, 1);
    }
    forceBuilding(state, cMid - 4, rMid - 1, 'windmill', 0, 1);

    applyCoastalSand(state.tiles, state.gridSize);
    state.newsTicker = `Stadsbestuur ${state.settings.cityName}: "Forensen en hoogbouw verbinden de hele SimCity-regio!"`;
    return;
  }

  // Metropool: Full SimCity 4/3000 Skyline + University + Stadium + Seaport + Airport + Nuclear/Clean Power
  const gridRoads: Array<[number, number]> = [];
  for (let c = 2; c <= state.gridSize - 3; c++) {
    gridRoads.push([c, rMid - 1]);
    gridRoads.push([c, rMid + 1]);
    gridRoads.push([c, rMid + 4]);
  }
  for (let r = 2; r <= state.gridSize - 3; r++) {
    gridRoads.push([cMid - 1, r]);
    gridRoads.push([cMid + 2, r]);
    gridRoads.push([cMid + 5, r]);
  }
  gridRoads.forEach(([c, r]) => forceBuilding(state, c, r, 'road'));

  // High-density residential & commercial skyline
  forceBuilding(state, cMid, rMid - 2, 'house', 2, 3);
  forceBuilding(state, cMid + 1, rMid - 2, 'house', 2, 3);
  forceBuilding(state, cMid, rMid - 3, 'house', 0, 2);
  forceBuilding(state, cMid + 1, rMid - 3, 'house', 0, 2);
  forceBuilding(state, cMid - 2, rMid - 2, 'house', 1, 2);
  forceBuilding(state, cMid - 2, rMid + 2, 'house', 1, 3);
  forceBuilding(state, cMid - 2, rMid + 3, 'house', 1, 2);
  forceBuilding(state, cMid, rMid + 2, 'shop', 0, 3);
  forceBuilding(state, cMid + 1, rMid + 2, 'shop', 0, 3);
  forceBuilding(state, cMid + 3, rMid + 2, 'shop', 3, 2);
  forceBuilding(state, cMid + 3, rMid - 2, 'shop', 3, 3);
  forceBuilding(state, cMid + 4, rMid - 2, 'shop', 2, 2);
  forceBuilding(state, cMid + 4, rMid + 3, 'factory', 3, 2);
  forceBuilding(state, cMid + 3, rMid + 3, 'factory', 3, 2);

  // Landmark, Stadium, University, Transit, Airport, Seaport & Nuclear Power
  forceBuilding(state, cMid + 1, rMid, 'park', 0, 1);
  forceBuilding(state, cMid, rMid + 3, 'landmark', 0, 1);
  forceBuilding(state, cMid + 1, rMid + 3, 'stadium', 0, 1);
  forceBuilding(state, cMid - 2, rMid, 'trainstation', 1, 1);
  forceBuilding(state, cMid + 3, rMid, 'police', 3, 1);
  forceBuilding(state, cMid + 3, rMid - 3, 'firestation', 2, 1);
  forceBuilding(state, cMid + 4, rMid, 'university', 0, 1);
  forceBuilding(state, cMid + 4, rMid - 3, 'hospital', 2, 1);
  forceBuilding(state, cMid - 3, rMid + 2, 'watertower', 0, 1);
  forceBuilding(state, cMid - 3, rMid + 3, 'watertower', 0, 1);
  forceBuilding(state, cMid + 6, rMid + 2, 'nuclear', 0, 1);
  forceBuilding(state, cMid + 6, rMid - 2, 'solarplant', 0, 1);
  forceBuilding(state, cMid + 6, rMid + 3, 'seaport', 0, 1);
  forceBuilding(state, cMid - 3, rMid - 3, 'airport', 0, 1);
  forceBuilding(state, cMid - 3, rMid, 'park', 0, 1);

  applyCoastalSand(state.tiles, state.gridSize);
  state.victoryAchieved = true;
  state.victoryDismissed = true;
  state.newsTicker = `Metropool ${state.settings.cityName} bruist van internationale vluchten, zeehandel, torens en regionale samenwerking!`;
}

export function createCityStateForPlot(plotId: string): CityState {
  const bp = findPlotBlueprint(plotId) || REGIONS[0].plots[5];
  const state = createInitialCityState({
    cityName: bp.name,
    regionId: bp.regionId,
    plotId: bp.plotId,
    mapPreset: bp.mapPreset,
    mapSeed: bp.mapSeed,
    timeOfDay: bp.timeOfDay,
  });
  state.budget = bp.startBudget;
  populateSettlement(state, bp.kind, bp);
  const m = computeCityMetrics(state);
  state.bestPopulation = m.population;
  return state;
}

const VAULT_STORAGE_KEY = 'stadbouwer3000.regionVault.v2';

function computeMiniPreviewColors(state: CityState): string[] {
  const out: string[] = [];
  const step = Math.max(1, Math.floor(state.gridSize / 4));
  for (let gy = 0; gy < 4; gy++) {
    for (let gx = 0; gx < 4; gx++) {
      const col = Math.min(state.gridSize - 1, gx * step + 1);
      const row = Math.min(state.gridSize - 1, gy * step + 1);
      const tile = getTile(state, col, row);
      if (!tile) {
        out.push('#5d8e43');
        continue;
      }
      if (tile.building === 'house') out.push('#34d399');
      else if (tile.building === 'shop') out.push('#38bdf8');
      else if (tile.building === 'factory' || tile.building === 'seaport') out.push('#f59e0b');
      else if (tile.building === 'airport' || tile.building === 'road') out.push('#94a3b8');
      else if (tile.building) out.push('#f5b942');
      else if (tile.terrain === 'water') out.push('#1d6ca3');
      else if (tile.terrain === 'mountain') out.push('#78808f');
      else if (tile.terrain === 'forest') out.push('#2c6b35');
      else if (tile.terrain === 'sand') out.push('#d5c088');
      else out.push('#619446');
    }
  }
  return out;
}

export class RegionVault {
  private readonly states = new Map<string, CityState>();

  constructor() {
    this.loadFromStorage();
  }

  getOrCreatePlot(plotId: string): CityState {
    const existing = this.states.get(plotId);
    if (existing) {
      return JSON.parse(JSON.stringify(existing)) as CityState;
    }
    const created = createCityStateForPlot(plotId);
    this.states.set(plotId, created);
    return JSON.parse(JSON.stringify(created)) as CityState;
  }

  getPlotSnapshotFast(plotId: string): CityState {
    let st = this.states.get(plotId);
    if (!st) {
      st = createCityStateForPlot(plotId);
      this.states.set(plotId, st);
    }
    return st;
  }

  getNeighborSynergyForPlot(plotId: string): NeighborSynergy {
    const bp = findPlotBlueprint(plotId);
    if (!bp) return createEmptyNeighborSynergy();
    const reg = getRegionById(bp.regionId);

    const findNeighbor = (rx: number, ry: number) =>
      reg.plots.find((p) => p.rx === rx && p.ry === ry) || null;

    const nBp = findNeighbor(bp.rx, bp.ry - 1);
    const eBp = findNeighbor(bp.rx + 1, bp.ry);
    const sBp = findNeighbor(bp.rx, bp.ry + 1);
    const wBp = findNeighbor(bp.rx - 1, bp.ry);

    let connectedNeighbors = 0;
    let adjacentPopTotal = 0;
    const countNeighbor = (nb: RegionPlotBlueprint | null): string | null => {
      if (!nb) return null;
      connectedNeighbors++;
      const nState = this.getPlotSnapshotFast(nb.plotId);
      adjacentPopTotal += computeCityMetrics(nState).population;
      return nb.name;
    };

    const links = {
      north: countNeighbor(nBp),
      east: countNeighbor(eBp),
      south: countNeighbor(sBp),
      west: countNeighbor(wBp),
    };

    const commuterIncomeBonus = Math.min(85, Math.round(adjacentPopTotal * 0.14));
    const demandBoost = Math.min(26, Math.round(adjacentPopTotal * 0.04));

    return {
      connectedNeighbors,
      adjacentPopTotal,
      commuterIncomeBonus,
      demandBoost,
      links,
    };
  }

  savePlot(plotId: string, state: CityState): void {
    this.states.set(plotId, JSON.parse(JSON.stringify(state)) as CityState);
    this.saveToStorage();
  }

  resetPlot(plotId: string): CityState {
    const fresh = createCityStateForPlot(plotId);
    this.states.set(plotId, fresh);
    this.saveToStorage();
    return JSON.parse(JSON.stringify(fresh)) as CityState;
  }

  listRegionPlots(regionId: RegionId, activePlotId: string): RegionPlotSummary[] {
    const reg = getRegionById(regionId);
    return reg.plots.map((bp) => {
      const state =
        this.states.get(bp.plotId) || this.getPlotSnapshotFast(bp.plotId);
      const metrics = computeCityMetrics(state);
      const neighborCount = reg.plots.filter(
        (other) =>
          Math.abs(other.rx - bp.rx) + Math.abs(other.ry - bp.ry) === 1
      ).length;
      return {
        plotId: bp.plotId,
        regionId: bp.regionId,
        rx: bp.rx,
        ry: bp.ry,
        name: state.settings.cityName || bp.name,
        kind: bp.kind,
        tierName: metrics.tierName,
        population: metrics.population,
        happiness: metrics.happiness,
        budget: Math.round(state.budget),
        powerBalance: metrics.powerBalance,
        tagline: bp.tagline,
        isActive: bp.plotId === activePlotId,
        miniPreviewColors: computeMiniPreviewColors(state),
        neighborCount,
      };
    });
  }

  getTotalRegionPopulation(regionId: RegionId): number {
    return this.listRegionPlots(regionId, '').reduce(
      (sum, p) => sum + p.population,
      0
    );
  }

  getRegionSummaries(
    regionId: RegionId,
    activePlotId: string
  ): {
    summaries: RegionPlotSummary[];
    totalPopulation: number;
    totalPowerSurplus: number;
  } {
    const summaries = this.listRegionPlots(regionId, activePlotId);
    let totalPopulation = 0;
    let totalPowerSurplus = 0;
    for (const s of summaries) {
      totalPopulation += s.population;
      totalPowerSurplus += s.powerBalance;
    }
    return {summaries, totalPopulation, totalPowerSurplus};
  }

  private loadFromStorage(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem(VAULT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, CityState>;
      for (const [id, st] of Object.entries(parsed)) {
        if (st && Array.isArray(st.tiles) && st.tiles.length === 256) {
          this.states.set(id, st);
        }
      }
    } catch {
      // ignore storage errors
    }
  }

  private saveToStorage(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const obj: Record<string, CityState> = {};
      for (const [id, st] of this.states.entries()) {
        obj[id] = st;
      }
      localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(obj));
    } catch {
      // ignore storage quota errors
    }
  }
}
