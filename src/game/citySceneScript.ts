import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import * as xb from 'xrblocks';

import {
  BOARD_SPAN,
  GRID_SIZE,
  PLINTH_HEIGHT,
  PLINTH_SIZE,
  TERRAIN_HEIGHTS,
  TILE_SIZE,
} from '../constants';
import type {
  CityMetrics,
  CityState,
  GamePhase,
  TimeOfDay,
} from '../types';
import {
  canPlaceOnTile,
  getRoadNeighborsMask,
  getTerrainHeightY,
  getTile,
  getTileDataOverlayColor,
  isTerrainTool,
} from './cityRules';
import {
  type AnimatedBuildingHandle,
  type BuildingGeometryCache,
  createBuildingBuilder,
} from './buildingModels';
import {ParticlePool} from './particlePool';
import {
  type CityMaterialLibrary,
  createCityMaterialLibrary,
} from './proceduralMaterials';
import {TrafficSystem, tileCenterLocal} from './trafficSystem';

const _localHit = new THREE.Vector3();
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _lookMat = new THREE.Matrix4();
const _targetQuat = new THREE.Quaternion();
const _upVec = new THREE.Vector3(0, 1, 0);

export interface CitySceneCallbacks {
  onTileHover: (col: number | null, row: number | null) => void;
  onTileClick: (col: number, row: number) => void;
}

class CityBoardSurface extends xb.MeshScript<
  THREE.PlaneGeometry,
  THREE.MeshBasicMaterial
> {
  private readonly callbacks: CitySceneCallbacks;

  constructor(
    material: THREE.MeshBasicMaterial,
    callbacks: CitySceneCallbacks
  ) {
    const geo = new THREE.PlaneGeometry(BOARD_SPAN, BOARD_SPAN, 1, 1);
    geo.rotateX(-Math.PI / 2);
    super(geo, material);
    this.name = 'City terrain surface';
    this.position.y = 0.015;
    this.callbacks = callbacks;
  }

  private resolveGridCell(
    point: THREE.Vector3 | undefined
  ): {col: number; row: number} | null {
    if (!point) return null;
    _localHit.copy(point);
    this.worldToLocal(_localHit);
    const half = BOARD_SPAN / 2;
    const col = Math.floor((_localHit.x + half) / TILE_SIZE);
    const row = Math.floor((_localHit.z + half) / TILE_SIZE);
    if (col < 0 || col >= GRID_SIZE || row < 0 || row >= GRID_SIZE) {
      return null;
    }
    return {col, row};
  }

  onHovering(event: xb.HoverEvent): void {
    const cell = this.resolveGridCell(event.intersection?.point);
    if (cell) {
      this.callbacks.onTileHover(cell.col, cell.row);
    } else {
      this.callbacks.onTileHover(null, null);
    }
    event.stopPropagation();
  }

  onHoverExit(event: xb.HoverEvent): void {
    this.callbacks.onTileHover(null, null);
    event.stopPropagation();
  }

  onObjectSelectStart(event: xb.SelectEvent): void {
    const cell = this.resolveGridCell(event.intersection?.point);
    if (cell) {
      this.callbacks.onTileClick(cell.col, cell.row);
    }
    event.stopPropagation();
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

export class CitySceneScript extends xb.Script {
  private readonly isSoftwareGl: boolean;
  private readonly callbacks: CitySceneCallbacks;

  private mats!: CityMaterialLibrary;
  private builder!: BuildingGeometryCache;
  private particles!: ParticlePool;
  private traffic!: TrafficSystem;

  private boardRoot = new THREE.Group();
  private boardSurface!: CityBoardSurface;
  private terrainGroup = new THREE.Group();
  private overlayGroup = new THREE.Group();
  private buildingsGroup = new THREE.Group();
  private hoverGroup = new THREE.Group();
  private hoverCursorMesh!: THREE.Mesh;
  private hoverCursorMat!: THREE.MeshBasicMaterial;
  private ghostMaterial!: THREE.MeshStandardMaterial;
  private ghostGroup: THREE.Group | null = null;
  private ghostToolKey = '';

  private skyGroup = new THREE.Group();
  private skyDomeMat?: THREE.ShaderMaterial;
  private hemiLight!: THREE.HemisphereLight;
  private sunLight!: THREE.DirectionalLight;
  private rimLight!: THREE.DirectionalLight;
  private envRenderTarget: THREE.WebGLRenderTarget | null = null;

  private terrainMeshes = new Map<string, {terrain: string; group: THREE.Group}>();
  private overlayGeo?: THREE.PlaneGeometry;
  private overlayMeshes = new Map<
    string,
    {mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial}
  >();
  private handles = new Map<string, AnimatedBuildingHandle>();
  private stateRef: CityState | null = null;
  private phase: GamePhase = 'title';
  private hoveredCell: {col: number; row: number} | null = null;
  private activeTimeOfDay: TimeOfDay = 'day';

  private boardYaw = 0;
  private boardTargetYaw = 0;
  private skyMode: 'sky' | 'ar' = 'sky';
  private cameraSettling = false;
  private userMovedCamera = false;
  private titleOrbitAngle = 0.35;
  private smokeTimer = 0;
  private elapsedClock = 0;
  private lastFrameMs = performance.now();

  private plaqueCard?: xb.UICard;
  private plaqueTierText?: xb.UIText;
  private plaquePopText?: xb.UIText;
  private plaqueBudgetText?: xb.UIText;

  constructor(isSoftwareGl: boolean, callbacks: CitySceneCallbacks) {
    super();
    this.isSoftwareGl = isSoftwareGl;
    this.callbacks = callbacks;
  }

  init(): void {
    const renderer = xb.core.renderer as THREE.WebGLRenderer;
    const maxAniso = renderer?.capabilities?.getMaxAnisotropy?.() ?? 4;

    if (renderer) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
      renderer.setPixelRatio(
        this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
      );
      if (renderer.shadowMap) {
        renderer.shadowMap.enabled = !this.isSoftwareGl;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      }

      if (typeof renderer.getContext === 'function') {
        const pmrem = new THREE.PMREMGenerator(renderer);
        this.envRenderTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
        xb.core.scene.environment = this.envRenderTarget.texture;
        pmrem.dispose();
      }
    }

    this.mats = createCityMaterialLibrary(maxAniso);
    this.builder = createBuildingBuilder(this.mats);
    this.particles = new ParticlePool();
    this.traffic = new TrafficSystem(this.builder);

    this.setupLighting();
    this.setupSkyDome();
    this.setupBoardDiorama();
    this.setupSpatialPlaque();
    this.applyTimeOfDay('day');

    window.addEventListener('pointerdown', this.onUserPointerInteract);
    window.addEventListener('keydown', this.onUserKeyInteract);
  }

  private onUserPointerInteract = (e: PointerEvent): void => {
    if (
      e.button === 2 &&
      (this.phase === 'playing' || this.phase === 'mapmaker')
    ) {
      this.cameraSettling = false;
      this.userMovedCamera = true;
    }
  };

  private onUserKeyInteract = (e: KeyboardEvent): void => {
    if (
      (this.phase === 'playing' || this.phase === 'mapmaker') &&
      [
        'KeyW',
        'KeyA',
        'KeyS',
        'KeyD',
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
      ].includes(e.code)
    ) {
      this.cameraSettling = false;
      this.userMovedCamera = true;
    }
  };

  private setupLighting(): void {
    this.hemiLight = new THREE.HemisphereLight(0xc4e2ff, 0x5c6e4e, 0.85);
    this.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff1d4, 1.85);
    this.sunLight.position.set(1.8, 3.4, 1.1);
    this.sunLight.target.position.set(0, 0.92, -1.08);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 8;
    this.sunLight.shadow.camera.left = -1.0;
    this.sunLight.shadow.camera.right = 1.0;
    this.sunLight.shadow.camera.top = 1.0;
    this.sunLight.shadow.camera.bottom = -1.0;
    this.sunLight.shadow.bias = -0.0006;
    this.sunLight.shadow.normalBias = 0.02;
    this.add(this.sunLight, this.sunLight.target);

    this.rimLight = new THREE.DirectionalLight(0xa5ccf5, 0.65);
    this.rimLight.position.set(-1.8, 1.8, -2.5);
    this.add(this.rimLight);
  }

  private setupSkyDome(): void {
    this.skyGroup.name = 'Sky backdrop';
    this.skyGroup.xb = {pointerEvents: 'none'};

    const skyGeo = new THREE.SphereGeometry(28, 24, 16);
    this.skyDomeMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTopColor: {value: new THREE.Color(0x4b87c8)},
        uHorizonColor: {value: new THREE.Color(0xdceaf5)},
        uBottomColor: {value: new THREE.Color(0x9fb8c9)},
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uBottomColor;
        varying vec3 vWorldPos;
        void main() {
          float h = normalize(vWorldPos).y;
          vec3 col = h >= 0.0
            ? mix(uHorizonColor, uTopColor, pow(clamp(h, 0.0, 1.0), 0.58))
            : mix(uHorizonColor, uBottomColor, clamp(-h * 2.5, 0.0, 1.0));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const dome = new THREE.Mesh(skyGeo, this.skyDomeMat);
    dome.renderOrder = -100;
    dome.xb = {pointerEvents: 'none'};
    this.skyGroup.add(dome);
    this.add(this.skyGroup);
  }

  applyTimeOfDay(time: TimeOfDay): void {
    this.activeTimeOfDay = time;
    if (!this.skyDomeMat || !this.hemiLight || !this.sunLight) return;

    const u = this.skyDomeMat.uniforms;
    const renderer = xb.core.renderer as THREE.WebGLRenderer;

    if (time === 'morning') {
      u.uTopColor.value.setHex(0x6398d6);
      u.uHorizonColor.value.setHex(0xfce1c2);
      u.uBottomColor.value.setHex(0x9cb1c4);
      this.sunLight.position.set(2.4, 2.2, 0.8);
      this.sunLight.color.setHex(0xffe0b2);
      this.sunLight.intensity = 1.75;
      this.hemiLight.color.setHex(0xd8ecff);
      this.hemiLight.groundColor.setHex(0x6c684f);
      this.hemiLight.intensity = 0.85;
      this.mats.setWindowEmissive(0.45);
      if (renderer) renderer.toneMappingExposure = 1.02;
    } else if (time === 'sunset') {
      u.uTopColor.value.setHex(0x3b4878);
      u.uHorizonColor.value.setHex(0xf29f6d);
      u.uBottomColor.value.setHex(0x52455e);
      this.sunLight.position.set(-2.3, 1.65, 1.2);
      this.sunLight.color.setHex(0xff9f5c);
      this.sunLight.intensity = 1.65;
      this.hemiLight.color.setHex(0xe8a990);
      this.hemiLight.groundColor.setHex(0x3f3b4a);
      this.hemiLight.intensity = 0.72;
      this.mats.setWindowEmissive(1.25);
      if (renderer) renderer.toneMappingExposure = 0.96;
    } else if (time === 'night') {
      u.uTopColor.value.setHex(0x0b1526);
      u.uHorizonColor.value.setHex(0x1b2d47);
      u.uBottomColor.value.setHex(0x09111c);
      this.sunLight.position.set(-1.4, 2.8, -1.2);
      this.sunLight.color.setHex(0x88b4f0);
      this.sunLight.intensity = 0.65;
      this.hemiLight.color.setHex(0x3b5882);
      this.hemiLight.groundColor.setHex(0x19232f);
      this.hemiLight.intensity = 0.55;
      this.mats.setWindowEmissive(2.2);
      if (renderer) renderer.toneMappingExposure = 0.95;
    } else {
      // Bright Day
      u.uTopColor.value.setHex(0x4b87c8);
      u.uHorizonColor.value.setHex(0xdceaf5);
      u.uBottomColor.value.setHex(0x9fb8c9);
      this.sunLight.position.set(1.8, 3.4, 1.1);
      this.sunLight.color.setHex(0xfff1d4);
      this.sunLight.intensity = 1.85;
      this.hemiLight.color.setHex(0xc4e2ff);
      this.hemiLight.groundColor.setHex(0x5c6e4e);
      this.hemiLight.intensity = 0.85;
      this.mats.setWindowEmissive(0.35);
      if (renderer) renderer.toneMappingExposure = 1.0;
    }
  }

  private setupBoardDiorama(): void {
    this.boardRoot.name = 'City Diorama';
    this.boardRoot.position.set(0, 0.92, -1.08);
    this.add(this.boardRoot);

    const plinthGroup = new THREE.Group();
    plinthGroup.name = 'Architectural Plinth';
    plinthGroup.xb = {pointerEvents: 'none'};

    const trayGeo = new THREE.BoxGeometry(PLINTH_SIZE, PLINTH_HEIGHT, PLINTH_SIZE);
    const tray = new THREE.Mesh(trayGeo, this.mats.walnutFrame);
    tray.position.y = -PLINTH_HEIGHT / 2 - 0.004;
    tray.receiveShadow = true;
    tray.castShadow = true;
    plinthGroup.add(tray);

    const skirtGeo = new THREE.CylinderGeometry(
      PLINTH_SIZE * 0.62,
      PLINTH_SIZE * 0.42,
      0.16,
      4
    );
    skirtGeo.rotateY(Math.PI / 4);
    const skirt = new THREE.Mesh(skirtGeo, this.mats.walnutFrame);
    skirt.position.y = -PLINTH_HEIGHT - 0.08;
    plinthGroup.add(skirt);

    const bracketGeo = new THREE.BoxGeometry(
      0.065,
      PLINTH_HEIGHT + 0.01,
      0.065
    );
    const cornerOffset = PLINTH_SIZE / 2 - 0.025;
    for (const cx of [-1, 1]) {
      for (const cz of [-1, 1]) {
        const bracket = new THREE.Mesh(bracketGeo, this.mats.brassAccent);
        bracket.position.set(
          cx * cornerOffset,
          -PLINTH_HEIGHT / 2 - 0.002,
          cz * cornerOffset
        );
        plinthGroup.add(bracket);
      }
    }

    const rimThick = 0.025;
    const rimH = 0.022;
    const rimNSGeo = new THREE.BoxGeometry(PLINTH_SIZE, rimH, rimThick);
    const rimEWGeo = new THREE.BoxGeometry(rimThick, rimH, BOARD_SPAN);
    const rimN = new THREE.Mesh(rimNSGeo, this.mats.walnutFrame);
    rimN.position.set(0, rimH / 2 - 0.004, -(BOARD_SPAN + rimThick) / 2);
    const rimS = new THREE.Mesh(rimNSGeo, this.mats.walnutFrame);
    rimS.position.set(0, rimH / 2 - 0.004, (BOARD_SPAN + rimThick) / 2);
    const rimE = new THREE.Mesh(rimEWGeo, this.mats.walnutFrame);
    rimE.position.set((BOARD_SPAN + rimThick) / 2, rimH / 2 - 0.004, 0);
    const rimW = new THREE.Mesh(rimEWGeo, this.mats.walnutFrame);
    rimW.position.set(-(BOARD_SPAN + rimThick) / 2, rimH / 2 - 0.004, 0);
    plinthGroup.add(rimN, rimS, rimE, rimW);

    this.boardRoot.add(plinthGroup);

    // Invisible raycast target plane over the grid
    const raycastMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.boardSurface = new CityBoardSurface(raycastMat, this.callbacks);
    this.boardRoot.add(this.boardSurface);

    this.terrainGroup.name = 'Sculpted Terrain';
    this.terrainGroup.xb = {pointerEvents: 'none'};
    this.overlayGroup.name = 'Data Map Overlay';
    this.overlayGroup.xb = {pointerEvents: 'none'};
    this.buildingsGroup.name = 'Buildings';
    this.buildingsGroup.xb = {pointerEvents: 'none'};
    this.traffic.group.xb = {pointerEvents: 'none'};
    this.particles.mesh.xb = {pointerEvents: 'none'};
    this.hoverGroup.xb = {pointerEvents: 'none'};

    this.overlayGeo = new THREE.PlaneGeometry(TILE_SIZE * 0.94, TILE_SIZE * 0.94);
    this.overlayGeo.rotateX(-Math.PI / 2);

    this.boardRoot.add(
      this.terrainGroup,
      this.overlayGroup,
      this.buildingsGroup,
      this.traffic.group,
      this.particles.mesh,
      this.hoverGroup
    );

    const cursorGeo = new THREE.PlaneGeometry(TILE_SIZE * 0.96, TILE_SIZE * 0.96);
    cursorGeo.rotateX(-Math.PI / 2);
    this.hoverCursorMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.hoverCursorMesh = new THREE.Mesh(cursorGeo, this.hoverCursorMat);
    this.hoverCursorMesh.position.y = 0.005;
    this.hoverGroup.add(this.hoverCursorMesh);
    this.hoverGroup.visible = false;

    this.ghostMaterial = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.55,
      roughness: 0.4,
      depthWrite: false,
    });
  }

  private setupSpatialPlaque(): void {
    this.plaqueTierText = new xb.UIText({
      text: 'Dorp',
      pointerEvents: 'none',
      style: {fontSize: 16, fontWeight: 'bold', color: '#f5b942'},
    });
    this.plaquePopText = new xb.UIText({
      text: 'Inw: 32 · 80%',
      pointerEvents: 'none',
      style: {fontSize: 12, color: '#e2e8f0'},
    });
    this.plaqueBudgetText = new xb.UIText({
      text: 'Budget: €1250',
      pointerEvents: 'none',
      style: {fontSize: 13, fontWeight: 'bold', color: '#34d399'},
    });

    this.plaqueCard = new xb.UICard({
      size: {width: 0.24, height: 'auto'},
      pointerEvents: 'none',
      style: {
        flexDirection: 'column',
        gap: 3,
        padding: 10,
        backgroundColor: 'rgba(18, 24, 33, 0.9)',
        borderRadius: 12,
      },
      children: [
        new xb.UIText({
          text: 'STADBOUWER 3000',
          pointerEvents: 'none',
          style: {fontSize: 10, fontWeight: 'bold', color: '#94a3b8'},
        }),
        this.plaqueTierText,
        this.plaquePopText,
        this.plaqueBudgetText,
      ],
    });
    this.plaqueCard.name = 'Spatial city plaque';
    this.plaqueCard.position.set(BOARD_SPAN * 0.69, 0.23, -BOARD_SPAN * 0.28);
    this.plaqueCard.rotation.y = -0.38;
    this.boardRoot.add(this.plaqueCard);
  }

  onSimulatorStarted(): void {
    this.applyTitleCameraPose(true);
  }

  onXRSessionStarted(): void {
    const blend = xb.core.environmentBlendMode;
    if (blend && blend !== 'opaque') {
      this.setSkyMode('ar');
    }
  }

  setSkyMode(mode: 'sky' | 'ar'): void {
    this.skyMode = mode;
    this.skyGroup.visible = mode === 'sky';
    if (xb.core.transition) {
      if (mode === 'ar') {
        xb.core.transition.toAR();
      } else {
        xb.core.transition.toVR({color: 0xc8dff4, targetAlpha: 0.15});
      }
    }
  }

  getSkyMode(): 'sky' | 'ar' {
    return this.skyMode;
  }

  rotateBoard(stepQuarter = 1): void {
    this.boardTargetYaw += stepQuarter * (Math.PI / 4);
  }

  setPhase(phase: GamePhase): void {
    const prev = this.phase;
    this.phase = phase;
    if (phase === 'title') {
      this.hoverGroup.visible = false;
      this.userMovedCamera = false;
      this.cameraSettling = false;
    } else if (
      (phase === 'playing' || phase === 'mapmaker') &&
      prev === 'title'
    ) {
      this.cameraSettling = true;
      this.userMovedCamera = false;
    }
  }

  syncCity(
    state: CityState,
    metrics: CityMetrics,
    changedCell?: {
      col: number;
      row: number;
      action: 'placed' | 'demolished' | 'terrain' | 'none';
    }
  ): void {
    this.stateRef = state;

    if (state.settings.timeOfDay !== this.activeTimeOfDay) {
      this.applyTimeOfDay(state.settings.timeOfDay);
    }

    if (this.plaqueTierText) {
      this.plaqueTierText.text = `${state.settings.cityName} · ${metrics.tierName}`;
    }
    if (this.plaquePopText) {
      this.plaquePopText.text = `Inw: ${metrics.population} · ${metrics.happiness}%`;
    }
    if (this.plaqueBudgetText) {
      this.plaqueBudgetText.text = `Budget: €${Math.round(state.budget)}`;
      this.plaqueBudgetText.style.color =
        state.budget >= 0 ? '#34d399' : '#f87171';
    }

    // Reconcile terrain blocks
    for (const tile of state.tiles) {
      const key = `${tile.col},${tile.row}`;
      const existingTerr = this.terrainMeshes.get(key);
      if (!existingTerr || existingTerr.terrain !== tile.terrain) {
        if (existingTerr) {
          this.terrainGroup.remove(existingTerr.group);
        }
        const terrGroup = this.builder.buildTerrainTileMesh(
          tile.terrain,
          tile.variant,
          tile.col,
          tile.row
        );
        const [lx, lz] = tileCenterLocal(tile.col, tile.row, state.gridSize);
        terrGroup.position.set(lx, 0, lz);
        this.terrainGroup.add(terrGroup);
        this.terrainMeshes.set(key, {terrain: tile.terrain, group: terrGroup});
      }
    }

    // Reconcile buildings & bridges
    for (const tile of state.tiles) {
      const key = `${tile.col},${tile.row}`;
      const existing = this.handles.get(key);
      const baseY =
        tile.building === 'road' && tile.terrain === 'water'
          ? 0.002
          : getTerrainHeightY(tile.terrain);

      if (!tile.building) {
        if (existing) {
          this.buildingsGroup.remove(existing.group);
          this.handles.delete(key);
        }
        continue;
      }

      const roadMask =
        tile.building === 'road'
          ? getRoadNeighborsMask(state, tile.col, tile.row)
          : 0;
      const isBridge = tile.building === 'road' && tile.terrain === 'water';
      const tileDensity = tile.density || 1;

      const needsRebuild =
        !existing ||
        existing.type !== tile.building ||
        (tile.building === 'road' &&
          (existing.group.userData.roadMask !== roadMask ||
            existing.group.userData.isBridge !== isBridge)) ||
        existing.group.userData.density !== tileDensity ||
        existing.group.userData.rotation !== tile.rotation ||
        existing.group.userData.baseY !== baseY;

      if (needsRebuild) {
        if (existing) {
          this.buildingsGroup.remove(existing.group);
        }
        const handle = this.builder.buildMesh(
          tile.building,
          tile.variant,
          roadMask,
          tile.col,
          tile.row,
          isBridge,
          tileDensity
        );
        handle.group.userData.roadMask = roadMask;
        handle.group.userData.isBridge = isBridge;
        handle.group.userData.density = tileDensity;
        handle.group.userData.rotation = tile.rotation;
        handle.group.userData.baseY = baseY;

        const [lx, lz] = tileCenterLocal(tile.col, tile.row, state.gridSize);
        handle.group.position.set(lx, baseY, lz);
        if (tile.building !== 'road') {
          handle.group.rotation.y = (tile.rotation * Math.PI) / 2;
        }
        const isJustPlaced =
          changedCell &&
          changedCell.action === 'placed' &&
          changedCell.col === tile.col &&
          changedCell.row === tile.row;
        handle.popProgress = isJustPlaced ? 0.01 : 1.0;
        if (isJustPlaced) {
          handle.group.scale.setScalar(0.1);
        }

        this.buildingsGroup.add(handle.group);
        this.handles.set(key, handle);
      }
    }

    // Reconcile 3D data overlay heatmap (landValue / pollution / services)
    const showOverlay = state.dataOverlay && state.dataOverlay !== 'none';
    this.overlayGroup.visible = Boolean(showOverlay);
    if (showOverlay && this.overlayGeo) {
      for (const tile of state.tiles) {
        const key = `${tile.col},${tile.row}`;
        let entry = this.overlayMeshes.get(key);
        if (!entry) {
          const mat = new THREE.MeshBasicMaterial({
            color: 0x22c55e,
            transparent: true,
            opacity: 0.45,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1,
          });
          const mesh = new THREE.Mesh(this.overlayGeo, mat);
          this.overlayGroup.add(mesh);
          entry = {mesh, mat};
          this.overlayMeshes.set(key, entry);
        }
        const tone = getTileDataOverlayColor(
          state,
          tile.col,
          tile.row,
          state.dataOverlay
        );
        if (tone) {
          const [lx, lz] = tileCenterLocal(tile.col, tile.row, state.gridSize);
          entry.mesh.position.set(lx, getTerrainHeightY(tile.terrain) + 0.004, lz);
          entry.mat.color.setHex(tone.color);
          entry.mat.opacity = tone.opacity;
          entry.mesh.visible = true;
        } else {
          entry.mesh.visible = false;
        }
      }
    }

    if (changedCell && changedCell.action !== 'none') {
      const tile = getTile(state, changedCell.col, changedCell.row);
      const py = tile ? getTerrainHeightY(tile.terrain) + 0.01 : 0.02;
      const [lx, lz] = tileCenterLocal(
        changedCell.col,
        changedCell.row,
        state.gridSize
      );
      if (changedCell.action === 'placed') {
        this.particles.emitBurst(lx, py, lz, 10, 0xe8e2d0, 'dust');
      } else if (changedCell.action === 'demolished') {
        this.particles.emitBurst(lx, py, lz, 18, 0xb87654, 'rubble');
      } else if (changedCell.action === 'terrain') {
        this.particles.emitBurst(lx, py, lz, 8, 0x86efac, 'dust');
      }
    }

    this.traffic.syncWithCity(state);
    this.refreshHoverPreview();
  }

  setHoveredCell(col: number | null, row: number | null): void {
    if (col === null || row === null) {
      this.hoveredCell = null;
    } else {
      this.hoveredCell = {col, row};
    }
    this.refreshHoverPreview();
  }

  refreshHoverPreview(): void {
    if (
      (this.phase !== 'playing' && this.phase !== 'mapmaker') ||
      !this.hoveredCell ||
      !this.stateRef
    ) {
      this.hoverGroup.visible = false;
      return;
    }

    const {col, row} = this.hoveredCell;
    const state = this.stateRef;
    const tool = state.selectedTool;
    const tile = getTile(state, col, row);
    const [lx, lz] = tileCenterLocal(col, row, state.gridSize);
    const baseY = tile ? getTerrainHeightY(tile.terrain) : TERRAIN_HEIGHTS.grass;

    this.hoverGroup.position.set(lx, baseY, lz);
    this.hoverGroup.visible = true;

    const freeMode = this.phase === 'mapmaker';
    const check = canPlaceOnTile(state, col, row, tool, freeMode);

    if (this.phase === 'mapmaker' && isTerrainTool(tool) && state.mapBrushSize === 2) {
      this.hoverCursorMesh.scale.set(2.95, 1, 2.95);
    } else {
      this.hoverCursorMesh.scale.set(1, 1, 1);
    }

    if (tool === 'bulldoze') {
      this.hoverCursorMat.color.setHex(check.ok ? 0xf59e0b : 0x64748b);
    } else if (isTerrainTool(tool)) {
      this.hoverCursorMat.color.setHex(check.ok ? 0x38bdf8 : 0xef4444);
    } else {
      this.hoverCursorMat.color.setHex(check.ok ? 0x34d399 : 0xef4444);
    }

    const desiredKey =
      tool === 'bulldoze' || isTerrainTool(tool) ? 'none' : `${tool}`;
    if (this.ghostToolKey !== desiredKey) {
      if (this.ghostGroup) {
        this.hoverGroup.remove(this.ghostGroup);
        this.ghostGroup = null;
      }
      this.ghostToolKey = desiredKey;

      if (desiredKey !== 'none') {
        const previewHandle = this.builder.buildMesh(
          tool as any,
          0,
          0,
          col,
          row,
          tile?.terrain === 'water'
        );
        previewHandle.group.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.castShadow = false;
            m.receiveShadow = false;
            m.material = this.ghostMaterial;
          }
        });
        this.ghostGroup = previewHandle.group;
        this.hoverGroup.add(this.ghostGroup);
      }
    }

    if (this.ghostGroup) {
      this.ghostMaterial.color.setHex(check.ok ? 0x34d399 : 0xef4444);
      this.ghostGroup.rotation.y =
        tool === 'road' ? 0 : (state.buildRotation * Math.PI) / 2;
      this.ghostGroup.visible = !tile?.building;
    }
  }

  private applyTitleCameraPose(instant = false): void {
    const cam = xb.core.camera;
    const renderer = xb.core.renderer;
    if (!cam || renderer?.xr?.isPresenting) return;

    const center = _targetLookAt.set(-0.2, 0.92, -1.08);
    const radius = 1.36;
    const x = Math.sin(this.titleOrbitAngle) * radius;
    const z = -1.08 + Math.cos(this.titleOrbitAngle) * radius;
    _targetCamPos.set(x, 1.66, z);

    if (instant) {
      cam.position.copy(_targetCamPos);
      cam.lookAt(center);
    } else {
      cam.position.lerp(_targetCamPos, 0.12);
      _lookMat.lookAt(cam.position, center, _upVec);
      _targetQuat.setFromRotationMatrix(_lookMat);
      cam.quaternion.slerp(_targetQuat, 0.12);
    }
  }

  update(): void {
    const now = performance.now();
    const rawDt = Math.max(0.001, (now - this.lastFrameMs) / 1000);
    this.lastFrameMs = now;
    const dt = Math.min(rawDt, 0.05);
    this.elapsedClock += dt;

    this.boardYaw = THREE.MathUtils.damp(
      this.boardYaw,
      this.boardTargetYaw,
      8,
      dt
    );
    this.boardRoot.rotation.y = this.boardYaw;

    // Gentle water shimmer animation
    if (this.mats?.waterTile?.map) {
      this.mats.waterTile.map.offset.x = (this.elapsedClock * 0.03) % 1;
      this.mats.waterTile.map.offset.y = (this.elapsedClock * 0.015) % 1;
    }

    const cam = xb.core.camera;
    const isXR = Boolean(xb.core.renderer?.xr?.isPresenting);
    if (cam && !isXR) {
      if (this.phase === 'title') {
        this.titleOrbitAngle += dt * 0.14;
        this.applyTitleCameraPose(false);
      } else if (
        (this.phase === 'playing' || this.phase === 'mapmaker') &&
        this.cameraSettling &&
        !this.userMovedCamera
      ) {
        const dampAlpha = 1 - Math.exp(-5.5 * dt);
        _targetCamPos.set(0, 1.56, -0.3);
        _targetLookAt.set(0, 0.9, -1.08);
        cam.position.lerp(_targetCamPos, dampAlpha);
        _lookMat.lookAt(cam.position, _targetLookAt, _upVec);
        _targetQuat.setFromRotationMatrix(_lookMat);
        cam.quaternion.slerp(_targetQuat, dampAlpha);

        if (
          cam.position.distanceTo(_targetCamPos) < 0.015 &&
          cam.quaternion.angleTo(_targetQuat) < 0.015
        ) {
          cam.position.copy(_targetCamPos);
          cam.quaternion.copy(_targetQuat);
          this.cameraSettling = false;
        }
      }
    }

    const simMultiplier =
      this.phase === 'paused' || this.phase === 'gameover'
        ? 0
        : this.stateRef?.speedMultiplier ?? 1;

    this.smokeTimer += dt * simMultiplier;
    const emitSmoke = this.smokeTimer >= 0.48;
    if (emitSmoke) this.smokeTimer = 0;

    for (const handle of this.handles.values()) {
      if (handle.popProgress < 1) {
        handle.popProgress = Math.min(1, handle.popProgress + dt * 4.2);
        const t = handle.popProgress;
        const bounce = 1 + 0.18 * Math.sin(t * Math.PI) * (1 - t);
        handle.group.scale.set(bounce, t * bounce, bounce);
        if (handle.popProgress >= 1) {
          handle.group.scale.setScalar(1);
        }
      }

      if (handle.rotor && simMultiplier > 0) {
        if (handle.type === 'airport') {
          handle.rotor.rotation.y += dt * 1.8 * simMultiplier;
        } else {
          handle.rotor.rotation.z -= dt * 2.5 * simMultiplier;
        }
      }

      if (handle.fountainSpire && simMultiplier > 0) {
        const pulse =
          0.85 + 0.25 * Math.sin(this.elapsedClock * 5.2 + handle.col);
        handle.fountainSpire.scale.set(1, pulse, 1);
      }

      if (emitSmoke && handle.chimneyWorldOffsets) {
        for (const offset of handle.chimneyWorldOffsets) {
          const sx = handle.group.position.x + offset.x;
          const sy = handle.group.position.y + offset.y;
          const sz = handle.group.position.z + offset.z;
          this.particles.emitBurst(sx, sy, sz, 1, 0xcbd5e1, 'smoke');
        }
      }
    }

    if (this.stateRef && simMultiplier > 0) {
      this.traffic.update(dt, this.stateRef, simMultiplier);
    }
    this.particles.update(dt);
  }

  dispose(): void {
    window.removeEventListener('pointerdown', this.onUserPointerInteract);
    window.removeEventListener('keydown', this.onUserKeyInteract);
    this.envRenderTarget?.dispose();
    this.particles.dispose();
    this.builder.dispose();
    this.mats.dispose();
    this.hoverCursorMat.dispose();
    this.ghostMaterial.dispose();
    this.skyDomeMat?.dispose();
    this.overlayGeo?.dispose();
    for (const entry of this.overlayMeshes.values()) {
      entry.mat.dispose();
    }
  }
}
