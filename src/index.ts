import * as THREE from 'three';
import * as xb from 'xrblocks';

import {
  BUILDING_CATALOG,
  BUILDING_TOOL_ORDER,
  CYCLE_INTERVAL_SEC,
  DATA_OVERLAY_LABELS,
  DIFFICULTY_LABELS,
  TERRAIN_TOOL_ORDER,
} from './constants';
import {
  buildRuleBasedAdvisorReport,
  canPlaceOnTile,
  computeCityMetrics,
  computeNextAutoBuildAction,
  createInitialCityState,
  decodeCitySharePayload,
  encodeCitySharePayload,
  generateTerrainGrid,
  getTile,
  isTerrainTool,
  paintTerrainBrush,
  placeStarterTown,
  placeToolOnTile,
  serializeTerrainRowsForAI,
  stepCityCycle,
  triggerDisaster,
} from './game/cityRules';
import {CitySceneScript} from './game/citySceneScript';
import {
  RegionVault,
  createCityStateForPlot,
  getRegionById,
} from './game/regionPresets';
import {SoundSynth} from './game/soundSynth';
import {type P2PActionPayload, P2PSessionManager} from './net/p2pSync';
import type {
  AdvisorReport,
  AiCityPlan,
  BuildingType,
  CityMetrics,
  CityState,
  DataOverlayMode,
  DisasterKind,
  DockCategory,
  GamePhase,
  GameSettings,
  MapPresetId,
  OnlineRoomSummary,
  OrdinanceId,
  PublishedCitySummary,
  RegionId,
  TaxRates,
  TerrainToolId,
  ToolId,
} from './types';
import {type ActiveOverlay, GameHud} from './ui/gameHud';

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

const VALID_AI_BUILDINGS = new Set<BuildingType>([
  'road',
  'trainstation',
  'house',
  'shop',
  'park',
  'factory',
  'seaport',
  'airport',
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
]);

const CLASSIC_NUMBER_TOOLS: ToolId[] = [
  'road',
  'house',
  'shop',
  'factory',
  'park',
  'windmill',
  'powerplant',
  'watertower',
  'police',
];

const OVERLAY_CYCLE_ORDER: DataOverlayMode[] = [
  'none',
  'landValue',
  'pollution',
  'services',
];

class StadBouwerApp {
  private readonly isSoftwareGl = detectSoftwareWebGL();
  private readonly vault = new RegionVault();
  private state: CityState = this.vault.getOrCreatePlot('delta-nieuw-amsterdam');
  private phase: GamePhase = 'title';
  private activeOverlay: ActiveOverlay = 'none';
  private selectedRegionTab: RegionId = this.state.settings.regionId;

  private cycleAccumulatorSec = 0;
  private autoBuildAccumulatorSec = 0;
  private lastTickMs = performance.now();
  private softwareFrameTimer = 0;

  private geminiAdvisorOverride: AdvisorReport | null = null;
  private aiPlanTimers: number[] = [];

  private cachedOnlineRooms: OnlineRoomSummary[] = [];
  private cachedOnlineCities: PublishedCitySummary[] = [];

  private readonly sound = new SoundSynth();
  private readonly hud: GameHud;
  private readonly sceneScript: CitySceneScript;
  private readonly p2p: P2PSessionManager;

  constructor(shellRoot: HTMLElement) {
    this.sceneScript = new CitySceneScript(this.isSoftwareGl, {
      onTileHover: (col, row) => this.handleTileHover(col, row),
      onTileClick: (col, row) => this.handleTileClick(col, row),
    });

    this.p2p = new P2PSessionManager({
      onStatusChange: (status) => {
        this.hud.updateP2PStatus(status);
        void this.refreshOnlineLobby();
      },
      onRemoteAction: (action, fromName) => {
        this.applyRemoteAction(action, fromName);
      },
      onInitialSnapshot: (encoded) => {
        const decoded = decodeCitySharePayload(encoded);
        if (!decoded) return;
        this.state = decoded;
        this.geminiAdvisorOverride = null;
        this.syncAll();
        this.hud.showToast('Stadskaart geladen vanuit online kamer.', 2200);
      },
      onChatMessage: (msg) => {
        this.hud.appendChatMessage(msg);
      },
    });
    this.p2p.setSnapshotProvider(() => encodeCitySharePayload(this.state));

    this.hud = new GameHud(shellRoot, {
      onStartGame: () => this.startGame(),
      onOpenOverlay: (overlay) => this.openOverlay(overlay),
      onOpenMapMaker: () => this.openMapMaker(),
      onFinishMapMaker: () => this.finishMapMaker(),
      onSelectMapPreset: (preset, randomizeSeed) =>
        this.applyMapPreset(preset, randomizeSeed),
      onSetBrushSize: (size) => {
        this.sound.playClick();
        this.state.mapBrushSize = size;
        this.sceneScript.refreshHoverPreview();
        this.refreshHud();
      },
      onResetStarterTown: () => this.resetStarterTownOnMap(),
      onSelectTool: (tool) => this.selectTool(tool),
      onSelectDockTab: (tab: DockCategory) => {
        this.sound.playClick();
        this.hud.setActiveDockTab(tab);
      },
      onRotateBuilding: () => this.rotateBuilding(),
      onRotateBoard: () => {
        this.sound.playRotate();
        this.sceneScript.rotateBoard(1);
      },
      onCycleSpeed: () => this.cycleSpeed(),
      onCycleDataOverlay: () => this.cycleDataOverlay(),
      onToggleSkyMode: () => this.toggleSkyMode(),
      onToggleMute: () => {
        this.sound.toggleMute();
        this.refreshHud();
      },
      onToggleAutoBuild: () => this.toggleAutoBuild(),
      onStepAutoBuildOnce: () => this.stepAutoBuildOnce(),
      onApplySettings: (partial, regenerateMap) =>
        this.applySettings(partial, regenerateMap),
      onSelectRegionTab: (regionId) => {
        this.sound.playClick();
        this.selectedRegionTab = regionId;
        this.refreshRegionModal();
      },
      onSelectPlot: (plotId) => this.selectPlot(plotId),
      onResetPlot: (plotId) => this.resetPlot(plotId),
      onSetTaxRates: (taxes) => this.setTaxRates(taxes),
      onToggleOrdinance: (id) => this.toggleOrdinance(id),
      onAdjustNeighborTrade: (deltaMw) => this.adjustNeighborTrade(deltaMw),
      onTriggerDisaster: (kind) => this.runManualDisaster(kind),
      onRunAiCityPlan: (prompt) => void this.runAiCityPlan(prompt),
      onAskAiAdvisor: (question) => void this.askAiAdvisor(question),
      onConnectP2P: (roomCode, displayName, isPublic) => {
        this.sound.playClick();
        const metrics = this.getCurrentMetrics();
        const reg = getRegionById(this.state.settings.regionId);
        this.p2p.connectRoom(roomCode, displayName, {
          isPublic,
          cityName: this.state.settings.cityName,
          regionName: reg.name,
          population: metrics.population,
          tierName: metrics.tierName,
        });
      },
      onDisconnectP2P: () => {
        this.sound.playClick();
        this.p2p.disconnect();
      },
      onRefreshOnlineLobby: () => void this.refreshOnlineLobby(),
      onPublishCityOnline: (authorName) =>
        void this.publishCurrentCity(authorName),
      onLikeOnlineCity: (cityId) => void this.likeOnlineCity(cityId),
      onLoadOnlineCity: (encoded, cityName) =>
        this.loadOnlineCity(encoded, cityName),
      onSendChat: (text) => {
        this.sound.playClick();
        this.p2p.sendChat(text);
      },
      onCopyShareLink: () => void this.copyShareLink(),
      onExportCityJson: () => this.exportCityJson(),
      onImportCityPayload: (raw) => this.importCityPayload(raw),
      onPause: () => this.setPhase('paused'),
      onResume: () => this.setPhase('playing'),
      onContinueEndless: () => {
        this.state.victoryDismissed = true;
        this.state.gameOverReason = null;
        this.vault.savePlot(this.state.settings.plotId, this.state);
        this.setPhase('playing');
        this.hud.showToast('Eindeloze bouwmodus geactiveerd!', 2400);
      },
      onRestart: () => this.resetCity('playing'),
      onReturnTitle: () => this.resetCity('title'),
    });
  }

  private getCurrentMetrics(): CityMetrics {
    return computeCityMetrics(
      this.state,
      this.vault.getNeighborSynergyForPlot(this.state.settings.plotId)
    );
  }

  async boot(): Promise<void> {
    const options = new xb.Options();
    options.antialias = !this.isSoftwareGl;
    options.setAppTitle('StadBouwer 3000');
    options.setAppDescription(
      'Mijn eigen 3D stadsbouwspel met 4x3 SimCity-regio\'s, 20+ gebouwen, AI en Online Multiplayer.'
    );
    options.enableReticles();
    options.enableXRTransitions();

    const params = new URLSearchParams(window.location.search);
    const autostart = params.get('autostart') === '1';
    const sharedCity = params.get('city');
    const roomParam = params.get('room');
    const plotParam = params.get('plot');

    if (sharedCity) {
      const decoded = decodeCitySharePayload(sharedCity);
      if (decoded) {
        this.state = decoded;
      }
    } else if (plotParam) {
      this.state = this.vault.getOrCreatePlot(plotParam);
      this.selectedRegionTab = this.state.settings.regionId;
    }

    xb.add(this.sceneScript);
    await xb.init(options);

    const metrics = this.getCurrentMetrics();
    this.sceneScript.syncCity(this.state, metrics);
    this.sceneScript.applyTimeOfDay(this.state.settings.timeOfDay);
    this.sceneScript.setSkyMode('sky');
    this.hud.updateP2PStatus(this.p2p.getStatus());

    this.setPhase(autostart || sharedCity || roomParam ? 'playing' : 'title');

    if (roomParam) {
      const reg = getRegionById(this.state.settings.regionId);
      this.p2p.connectRoom(roomParam, 'Gast-Burgemeester', {
        isPublic: true,
        cityName: this.state.settings.cityName,
        regionName: reg.name,
        population: metrics.population,
        tierName: metrics.tierName,
      });
    }

    void this.refreshOnlineLobby();
    this.bindGlobalListeners();
    this.startEconomyTicker();

    if (this.isSoftwareGl) {
      this.enableSoftwareGlPacing();
    }
  }

  private enableSoftwareGlPacing(): void {
    const renderer = xb.core.renderer as THREE.WebGLRenderer;
    if (!renderer || typeof renderer.setAnimationLoop !== 'function') return;

    renderer.setAnimationLoop(null);

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext?.() as WebGL2RenderingContext | undefined;
      if (!gl || typeof gl.fenceSync !== 'function') {
        this.softwareFrameTimer = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.softwareFrameTimer = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.softwareFrameTimer = window.setTimeout(cb, 80);
        }
      };
      this.softwareFrameTimer = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (renderer.xr?.isPresenting) return;
      xb.core.stepFrame(45);
      afterDraw(tick);
    };
    this.softwareFrameTimer = window.setTimeout(tick, 16);
  }

  private bindGlobalListeners(): void {
    window.addEventListener('keydown', (e) => {
      if (
        e.target instanceof HTMLElement &&
        e.target.matches('input, textarea, select')
      ) {
        if (e.code === 'Escape' && this.activeOverlay !== 'none') {
          this.openOverlay('none');
        }
        return;
      }

      if (this.activeOverlay !== 'none') {
        if (e.code === 'Escape') {
          this.openOverlay('none');
        }
        return;
      }

      if (this.phase === 'title') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          this.startGame();
        }
        return;
      }

      if (e.code === 'Escape') {
        if (this.phase === 'playing') {
          this.setPhase('paused');
        } else if (this.phase === 'paused') {
          this.setPhase('playing');
        } else if (this.phase === 'mapmaker') {
          this.finishMapMaker();
        }
        return;
      }

      if (this.phase === 'mapmaker') {
        const terrainIdx = Number(e.key) - 1;
        if (terrainIdx >= 0 && terrainIdx < TERRAIN_TOOL_ORDER.length) {
          this.selectTool(TERRAIN_TOOL_ORDER[terrainIdx]);
          return;
        }
        const terrainKeyMap: Record<string, TerrainToolId> = {
          KeyQ: 'terrain_grass',
          KeyW: 'terrain_water',
          KeyE: 'terrain_forest',
          KeyR: 'terrain_hill',
          KeyT: 'terrain_mountain',
        };
        const mapped = terrainKeyMap[e.code];
        if (mapped) {
          this.selectTool(mapped);
        }
        return;
      }

      if (this.phase !== 'playing') return;

      const idx = Number(e.key) - 1;
      if (idx >= 0 && idx < CLASSIC_NUMBER_TOOLS.length) {
        this.selectTool(CLASSIC_NUMBER_TOOLS[idx]);
        return;
      }
      if (e.key === '0') {
        this.selectTool('bulldoze');
        return;
      }

      switch (e.code) {
        case 'KeyT':
          this.selectTool('trainstation');
          break;
        case 'KeyP':
          this.selectTool('seaport');
          break;
        case 'KeyV':
          this.selectTool('airport');
          break;
        case 'KeyZ':
          this.selectTool('solarplant');
          break;
        case 'KeyK':
          this.selectTool('nuclear');
          break;
        case 'KeyU':
          this.selectTool('university');
          break;
        case 'KeyS':
          this.selectTool('stadium');
          break;
        case 'KeyF':
          this.selectTool('firestation');
          break;
        case 'KeyC':
          this.selectTool('school');
          break;
        case 'KeyH':
          this.selectTool('hospital');
          break;
        case 'KeyL':
          this.selectTool('landmark');
          break;
        case 'KeyG':
          this.cycleDataOverlay();
          break;
        case 'KeyR':
          this.rotateBuilding();
          break;
        case 'KeyQ':
          this.sound.playRotate();
          this.sceneScript.rotateBoard(-1);
          break;
        case 'KeyE':
          this.sound.playRotate();
          this.sceneScript.rotateBoard(1);
          break;
        case 'Space':
          e.preventDefault();
          this.cycleSpeed();
          break;
        case 'KeyB':
          this.toggleSkyMode();
          break;
        case 'KeyM':
          this.sound.toggleMute();
          this.refreshHud();
          break;
      }
    });
  }

  private startEconomyTicker(): void {
    const loop = () => {
      const now = performance.now();
      const dt = Math.min(
        0.05,
        Math.max(0.001, (now - this.lastTickMs) / 1000)
      );
      this.lastTickMs = now;

      if (this.phase === 'playing') {
        this.cycleAccumulatorSec += dt * this.state.speedMultiplier;
        if (this.cycleAccumulatorSec >= CYCLE_INTERVAL_SEC) {
          this.cycleAccumulatorSec -= CYCLE_INTERVAL_SEC;
          const synergy = this.vault.getNeighborSynergyForPlot(
            this.state.settings.plotId
          );
          const res = stepCityCycle(this.state, synergy);
          this.sound.playIncomeCycle(res.incomeApplied >= 0);

          if (res.tierChangedTo) {
            this.sound.playLevelUp();
            this.hud.showToast(
              `Stadsrang verhoogd: ${res.tierChangedTo}!`,
              3000
            );
          }
          if (res.upgradedCount > 0) {
            this.hud.showToast(
              `Hoogbouw-boom! ${res.upgradedCount} wijk(en) gegroeid.`,
              2200
            );
          }
          if (res.disasterNote) {
            this.hud.showToast(res.disasterNote, 2800);
          }
          this.vault.savePlot(this.state.settings.plotId, this.state);
          this.p2p.updateRoomMeta({
            cityName: this.state.settings.cityName,
            population: res.metrics.population,
            tierName: res.metrics.tierName,
          });
          if (res.gameOverReason === 'victory' && !this.state.victoryDismissed) {
            this.sound.playLevelUp();
            this.setPhase('gameover');
          } else if (
            res.gameOverReason === 'bankrupt' ||
            res.gameOverReason === 'unhappy'
          ) {
            this.sound.playError();
            this.setPhase('gameover');
          } else {
            this.sceneScript.syncCity(this.state, res.metrics);
            this.refreshHud();
          }
        }

        if (this.state.settings.autoBuildEnabled) {
          this.autoBuildAccumulatorSec += dt * this.state.speedMultiplier;
          const interval = Math.max(
            0.8,
            this.state.settings.autoBuildIntervalSec || 2.2
          );
          if (this.autoBuildAccumulatorSec >= interval) {
            this.autoBuildAccumulatorSec -= interval;
            this.performAutoBuildStep(false);
          }
        }
      }

      window.setTimeout(loop, 120);
    };
    window.setTimeout(loop, 120);
  }

  private startGame(): void {
    this.sound.playClick();
    this.openOverlay('none');
    this.setPhase('playing');
  }

  private openOverlay(overlay: ActiveOverlay): void {
    this.sound.playClick();
    this.activeOverlay = overlay;
    this.hud.setOverlay(overlay, this.state.settings);
    const metrics = this.getCurrentMetrics();
    if (overlay === 'advisor') {
      const report =
        this.geminiAdvisorOverride ||
        buildRuleBasedAdvisorReport(this.state, metrics);
      this.hud.updateAdvisor(report);
    } else if (overlay === 'regions') {
      this.selectedRegionTab = this.state.settings.regionId;
      this.refreshRegionModal();
    } else if (overlay === 'budget') {
      this.hud.updateBudgetModal(this.state, metrics);
    } else if (overlay === 'p2p') {
      void this.refreshOnlineLobby();
    }
  }

  private refreshRegionModal(): void {
    this.vault.savePlot(this.state.settings.plotId, this.state);
    const reg = getRegionById(this.selectedRegionTab);
    const bundle = this.vault.getRegionSummaries(
      reg.id,
      this.state.settings.plotId
    );
    const metrics = this.getCurrentMetrics();
    this.hud.updateRegions(
      reg,
      bundle.summaries,
      bundle.totalPopulation,
      bundle.totalPowerSurplus,
      metrics
    );
  }

  private selectPlot(plotId: string): void {
    this.sound.playClick();
    this.clearAiPlanTimers();
    this.vault.savePlot(this.state.settings.plotId, this.state);
    this.state = this.vault.getOrCreatePlot(plotId);
    this.selectedRegionTab = this.state.settings.regionId;
    this.geminiAdvisorOverride = null;
    this.openOverlay('none');
    this.syncAll();
    this.setPhase('playing');
    this.broadcastFullSync();
    const metrics = this.getCurrentMetrics();
    this.p2p.updateRoomMeta({
      cityName: this.state.settings.cityName,
      population: metrics.population,
      tierName: metrics.tierName,
    });
    this.hud.showToast(
      `Aangekomen in ${this.state.settings.cityName}!`,
      2200
    );
  }

  private resetPlot(plotId: string): void {
    this.sound.playDemolish();
    const fresh = this.vault.resetPlot(plotId);
    if (this.state.settings.plotId === plotId) {
      this.state = fresh;
      this.geminiAdvisorOverride = null;
      this.syncAll();
    }
    this.refreshRegionModal();
    this.hud.showToast(`${fresh.settings.cityName} hersteld naar beginstand.`, 2000);
  }

  private cycleDataOverlay(): void {
    this.sound.playClick();
    const idx = OVERLAY_CYCLE_ORDER.indexOf(this.state.dataOverlay);
    this.state.dataOverlay =
      OVERLAY_CYCLE_ORDER[(idx + 1) % OVERLAY_CYCLE_ORDER.length];
    this.syncAll();
    this.hud.showToast(
      `Datakaart: ${DATA_OVERLAY_LABELS[this.state.dataOverlay]}`,
      1800
    );
  }

  private setTaxRates(taxes: TaxRates): void {
    this.state.taxes = {
      residential: Math.max(0, Math.min(15, Math.round(taxes.residential))),
      commercial: Math.max(0, Math.min(15, Math.round(taxes.commercial))),
      industrial: Math.max(0, Math.min(15, Math.round(taxes.industrial))),
    };
    this.vault.savePlot(this.state.settings.plotId, this.state);
    this.refreshHud();
  }

  private toggleOrdinance(id: OrdinanceId): void {
    this.sound.playClick();
    const exists = this.state.ordinances.includes(id);
    this.state.ordinances = exists
      ? this.state.ordinances.filter((o) => o !== id)
      : [...this.state.ordinances, id];
    this.vault.savePlot(this.state.settings.plotId, this.state);
    this.syncAll();
  }

  private adjustNeighborTrade(deltaMw: number): void {
    this.sound.playClick();
    if (deltaMw === 0) {
      this.state.neighborTradeMw = 0;
    } else {
      this.state.neighborTradeMw = Math.max(
        -30,
        Math.min(30, (this.state.neighborTradeMw || 0) + deltaMw)
      );
    }
    this.vault.savePlot(this.state.settings.plotId, this.state);
    this.syncAll();
  }

  private runManualDisaster(kind: DisasterKind): void {
    this.sound.playError();
    const msg = triggerDisaster(this.state, kind);
    this.vault.savePlot(this.state.settings.plotId, this.state);
    this.openOverlay('none');
    this.syncAll();
    this.hud.showToast(msg, 3200);
  }

  private openMapMaker(): void {
    this.sound.playClick();
    this.openOverlay('none');
    if (!isTerrainTool(this.state.selectedTool)) {
      this.state.selectedTool = 'terrain_water';
    }
    this.setPhase('mapmaker');
  }

  private finishMapMaker(): void {
    this.sound.playClick();
    if (isTerrainTool(this.state.selectedTool)) {
      this.state.selectedTool = 'house';
    }
    this.vault.savePlot(this.state.settings.plotId, this.state);
    this.setPhase('playing');
    this.broadcastFullSync();
    this.hud.showToast('Landkaart opgeslagen! Je kunt nu bouwen.', 2200);
  }

  private applyMapPreset(preset: MapPresetId, randomizeSeed: boolean): void {
    this.sound.playClick();
    this.state.settings.mapPreset = preset;
    if (randomizeSeed) {
      this.state.settings.mapSeed = Math.floor(1000 + Math.random() * 9000);
    }
    this.state.tiles = generateTerrainGrid(
      preset,
      this.state.settings.mapSeed,
      this.state.gridSize
    );
    placeStarterTown(this.state);
    this.geminiAdvisorOverride = null;
    this.vault.savePlot(this.state.settings.plotId, this.state);
    this.syncAll();
    this.broadcastFullSync();
  }

  private resetStarterTownOnMap(): void {
    this.sound.playBuild(false);
    placeStarterTown(this.state);
    this.geminiAdvisorOverride = null;
    this.vault.savePlot(this.state.settings.plotId, this.state);
    this.syncAll();
    this.broadcastFullSync();
  }

  private resetCity(targetPhase: GamePhase): void {
    this.sound.playClick();
    this.clearAiPlanTimers();
    this.openOverlay('none');
    if (this.state.settings.plotId) {
      this.state = createCityStateForPlot(this.state.settings.plotId);
      this.vault.savePlot(this.state.settings.plotId, this.state);
    } else {
      this.state = createInitialCityState(this.state.settings);
    }
    this.cycleAccumulatorSec = 0;
    this.autoBuildAccumulatorSec = 0;
    this.geminiAdvisorOverride = null;
    const metrics = this.getCurrentMetrics();
    this.sceneScript.syncCity(this.state, metrics);
    this.sceneScript.applyTimeOfDay(this.state.settings.timeOfDay);
    this.setPhase(targetPhase);
    this.broadcastFullSync();
  }

  private setPhase(phase: GamePhase): void {
    this.phase = phase;
    this.sceneScript.setPhase(phase);
    this.refreshHud();
  }

  private selectTool(tool: ToolId): void {
    this.sound.playClick();
    this.state.selectedTool = tool;
    this.sceneScript.refreshHoverPreview();
    this.refreshHud();
  }

  private rotateBuilding(): void {
    this.sound.playRotate();
    this.state.buildRotation = (this.state.buildRotation + 1) % 4;
    this.sceneScript.refreshHoverPreview();
    this.refreshHud();
  }

  private cycleSpeed(): void {
    this.sound.playClick();
    this.state.speedMultiplier =
      this.state.speedMultiplier === 1
        ? 2
        : this.state.speedMultiplier === 2
          ? 3
          : 1;
    this.refreshHud();
  }

  private toggleSkyMode(): void {
    this.sound.playClick();
    const next = this.sceneScript.getSkyMode() === 'sky' ? 'ar' : 'sky';
    this.sceneScript.setSkyMode(next);
    this.refreshHud();
  }

  private toggleAutoBuild(): void {
    this.sound.playClick();
    this.state.settings.autoBuildEnabled =
      !this.state.settings.autoBuildEnabled;
    this.autoBuildAccumulatorSec = 0;
    this.refreshHud();
    this.hud.showToast(
      this.state.settings.autoBuildEnabled
        ? 'Auto-Stad Bouwen ingeschakeld!'
        : 'Auto-Stad Bouwen gepauzeerd.',
      1800
    );
  }

  private stepAutoBuildOnce(): void {
    if (this.phase === 'title') {
      this.openOverlay('none');
      this.setPhase('playing');
    }
    const built = this.performAutoBuildStep(true);
    if (!built) {
      this.sound.playError();
      this.hud.showToast(
        'Auto-Bouw wacht op meer budget of vrije bouwgrond.',
        2000
      );
    }
  }

  private performAutoBuildStep(announce: boolean): boolean {
    const plan = computeNextAutoBuildAction(this.state);
    if (!plan) return false;
    const res = placeToolOnTile(
      this.state,
      plan.col,
      plan.row,
      plan.tool,
      plan.rotation
    );
    if (!res.ok) return false;

    this.geminiAdvisorOverride = null;
    this.sound.playBuild(plan.tool === 'road');
    const metrics = this.getCurrentMetrics();
    this.sceneScript.syncCity(this.state, metrics, {
      col: plan.col,
      row: plan.row,
      action: res.action,
    });
    this.refreshHud();

    this.p2p.broadcastAction(
      {
        kind: 'tile_place',
        col: plan.col,
        row: plan.row,
        tool: plan.tool,
        rotation: plan.rotation,
        freeMode: false,
      },
      encodeCitySharePayload(this.state)
    );

    if (announce) {
      this.hud.showToast(
        `Auto-Bouw plaatste ${BUILDING_CATALOG[plan.tool].label}!`,
        1600
      );
    }
    return true;
  }

  private applySettings(
    partial: Partial<GameSettings>,
    regenerateMap: boolean
  ): void {
    this.sound.playClick();
    const prevDiff = this.state.settings.difficulty;
    this.state.settings = {
      ...this.state.settings,
      ...partial,
    };

    if (regenerateMap) {
      this.clearAiPlanTimers();
      this.state = createInitialCityState(this.state.settings);
      this.cycleAccumulatorSec = 0;
      this.autoBuildAccumulatorSec = 0;
      this.geminiAdvisorOverride = null;
    } else if (
      partial.difficulty &&
      partial.difficulty !== prevDiff &&
      partial.difficulty === 'sandbox'
    ) {
      this.state.budget = Math.max(
        this.state.budget,
        DIFFICULTY_LABELS.sandbox.startBudget
      );
    }

    this.sceneScript.applyTimeOfDay(this.state.settings.timeOfDay);
    this.openOverlay('none');
    if (this.phase === 'title') {
      this.setPhase('playing');
    } else {
      this.syncAll();
    }
    this.broadcastFullSync();
    this.hud.showToast('Spelopties toegepast!', 1800);
  }

  private clearAiPlanTimers(): void {
    for (const id of this.aiPlanTimers) {
      window.clearTimeout(id);
    }
    this.aiPlanTimers = [];
  }

  private async runAiCityPlan(prompt: string): Promise<void> {
    const trimmed = prompt.trim();
    if (!trimmed) {
      this.hud.setAiBusy(false, 'Typ eerst een wens of kies een voorbeeld.', true);
      return;
    }

    this.sound.playClick();
    this.hud.setAiBusy(
      true,
      'Gemini AI ontwerpt wegen, woonwijken, parken en energie...'
    );

    try {
      const response = await fetch('/api/ai/plan-city', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          prompt: trimmed,
          gridSize: this.state.gridSize,
          budget: Math.round(this.state.budget),
          terrainRows: serializeTerrainRowsForAI(this.state),
        }),
      });

      const data = (await response.json()) as Partial<AiCityPlan> & {
        error?: string;
      };
      if (!response.ok) {
        this.sound.playError();
        this.hud.setAiBusy(
          false,
          data.error || `Serverfout (${response.status}).`,
          true
        );
        return;
      }

      const placements = Array.isArray(data.placements) ? data.placements : [];
      if (placements.length === 0) {
        this.hud.setAiBusy(
          false,
          'AI gaf geen bouwplaatsingen terug. Probeer een specifiekere beschrijving.',
          true
        );
        return;
      }

      if (data.cityName && typeof data.cityName === 'string') {
        this.state.settings.cityName = data.cityName.slice(0, 24);
      }
      if (data.concept && typeof data.concept === 'string') {
        this.state.newsTicker = `AI Architect: ${data.concept}`;
      }

      this.clearAiPlanTimers();
      this.openOverlay('none');
      if (this.phase === 'title' || this.phase === 'mapmaker') {
        this.setPhase('playing');
      }

      // Sort roads first so houses/shops connect smoothly
      const ordered = [...placements].sort((a, b) =>
        a.building === 'road' && b.building !== 'road'
          ? -1
          : a.building !== 'road' && b.building === 'road'
            ? 1
            : 0
      );

      let placedCount = 0;
      ordered.forEach((step, idx) => {
        const timer = window.setTimeout(() => {
          const building = step.building as BuildingType;
          if (!VALID_AI_BUILDINGS.has(building)) return;
          const tool = building as ToolId;
          const res = placeToolOnTile(
            this.state,
            Number(step.col),
            Number(step.row),
            tool,
            Number(step.rotation) || 0,
            false
          );
          if (res.ok) {
            placedCount++;
            this.sound.playBuild(tool === 'road');
            const m = this.getCurrentMetrics();
            this.sceneScript.syncCity(this.state, m, {
              col: Number(step.col),
              row: Number(step.row),
              action: res.action,
            });
            this.refreshHud();
          }
          if (idx === ordered.length - 1) {
            this.broadcastFullSync();
            this.hud.showToast(
              `AI Stadsarchitect bouwde ${placedCount} nieuwe structuren!`,
              2600
            );
          }
        }, idx * 75);
        this.aiPlanTimers.push(timer);
      });

      this.hud.setAiBusy(false, 'Stadsplan wordt op de tafel gebouwd...');
    } catch (err) {
      this.sound.playError();
      this.hud.setAiBusy(
        false,
        err instanceof Error
          ? err.message
          : 'Verbinding met AI Architect mislukt.',
        true
      );
    }
  }

  private async askAiAdvisor(question: string): Promise<void> {
    this.sound.playClick();
    const metrics = this.getCurrentMetrics();
    const counts: Record<string, number> = {};
    for (const tile of this.state.tiles) {
      if (tile.building) {
        counts[tile.building] = (counts[tile.building] || 0) + 1;
      }
    }

    this.hud.setAdvisorBusy(true, 'Gemini Stadsadviseur analyseert jouw cijfers...');
    try {
      const response = await fetch('/api/ai/advisor', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          budget: Math.round(this.state.budget),
          metrics,
          counts,
          question: question.trim() || 'Wat heeft mijn stad nu het hardst nodig?',
        }),
      });
      const data = (await response.json()) as Partial<AdvisorReport> & {
        error?: string;
      };
      if (!response.ok) {
        this.sound.playError();
        this.hud.setAdvisorBusy(false);
        const fallback = buildRuleBasedAdvisorReport(this.state, metrics);
        this.hud.updateAdvisor(
          fallback,
          data.error || `Serverfout (${response.status}).`,
          true
        );
        return;
      }

      const validTool =
        data.recommendedTool && data.recommendedTool in BUILDING_CATALOG
          ? (data.recommendedTool as ToolId)
          : 'house';
      const report: AdvisorReport = {
        advisorName: data.advisorName || 'Gemini Stadsadviseur',
        role: data.role || 'Hoofd Stedenbouw',
        mood:
          data.mood === 'urgent' || data.mood === 'caution'
            ? data.mood
            : 'positive',
        headline: data.headline || 'Stadsanalyse gereed',
        summary: data.summary || '',
        tips: Array.isArray(data.tips) ? data.tips.slice(0, 4) : [],
        recommendedTool: validTool,
        source: 'gemini',
      };
      this.geminiAdvisorOverride = report;
      this.hud.setAdvisorBusy(false);
      this.hud.updateAdvisor(report, 'Live Gemini advies bijgewerkt.', false);
    } catch (err) {
      this.sound.playError();
      this.hud.setAdvisorBusy(false);
      const fallback = buildRuleBasedAdvisorReport(this.state, metrics);
      this.hud.updateAdvisor(
        fallback,
        err instanceof Error ? err.message : 'Kon AI adviseur niet bereiken.',
        true
      );
    }
  }

  private async copyShareLink(): Promise<void> {
    this.sound.playClick();
    const encoded = encodeCitySharePayload(this.state);
    const url = new URL(window.location.href);
    url.searchParams.set('city', encoded);
    const room = this.p2p.getStatus().roomCode;
    if (room) {
      url.searchParams.set('room', room);
    }
    const shareText = url.toString();

    const importArea = document.querySelector<HTMLTextAreaElement>(
      '[data-p2p-import]'
    );
    if (importArea) {
      importArea.value = shareText;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        this.hud.showToast('Deel-link gekopieerd naar klembord!', 2200);
        return;
      }
    } catch {
      // Fallback displayed in textarea
    }
    this.hud.showToast('Deel-link klaargezet in het deelvak.', 2200);
  }

  private exportCityJson(): void {
    this.sound.playClick();
    const payload = encodeCitySharePayload(this.state);
    const importArea = document.querySelector<HTMLTextAreaElement>(
      '[data-p2p-import]'
    );
    if (importArea) {
      importArea.value = payload;
    }
    try {
      const blob = new Blob(
        [
          JSON.stringify(
            {
              app: 'StadBouwerXR',
              cityName: this.state.settings.cityName,
              code: payload,
            },
            null,
            2
          ),
        ],
        {type: 'application/json'}
      );
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `${this.state.settings.cityName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'stad'}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch {
      // textarea already holds code
    }
    this.hud.showToast('Stad geëxporteerd (.json & stadscode).', 2200);
  }

  private importCityPayload(raw: string): void {
    this.sound.playClick();
    let code = raw.trim();
    if (!code) {
      this.sound.playError();
      this.hud.showToast('Plak eerst een stadscode, URL of JSON.', 2000);
      return;
    }

    if (code.startsWith('http://') || code.startsWith('https://')) {
      try {
        const parsedUrl = new URL(code);
        code = parsedUrl.searchParams.get('city') || code;
      } catch {
        // leave as raw
      }
    } else if (code.startsWith('{')) {
      try {
        const obj = JSON.parse(code) as {code?: string};
        if (obj && typeof obj.code === 'string') {
          code = obj.code;
        }
      } catch {
        // let decoder test direct compact JSON
      }
    }

    const decoded = decodeCitySharePayload(code);
    if (!decoded) {
      this.sound.playError();
      this.hud.showToast('Ongeldige stadscode of JSON-bestand.', 2200);
      return;
    }

    this.state = decoded;
    this.geminiAdvisorOverride = null;
    this.openOverlay('none');
    this.setPhase('playing');
    this.broadcastFullSync();
    this.hud.showToast(
      `Stad "${this.state.settings.cityName}" geladen!`,
      2200
    );
  }

  private async refreshOnlineLobby(): Promise<void> {
    try {
      const [roomsRes, citiesRes] = await Promise.all([
        fetch('/api/online/rooms'),
        fetch('/api/online/cities'),
      ]);
      if (roomsRes.ok) {
        const d = (await roomsRes.json()) as {rooms?: OnlineRoomSummary[]};
        this.cachedOnlineRooms = Array.isArray(d.rooms) ? d.rooms : [];
      }
      if (citiesRes.ok) {
        const d = (await citiesRes.json()) as {cities?: PublishedCitySummary[]};
        this.cachedOnlineCities = Array.isArray(d.cities) ? d.cities : [];
      }
      this.hud.updateOnlineLobby(
        this.cachedOnlineRooms,
        this.cachedOnlineCities
      );
    } catch {
      this.hud.updateOnlineLobby(
        this.cachedOnlineRooms,
        this.cachedOnlineCities
      );
    }
  }

  private async publishCurrentCity(authorName: string): Promise<void> {
    this.sound.playClick();
    const metrics = this.getCurrentMetrics();
    const reg = getRegionById(this.state.settings.regionId);
    const encoded = encodeCitySharePayload(this.state);

    this.hud.setPublishStatus('Stad wordt online gepubliceerd...');
    try {
      const res = await fetch('/api/online/publish', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          cityName: this.state.settings.cityName,
          authorName: authorName.trim() || 'Burgemeester',
          regionName: reg.name,
          tierName: metrics.tierName,
          population: metrics.population,
          happiness: metrics.happiness,
          encoded,
        }),
      });
      if (!res.ok) {
        this.sound.playError();
        this.hud.setPublishStatus('Kon stad niet publiceren.', true);
        return;
      }
      this.sound.playLevelUp();
      this.hud.setPublishStatus(
        `"${this.state.settings.cityName}" staat nu live in de Online Stedengalerij!`
      );
      await this.refreshOnlineLobby();
    } catch {
      this.sound.playError();
      this.hud.setPublishStatus('Verbinding met server mislukt.', true);
    }
  }

  private async likeOnlineCity(cityId: string): Promise<void> {
    this.sound.playClick();
    try {
      const res = await fetch(
        `/api/online/cities/${encodeURIComponent(cityId)}/like`,
        {method: 'POST'}
      );
      if (res.ok) {
        await this.refreshOnlineLobby();
      }
    } catch {
      // ignore
    }
  }

  private loadOnlineCity(encoded: string, cityName: string): void {
    const decoded = decodeCitySharePayload(encoded);
    if (!decoded) {
      this.sound.playError();
      this.hud.showToast('Kon gedeelde stad niet laden.', 2000);
      return;
    }
    this.sound.playLevelUp();
    this.clearAiPlanTimers();
    this.state = decoded;
    this.geminiAdvisorOverride = null;
    this.openOverlay('none');
    this.syncAll();
    this.setPhase('playing');
    this.broadcastFullSync();
    this.hud.showToast(`Online stad "${cityName}" geladen!`, 2400);
  }

  private applyRemoteAction(action: P2PActionPayload, fromName: string): void {
    if (action.kind === 'tile_place') {
      const res = placeToolOnTile(
        this.state,
        action.col,
        action.row,
        action.tool as ToolId,
        action.rotation,
        action.freeMode
      );
      if (res.ok) {
        this.sound.playBuild(action.tool === 'road');
        const metrics = this.getCurrentMetrics();
        this.sceneScript.syncCity(this.state, metrics, {
          col: action.col,
          row: action.row,
          action: res.action,
        });
        this.refreshHud();
        this.hud.showToast(
          `${fromName} bouwde ${BUILDING_CATALOG[action.tool as ToolId]?.label || action.tool}`,
          1500
        );
      }
    } else if (action.kind === 'terrain_brush') {
      const changed = paintTerrainBrush(
        this.state,
        action.col,
        action.row,
        action.tool as TerrainToolId,
        action.brushSize,
        true
      );
      if (changed > 0) {
        const metrics = this.getCurrentMetrics();
        this.sceneScript.syncCity(this.state, metrics, {
          col: action.col,
          row: action.row,
          action: 'terrain',
        });
        this.refreshHud();
      }
    } else if (action.kind === 'city_sync') {
      const decoded = decodeCitySharePayload(action.encoded);
      if (decoded) {
        this.state = decoded;
        this.syncAll();
        this.hud.showToast(`${fromName} heeft de stadskaart bijgewerkt.`, 1800);
      }
    }
  }

  private broadcastFullSync(): void {
    if (!this.p2p.getStatus().connected) return;
    this.p2p.broadcastAction(
      {
        kind: 'city_sync',
        encoded: encodeCitySharePayload(this.state),
        author: 'Burgemeester',
      },
      encodeCitySharePayload(this.state)
    );
  }

  private handleTileHover(col: number | null, row: number | null): void {
    this.sceneScript.setHoveredCell(col, row);
    if (
      (this.phase !== 'playing' && this.phase !== 'mapmaker') ||
      col === null ||
      row === null
    ) {
      this.hud.hideToast();
      return;
    }

    const tile = getTile(this.state, col, row);
    const tool = this.state.selectedTool;
    const freeMode = this.phase === 'mapmaker';
    const check = canPlaceOnTile(this.state, col, row, tool, freeMode);

    if (tool === 'bulldoze') {
      if (tile?.building) {
        const label =
          tile.building === 'townhall'
            ? 'Stadhuis (beschermd)'
            : BUILDING_CATALOG[tile.building].label;
        this.hud.showToast(
          check.ok ? `Sloop ${label} (50% terug)` : check.reason || label,
          0
        );
      } else {
        this.hud.hideToast();
      }
      return;
    }

    if (isTerrainTool(tool)) {
      const def = BUILDING_CATALOG[tool];
      const brushText =
        this.phase === 'mapmaker'
          ? this.state.mapBrushSize === 2
            ? '3×3'
            : '1×1'
          : `€${this.state.settings.difficulty === 'sandbox' ? 0 : def.cost}`;
      this.hud.showToast(
        check.ok ? `${def.label} vormen (${brushText})` : check.reason || def.label,
        0
      );
      return;
    }

    if (tile?.building) {
      const existingLabel =
        tile.building === 'townhall'
          ? 'Stadhuis (Stadskern)'
          : BUILDING_CATALOG[tile.building].label;
      this.hud.showToast(`Tegel (${col + 1},${row + 1}): ${existingLabel}`, 0);
    } else {
      const def = BUILDING_CATALOG[tool];
      const isBridgeSpot = tool === 'road' && tile?.terrain === 'water';
      const displayCost =
        this.state.settings.difficulty === 'sandbox'
          ? 0
          : isBridgeSpot
            ? 45
            : def.cost;
      const displayName = isBridgeSpot ? 'Brug bouwen' : `${def.label} bouwen`;
      this.hud.showToast(
        check.ok
          ? `${displayName} (€${displayCost}) · ${def.shortRole}`
          : check.reason || 'Geblokkeerd',
        0
      );
    }
  }

  private handleTileClick(col: number, row: number): void {
    if (this.phase !== 'playing' && this.phase !== 'mapmaker') return;

    if (this.phase === 'mapmaker' && isTerrainTool(this.state.selectedTool)) {
      const changed = paintTerrainBrush(
        this.state,
        col,
        row,
        this.state.selectedTool,
        this.state.mapBrushSize,
        true
      );
      if (changed === 0) {
        this.sound.playError();
        this.hud.showToast('Geen terrein gewijzigd op deze plek.', 1400);
        return;
      }
      this.sound.playBuild(true);
      const metrics = this.getCurrentMetrics();
      this.sceneScript.syncCity(this.state, metrics, {
        col,
        row,
        action: 'terrain',
      });
      this.refreshHud();
      this.p2p.broadcastAction(
        {
          kind: 'terrain_brush',
          col,
          row,
          tool: this.state.selectedTool,
          brushSize: this.state.mapBrushSize,
        },
        encodeCitySharePayload(this.state)
      );
      return;
    }

    const result = placeToolOnTile(
      this.state,
      col,
      row,
      this.state.selectedTool,
      this.state.buildRotation,
      false
    );

    if (!result.ok) {
      this.sound.playError();
      this.hud.showToast(result.reason || 'Kan hier niet bouwen', 1800);
      return;
    }

    this.geminiAdvisorOverride = null;

    if (result.action === 'placed' || result.action === 'terrain') {
      this.sound.playBuild(
        result.building === 'road' || result.action === 'terrain'
      );
    } else if (result.action === 'demolished') {
      this.sound.playDemolish();
      this.hud.showToast(`Gesloopt (+€${result.costDelta} terug)`, 1600);
    }

    const metrics = this.getCurrentMetrics();
    this.sceneScript.syncCity(this.state, metrics, {
      col,
      row,
      action: result.action,
    });
    this.vault.savePlot(this.state.settings.plotId, this.state);
    this.refreshHud();

    this.p2p.broadcastAction(
      {
        kind: 'tile_place',
        col,
        row,
        tool: this.state.selectedTool,
        rotation: this.state.buildRotation,
        freeMode: false,
      },
      encodeCitySharePayload(this.state)
    );
  }

  private syncAll(): void {
    const metrics = this.getCurrentMetrics();
    this.sceneScript.syncCity(this.state, metrics);
    this.sceneScript.applyTimeOfDay(this.state.settings.timeOfDay);
    this.refreshHud();
  }

  private refreshHud(): void {
    const metrics = this.getCurrentMetrics();
    this.hud.update(
      this.state,
      metrics,
      this.phase,
      this.sceneScript.getSkyMode(),
      this.sound.isMuted
    );

    if (this.activeOverlay === 'advisor') {
      const report =
        this.geminiAdvisorOverride ||
        buildRuleBasedAdvisorReport(this.state, metrics);
      this.hud.updateAdvisor(report);
    } else {
      const ruleReport = buildRuleBasedAdvisorReport(this.state, metrics);
      this.hud.updateAdvisor(this.geminiAdvisorOverride || ruleReport);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const shellRoot = document.getElementById('game-shell');
  if (!shellRoot) return;
  const app = new StadBouwerApp(shellRoot);
  void app.boot();
});
