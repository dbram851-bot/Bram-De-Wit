import * as THREE from 'three';

import {TERRAIN_HEIGHTS, TILE_SIZE} from '../constants';
import type {BuildingType, TerrainType} from '../types';
import type {CityMaterialLibrary} from './proceduralMaterials';

export interface AnimatedBuildingHandle {
  type: BuildingType;
  col: number;
  row: number;
  group: THREE.Group;
  rotor?: THREE.Object3D;
  fountainSpire?: THREE.Object3D;
  chimneyWorldOffsets?: THREE.Vector3[];
  popProgress: number;
}

export interface BuildingGeometryCache {
  dispose: () => void;
  buildTerrainTileMesh: (
    terrain: TerrainType,
    variant: number,
    col: number,
    row: number
  ) => THREE.Group;
  buildMesh: (
    type: BuildingType,
    variant: number,
    roadMask: number,
    col: number,
    row: number,
    isBridge?: boolean,
    density?: 1 | 2 | 3
  ) => AnimatedBuildingHandle;
  createCarGroup: (colorIdx: number) => THREE.Group;
}

export function createBuildingBuilder(
  mats: CityMaterialLibrary
): BuildingGeometryCache {
  const geometries: THREE.BufferGeometry[] = [];
  const track = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };

  const S = TILE_SIZE; // 0.092m
  const shadowGeo = track(new THREE.CircleGeometry(S * 0.44, 16));
  shadowGeo.rotateX(-Math.PI / 2);

  // Terrain tile block geometries
  const tileBaseBoxGeo = track(new THREE.BoxGeometry(S * 0.995, 1, S * 0.995));
  const pineTrunkGeo = track(new THREE.CylinderGeometry(0.0025, 0.0038, 0.016, 6));
  const pineCone1Geo = track(new THREE.ConeGeometry(0.012, 0.024, 7));
  const pineCone2Geo = track(new THREE.ConeGeometry(0.009, 0.018, 7));
  const rockPeak1Geo = track(new THREE.ConeGeometry(S * 0.42, 0.044, 5));
  const rockPeak2Geo = track(new THREE.ConeGeometry(S * 0.28, 0.032, 5));
  const snowCapGeo = track(new THREE.ConeGeometry(S * 0.17, 0.018, 5));

  // Road & Bridge geometries
  const roadCenterGeo = track(new THREE.BoxGeometry(S * 0.62, 0.004, S * 0.62));
  const roadArmNSGeo = track(new THREE.BoxGeometry(S * 0.62, 0.004, S * 0.22));
  const roadArmEWGeo = track(new THREE.BoxGeometry(S * 0.22, 0.004, S * 0.62));
  const curbNSGeo = track(new THREE.BoxGeometry(S * 0.07, 0.0065, S * 0.22));
  const curbEWGeo = track(new THREE.BoxGeometry(S * 0.22, 0.0065, S * 0.07));
  const curbCornerGeo = track(new THREE.BoxGeometry(S * 0.07, 0.0065, S * 0.07));
  const stripeNSGeo = track(new THREE.BoxGeometry(0.0045, 0.0046, S * 0.22));
  const stripeEWGeo = track(new THREE.BoxGeometry(S * 0.22, 0.0046, 0.0045));

  // Bridge parts (for roads over water)
  const bridgeDeckGeo = track(new THREE.BoxGeometry(S * 0.98, 0.005, S * 0.68));
  const bridgeRailGeo = track(new THREE.BoxGeometry(S * 0.98, 0.008, 0.005));
  const bridgePillarGeo = track(new THREE.BoxGeometry(0.012, 0.016, 0.012));
  const bridgeArchGeo = track(new THREE.BoxGeometry(S * 0.46, 0.024, 0.005));

  // House geometries (3 variants)
  const housePlinthGeo = track(new THREE.BoxGeometry(S * 0.76, 0.008, S * 0.74));
  const houseBodyGeo = track(new THREE.BoxGeometry(S * 0.64, 0.046, S * 0.6));
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-S * 0.35, 0);
  roofShape.lineTo(0, 0.03);
  roofShape.lineTo(S * 0.35, 0);
  roofShape.closePath();
  const houseRoofGeo = track(
    new THREE.ExtrudeGeometry(roofShape, {
      depth: S * 0.64,
      bevelEnabled: true,
      bevelThickness: 0.0015,
      bevelSize: 0.0015,
      bevelSegments: 1,
    })
  );
  houseRoofGeo.translate(0, 0, -S * 0.32);
  const aptBodyGeo = track(new THREE.BoxGeometry(S * 0.68, 0.088, S * 0.62));
  const aptTrimGeo = track(new THREE.BoxGeometry(S * 0.72, 0.006, S * 0.66));
  const chimneyGeo = track(new THREE.BoxGeometry(0.01, 0.02, 0.01));
  const doorGeo = track(new THREE.BoxGeometry(0.013, 0.02, 0.004));
  const windowGeo = track(new THREE.BoxGeometry(0.013, 0.012, 0.0035));
  const awningGeo = track(new THREE.BoxGeometry(0.02, 0.0035, 0.01));

  // Shop / Commercial Office geometries
  const shopBaseGeo = track(new THREE.BoxGeometry(S * 0.8, 0.036, S * 0.76));
  const shopUpperGeo = track(new THREE.BoxGeometry(S * 0.68, 0.04, S * 0.64));
  const shopTowerGeo = track(new THREE.BoxGeometry(S * 0.64, 0.115, S * 0.62));
  const shopParapetGeo = track(new THREE.BoxGeometry(S * 0.72, 0.007, S * 0.68));
  const shopWindowGeo = track(new THREE.BoxGeometry(S * 0.54, 0.018, 0.004));
  const shopAwningGeo = track(new THREE.BoxGeometry(S * 0.64, 0.007, 0.018));
  const shopSignGeo = track(new THREE.BoxGeometry(0.03, 0.012, 0.005));
  const hvacGeo = track(new THREE.BoxGeometry(0.018, 0.009, 0.018));

  // Park geometries
  const parkLawnGeo = track(new THREE.BoxGeometry(S * 0.88, 0.004, S * 0.88));
  const fountainRimGeo = track(new THREE.CylinderGeometry(0.017, 0.02, 0.007, 16));
  const fountainWaterGeo = track(new THREE.CylinderGeometry(0.013, 0.013, 0.005, 16));
  const fountainSpireGeo = track(new THREE.ConeGeometry(0.0045, 0.017, 10));
  const trunkGeo = track(new THREE.CylinderGeometry(0.004, 0.006, 0.026, 8));
  const crownLowGeo = track(new THREE.DodecahedronGeometry(0.016, 0));
  const crownTopGeo = track(new THREE.DodecahedronGeometry(0.012, 0));
  const benchGeo = track(new THREE.BoxGeometry(0.017, 0.0055, 0.007));

  // Factory geometries
  const factorySlabGeo = track(new THREE.BoxGeometry(S * 0.86, 0.006, S * 0.84));
  const factoryHallGeo = track(new THREE.BoxGeometry(S * 0.56, 0.042, S * 0.72));
  const sawtoothGeo = track(new THREE.CylinderGeometry(0.014, 0.014, S * 0.54, 3));
  sawtoothGeo.rotateZ(Math.PI / 2);
  const stackGeo = track(new THREE.CylinderGeometry(0.0055, 0.008, 0.07, 10));
  const stackRimGeo = track(new THREE.CylinderGeometry(0.007, 0.007, 0.005, 10));
  const siloGeo = track(new THREE.CylinderGeometry(0.012, 0.012, 0.054, 14));
  const siloCapGeo = track(
    new THREE.SphereGeometry(0.012, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)
  );

  // Powerplant geometries (SimCity 3000 coal/thermal plant)
  const plantHallGeo = track(new THREE.BoxGeometry(S * 0.46, 0.046, S * 0.72));
  const coolingTowerGeo = track(new THREE.CylinderGeometry(0.014, 0.022, 0.078, 16));
  const plantStackGeo = track(new THREE.CylinderGeometry(0.005, 0.007, 0.088, 10));

  // Watertower geometries
  const wtPadGeo = track(new THREE.BoxGeometry(S * 0.68, 0.006, S * 0.68));
  const wtLegGeo = track(new THREE.CylinderGeometry(0.0028, 0.0036, 0.064, 6));
  const wtTankGeo = track(new THREE.CylinderGeometry(0.022, 0.022, 0.03, 14));
  const wtRoofGeo = track(new THREE.ConeGeometry(0.024, 0.014, 14));

  // Windmill geometries
  const turbineFootingGeo = track(new THREE.CylinderGeometry(0.018, 0.024, 0.008, 12));
  const turbineTowerGeo = track(new THREE.CylinderGeometry(0.005, 0.01, 0.1, 12));
  const nacelleGeo = track(new THREE.BoxGeometry(0.012, 0.012, 0.022));
  const hubGeo = track(new THREE.ConeGeometry(0.006, 0.012, 10));
  hubGeo.rotateX(Math.PI / 2);
  const bladeGeo = track(new THREE.BoxGeometry(0.0045, 0.042, 0.0018));
  bladeGeo.translate(0, 0.021, 0);

  // High-rise & Civic service geometries
  const highResTowerGeo = track(new THREE.BoxGeometry(S * 0.68, 0.145, S * 0.64));
  const highResPentGeo = track(new THREE.BoxGeometry(S * 0.44, 0.024, S * 0.42));
  const comSkyscraperGeo = track(new THREE.BoxGeometry(S * 0.66, 0.185, S * 0.64));
  const comCrownGeo = track(new THREE.BoxGeometry(S * 0.46, 0.036, S * 0.46));
  const spireGeo = track(new THREE.CylinderGeometry(0.0018, 0.0038, 0.038, 8));

  const civicBaseGeo = track(new THREE.BoxGeometry(S * 0.86, 0.008, S * 0.84));
  const civicHallGeo = track(new THREE.BoxGeometry(S * 0.72, 0.044, S * 0.64));
  const civicGarageGeo = track(new THREE.BoxGeometry(0.022, 0.022, 0.005));
  const policeDomeGeo = track(new THREE.SphereGeometry(0.007, 10, 8));
  const fireTowerGeo = track(new THREE.BoxGeometry(0.02, 0.075, 0.02));
  const schoolWingGeo = track(new THREE.BoxGeometry(S * 0.28, 0.036, S * 0.56));
  const hospitalWingGeo = track(new THREE.BoxGeometry(S * 0.68, 0.082, S * 0.46));
  const crossVGeo = track(new THREE.BoxGeometry(0.005, 0.018, 0.004));
  const crossHGeo = track(new THREE.BoxGeometry(0.018, 0.005, 0.004));
  const helipadGeo = track(new THREE.CylinderGeometry(0.016, 0.016, 0.003, 14));
  const obeliskBaseGeo = track(new THREE.BoxGeometry(0.036, 0.018, 0.036));
  const obeliskShaftGeo = track(new THREE.CylinderGeometry(0.006, 0.015, 0.115, 4));
  const obeliskTipGeo = track(new THREE.ConeGeometry(0.0085, 0.022, 4));
  obeliskShaftGeo.rotateY(Math.PI / 4);
  obeliskTipGeo.rotateY(Math.PI / 4);

  // Town Hall geometries
  const thPlazaGeo = track(new THREE.BoxGeometry(S * 0.92, 0.008, S * 0.92));
  const thHallGeo = track(new THREE.BoxGeometry(S * 0.72, 0.048, S * 0.64));
  const thRoofGeo = track(new THREE.ConeGeometry(S * 0.48, 0.028, 4));
  thRoofGeo.rotateY(Math.PI / 4);

  // Train Station geometries
  const railTrackGeo = track(new THREE.BoxGeometry(S * 0.92, 0.003, 0.004));
  const stationCanopyGeo = track(
    new THREE.CylinderGeometry(S * 0.24, S * 0.24, S * 0.68, 10, 1, false, 0, Math.PI)
  );
  stationCanopyGeo.rotateZ(Math.PI / 2);
  const trainCarGeo = track(new THREE.BoxGeometry(S * 0.46, 0.015, 0.014));

  // Seaport geometries
  const pierDeckGeo = track(new THREE.BoxGeometry(S * 0.88, 0.007, S * 0.42));
  const containerGeo = track(new THREE.BoxGeometry(0.024, 0.014, 0.014));
  const craneMastGeo = track(new THREE.BoxGeometry(0.006, 0.056, 0.006));
  const craneBoomGeo = track(new THREE.BoxGeometry(0.044, 0.005, 0.006));
  const bargeHullGeo = track(new THREE.BoxGeometry(0.042, 0.011, 0.018));

  // Airport geometries
  const runwayStripGeo = track(new THREE.BoxGeometry(S * 0.94, 0.004, S * 0.34));
  const runwayStripeGeo = track(new THREE.BoxGeometry(0.012, 0.0045, 0.003));
  const hangarGeo = track(new THREE.BoxGeometry(S * 0.36, 0.026, S * 0.28));
  const atcShaftGeo = track(new THREE.CylinderGeometry(0.007, 0.011, 0.068, 8));
  const atcPodGeo = track(new THREE.CylinderGeometry(0.015, 0.011, 0.016, 10));
  const radarDishGeo = track(new THREE.BoxGeometry(0.018, 0.006, 0.003));
  const jetBodyGeo = track(new THREE.CylinderGeometry(0.0035, 0.0045, 0.028, 8));
  jetBodyGeo.rotateZ(Math.PI / 2);
  const jetWingGeo = track(new THREE.BoxGeometry(0.009, 0.0018, 0.028));

  // Solar Plant geometries
  const solarPanelGeo = track(new THREE.BoxGeometry(0.022, 0.0025, 0.016));
  const solarPostGeo = track(new THREE.CylinderGeometry(0.002, 0.002, 0.008, 6));
  const solarTowerGeo = track(new THREE.CylinderGeometry(0.005, 0.008, 0.056, 10));

  // Nuclear Plant geometries
  const nuclearDomeGeo = track(
    new THREE.SphereGeometry(0.02, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2)
  );
  const nuclearBaseGeo = track(new THREE.CylinderGeometry(0.02, 0.021, 0.026, 16));
  const nuclearCoolGeo = track(new THREE.CylinderGeometry(0.013, 0.02, 0.074, 16));

  // University geometries
  const uniMainGeo = track(new THREE.BoxGeometry(S * 0.78, 0.044, S * 0.42));
  const uniDomeGeo = track(
    new THREE.SphereGeometry(0.016, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2)
  );
  const uniSpireGeo = track(new THREE.CylinderGeometry(0.002, 0.004, 0.024, 8));

  // Stadium geometries
  const stadiumBowlGeo = track(new THREE.CylinderGeometry(S * 0.43, S * 0.36, 0.026, 20));
  const stadiumPitchGeo = track(new THREE.CylinderGeometry(S * 0.31, S * 0.31, 0.028, 20));
  const floodPoleGeo = track(new THREE.CylinderGeometry(0.0018, 0.0024, 0.048, 6));
  const floodHeadGeo = track(new THREE.BoxGeometry(0.011, 0.006, 0.004));
  const thTowerGeo = track(new THREE.BoxGeometry(0.022, 0.06, 0.022));
  const thSpireGeo = track(new THREE.ConeGeometry(0.016, 0.032, 4));
  thSpireGeo.rotateY(Math.PI / 4);
  const thClockGeo = track(new THREE.CylinderGeometry(0.006, 0.006, 0.003, 12));
  thClockGeo.rotateX(Math.PI / 2);
  const thColumnGeo = track(new THREE.CylinderGeometry(0.003, 0.0035, 0.036, 8));

  // Car geometries
  const carChassisGeo = track(new THREE.BoxGeometry(0.014, 0.0065, 0.027));
  const carCabinGeo = track(new THREE.BoxGeometry(0.012, 0.0055, 0.014));
  const wheelGeo = track(new THREE.CylinderGeometry(0.0028, 0.0028, 0.0025, 8));
  wheelGeo.rotateZ(Math.PI / 2);

  function addContactShadow(group: THREE.Group, scale = 1): void {
    const shadow = new THREE.Mesh(shadowGeo, mats.contactShadow);
    shadow.position.y = 0.0012;
    shadow.scale.setScalar(scale);
    group.add(shadow);
  }

  function enableShadows(group: THREE.Group): void {
    group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        if (m.material !== mats.contactShadow) {
          m.castShadow = true;
          m.receiveShadow = true;
        }
      }
    });
  }

  function buildTerrainTileMesh(
    terrain: TerrainType,
    variant: number,
    col: number,
    row: number
  ): THREE.Group {
    const group = new THREE.Group();
    const h = TERRAIN_HEIGHTS[terrain];
    const even = (col + row) % 2 === 0;

    let topMat = even ? mats.grassLight : mats.grassDark;
    if (terrain === 'water') topMat = mats.waterTile;
    else if (terrain === 'sand') topMat = mats.sandTile;
    else if (terrain === 'hill') topMat = mats.hillGrass;
    else if (terrain === 'mountain') topMat = mats.mountainRock;

    // Sculpted earth cutaway block for non-water elevation
    if (terrain === 'water') {
      const basin = new THREE.Mesh(tileBaseBoxGeo, mats.earthCutaway);
      basin.scale.y = 0.002;
      basin.position.y = -0.001;
      const water = new THREE.Mesh(tileBaseBoxGeo, topMat);
      water.scale.y = 0.003;
      water.position.y = h - 0.001;
      water.receiveShadow = true;
      group.add(basin, water);
      return group;
    }

    const soilHeight = h + 0.004;
    const block = new THREE.Mesh(tileBaseBoxGeo, [
      mats.earthCutaway,
      mats.earthCutaway,
      topMat,
      mats.earthCutaway,
      mats.earthCutaway,
      mats.earthCutaway,
    ]);
    block.scale.y = soilHeight;
    block.position.y = soilHeight / 2 - 0.004;
    block.receiveShadow = true;
    block.castShadow = terrain === 'hill' || terrain === 'mountain';
    group.add(block);

    if (terrain === 'forest') {
      const offsets: Array<[number, number, number]> = [
        [-S * 0.24, -S * 0.22, 1.0],
        [S * 0.2, -S * 0.16, 0.85],
        [-S * 0.05, S * 0.22, 1.1],
      ];
      for (let i = 0; i < offsets.length; i++) {
        const [tx, tz, sc] = offsets[i];
        const trunk = new THREE.Mesh(pineTrunkGeo, mats.treeTrunk);
        trunk.position.set(tx, h + 0.008, tz);
        const cone1 = new THREE.Mesh(
          pineCone1Geo,
          (variant + i) % 2 === 0 ? mats.pineGreen : mats.foliageGreens[0]
        );
        cone1.position.set(tx, h + 0.022, tz);
        cone1.scale.setScalar(sc);
        const cone2 = new THREE.Mesh(
          pineCone2Geo,
          (variant + i) % 2 === 0 ? mats.pineGreen : mats.foliageGreens[2]
        );
        cone2.position.set(tx, h + 0.032, tz);
        cone2.scale.setScalar(sc);
        trunk.castShadow = true;
        cone1.castShadow = true;
        cone2.castShadow = true;
        group.add(trunk, cone1, cone2);
      }
    } else if (terrain === 'mountain') {
      const peak1 = new THREE.Mesh(rockPeak1Geo, mats.mountainRock);
      peak1.position.set(-0.005, h + 0.021, 0.004);
      peak1.rotation.y = variant * 0.7;
      const peak2 = new THREE.Mesh(rockPeak2Geo, mats.mountainRock);
      peak2.position.set(0.016, h + 0.015, -0.012);
      peak2.rotation.y = variant * 1.1 + 0.5;
      const cap = new THREE.Mesh(snowCapGeo, mats.snowCap);
      cap.position.set(-0.005, h + 0.035, 0.004);
      cap.rotation.y = peak1.rotation.y;
      peak1.castShadow = true;
      peak2.castShadow = true;
      group.add(peak1, peak2, cap);
    }

    return group;
  }

  function buildRoad(roadMask: number, isBridge: boolean): THREE.Group {
    const group = new THREE.Group();
    const n = (roadMask & 1) !== 0;
    const e = (roadMask & 2) !== 0;
    const s = (roadMask & 4) !== 0;
    const w = (roadMask & 8) !== 0;

    if (isBridge) {
      // SimCity 3000 elevated bridge over water!
      const alongZ = (n || s) && !(e || w);
      const deckY = 0.012;
      const deck = new THREE.Mesh(bridgeDeckGeo, mats.asphalt);
      deck.position.y = deckY;
      if (alongZ) deck.rotation.y = Math.PI / 2;

      const rail1 = new THREE.Mesh(bridgeRailGeo, mats.bridgeSteel);
      const rail2 = new THREE.Mesh(bridgeRailGeo, mats.bridgeSteel);
      const arch1 = new THREE.Mesh(bridgeArchGeo, mats.bridgeSteel);
      const arch2 = new THREE.Mesh(bridgeArchGeo, mats.bridgeSteel);

      if (alongZ) {
        rail1.rotation.y = Math.PI / 2;
        rail2.rotation.y = Math.PI / 2;
        arch1.rotation.y = Math.PI / 2;
        arch2.rotation.y = Math.PI / 2;
        rail1.position.set(-S * 0.32, deckY + 0.005, 0);
        rail2.position.set(S * 0.32, deckY + 0.005, 0);
        arch1.position.set(-S * 0.32, deckY + 0.016, 0);
        arch2.position.set(S * 0.32, deckY + 0.016, 0);
      } else {
        rail1.position.set(0, deckY + 0.005, -S * 0.32);
        rail2.position.set(0, deckY + 0.005, S * 0.32);
        arch1.position.set(0, deckY + 0.016, -S * 0.32);
        arch2.position.set(0, deckY + 0.016, S * 0.32);
      }

      for (const px of [-S * 0.32, S * 0.32]) {
        for (const pz of [-S * 0.32, S * 0.32]) {
          const pillar = new THREE.Mesh(bridgePillarGeo, mats.stonePlinth);
          pillar.position.set(px, 0.004, pz);
          group.add(pillar);
        }
      }
      group.add(deck, rail1, rail2, arch1, arch2);
      enableShadows(group);
      return group;
    }

    const center = new THREE.Mesh(roadCenterGeo, mats.asphalt);
    center.position.y = 0.002;
    center.receiveShadow = true;
    group.add(center);

    if (n) {
      const arm = new THREE.Mesh(roadArmNSGeo, mats.asphalt);
      arm.position.set(0, 0.002, -S * 0.4);
      arm.receiveShadow = true;
      const stripe = new THREE.Mesh(stripeNSGeo, mats.roadStripe);
      stripe.position.set(0, 0.0024, -S * 0.35);
      const curbL = new THREE.Mesh(curbNSGeo, mats.sidewalk);
      curbL.position.set(-S * 0.34, 0.0032, -S * 0.4);
      const curbR = new THREE.Mesh(curbNSGeo, mats.sidewalk);
      curbR.position.set(S * 0.34, 0.0032, -S * 0.4);
      group.add(arm, stripe, curbL, curbR);
    } else {
      const cap = new THREE.Mesh(curbEWGeo, mats.sidewalk);
      cap.position.set(0, 0.0032, -S * 0.34);
      cap.scale.x = 2.8;
      group.add(cap);
    }

    if (s) {
      const arm = new THREE.Mesh(roadArmNSGeo, mats.asphalt);
      arm.position.set(0, 0.002, S * 0.4);
      arm.receiveShadow = true;
      const stripe = new THREE.Mesh(stripeNSGeo, mats.roadStripe);
      stripe.position.set(0, 0.0024, S * 0.35);
      const curbL = new THREE.Mesh(curbNSGeo, mats.sidewalk);
      curbL.position.set(-S * 0.34, 0.0032, S * 0.4);
      const curbR = new THREE.Mesh(curbNSGeo, mats.sidewalk);
      curbR.position.set(S * 0.34, 0.0032, S * 0.4);
      group.add(arm, stripe, curbL, curbR);
    } else {
      const cap = new THREE.Mesh(curbEWGeo, mats.sidewalk);
      cap.position.set(0, 0.0032, S * 0.34);
      cap.scale.x = 2.8;
      group.add(cap);
    }

    if (e) {
      const arm = new THREE.Mesh(roadArmEWGeo, mats.asphalt);
      arm.position.set(S * 0.4, 0.002, 0);
      arm.receiveShadow = true;
      const stripe = new THREE.Mesh(stripeEWGeo, mats.roadStripe);
      stripe.position.set(S * 0.35, 0.0024, 0);
      const curbT = new THREE.Mesh(curbEWGeo, mats.sidewalk);
      curbT.position.set(S * 0.4, 0.0032, -S * 0.34);
      const curbB = new THREE.Mesh(curbEWGeo, mats.sidewalk);
      curbB.position.set(S * 0.4, 0.0032, S * 0.34);
      group.add(arm, stripe, curbT, curbB);
    } else {
      const cap = new THREE.Mesh(curbNSGeo, mats.sidewalk);
      cap.position.set(S * 0.34, 0.0032, 0);
      cap.scale.z = 2.8;
      group.add(cap);
    }

    if (w) {
      const arm = new THREE.Mesh(roadArmEWGeo, mats.asphalt);
      arm.position.set(-S * 0.4, 0.002, 0);
      arm.receiveShadow = true;
      const stripe = new THREE.Mesh(stripeEWGeo, mats.roadStripe);
      stripe.position.set(-S * 0.35, 0.0024, 0);
      const curbT = new THREE.Mesh(curbEWGeo, mats.sidewalk);
      curbT.position.set(-S * 0.4, 0.0032, -S * 0.34);
      const curbB = new THREE.Mesh(curbEWGeo, mats.sidewalk);
      curbB.position.set(-S * 0.4, 0.0032, S * 0.34);
      group.add(arm, stripe, curbT, curbB);
    } else {
      const cap = new THREE.Mesh(curbNSGeo, mats.sidewalk);
      cap.position.set(-S * 0.34, 0.0032, 0);
      cap.scale.z = 2.8;
      group.add(cap);
    }

    for (const cx of [-1, 1]) {
      for (const cz of [-1, 1]) {
        const corner = new THREE.Mesh(curbCornerGeo, mats.sidewalk);
        corner.position.set(cx * S * 0.34, 0.0032, cz * S * 0.34);
        group.add(corner);
      }
    }

    return group;
  }

  function buildHouse(variant: number, density: 1 | 2 | 3): THREE.Group {
    const group = new THREE.Group();
    addContactShadow(group, 1.0);

    const plinth = new THREE.Mesh(housePlinthGeo, mats.stonePlinth);
    plinth.position.y = 0.004;

    const wallMat = mats.wallVariants[variant % mats.wallVariants.length];
    const roofMat = mats.roofVariants[variant % mats.roofVariants.length];

    if (density === 3) {
      // Density 3: SimCity 3000 6-story modern urban residential tower
      const body = new THREE.Mesh(highResTowerGeo, wallMat);
      body.position.y = 0.008 + 0.0725;
      const trim = new THREE.Mesh(aptTrimGeo, mats.stonePlinth);
      trim.position.y = 0.154;
      const pent = new THREE.Mesh(highResPentGeo, roofMat);
      pent.position.y = 0.168;
      const door = new THREE.Mesh(doorGeo, mats.woodDoor);
      door.position.set(0, 0.018, S * 0.322);
      group.add(plinth, body, trim, pent, door);

      for (const wy of [0.036, 0.058, 0.08, 0.102, 0.124, 0.144]) {
        for (const wx of [-0.018, 0, 0.018]) {
          const wf = new THREE.Mesh(windowGeo, mats.warmWindowGlow);
          wf.position.set(wx, wy, S * 0.322);
          const wb = new THREE.Mesh(windowGeo, mats.warmWindowGlow);
          wb.position.set(wx, wy, -S * 0.322);
          group.add(wf, wb);
        }
      }
      enableShadows(group);
      return group;
    }

    if (density === 2 || variant % 3 === 1) {
      // Density 2: 3-story brick apartment block with glowing window grid
      const body = new THREE.Mesh(aptBodyGeo, wallMat);
      body.position.y = 0.008 + 0.044;
      const cornice = new THREE.Mesh(aptTrimGeo, roofMat);
      cornice.position.y = 0.098;
      const door = new THREE.Mesh(doorGeo, mats.woodDoor);
      door.position.set(0, 0.018, S * 0.312);
      group.add(plinth, body, cornice, door);

      for (const wy of [0.04, 0.062, 0.082]) {
        for (const wx of [-0.016, 0.016]) {
          const wf = new THREE.Mesh(windowGeo, mats.warmWindowGlow);
          wf.position.set(wx, wy, S * 0.312);
          const wb = new THREE.Mesh(windowGeo, mats.warmWindowGlow);
          wb.position.set(wx, wy, -S * 0.312);
          group.add(wf, wb);
        }
      }
      enableShadows(group);
      return group;
    }

    // Density 1: Classic Dutch pitched-roof townhouse
    const body = new THREE.Mesh(houseBodyGeo, wallMat);
    body.position.y = 0.008 + 0.023;
    const roof = new THREE.Mesh(houseRoofGeo, roofMat);
    roof.position.y = 0.054;
    const chimney = new THREE.Mesh(chimneyGeo, mats.factoryBrick);
    chimney.position.set(0.014, 0.072, -0.012);
    const door = new THREE.Mesh(doorGeo, mats.woodDoor);
    door.position.set(0, 0.018, S * 0.305);
    const awning = new THREE.Mesh(
      awningGeo,
      mats.awningStripes[variant % mats.awningStripes.length]
    );
    awning.position.set(0, 0.032, S * 0.315);

    const winL = new THREE.Mesh(windowGeo, mats.warmWindowGlow);
    winL.position.set(-0.015, 0.035, S * 0.304);
    const winR = new THREE.Mesh(windowGeo, mats.warmWindowGlow);
    winR.position.set(0.015, 0.035, S * 0.304);
    const winBack = new THREE.Mesh(windowGeo, mats.glassWindow);
    winBack.position.set(0, 0.035, -S * 0.304);

    group.add(plinth, body, roof, chimney, door, awning, winL, winR, winBack);
    enableShadows(group);
    return group;
  }

  function buildShop(variant: number, density: 1 | 2 | 3): THREE.Group {
    const group = new THREE.Group();
    addContactShadow(group, 1.05);

    if (density === 3) {
      // Density 3: SimCity 3000 Downtown Glass Skyscraper with crown & spire
      const base = new THREE.Mesh(shopBaseGeo, mats.stonePlinth);
      base.position.y = 0.018;
      const tower = new THREE.Mesh(comSkyscraperGeo, mats.glassTowerFacade);
      tower.position.y = 0.036 + 0.0925;
      const crown = new THREE.Mesh(comCrownGeo, mats.glassTowerFacade);
      crown.position.y = 0.221 + 0.018;
      const spire = new THREE.Mesh(spireGeo, mats.brassAccent);
      spire.position.y = 0.257 + 0.019;
      const storefront = new THREE.Mesh(shopWindowGeo, mats.warmWindowGlow);
      storefront.position.set(0, 0.016, S * 0.382);
      const sign = new THREE.Mesh(shopSignGeo, mats.brassAccent);
      sign.position.set(0, 0.214, S * 0.32);

      group.add(base, tower, crown, spire, storefront, sign);
      enableShadows(group);
      return group;
    }

    if (density === 2 || variant % 3 === 1) {
      // Density 2: Mid-Rise Glass Commercial Office Tower
      const base = new THREE.Mesh(shopBaseGeo, mats.stonePlinth);
      base.position.y = 0.018;
      const tower = new THREE.Mesh(shopTowerGeo, mats.glassTowerFacade);
      tower.position.y = 0.036 + 0.0575;
      const cap = new THREE.Mesh(shopParapetGeo, mats.steelSilo);
      cap.position.y = 0.153;
      const hvac = new THREE.Mesh(hvacGeo, mats.coolingConcrete);
      hvac.position.set(0.008, 0.161, -0.006);
      const storefront = new THREE.Mesh(shopWindowGeo, mats.warmWindowGlow);
      storefront.position.set(0, 0.016, S * 0.382);
      const sign = new THREE.Mesh(shopSignGeo, mats.brassAccent);
      sign.position.set(0, 0.145, S * 0.32);

      group.add(base, tower, cap, hvac, storefront, sign);
      enableShadows(group);
      return group;
    }

    const wallMat = mats.wallVariants[(variant + 1) % mats.wallVariants.length];
    const awningMat = mats.awningStripes[variant % mats.awningStripes.length];

    const base = new THREE.Mesh(shopBaseGeo, mats.stonePlinth);
    base.position.y = 0.018;
    const upper = new THREE.Mesh(shopUpperGeo, wallMat);
    upper.position.y = 0.036 + 0.02;
    const parapet = new THREE.Mesh(shopParapetGeo, mats.roofVariants[1]);
    parapet.position.y = 0.078;
    const storefront = new THREE.Mesh(shopWindowGeo, mats.warmWindowGlow);
    storefront.position.set(0, 0.016, S * 0.382);
    const awning = new THREE.Mesh(shopAwningGeo, awningMat);
    awning.position.set(0, 0.031, S * 0.398);
    awning.rotation.x = 0.28;
    const sign = new THREE.Mesh(shopSignGeo, mats.brassAccent);
    sign.position.set(0, 0.055, S * 0.325);
    const upperWinL = new THREE.Mesh(windowGeo, mats.warmWindowGlow);
    upperWinL.position.set(-0.014, 0.055, S * 0.322);
    const upperWinR = new THREE.Mesh(windowGeo, mats.warmWindowGlow);
    upperWinR.position.set(0.014, 0.055, S * 0.322);

    group.add(
      base,
      upper,
      parapet,
      storefront,
      awning,
      sign,
      upperWinL,
      upperWinR
    );
    enableShadows(group);
    return group;
  }

  function buildPark(variant: number): {
    group: THREE.Group;
    fountainSpire: THREE.Object3D;
  } {
    const group = new THREE.Group();

    const lawn = new THREE.Mesh(parkLawnGeo, mats.foliageGreens[1]);
    lawn.position.y = 0.002;
    lawn.receiveShadow = true;

    const rim = new THREE.Mesh(fountainRimGeo, mats.stonePlinth);
    rim.position.set(0, 0.007, 0);

    const pool = new THREE.Mesh(fountainWaterGeo, mats.waterPool);
    pool.position.set(0, 0.009, 0);

    const spire = new THREE.Mesh(fountainSpireGeo, mats.waterPool);
    spire.position.set(0, 0.018, 0);

    const treeOffsets = [
      [-S * 0.27, -S * 0.25],
      [S * 0.27, S * 0.24],
    ];
    for (let i = 0; i < treeOffsets.length; i++) {
      const [tx, tz] = treeOffsets[i];
      const trunk = new THREE.Mesh(trunkGeo, mats.treeTrunk);
      trunk.position.set(tx, 0.014, tz);
      const leafMat =
        mats.foliageGreens[(variant + i) % mats.foliageGreens.length];
      const crown1 = new THREE.Mesh(crownLowGeo, leafMat);
      crown1.position.set(tx, 0.032, tz);
      const crown2 = new THREE.Mesh(crownTopGeo, leafMat);
      crown2.position.set(tx + 0.003, 0.044, tz - 0.002);
      group.add(trunk, crown1, crown2);
    }

    const bench = new THREE.Mesh(benchGeo, mats.woodDoor);
    bench.position.set(-S * 0.22, 0.007, S * 0.25);
    bench.rotation.y = 0.6;

    group.add(lawn, rim, pool, spire, bench);
    enableShadows(group);
    return {group, fountainSpire: spire};
  }

  function buildFactory(): {
    group: THREE.Group;
    chimneyOffsets: THREE.Vector3[];
  } {
    const group = new THREE.Group();
    addContactShadow(group, 1.12);

    const slab = new THREE.Mesh(factorySlabGeo, mats.stonePlinth);
    slab.position.y = 0.003;

    const hall = new THREE.Mesh(factoryHallGeo, mats.factoryBrick);
    hall.position.set(-0.01, 0.027, 0);

    for (const zOff of [-0.016, 0.014]) {
      const bay = new THREE.Mesh(sawtoothGeo, mats.roofVariants[1]);
      bay.position.set(-0.01, 0.054, zOff);
      group.add(bay);
    }

    const chimneyOffsets: THREE.Vector3[] = [];
    for (const zOff of [-0.018, 0.018]) {
      const stack = new THREE.Mesh(stackGeo, mats.factoryBrick);
      stack.position.set(0.024, 0.038, zOff);
      const rim = new THREE.Mesh(stackRimGeo, mats.stonePlinth);
      rim.position.set(0.024, 0.075, zOff);
      group.add(stack, rim);
      chimneyOffsets.push(new THREE.Vector3(0.024, 0.08, zOff));
    }

    const silo = new THREE.Mesh(siloGeo, mats.steelSilo);
    silo.position.set(0.024, 0.03, 0);
    const siloCap = new THREE.Mesh(siloCapGeo, mats.steelSilo);
    siloCap.position.set(0.024, 0.057, 0);

    group.add(slab, hall, silo, siloCap);
    enableShadows(group);
    return {group, chimneyOffsets};
  }

  function buildPowerPlant(): {
    group: THREE.Group;
    chimneyOffsets: THREE.Vector3[];
  } {
    const group = new THREE.Group();
    addContactShadow(group, 1.16);

    const slab = new THREE.Mesh(factorySlabGeo, mats.stonePlinth);
    slab.position.y = 0.003;

    const hall = new THREE.Mesh(plantHallGeo, mats.factoryBrick);
    hall.position.set(-0.016, 0.026, 0);

    const cooling = new THREE.Mesh(coolingTowerGeo, mats.coolingConcrete);
    cooling.position.set(0.016, 0.042, 0.012);

    const collar = new THREE.Mesh(stackRimGeo, mats.hazardStripe);
    collar.scale.set(2.2, 1, 2.2);
    collar.position.set(0.016, 0.076, 0.012);

    const stack = new THREE.Mesh(plantStackGeo, mats.coolingConcrete);
    stack.position.set(0.018, 0.047, -0.02);
    const stackTop = new THREE.Mesh(stackRimGeo, mats.hazardStripe);
    stackTop.position.set(0.018, 0.09, -0.02);

    group.add(slab, hall, cooling, collar, stack, stackTop);
    enableShadows(group);
    return {
      group,
      chimneyOffsets: [
        new THREE.Vector3(0.016, 0.084, 0.012),
        new THREE.Vector3(0.018, 0.096, -0.02),
      ],
    };
  }

  function buildWaterTower(): THREE.Group {
    const group = new THREE.Group();
    addContactShadow(group, 0.95);

    const pad = new THREE.Mesh(wtPadGeo, mats.stonePlinth);
    pad.position.y = 0.003;
    group.add(pad);

    for (const lx of [-0.014, 0.014]) {
      for (const lz of [-0.014, 0.014]) {
        const leg = new THREE.Mesh(wtLegGeo, mats.steelSilo);
        leg.position.set(lx, 0.034, lz);
        leg.rotation.z = lx > 0 ? 0.1 : -0.1;
        leg.rotation.x = lz > 0 ? -0.1 : 0.1;
        group.add(leg);
      }
    }

    const tank = new THREE.Mesh(wtTankGeo, mats.waterTankBlue);
    tank.position.y = 0.078;
    const roof = new THREE.Mesh(wtRoofGeo, mats.copperRoof);
    roof.position.y = 0.1;

    group.add(tank, roof);
    enableShadows(group);
    return group;
  }

  function buildWindmill(): {
    group: THREE.Group;
    rotor: THREE.Object3D;
  } {
    const group = new THREE.Group();
    addContactShadow(group, 0.9);

    const footing = new THREE.Mesh(turbineFootingGeo, mats.stonePlinth);
    footing.position.y = 0.004;

    const tower = new THREE.Mesh(turbineTowerGeo, mats.windmillTower);
    tower.position.y = 0.008 + 0.05;

    const nacelle = new THREE.Mesh(nacelleGeo, mats.windmillTower);
    nacelle.position.set(0, 0.11, 0.0015);

    const rotor = new THREE.Group();
    rotor.position.set(0, 0.11, 0.013);

    const hub = new THREE.Mesh(hubGeo, mats.brassAccent);
    rotor.add(hub);

    for (let i = 0; i < 3; i++) {
      const bladeWrap = new THREE.Group();
      bladeWrap.rotation.z = (i * Math.PI * 2) / 3;
      const blade = new THREE.Mesh(bladeGeo, mats.windmillBlade);
      blade.rotation.y = 0.18;
      bladeWrap.add(blade);
      rotor.add(bladeWrap);
    }

    group.add(footing, tower, nacelle, rotor);
    enableShadows(group);
    return {group, rotor};
  }

  function buildTownHall(): THREE.Group {
    const group = new THREE.Group();
    addContactShadow(group, 1.2);

    const plaza = new THREE.Mesh(thPlazaGeo, mats.sidewalk);
    plaza.position.y = 0.004;

    const hall = new THREE.Mesh(thHallGeo, mats.townhallStone);
    hall.position.y = 0.008 + 0.024;

    const roof = new THREE.Mesh(thRoofGeo, mats.copperRoof);
    roof.position.y = 0.068;

    const tower = new THREE.Mesh(thTowerGeo, mats.townhallStone);
    tower.position.set(0, 0.09, -0.004);

    const spire = new THREE.Mesh(thSpireGeo, mats.copperRoof);
    spire.position.set(0, 0.135, -0.004);

    const clock = new THREE.Mesh(thClockGeo, mats.brassAccent);
    clock.position.set(0, 0.102, 0.008);

    for (const cx of [-0.018, -0.006, 0.006, 0.018]) {
      const col = new THREE.Mesh(thColumnGeo, mats.townhallStone);
      col.position.set(cx, 0.026, S * 0.34);
      group.add(col);
    }

    const door = new THREE.Mesh(doorGeo, mats.woodDoor);
    door.position.set(0, 0.018, S * 0.318);

    group.add(plaza, hall, roof, tower, spire, clock, door);
    enableShadows(group);
    return group;
  }

  function createCarGroup(colorIdx: number): THREE.Group {
    const car = new THREE.Group();
    const bodyMat = mats.carBodies[colorIdx % mats.carBodies.length];

    const chassis = new THREE.Mesh(carChassisGeo, bodyMat);
    chassis.position.y = 0.0052;
    const cabin = new THREE.Mesh(carCabinGeo, mats.glassWindow);
    cabin.position.set(0, 0.0105, -0.0015);

    car.add(chassis, cabin);
    const wheelOffsets: Array<[number, number]> = [
      [-0.007, -0.008],
      [0.007, -0.008],
      [-0.007, 0.008],
      [0.007, 0.008],
    ];
    for (const [wx, wz] of wheelOffsets) {
      const wheel = new THREE.Mesh(wheelGeo, mats.tireRubber);
      wheel.position.set(wx, 0.0028, wz);
      car.add(wheel);
    }
    enableShadows(car);
    return car;
  }

  function buildPolice(): THREE.Group {
    const group = new THREE.Group();
    addContactShadow(group, 1.05);

    const pad = new THREE.Mesh(civicBaseGeo, mats.stonePlinth);
    pad.position.y = 0.004;
    const hall = new THREE.Mesh(civicHallGeo, mats.hospitalWhite);
    hall.position.y = 0.008 + 0.022;
    const trim = new THREE.Mesh(shopParapetGeo, mats.policeBlue);
    trim.position.y = 0.052;
    const dome = new THREE.Mesh(policeDomeGeo, mats.policeBlue);
    dome.position.set(0, 0.058, 0.005);
    const antenna = new THREE.Mesh(spireGeo, mats.steelSilo);
    antenna.scale.y = 0.65;
    antenna.position.set(-0.016, 0.068, -0.014);
    const bay = new THREE.Mesh(civicGarageGeo, mats.policeBlue);
    bay.position.set(0, 0.019, S * 0.325);

    group.add(pad, hall, trim, dome, antenna, bay);
    enableShadows(group);
    return group;
  }

  function buildFireStation(): THREE.Group {
    const group = new THREE.Group();
    addContactShadow(group, 1.05);

    const pad = new THREE.Mesh(civicBaseGeo, mats.stonePlinth);
    pad.position.y = 0.004;
    const hall = new THREE.Mesh(civicHallGeo, mats.factoryBrick);
    hall.position.y = 0.008 + 0.022;
    const trim = new THREE.Mesh(shopParapetGeo, mats.fireRed);
    trim.position.y = 0.052;
    const tower = new THREE.Mesh(fireTowerGeo, mats.factoryBrick);
    tower.position.set(0.018, 0.045, -0.012);
    const cap = new THREE.Mesh(thClockGeo, mats.fireRed);
    cap.rotation.x = 0;
    cap.position.set(0.018, 0.085, -0.012);
    const bay1 = new THREE.Mesh(civicGarageGeo, mats.fireRed);
    bay1.position.set(-0.014, 0.019, S * 0.325);
    const bay2 = new THREE.Mesh(civicGarageGeo, mats.fireRed);
    bay2.position.set(0.014, 0.019, S * 0.325);

    group.add(pad, hall, trim, tower, cap, bay1, bay2);
    enableShadows(group);
    return group;
  }

  function buildSchool(): THREE.Group {
    const group = new THREE.Group();
    addContactShadow(group, 1.1);

    const lawn = new THREE.Mesh(parkLawnGeo, mats.foliageGreens[1]);
    lawn.position.y = 0.002;
    const main = new THREE.Mesh(civicHallGeo, mats.schoolBrick);
    main.position.set(0, 0.004 + 0.02, -0.006);
    const wingL = new THREE.Mesh(schoolWingGeo, mats.schoolBrick);
    wingL.position.set(-0.024, 0.02, 0.01);
    const wingR = new THREE.Mesh(schoolWingGeo, mats.schoolBrick);
    wingR.position.set(0.024, 0.02, 0.01);
    const trim = new THREE.Mesh(shopParapetGeo, mats.roofVariants[1]);
    trim.position.set(0, 0.046, -0.006);
    const clock = new THREE.Mesh(thClockGeo, mats.brassAccent);
    clock.position.set(0, 0.042, S * 0.25);

    group.add(lawn, main, wingL, wingR, trim, clock);
    enableShadows(group);
    return group;
  }

  function buildHospital(): THREE.Group {
    const group = new THREE.Group();
    addContactShadow(group, 1.15);

    const pad = new THREE.Mesh(civicBaseGeo, mats.stonePlinth);
    pad.position.y = 0.004;
    const wing = new THREE.Mesh(hospitalWingGeo, mats.hospitalWhite);
    wing.position.set(0, 0.008 + 0.041, 0);
    const heli = new THREE.Mesh(helipadGeo, mats.steelSilo);
    heli.position.set(-0.014, 0.091, 0);
    const crossV = new THREE.Mesh(crossVGeo, mats.fireRed);
    crossV.position.set(0.014, 0.072, S * 0.235);
    const crossH = new THREE.Mesh(crossHGeo, mats.fireRed);
    crossH.position.set(0.014, 0.072, S * 0.235);
    const door = new THREE.Mesh(civicGarageGeo, mats.glassWindow);
    door.position.set(0, 0.019, S * 0.235);

    group.add(pad, wing, heli, crossV, crossH, door);
    enableShadows(group);
    return group;
  }

  function buildLandmark(): THREE.Group {
    const group = new THREE.Group();
    addContactShadow(group, 1.2);

    const plaza = new THREE.Mesh(thPlazaGeo, mats.sidewalk);
    plaza.position.y = 0.004;
    const base = new THREE.Mesh(obeliskBaseGeo, mats.stonePlinth);
    base.position.y = 0.017;
    const shaft = new THREE.Mesh(obeliskShaftGeo, mats.townhallStone);
    shaft.position.y = 0.082;
    const tip = new THREE.Mesh(obeliskTipGeo, mats.goldMonument);
    tip.position.y = 0.15;

    for (const [tx, tz] of [
      [-S * 0.3, -S * 0.3],
      [S * 0.3, -S * 0.3],
      [-S * 0.3, S * 0.3],
      [S * 0.3, S * 0.3],
    ]) {
      const crown = new THREE.Mesh(crownTopGeo, mats.foliageGreens[0]);
      crown.scale.setScalar(0.7);
      crown.position.set(tx, 0.016, tz);
      group.add(crown);
    }

    group.add(plaza, base, shaft, tip);
    enableShadows(group);
    return group;
  }

  function buildTrainStation(): THREE.Group {
    const group = new THREE.Group();
    addContactShadow(group, 1.15);

    const pad = new THREE.Mesh(civicBaseGeo, mats.stonePlinth);
    pad.position.y = 0.004;
    const hall = new THREE.Mesh(
      new THREE.BoxGeometry(S * 0.72, 0.032, S * 0.32),
      mats.schoolBrick
    );
    geometries.push(hall.geometry);
    hall.position.set(0, 0.024, -S * 0.22);

    const canopy = new THREE.Mesh(stationCanopyGeo, mats.glassTowerFacade);
    canopy.position.set(0, 0.012, S * 0.14);

    const r1 = new THREE.Mesh(railTrackGeo, mats.steelSilo);
    r1.position.set(0, 0.009, S * 0.1);
    const r2 = new THREE.Mesh(railTrackGeo, mats.steelSilo);
    r2.position.set(0, 0.009, S * 0.2);

    const train = new THREE.Mesh(trainCarGeo, mats.trainYellow);
    train.position.set(-0.006, 0.018, S * 0.15);
    const roofStripe = new THREE.Mesh(
      new THREE.BoxGeometry(S * 0.42, 0.004, 0.012),
      mats.policeBlue
    );
    geometries.push(roofStripe.geometry);
    roofStripe.position.set(-0.006, 0.027, S * 0.15);

    const clock = new THREE.Mesh(thClockGeo, mats.goldMonument);
    clock.position.set(0, 0.044, -S * 0.07);

    group.add(pad, hall, canopy, r1, r2, train, roofStripe, clock);
    enableShadows(group);
    return group;
  }

  function buildSeaport(): THREE.Group {
    const group = new THREE.Group();
    addContactShadow(group, 1.2);

    const deck = new THREE.Mesh(pierDeckGeo, mats.sidewalk);
    deck.position.set(0, 0.004, -S * 0.2);

    const c1 = new THREE.Mesh(containerGeo, mats.containerColors[0]);
    c1.position.set(-0.022, 0.014, -S * 0.24);
    const c2 = new THREE.Mesh(containerGeo, mats.containerColors[1]);
    c2.position.set(-0.022, 0.028, -S * 0.24);
    const c3 = new THREE.Mesh(containerGeo, mats.containerColors[2]);
    c3.position.set(0.012, 0.014, -S * 0.2);

    const mast = new THREE.Mesh(craneMastGeo, mats.hazardStripe);
    mast.position.set(0.024, 0.035, -S * 0.08);
    const boom = new THREE.Mesh(craneBoomGeo, mats.hazardStripe);
    boom.position.set(0.012, 0.06, 0.002);
    boom.rotation.y = Math.PI / 2;

    const barge = new THREE.Mesh(bargeHullGeo, mats.factoryBrick);
    barge.position.set(-0.005, 0.007, S * 0.22);
    const bargeBox = new THREE.Mesh(containerGeo, mats.containerColors[1]);
    bargeBox.position.set(-0.005, 0.018, S * 0.22);

    group.add(deck, c1, c2, c3, mast, boom, barge, bargeBox);
    enableShadows(group);
    return group;
  }

  function buildAirport(): {group: THREE.Group; rotor: THREE.Object3D} {
    const group = new THREE.Group();
    addContactShadow(group, 1.3);

    const tarmac = new THREE.Mesh(civicBaseGeo, mats.tarmacDark);
    tarmac.position.y = 0.004;

    const runway = new THREE.Mesh(runwayStripGeo, mats.asphalt);
    runway.position.set(0, 0.007, S * 0.2);
    for (const sx of [-0.028, -0.008, 0.012, 0.032]) {
      const stripe = new THREE.Mesh(runwayStripeGeo, mats.roadStripe);
      stripe.position.set(sx, 0.008, S * 0.2);
      group.add(stripe);
    }

    const terminal = new THREE.Mesh(hangarGeo, mats.hospitalWhite);
    terminal.position.set(-0.018, 0.02, -S * 0.18);
    const termGlass = new THREE.Mesh(shopWindowGeo, mats.glassTowerFacade);
    termGlass.scale.set(0.55, 0.7, 1);
    termGlass.position.set(-0.018, 0.02, -S * 0.04);

    const shaft = new THREE.Mesh(atcShaftGeo, mats.steelSilo);
    shaft.position.set(0.024, 0.042, -S * 0.18);
    const pod = new THREE.Mesh(atcPodGeo, mats.glassTowerFacade);
    pod.position.set(0.024, 0.08, -S * 0.18);

    const rotor = new THREE.Group();
    rotor.position.set(0.024, 0.092, -S * 0.18);
    const dish = new THREE.Mesh(radarDishGeo, mats.goldMonument);
    rotor.add(dish);

    const jet = new THREE.Mesh(jetBodyGeo, mats.hospitalWhite);
    jet.position.set(-0.01, 0.013, S * 0.2);
    const wing = new THREE.Mesh(jetWingGeo, mats.policeBlue);
    wing.position.set(-0.012, 0.013, S * 0.2);

    group.add(tarmac, runway, terminal, termGlass, shaft, pod, rotor, jet, wing);
    enableShadows(group);
    return {group, rotor};
  }

  function buildSolarPlant(): THREE.Group {
    const group = new THREE.Group();
    addContactShadow(group, 1.15);

    const pad = new THREE.Mesh(civicBaseGeo, mats.stonePlinth);
    pad.position.y = 0.004;

    const tower = new THREE.Mesh(solarTowerGeo, mats.windmillTower);
    tower.position.set(0, 0.034, -0.02);
    const collector = new THREE.Mesh(thClockGeo, mats.floodlightGlow);
    collector.position.set(0, 0.064, -0.02);

    for (const px of [-0.022, 0.003, 0.026]) {
      for (const pz of [0.004, 0.024]) {
        const post = new THREE.Mesh(solarPostGeo, mats.steelSilo);
        post.position.set(px, 0.011, pz);
        const panel = new THREE.Mesh(solarPanelGeo, mats.solarPanelBlue);
        panel.position.set(px, 0.016, pz);
        panel.rotation.x = 0.36;
        group.add(post, panel);
      }
    }

    group.add(pad, tower, collector);
    enableShadows(group);
    return group;
  }

  function buildNuclearPlant(): {
    group: THREE.Group;
    chimneyOffsets: THREE.Vector3[];
  } {
    const group = new THREE.Group();
    addContactShadow(group, 1.25);

    const pad = new THREE.Mesh(civicBaseGeo, mats.stonePlinth);
    pad.position.y = 0.004;

    const base = new THREE.Mesh(nuclearBaseGeo, mats.hospitalWhite);
    base.position.set(-0.016, 0.021, 0.012);
    const dome = new THREE.Mesh(nuclearDomeGeo, mats.copperRoof);
    dome.position.set(-0.016, 0.034, 0.012);

    const t1 = new THREE.Mesh(nuclearCoolGeo, mats.coolingConcrete);
    t1.position.set(0.018, 0.044, -0.016);
    const t2 = new THREE.Mesh(nuclearCoolGeo, mats.coolingConcrete);
    t2.position.set(0.02, 0.044, 0.018);

    const rim1 = new THREE.Mesh(stackRimGeo, mats.hazardStripe);
    rim1.scale.setScalar(1.9);
    rim1.position.set(0.018, 0.079, -0.016);
    const rim2 = new THREE.Mesh(stackRimGeo, mats.hazardStripe);
    rim2.scale.setScalar(1.9);
    rim2.position.set(0.02, 0.079, 0.018);

    group.add(pad, base, dome, t1, t2, rim1, rim2);
    enableShadows(group);
    return {
      group,
      chimneyOffsets: [
        new THREE.Vector3(0.018, 0.086, -0.016),
        new THREE.Vector3(0.02, 0.086, 0.018),
      ],
    };
  }

  function buildUniversity(): THREE.Group {
    const group = new THREE.Group();
    addContactShadow(group, 1.2);

    const lawn = new THREE.Mesh(parkLawnGeo, mats.foliageGreens[0]);
    lawn.position.y = 0.002;
    const hall = new THREE.Mesh(uniMainGeo, mats.townhallStone);
    hall.position.set(0, 0.026, -0.014);
    const wingL = new THREE.Mesh(schoolWingGeo, mats.schoolBrick);
    wingL.position.set(-0.024, 0.022, 0.012);
    const wingR = new THREE.Mesh(schoolWingGeo, mats.schoolBrick);
    wingR.position.set(0.024, 0.022, 0.012);
    const dome = new THREE.Mesh(uniDomeGeo, mats.copperRoof);
    dome.position.set(0, 0.048, -0.012);
    const spire = new THREE.Mesh(uniSpireGeo, mats.goldMonument);
    spire.position.set(0, 0.072, -0.012);

    group.add(lawn, hall, wingL, wingR, dome, spire);
    enableShadows(group);
    return group;
  }

  function buildStadium(): THREE.Group {
    const group = new THREE.Group();
    addContactShadow(group, 1.25);

    const pad = new THREE.Mesh(civicBaseGeo, mats.sidewalk);
    pad.position.y = 0.004;
    const bowl = new THREE.Mesh(stadiumBowlGeo, mats.stadiumWhite);
    bowl.position.y = 0.021;
    const pitch = new THREE.Mesh(stadiumPitchGeo, mats.stadiumTurf);
    pitch.position.y = 0.022;

    for (const [fx, fz] of [
      [-0.03, -0.03],
      [0.03, -0.03],
      [-0.03, 0.03],
      [0.03, 0.03],
    ]) {
      const pole = new THREE.Mesh(floodPoleGeo, mats.steelSilo);
      pole.position.set(fx, 0.032, fz);
      const lamp = new THREE.Mesh(floodHeadGeo, mats.floodlightGlow);
      lamp.position.set(fx, 0.056, fz);
      lamp.lookAt(0, 0.02, 0);
      group.add(pole, lamp);
    }

    group.add(pad, bowl, pitch);
    enableShadows(group);
    return group;
  }

  function buildMesh(
    type: BuildingType,
    variant: number,
    roadMask: number,
    col: number,
    row: number,
    isBridge = false,
    density: 1 | 2 | 3 = 1
  ): AnimatedBuildingHandle {
    let group: THREE.Group;
    let rotor: THREE.Object3D | undefined;
    let fountainSpire: THREE.Object3D | undefined;
    let chimneyWorldOffsets: THREE.Vector3[] | undefined;

    if (type === 'road') {
      group = buildRoad(roadMask, isBridge);
    } else if (type === 'trainstation') {
      group = buildTrainStation();
    } else if (type === 'seaport') {
      group = buildSeaport();
    } else if (type === 'airport') {
      const ap = buildAirport();
      group = ap.group;
      rotor = ap.rotor;
    } else if (type === 'house') {
      group = buildHouse(variant, density);
    } else if (type === 'shop') {
      group = buildShop(variant, density);
    } else if (type === 'park') {
      const p = buildPark(variant);
      group = p.group;
      fountainSpire = p.fountainSpire;
    } else if (type === 'factory') {
      const f = buildFactory();
      group = f.group;
      chimneyWorldOffsets = f.chimneyOffsets;
      if (density === 3) {
        group.scale.set(1.06, 1.32, 1.06);
      } else if (density === 2) {
        group.scale.set(1.02, 1.15, 1.02);
      }
    } else if (type === 'solarplant') {
      group = buildSolarPlant();
    } else if (type === 'powerplant') {
      const pp = buildPowerPlant();
      group = pp.group;
      chimneyWorldOffsets = pp.chimneyOffsets;
    } else if (type === 'nuclear') {
      const np = buildNuclearPlant();
      group = np.group;
      chimneyWorldOffsets = np.chimneyOffsets;
    } else if (type === 'watertower') {
      group = buildWaterTower();
    } else if (type === 'police') {
      group = buildPolice();
    } else if (type === 'firestation') {
      group = buildFireStation();
    } else if (type === 'school') {
      group = buildSchool();
    } else if (type === 'university') {
      group = buildUniversity();
    } else if (type === 'hospital') {
      group = buildHospital();
    } else if (type === 'stadium') {
      group = buildStadium();
    } else if (type === 'landmark') {
      group = buildLandmark();
    } else if (type === 'windmill') {
      const w = buildWindmill();
      group = w.group;
      rotor = w.rotor;
    } else {
      group = buildTownHall();
    }

    return {
      type,
      col,
      row,
      group,
      rotor,
      fountainSpire,
      chimneyWorldOffsets,
      popProgress: 0,
    };
  }

  return {
    buildTerrainTileMesh,
    buildMesh,
    createCarGroup,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
    },
  };
}
