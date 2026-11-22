import * as THREE from 'three';

import {GRID_SIZE, TERRAIN_HEIGHTS, TILE_SIZE} from '../constants';
import type {CityState, TrafficDensity} from '../types';
import {getTile} from './cityRules';
import type {BuildingGeometryCache} from './buildingModels';

interface CarAgent {
  mesh: THREE.Group;
  col: number;
  row: number;
  prevCol: number;
  prevRow: number;
  targetCol: number;
  targetRow: number;
  progress: number;
  speed: number;
}

export function tileCenterLocal(
  col: number,
  row: number,
  gridSize = GRID_SIZE
): [number, number] {
  const half = (gridSize * TILE_SIZE) / 2;
  const x = -half + (col + 0.5) * TILE_SIZE;
  const z = -half + (row + 0.5) * TILE_SIZE;
  return [x, z];
}

function tileRoadSurfaceY(state: CityState, col: number, row: number): number {
  const t = getTile(state, col, row);
  if (!t) return TERRAIN_HEIGHTS.grass;
  if (t.terrain === 'water') return 0.016; // Bridge deck height
  return TERRAIN_HEIGHTS[t.terrain];
}

const MAX_CARS = 16;

export class TrafficSystem {
  readonly group = new THREE.Group();
  private agents: CarAgent[] = [];
  private roadSignature = '';
  private desiredCars = 9;

  constructor(builder: BuildingGeometryCache) {
    this.group.name = 'Autonomous Traffic';
    for (let i = 0; i < MAX_CARS; i++) {
      const mesh = builder.createCarGroup(i);
      mesh.visible = false;
      this.group.add(mesh);
      this.agents.push({
        mesh,
        col: 0,
        row: 0,
        prevCol: 0,
        prevRow: 0,
        targetCol: 0,
        targetRow: 0,
        progress: 0,
        speed: 1.55 + (i % 4) * 0.25,
      });
    }
  }

  private getTargetCount(density: TrafficDensity): number {
    if (density === 'low') return 4;
    if (density === 'busy') return MAX_CARS;
    return 9;
  }

  syncWithCity(state: CityState): void {
    const roadTiles = state.tiles.filter((t) => t.building === 'road');
    const density = state.settings.trafficDensity;
    this.desiredCars = this.getTargetCount(density);

    const sig = `${roadTiles.map((t) => `${t.col},${t.row}`).join(';')}|${density}`;
    if (sig === this.roadSignature) return;
    this.roadSignature = sig;

    if (roadTiles.length < 2) {
      for (const a of this.agents) a.mesh.visible = false;
      return;
    }

    const activeCount = Math.min(
      this.desiredCars,
      Math.max(2, Math.floor(roadTiles.length * 0.7))
    );

    for (let i = 0; i < this.agents.length; i++) {
      const a = this.agents[i];
      if (i >= activeCount) {
        a.mesh.visible = false;
        continue;
      }

      const currentTile = getTile(state, a.col, a.row);
      if (!a.mesh.visible || currentTile?.building !== 'road') {
        const seedTile = roadTiles[(i * 3) % roadTiles.length];
        a.col = seedTile.col;
        a.row = seedTile.row;
        a.prevCol = seedTile.col;
        a.prevRow = seedTile.row;
        a.targetCol = seedTile.col;
        a.targetRow = seedTile.row;
        a.progress = 1;
        this.pickNextTarget(a, state);
      }
      a.mesh.visible = true;
    }
  }

  private pickNextTarget(agent: CarAgent, state: CityState): void {
    const dirs: Array<[number, number]> = [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ];
    const neighbors: Array<{col: number; row: number}> = [];
    for (const [dc, dr] of dirs) {
      const nc = agent.col + dc;
      const nr = agent.row + dr;
      if (getTile(state, nc, nr)?.building === 'road') {
        neighbors.push({col: nc, row: nr});
      }
    }

    if (neighbors.length === 0) {
      agent.targetCol = agent.col;
      agent.targetRow = agent.row;
      agent.progress = 0;
      return;
    }

    const nonReverse = neighbors.filter(
      (n) => !(n.col === agent.prevCol && n.row === agent.prevRow)
    );
    const pool = nonReverse.length > 0 ? nonReverse : neighbors;
    const pick =
      pool[Math.floor((agent.col * 7 + agent.row * 13 + performance.now() * 0.01) % pool.length)];

    agent.prevCol = agent.col;
    agent.prevRow = agent.row;
    agent.targetCol = pick.col;
    agent.targetRow = pick.row;
    agent.progress = 0;
  }

  update(dt: number, state: CityState, speedMultiplier: number): void {
    const step = dt * speedMultiplier;
    for (const a of this.agents) {
      if (!a.mesh.visible) continue;

      a.progress += step * a.speed;
      if (a.progress >= 1) {
        a.col = a.targetCol;
        a.row = a.targetRow;
        this.pickNextTarget(a, state);
      }

      const [sx, sz] = tileCenterLocal(a.col, a.row, state.gridSize);
      const [ex, ez] = tileCenterLocal(a.targetCol, a.targetRow, state.gridSize);
      const sy = tileRoadSurfaceY(state, a.col, a.row);
      const ey = tileRoadSurfaceY(state, a.targetCol, a.targetRow);

      const t = Math.min(1, a.progress);
      const x = THREE.MathUtils.lerp(sx, ex, t);
      const y = THREE.MathUtils.lerp(sy, ey, t);
      const z = THREE.MathUtils.lerp(sz, ez, t);

      const dx = ex - sx;
      const dz = ez - sz;
      const len = Math.hypot(dx, dz);
      let laneX = 0;
      let laneZ = 0;
      if (len > 0.0001) {
        laneX = (-dz / len) * (TILE_SIZE * 0.14);
        laneZ = (dx / len) * (TILE_SIZE * 0.14);
        a.mesh.rotation.y = Math.atan2(dx, dz);
      }

      a.mesh.position.set(x + laneX, y + 0.0028, z + laneZ);
    }
  }
}
