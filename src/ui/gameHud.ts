import {
  BUILDING_CATALOG,
  DATA_OVERLAY_LABELS,
  DIFFICULTY_LABELS,
  DOCK_TAB_LABELS,
  DOCK_TAB_ORDER,
  DOCK_TOOLS_BY_TAB,
  MAP_PRESET_LABELS,
  ORDINANCES,
  TERRAIN_TOOL_ORDER,
  TIME_OF_DAY_LABELS,
} from '../constants';
import {REGIONS} from '../game/regionPresets';
import type {
  AdvisorReport,
  ChatMessageEntry,
  CityMetrics,
  CityState,
  DifficultyMode,
  DisasterKind,
  DockCategory,
  GameOverReason,
  GamePhase,
  GameSettings,
  MapPresetId,
  OnlineRoomSummary,
  OrdinanceId,
  P2PStatus,
  PublishedCitySummary,
  RegionDefinition,
  RegionId,
  RegionPlotSummary,
  TaxRates,
  TimeOfDay,
  ToolId,
  TrafficDensity,
} from '../types';

export type ActiveOverlay =
  | 'none'
  | 'options'
  | 'ai'
  | 'p2p'
  | 'advisor'
  | 'regions'
  | 'budget'
  | 'features';

export type OnlineSubTab = 'rooms' | 'gallery' | 'share';

export interface HudCallbacks {
  onStartGame: () => void;
  onOpenOverlay: (overlay: ActiveOverlay) => void;
  onOpenMapMaker: () => void;
  onFinishMapMaker: () => void;
  onSelectMapPreset: (preset: MapPresetId, randomizeSeed: boolean) => void;
  onSetBrushSize: (size: 1 | 2) => void;
  onResetStarterTown: () => void;
  onSelectTool: (tool: ToolId) => void;
  onSelectDockTab: (tab: DockCategory) => void;
  onRotateBuilding: () => void;
  onRotateBoard: () => void;
  onCycleSpeed: () => void;
  onCycleDataOverlay: () => void;
  onToggleSkyMode: () => void;
  onToggleMute: () => void;
  onToggleAutoBuild: () => void;
  onStepAutoBuildOnce: () => void;
  onApplySettings: (partial: Partial<GameSettings>, regenerateMap: boolean) => void;
  onSelectRegionTab: (regionId: RegionId) => void;
  onSelectPlot: (plotId: string) => void;
  onResetPlot: (plotId: string) => void;
  onSetTaxRates: (taxes: TaxRates) => void;
  onToggleOrdinance: (id: OrdinanceId) => void;
  onAdjustNeighborTrade: (deltaMw: number) => void;
  onTriggerDisaster: (kind: DisasterKind) => void;
  onRunAiCityPlan: (prompt: string) => void;
  onAskAiAdvisor: (question: string) => void;
  onConnectP2P: (roomCode: string, displayName: string, isPublic: boolean) => void;
  onDisconnectP2P: () => void;
  onRefreshOnlineLobby: () => void;
  onPublishCityOnline: (authorName: string) => void;
  onLikeOnlineCity: (cityId: string) => void;
  onLoadOnlineCity: (encoded: string, cityName: string) => void;
  onSendChat: (text: string) => void;
  onCopyShareLink: () => void;
  onExportCityJson: () => void;
  onImportCityPayload: (raw: string) => void;
  onPause: () => void;
  onResume: () => void;
  onContinueEndless: () => void;
  onRestart: () => void;
  onReturnTitle: () => void;
}

function toolSvg(tool: ToolId): string {
  switch (tool) {
    case 'road':
      return `<svg class="sb-tool-svg" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 20L9 4h6l4 16H5z" fill="#475569" stroke="#0f172a" stroke-width="1.5"/>
        <path d="M12 6v3m0 3v3m0 3v1" stroke="#f8fafc" stroke-width="1.8" stroke-linecap="round"/>
      </svg>`;
    case 'trainstation':
      return `<svg class="sb-tool-svg" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 19h18M4 17h16v-5l-4-4H8l-4 4v5z" fill="#c2593f" stroke="#0f172a" stroke-width="1.4" stroke-linejoin="round"/>
        <circle cx="12" cy="11.5" r="2.1" fill="#fef08a" stroke="#0f172a" stroke-width="1"/>
        <rect x="6" y="14" width="12" height="3" rx="0.8" fill="#38bdf8"/>
      </svg>`;
    case 'house':
      return `<svg class="sb-tool-svg" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 11L12 3l9 8v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9z" fill="#f4ece1" stroke="#0f172a" stroke-width="1.5"/>
        <path d="M2 11l10-8 10 8" fill="none" stroke="#c45c3e" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="9.5" y="14" width="5" height="7" rx="0.5" fill="#6b3e26"/>
        <rect x="6" y="12" width="3" height="3" fill="#ffe49e"/>
      </svg>`;
    case 'shop':
      return `<svg class="sb-tool-svg" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5" y="3" width="14" height="18" rx="1.5" fill="#4f82b0" stroke="#0f172a" stroke-width="1.5"/>
        <rect x="7" y="6" width="4" height="3" fill="#bae6fd"/>
        <rect x="13" y="6" width="4" height="3" fill="#bae6fd"/>
        <rect x="7" y="11" width="4" height="3" fill="#ffe49e"/>
        <rect x="13" y="11" width="4" height="3" fill="#ffe49e"/>
        <rect x="7" y="16" width="10" height="4" fill="#ffe49e"/>
      </svg>`;
    case 'park':
      return `<svg class="sb-tool-svg" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="9" cy="9" r="5" fill="#4c9a45" stroke="#0f172a" stroke-width="1.4"/>
        <circle cx="15.5" cy="11" r="4" fill="#5fb351" stroke="#0f172a" stroke-width="1.4"/>
        <rect x="8" y="13" width="2" height="7" fill="#6e472b"/>
        <rect x="14.5" y="14" width="2" height="6" fill="#6e472b"/>
        <path d="M3 20h18" stroke="#34d399" stroke-width="2" stroke-linecap="round"/>
      </svg>`;
    case 'factory':
      return `<svg class="sb-tool-svg" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 20V10l5 3V10l5 3V8h8v12H3z" fill="#9b5446" stroke="#0f172a" stroke-width="1.5" stroke-linejoin="round"/>
        <rect x="16" y="3" width="3" height="6" fill="#64748b" stroke="#0f172a" stroke-width="1.2"/>
        <rect x="6" y="15" width="3" height="3" fill="#ffe49e"/>
        <rect x="11" y="15" width="3" height="3" fill="#ffe49e"/>
      </svg>`;
    case 'seaport':
      return `<svg class="sb-tool-svg" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="15" width="18" height="3" fill="#64748b" stroke="#0f172a" stroke-width="1.2"/>
        <path d="M6 15V5l9 2" fill="none" stroke="#eab308" stroke-width="2" stroke-linecap="round"/>
        <rect x="9" y="11" width="5" height="4" fill="#dc2626" stroke="#0f172a" stroke-width="1"/>
        <rect x="14.5" y="11" width="5" height="4" fill="#2563eb" stroke="#0f172a" stroke-width="1"/>
        <path d="M3 20c3-1.2 6 1.2 9 0s6-1.2 9 0" stroke="#38bdf8" stroke-width="1.7" fill="none"/>
      </svg>`;
    case 'airport':
      return `<svg class="sb-tool-svg" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="15" width="18" height="5" rx="1" fill="#334155" stroke="#0f172a" stroke-width="1.2"/>
        <path d="M5 17.5h14" stroke="#f8fafc" stroke-dasharray="2 2" stroke-width="1.2"/>
        <path d="M12 4l2.5 5 5 1.2-5 1.8V14l-2.5-.8-2.5.8v-2l-5-1.8 5-1.2z" fill="#e2e8f0" stroke="#0f172a" stroke-width="1.1" stroke-linejoin="round"/>
      </svg>`;
    case 'windmill':
      return `<svg class="sb-tool-svg" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M10.5 21L11.5 9h1l1 12h-3z" fill="#f4f6f8" stroke="#0f172a" stroke-width="1.3"/>
        <circle cx="12" cy="8.5" r="2" fill="#f5b942" stroke="#0f172a" stroke-width="1.2"/>
        <path d="M12 6.5V2M13.8 9.5l4 2.3M10.2 9.5l-4 2.3" stroke="#e2e8f0" stroke-width="2" stroke-linecap="round"/>
      </svg>`;
    case 'solarplant':
      return `<svg class="sb-tool-svg" viewBox="0 0 24 24" aria-hidden="true">
        <polygon points="4,15 8,7 20,7 16,15" fill="#1d4ed8" stroke="#fde047" stroke-width="1.4"/>
        <path d="M10 7l-3 8M14 7l-3 8M6 11h12" stroke="#93c5fd" stroke-width="1.1"/>
        <path d="M8 15v4M16 15v4M6 19h12" stroke="#94a3b8" stroke-width="1.6" stroke-linecap="round"/>
      </svg>`;
    case 'powerplant':
      return `<svg class="sb-tool-svg" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 20l2-12h6l2 12H4z" fill="#cbd5e1" stroke="#0f172a" stroke-width="1.4"/>
        <rect x="14" y="10" width="6" height="10" fill="#9b5446" stroke="#0f172a" stroke-width="1.4"/>
        <path d="M5 10h7" stroke="#ef4444" stroke-width="2"/>
        <path d="M11 4l-2 4h3l-2 4" fill="none" stroke="#f5b942" stroke-width="1.8" stroke-linecap="round"/>
      </svg>`;
    case 'nuclear':
      return `<svg class="sb-tool-svg" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 20l2-13h5l2 13H4z" fill="#cbd5e1" stroke="#0f172a" stroke-width="1.3"/>
        <path d="M13 20l1.5-10h4.5l1.5 10H13z" fill="#94a3b8" stroke="#0f172a" stroke-width="1.3"/>
        <circle cx="15" cy="9" r="3" fill="#c084fc" stroke="#0f172a" stroke-width="1.1"/>
        <circle cx="8.5" cy="11" r="1.4" fill="#38bdf8"/>
      </svg>`;
    case 'watertower':
      return `<svg class="sb-tool-svg" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 21l3-9m7 9l-3-9m-4 4h4" stroke="#94a3b8" stroke-width="1.7" stroke-linecap="round"/>
        <rect x="7" y="5" width="10" height="7" rx="1.5" fill="#5093cc" stroke="#0f172a" stroke-width="1.4"/>
        <path d="M6 5l6-3 6 3" fill="#4fa38f" stroke="#0f172a" stroke-width="1.2"/>
      </svg>`;
    case 'police':
      return `<svg class="sb-tool-svg" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z" fill="#2b5998" stroke="#e2e8f0" stroke-width="1.5"/>
        <path d="M12 7l1.2 2.6 2.8.3-2.1 1.9.6 2.8-2.5-1.4-2.5 1.4.6-2.8L8 9.9l2.8-.3z" fill="#f5b942"/>
      </svg>`;
    case 'firestation':
      return `<svg class="sb-tool-svg" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="8" width="16" height="12" rx="1.5" fill="#cc3d35" stroke="#0f172a" stroke-width="1.4"/>
        <rect x="14" y="3" width="4" height="6" fill="#991b1b" stroke="#0f172a" stroke-width="1.2"/>
        <rect x="6" y="13" width="5" height="7" fill="#fef3c7"/>
        <path d="M9 4c1.5 1.8 0 3.2 0 3.2s-1.5-1.4 0-3.2z" fill="#fbbf24"/>
      </svg>`;
    case 'school':
      return `<svg class="sb-tool-svg" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4l9 4-9 4-9-4 9-4z" fill="#eab308" stroke="#0f172a" stroke-width="1.4"/>
        <path d="M6 10v6c0 1.8 2.7 3 6 3s6-1.2 6-3v-6" fill="#c2593f" stroke="#0f172a" stroke-width="1.4"/>
        <circle cx="12" cy="14" r="1.4" fill="#fef08a"/>
      </svg>`;
    case 'university':
      return `<svg class="sb-tool-svg" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3l8 4H4l8-4z" fill="#f5b942" stroke="#0f172a" stroke-width="1.2"/>
        <rect x="4" y="8" width="16" height="11" fill="#e2d5bf" stroke="#0f172a" stroke-width="1.3"/>
        <path d="M7 10v7M10.5 10v7M13.5 10v7M17 10v7" stroke="#475569" stroke-width="1.5"/>
        <rect x="3" y="19" width="18" height="2" fill="#94a3b8"/>
      </svg>`;
    case 'hospital':
      return `<svg class="sb-tool-svg" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="4" width="16" height="16" rx="2" fill="#f1f5f9" stroke="#0f172a" stroke-width="1.4"/>
        <path d="M10.5 7h3v3.5H17v3h-3.5V17h-3v-3.5H7v-3h3.5V7z" fill="#ef4444"/>
      </svg>`;
    case 'stadium':
      return `<svg class="sb-tool-svg" viewBox="0 0 24 24" aria-hidden="true">
        <ellipse cx="12" cy="13" rx="9" ry="6" fill="#e2e8f0" stroke="#0f172a" stroke-width="1.4"/>
        <ellipse cx="12" cy="13" rx="6" ry="3.5" fill="#22c55e" stroke="#15803d" stroke-width="1.2"/>
        <path d="M12 9.5v7M9 13h6" stroke="#f8fafc" stroke-width="0.9"/>
      </svg>`;
    case 'landmark':
      return `<svg class="sb-tool-svg" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 20l1.5-12h3L15 20H9z" fill="#e2e8f0" stroke="#0f172a" stroke-width="1.3"/>
        <path d="M10.5 8L12 3l1.5 5h-3z" fill="#f5b942" stroke="#0f172a" stroke-width="1.1"/>
        <rect x="6" y="19.5" width="12" height="2" rx="1" fill="#f5b942"/>
      </svg>`;
    case 'bulldoze':
      return `<svg class="sb-tool-svg" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 17h11l3-5-3-4H7L5 17z" fill="#ef4444" stroke="#0f172a" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M18 17l3-3v4h-3" fill="#f59e0b" stroke="#0f172a" stroke-width="1.3"/>
        <rect x="4" y="17" width="13" height="3" rx="1.5" fill="#334155"/>
      </svg>`;
    case 'terrain_grass':
      return `<svg class="sb-tool-svg" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="8" width="18" height="10" rx="2" fill="#6ba34a" stroke="#0f172a" stroke-width="1.5"/></svg>`;
    case 'terrain_water':
      return `<svg class="sb-tool-svg" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="8" width="18" height="10" rx="2" fill="#2582b5" stroke="#0f172a" stroke-width="1.5"/><path d="M6 12c2-1.5 4 1.5 6 0s4-1.5 6 0" stroke="#bae6fd" stroke-width="1.5" fill="none"/></svg>`;
    case 'terrain_forest':
      return `<svg class="sb-tool-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4l6 10H6l6-10z" fill="#2e7d32" stroke="#0f172a" stroke-width="1.4"/><rect x="11" y="14" width="2" height="6" fill="#6e472b"/></svg>`;
    case 'terrain_hill':
      return `<svg class="sb-tool-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18c3-8 6-9 9-9s6 1 9 9H3z" fill="#84a955" stroke="#0f172a" stroke-width="1.5"/></svg>`;
    case 'terrain_mountain':
      return `<svg class="sb-tool-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 19L10 5l5 7 3-4 4 11H2z" fill="#767f89" stroke="#0f172a" stroke-width="1.5"/><path d="M7.5 9.5L10 5l2.5 4.5-2.5 1.2z" fill="#eef3f8"/></svg>`;
  }
}

export class GameHud {
  private readonly root: HTMLElement;
  private readonly callbacks: HudCallbacks;

  private activeOverlay: ActiveOverlay = 'none';
  private activeDockTab: DockCategory = 'zones';
  private activeOnlineSubTab: OnlineSubTab = 'rooms';
  private chatHistory: ChatMessageEntry[] = [];

  // HUD stat nodes
  private cityTitleEl!: HTMLElement;
  private tierNameEl!: HTMLElement;
  private specRowEl!: HTMLElement;
  private budgetValEl!: HTMLElement;
  private budgetDeltaEl!: HTMLElement;
  private popValEl!: HTMLElement;
  private popGoalEl!: HTMLElement;
  private happyValEl!: HTMLElement;
  private happyStatusEl!: HTMLElement;
  private powerValEl!: HTMLElement;
  private powerDetailEl!: HTMLElement;
  private rciResBarEl!: HTMLElement;
  private rciComBarEl!: HTMLElement;
  private rciIndBarEl!: HTMLElement;
  private hoverToastEl!: HTMLElement;
  private tickerEl!: HTMLElement;
  private titleOnlineStripEl!: HTMLElement;

  // Controls
  private autoBuildBtnEl!: HTMLButtonElement;
  private dataOverlayBtnEl!: HTMLButtonElement;
  private p2pBtnEl!: HTMLButtonElement;
  private advisorBtnEl!: HTMLButtonElement;
  private speedBtnEl!: HTMLButtonElement;
  private skyBtnEl!: HTMLButtonElement;
  private muteBtnEl!: HTMLButtonElement;
  private rotateBtnEl!: HTMLButtonElement;
  private dockTabButtons = new Map<DockCategory, HTMLButtonElement>();
  private dockGroups = new Map<DockCategory, HTMLElement>();
  private lastSyncedTool: ToolId | null = null;
  private toolButtons = new Map<ToolId, HTMLButtonElement>();
  private terrainToolButtons = new Map<ToolId, HTMLButtonElement>();
  private mapBrushBtn1!: HTMLButtonElement;
  private mapBrushBtn2!: HTMLButtonElement;
  private presetButtons = new Map<MapPresetId, HTMLButtonElement>();

  // Overlays
  private overlayBackdropEl!: HTMLElement;
  private optionsPanelEl!: HTMLElement;
  private aiPanelEl!: HTMLElement;
  private p2pPanelEl!: HTMLElement;
  private regionsPanelEl!: HTMLElement;
  private budgetPanelEl!: HTMLElement;
  private featuresPanelEl!: HTMLElement;
  private advisorDrawerEl!: HTMLElement;

  // Options inputs
  private optCityNameInput!: HTMLInputElement;
  private optDifficultySelect!: HTMLSelectElement;
  private optPresetSelect!: HTMLSelectElement;
  private optTimeSelect!: HTMLSelectElement;
  private optTrafficSelect!: HTMLSelectElement;
  private optDisastersCheck!: HTMLInputElement;
  private optAutoBuildCheck!: HTMLInputElement;

  // Regions elements
  private regionTabsEl!: HTMLElement;
  private regionHeaderEl!: HTMLElement;
  private regionSummaryEl!: HTMLElement;
  private regionGridEl!: HTMLElement;

  // Budget & Ordinances elements
  private taxResSlider!: HTMLInputElement;
  private taxComSlider!: HTMLInputElement;
  private taxIndSlider!: HTMLInputElement;
  private taxResValEl!: HTMLElement;
  private taxComValEl!: HTMLElement;
  private taxIndValEl!: HTMLElement;
  private budgetLedgerEl!: HTMLElement;
  private budgetSpecsEl!: HTMLElement;
  private ordinanceListEl!: HTMLElement;
  private neighborTradeEl!: HTMLElement;

  // AI City Architect inputs
  private aiPromptInput!: HTMLTextAreaElement;
  private aiBuildBtn!: HTMLButtonElement;
  private aiStatusEl!: HTMLElement;

  // Advisor elements
  private advNameEl!: HTMLElement;
  private advRoleEl!: HTMLElement;
  private advHeadlineEl!: HTMLElement;
  private advSummaryEl!: HTMLElement;
  private advTipsEl!: HTMLElement;
  private advQuickToolBtn!: HTMLButtonElement;
  private advQuestionInput!: HTMLInputElement;
  private advAskBtn!: HTMLButtonElement;
  private advAiStatusEl!: HTMLElement;
  private advRecommendedTool: ToolId = 'house';

  // Online / P2P elements
  private p2pNameInput!: HTMLInputElement;
  private p2pRoomInput!: HTMLInputElement;
  private p2pPublicCheck!: HTMLInputElement;
  private p2pConnectBtn!: HTMLButtonElement;
  private p2pDisconnectBtn!: HTMLButtonElement;
  private p2pStatusBadgeEl!: HTMLElement;
  private p2pLogEl!: HTMLElement;
  private p2pPeerListEl!: HTMLElement;
  private p2pImportInput!: HTMLTextAreaElement;
  private onlineRoomsListEl!: HTMLElement;
  private onlineCitiesListEl!: HTMLElement;
  private publishBtnEl!: HTMLButtonElement;
  private publishStatusEl!: HTMLElement;
  private chatLogEl!: HTMLElement;
  private chatInputEl!: HTMLInputElement;
  private liveChatDockEl!: HTMLElement;
  private liveChatFeedEl!: HTMLElement;
  private liveChatInputEl!: HTMLInputElement;
  private onlineSubTabButtons = new Map<OnlineSubTab, HTMLButtonElement>();
  private onlineSubSections = new Map<OnlineSubTab, HTMLElement>();

  // Pause/GameOver modal
  private modalTitleEl!: HTMLElement;
  private modalSubEl!: HTMLElement;
  private modalPopEl!: HTMLElement;
  private modalBudgetEl!: HTMLElement;
  private modalHappyEl!: HTMLElement;
  private modalResumeBtn!: HTMLButtonElement;
  private modalContinueBtn!: HTMLButtonElement;
  private modalRestartBtn!: HTMLButtonElement;

  private toastTimer: number | null = null;

  constructor(root: HTMLElement, callbacks: HudCallbacks) {
    this.root = root;
    this.callbacks = callbacks;
    this.renderShell();
  }

  private renderToolButton(id: ToolId, isTerrainDeck = false): string {
    const def = BUILDING_CATALOG[id];
    const costText = def.cost > 0 ? `€${def.cost}` : '50% terug';
    const dataAttr = isTerrainDeck
      ? `data-terrain-tool="${id}"`
      : `data-tool="${id}"`;
    return `
      <button
        type="button"
        class="sb-tool-btn"
        ${dataAttr}
        aria-label="${def.label} (${def.hotkey}) - ${def.shortRole}"
        aria-pressed="false"
      >
        <span class="sb-tool-key">${def.hotkey}</span>
        ${toolSvg(id)}
        <span class="sb-tool-name">${def.label}</span>
        <span class="sb-tool-cost">${costText}</span>
        <span class="sb-tool-role">${def.shortRole}</span>
      </button>
    `;
  }

  private renderShell(): void {
    const dockTabsHtml = DOCK_TAB_ORDER.map(
      (tab) => `
      <button type="button" class="sb-dock-tab ${tab === this.activeDockTab ? 'is-selected' : ''}" data-dock-tab="${tab}">
        ${DOCK_TAB_LABELS[tab]}
      </button>`
    ).join('');

    const dockGroupsHtml = DOCK_TAB_ORDER.map((tab) => {
      const buttons = DOCK_TOOLS_BY_TAB[tab]
        .map((id) => this.renderToolButton(id, false))
        .join('');
      return `
        <div class="sb-dock-group ${tab === this.activeDockTab ? 'is-active' : ''}" data-dock-group="${tab}">
          ${buttons}
        </div>`;
    }).join('');

    const terrainToolsHtml = TERRAIN_TOOL_ORDER.map((id) =>
      this.renderToolButton(id, true)
    ).join('');

    const presetButtonsHtml = (Object.keys(MAP_PRESET_LABELS) as MapPresetId[])
      .map(
        (key) => `
        <button type="button" class="sb-chip-btn" data-preset="${key}">
          ${MAP_PRESET_LABELS[key].label}
        </button>`
      )
      .join('');

    const regionTabsHtml = REGIONS.map(
      (reg) => `
      <button type="button" class="sb-chip-btn" data-region-tab="${reg.id}">
        ${escapeHtml(reg.name)}
      </button>`
    ).join('');

    const ordinancesHtml = ORDINANCES.map(
      (ord) => `
      <label class="sb-ordinance-row">
        <input type="checkbox" data-ordinance="${ord.id}"/>
        <div class="sb-ordinance-meta">
          <strong>${escapeHtml(ord.label)} <span>(-€${ord.costPerCycle}/cyclus)</span></strong>
          <small>${escapeHtml(ord.desc)}</small>
        </div>
      </label>`
    ).join('');

    this.root.innerHTML = `
      <!-- 1. GROOT HOOFDMENU (TITLE) -->
      <section class="sb-title-overlay" id="title-overlay" aria-label="Hoofdmenu StadBouwer 3000">
        <div class="sb-title-hero">
          <svg class="sb-title-crest" viewBox="0 0 430 86" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="StadBouwer 3000 Mega Editie">
            <rect x="6" y="42" width="18" height="34" rx="2" fill="#233245" stroke="#f5b942" stroke-width="2"/>
            <rect x="28" y="18" width="22" height="58" rx="2" fill="#b84a2e" stroke="#ffe08a" stroke-width="2"/>
            <path d="M28 18L39 7L50 18" fill="#d96748" stroke="#ffe08a" stroke-width="2"/>
            <rect x="35" y="26" width="8" height="8" rx="1" fill="#ffe49e"/>
            <rect x="35" y="40" width="8" height="8" rx="1" fill="#ffe49e"/>
            <rect x="35" y="54" width="8" height="8" rx="1" fill="#ffe49e"/>
            <rect x="54" y="30" width="20" height="46" rx="2" fill="#3a7d6d" stroke="#a7f3d0" stroke-width="2"/>
            <rect x="59" y="38" width="5" height="5" fill="#ffe49e"/>
            <rect x="59" y="49" width="5" height="5" fill="#ffe49e"/>
            <path d="M2 77H78" stroke="#f5b942" stroke-width="2.5" stroke-linecap="round"/>
            <text x="90" y="39" fill="#F7F4EC" font-family="Outfit, sans-serif" font-size="30" font-weight="800" letter-spacing="1">STADBOUWER 3000</text>
            <text x="92" y="63" fill="#F5B942" font-family="Outfit, sans-serif" font-size="13" font-weight="700" letter-spacing="2.4">SIMCITY 3000 + 4 · MEGA EDITIE</text>
          </svg>
          <p class="sb-title-tagline">
            Jouw complete eigen stadsbouw-wereld: 3 onderling verbonden 4×3 SimCity-regio's (36 steden), 20+ gedetailleerde 3D-gebouwen, God-Mode terrein, Gemini AI en Online Multiplayer &amp; Stedengalerij voor iedereen met jouw game-URL.
          </p>

          <div class="sb-title-online-strip">
            <span class="sb-online-dot"></span>
            <span data-title-online-strip>Online lobby laden: kamers &amp; gedeelde steden...</span>
            <button type="button" class="sb-chip-btn is-selected" data-open-p2p="true">Open Online Hub</button>
          </div>

          <div class="sb-cta-row">
            <button type="button" class="sb-btn-primary" data-start="true">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 2.5v11l9-5.5-9-5.5z"/></svg>
              Speel Actieve Stad
            </button>
            <button type="button" class="sb-btn-secondary" data-open-regions="true">
              4×3 Regiokaart (36 Steden)
            </button>
            <button type="button" class="sb-btn-secondary" data-open-p2p="true">
              Online Spelen &amp; Delen
            </button>
          </div>

          <div class="sb-menu-grid">
            <button type="button" class="sb-menu-tile" data-open-regions="true">
              <strong>SimCity 4 Regiokaart (36 Kavels)</strong>
              <span>3× (4×3) aangrenzende dorpen, bruggen &amp; forensenhandel</span>
            </button>
            <button type="button" class="sb-menu-tile" data-open-p2p="true">
              <strong>Online Kamers &amp; Stedengalerij</strong>
              <span>Live kamers, samen bouwen, chatten &amp; steden publiceren</span>
            </button>
            <button type="button" class="sb-menu-tile" data-open-mapmaker="true">
              <strong>Landkaart &amp; God-Mode</strong>
              <span>Vorm rivieren, eilanden, bergen, heuvels &amp; bossen</span>
            </button>
            <button type="button" class="sb-menu-tile" data-open-ai="true">
              <strong>AI Stadsarchitect (Gemini)</strong>
              <span>Laat AI een volledige 16×16 stad met treinen &amp; havens bouwen</span>
            </button>
            <button type="button" class="sb-menu-tile" data-open-budget="true">
              <strong>Begroting, Wetten &amp; Rampen</strong>
              <span>Belastingen, 5 verordeningen, buurhandel &amp; 4 rampen</span>
            </button>
            <button type="button" class="sb-menu-tile" data-open-options="true">
              <strong>Spelopties &amp; Wereld</strong>
              <span>Sandbox/Pro, dag/ochtend/nacht, verkeer &amp; auto-bouw</span>
            </button>
            <button type="button" class="sb-menu-tile" data-open-advisor="true">
              <strong>Stadsadviseur &amp; Auto-Bouw</strong>
              <span>Live diagnose, RCI-vraagmeter &amp; slimme stadsbouw</span>
            </button>
            <button type="button" class="sb-menu-tile" data-open-features="true">
              <strong>Alle 21 Gebouwen &amp; Gids</strong>
              <span>Treinstation, Zeehaven, Luchthaven, Kern, Stadion, Uni...</span>
            </button>
          </div>

          <p class="sb-title-hint">
            Klik tegel om te bouwen · 1-9/0/T/P/V/Z/K/U/S/F/C/H/L Gereedschap · G Datakaart · R Draai gebouw · Q/E Draai tafel · Esc Pauze
          </p>
        </div>
      </section>

      <!-- 2. LANDKAART MAKER HUD -->
      <section class="sb-mapmaker-hud" id="mapmaker-hud" aria-label="Landkaart Maker">
        <div class="sb-top-bar">
          <div class="sb-panel-pill">
            <span class="sb-stat-label">LANDKAART MAKER (16×16)</span>
            <div class="sb-chip-row">${presetButtonsHtml}</div>
            <button type="button" class="sb-util-btn" data-new-seed="true">Nieuw Zaad</button>
            <button type="button" class="sb-util-btn" data-brush="1" aria-pressed="true">Kwast 1×1</button>
            <button type="button" class="sb-util-btn" data-brush="2" aria-pressed="false">Kwast 3×3</button>
          </div>
          <div class="sb-util-cluster">
            <button type="button" class="sb-util-btn" data-reset-town="true">Startdorp Plaatsen</button>
            <button type="button" class="sb-btn-primary sb-btn-compact" data-finish-mapmaker="true">Bouw op deze kaart!</button>
          </div>
        </div>

        <div class="sb-bottom-region">
          <nav class="sb-tool-dock" aria-label="Terrein gereedschap">
            ${terrainToolsHtml}
            <button type="button" class="sb-tool-btn sb-tool-rotate" data-mm-back="true">
              <span class="sb-tool-name">Hoofdmenu</span>
              <span class="sb-tool-role">Terug</span>
            </button>
          </nav>
        </div>
      </section>

      <!-- 3. PLAYING HUD -->
      <section class="sb-playing-hud" id="hud-overlay" aria-label="Stadsbesturing">
        <div class="sb-top-bar">
          <div class="sb-stats-cluster">
            <div class="sb-stat-pill sb-tier-pill">
              <span class="sb-stat-label" data-city-name>Nieuw-Amsterdam</span>
              <span class="sb-stat-val sb-tier-name" data-tier>Stad</span>
              <div class="sb-spec-row" data-spec-row></div>
            </div>
            <div class="sb-stat-pill">
              <span class="sb-stat-label">Budget</span>
              <span class="sb-stat-val" data-budget>€1850</span>
              <span class="sb-stat-sub" data-budget-delta>+€55/cyclus</span>
            </div>
            <div class="sb-stat-pill">
              <span class="sb-stat-label">Inwoners</span>
              <span class="sb-stat-val" data-pop>82</span>
              <span class="sb-stat-sub" data-pop-goal>Doel: 90</span>
            </div>
            <div class="sb-stat-pill">
              <span class="sb-stat-label">Geluk &amp; Waarde</span>
              <span class="sb-stat-val" data-happy>82%</span>
              <span class="sb-stat-sub" data-happy-status>Waarde 65% · Veilig 70%</span>
            </div>
            <div class="sb-stat-pill">
              <span class="sb-stat-label">Stroom</span>
              <span class="sb-stat-val" data-power>+16</span>
              <span class="sb-stat-sub" data-power-detail>24 / 8 MW</span>
            </div>
            <div class="sb-stat-pill sb-rci-pill" title="RCI Vraagmeter (Woon / Commercie / Industrie)">
              <span class="sb-stat-label">RCI Vraag</span>
              <div class="sb-rci-bars">
                <div class="sb-rci-col"><span class="sb-rci-track"><i data-rci-res class="sb-rci-fill is-res"></i></span><b>R</b></div>
                <div class="sb-rci-col"><span class="sb-rci-track"><i data-rci-com class="sb-rci-fill is-com"></i></span><b>C</b></div>
                <div class="sb-rci-col"><span class="sb-rci-track"><i data-rci-ind class="sb-rci-fill is-ind"></i></span><b>I</b></div>
              </div>
            </div>
          </div>

          <div class="sb-util-cluster">
            <button type="button" class="sb-util-btn" data-open-regions="true" aria-label="SimCity 4 Regiokaart en steden">Regio (4×3)</button>
            <button type="button" class="sb-util-btn" data-open-budget="true" aria-label="Begroting, belastingen en wetten">Begroting</button>
            <button type="button" class="sb-util-btn" data-cycle-overlay="true" aria-label="Wissel datakaart (G)">Laag: Normaal</button>
            <button type="button" class="sb-util-btn sb-util-advisor" data-open-advisor="true" aria-label="Stadsadviseur openen">Adviseur</button>
            <button type="button" class="sb-util-btn" data-toggle-autobuild="true" aria-pressed="false" aria-label="Auto Stad Bouwen aan/uit">Auto-Bouw: Uit</button>
            <button type="button" class="sb-util-btn" data-open-ai="true" aria-label="AI Stadsarchitect">AI Bouw</button>
            <button type="button" class="sb-util-btn" data-open-p2p="true" aria-label="Online Kamers, Stedengalerij & P2P">Online</button>
            <button type="button" class="sb-util-btn" data-open-mapmaker="true" aria-label="Landkaart bewerken">Kaart</button>
            <button type="button" class="sb-util-btn" data-open-options="true" aria-label="Spelopties">Opties</button>
            <button type="button" class="sb-util-btn" data-rotate-board="true" aria-label="Draai stadstafel">Tafel</button>
            <button type="button" class="sb-util-btn" data-speed="true" aria-label="Simulatiesnelheid">1×</button>
            <button type="button" class="sb-util-btn" data-sky="true" aria-label="Wissel Lucht of AR Kamer">Lucht</button>
            <button type="button" class="sb-util-btn" data-mute="true" aria-label="Geluid aan/uit">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>
            </button>
            <button type="button" class="sb-util-btn" data-pause="true" aria-label="Pauze">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
            </button>
          </div>
        </div>

        <!-- COMPACT IN-GAME ONLINE CHAT DOCK (ALLEEN ZICHTBAAR INDIEN VERBONDEN) -->
        <aside class="sb-live-chat-dock" id="live-chat-dock" aria-label="Online Burgemeester Chat">
          <div class="sb-live-chat-head">
            <span>Online Kamer Chat</span>
            <button type="button" class="sb-chip-btn" data-open-p2p="true">Lobby</button>
          </div>
          <div class="sb-live-chat-feed" data-live-chat-feed></div>
          <div class="sb-live-chat-form">
            <input type="text" class="sb-input" data-live-chat-input placeholder="Typ bericht..." maxlength="160"/>
            <button type="button" class="sb-btn-primary sb-btn-compact" data-live-chat-send="true">Stuur</button>
          </div>
        </aside>

        <!-- STADSADVISEUR DRAWER -->
        <aside class="sb-advisor-drawer" id="advisor-drawer" aria-hidden="true" aria-label="Stadsadviseur">
          <div class="sb-drawer-head">
            <div>
              <strong data-adv-name>Arch. Lotte van Dijk</strong>
              <span class="sb-adv-role" data-adv-role>Hoofd Stedenbouw</span>
            </div>
            <button type="button" class="sb-close-x" data-close-overlay="true" aria-label="Sluit adviseur">×</button>
          </div>
          <h3 class="sb-adv-headline" data-adv-headline>Advies laden...</h3>
          <p class="sb-adv-summary" data-adv-summary></p>
          <ul class="sb-adv-tips" data-adv-tips></ul>
          <div class="sb-adv-actions">
            <button type="button" class="sb-btn-secondary" data-adv-select-tool="true">Selecteer Aanbevolen Tool</button>
            <button type="button" class="sb-btn-secondary" data-step-autobuild="true">Bouw 1 Wijk (Auto)</button>
          </div>
          <div class="sb-adv-ask">
            <input type="text" class="sb-input" data-adv-question placeholder="Vraag Gemini Adviseur (bijv. hoe meer hoogbouw?)"/>
            <button type="button" class="sb-btn-primary sb-btn-compact" data-adv-ask="true">Vraag AI</button>
          </div>
          <p class="sb-status-note" data-adv-ai-status></p>
        </aside>

        <div class="sb-bottom-region">
          <div class="sb-hover-toast" data-toast aria-live="polite"></div>
          <div class="sb-ticker-bar" data-ticker>StadBouwer 3000 · Welkom burgemeester!</div>
          <div class="sb-dock-tabs" role="tablist" aria-label="Bouwcategorieën">
            ${dockTabsHtml}
          </div>
          <nav class="sb-tool-dock" aria-label="Bouwgereedschap">
            ${dockGroupsHtml}
            <button type="button" class="sb-tool-btn sb-tool-rotate" data-rotate-building="true" aria-label="Draai gebouw (R)">
              <span class="sb-tool-key">R</span>
              <svg class="sb-tool-svg" viewBox="0 0 24 24" fill="none" stroke="#f5b942" stroke-width="2" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3.2-6.9"/><polyline points="21 3 21 9 15 9"/></svg>
              <span class="sb-tool-name">Draaien</span>
              <span class="sb-tool-cost" data-rot-deg>0°</span>
              <span class="sb-tool-role">Richting</span>
            </button>
          </nav>
        </div>
      </section>

      <!-- 4. MODAL OVERLAYS (REGIO'S, BEGROTING & WETTEN, OPTIES, AI ARCHITECT, ONLINE & P2P, FUNCTIES) -->
      <div class="sb-overlay-backdrop" id="overlay-backdrop" aria-hidden="true">
        <!-- SIMCITY 4 REGIOKAART: 4x3 AANGRENZENDE KAVELS -->
        <div class="sb-dialog-card sb-dialog-mega" id="regions-panel" role="dialog" aria-modal="true" aria-label="SimCity 4 Regiokaart">
          <div class="sb-drawer-head">
            <h2>SimCity 4 Regiokaart · Aangrenzende Dorpen &amp; Steden (36 Kavels)</h2>
            <button type="button" class="sb-close-x" data-close-overlay="true" aria-label="Sluit regio overzicht">×</button>
          </div>
          <div class="sb-chip-row" data-region-tabs>${regionTabsHtml}</div>
          <div class="sb-region-banner">
            <div data-region-header></div>
            <div class="sb-region-totals" data-region-summary></div>
          </div>
          <div class="sb-region-mosaic" data-region-grid></div>
        </div>

        <!-- BEGROTING, BELASTINGEN, VERORDENINGEN & RAMPEN -->
        <div class="sb-dialog-card sb-dialog-wide" id="budget-panel" role="dialog" aria-modal="true" aria-label="Begroting, Belastingen en Wetten">
          <div class="sb-drawer-head">
            <h2>Begroting, Belastingen, Specialisaties &amp; Wetten</h2>
            <button type="button" class="sb-close-x" data-close-overlay="true" aria-label="Sluit begroting">×</button>
          </div>
          <div class="sb-budget-specs" data-budget-specs></div>
          <div class="sb-budget-cols">
            <div class="sb-budget-box">
              <h3>Belastingtarieven &amp; Kasboek</h3>
              <label class="sb-slider-row">
                <span>Woonbelasting (R): <strong data-tax-res-val>7%</strong></span>
                <input type="range" min="0" max="15" step="1" value="7" data-tax-res/>
              </label>
              <label class="sb-slider-row">
                <span>Commerciebelasting (C): <strong data-tax-com-val>7%</strong></span>
                <input type="range" min="0" max="15" step="1" value="7" data-tax-com/>
              </label>
              <label class="sb-slider-row">
                <span>Industriebelasting (I): <strong data-tax-ind-val>7%</strong></span>
                <input type="range" min="0" max="15" step="1" value="7" data-tax-ind/>
              </label>
              <div class="sb-ledger" data-budget-ledger></div>
              <div class="sb-trade-box">
                <strong>Regionale Buurhandel Stroom</strong>
                <span data-neighbor-trade>Geen handel (0 MW)</span>
                <div class="sb-chip-row">
                  <button type="button" class="sb-chip-btn" data-trade-delta="-10">Verkoop 10 MW (+€30)</button>
                  <button type="button" class="sb-chip-btn" data-trade-delta="0">Stop Handel</button>
                  <button type="button" class="sb-chip-btn" data-trade-delta="10">Koop 10 MW (-€30)</button>
                </div>
              </div>
            </div>
            <div class="sb-budget-box">
              <h3>Stadsverordeningen (Wetten)</h3>
              <div class="sb-ordinance-list" data-ordinance-list>
                ${ordinancesHtml}
              </div>
              <hr class="sb-divider"/>
              <div class="sb-trade-box">
                <strong>SimCity Rampen Simulatie</strong>
                <div class="sb-chip-row">
                  <button type="button" class="sb-chip-btn" data-disaster="storm">Zomerstorm</button>
                  <button type="button" class="sb-chip-btn" data-disaster="fire">Stadsbrand</button>
                  <button type="button" class="sb-chip-btn" data-disaster="earthquake">Aardbeving</button>
                  <button type="button" class="sb-chip-btn" data-disaster="ufo">UFO Bezoek</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- SPELOPTIES -->
        <div class="sb-dialog-card" id="options-panel" role="dialog" aria-modal="true" aria-label="Spelopties">
          <div class="sb-drawer-head">
            <h2>Spelopties &amp; Wereldinstellingen</h2>
            <button type="button" class="sb-close-x" data-close-overlay="true" aria-label="Sluit opties">×</button>
          </div>
          <div class="sb-form-grid">
            <label class="sb-field">
              <span>Stadsnaam</span>
              <input type="text" class="sb-input" data-opt-cityname value="Nieuw-Amsterdam" maxlength="24"/>
            </label>
            <label class="sb-field">
              <span>Moeilijkheidsgraad</span>
              <select class="sb-select" data-opt-difficulty>
                <option value="sandbox">Sandbox (Vrij Bouwen · €99.999)</option>
                <option value="normal" selected>Normaal (Klassieke Balans)</option>
                <option value="hard">Uitdagend (Burgemeester Pro)</option>
              </select>
            </label>
            <label class="sb-field">
              <span>Landkaart Preset (16×16)</span>
              <select class="sb-select" data-opt-preset>
                <option value="polder">Polder &amp; Rivier</option>
                <option value="river">Rivierdelta (Bruggen)</option>
                <option value="islands">Eilandenarchipel</option>
                <option value="valley">Bergvallei</option>
                <option value="random">Willekeurige Zaadkaart</option>
              </select>
            </label>
            <label class="sb-field">
              <span>Tijd van de Dag &amp; Sfeer</span>
              <select class="sb-select" data-opt-time>
                <option value="morning">Ochtendgloed</option>
                <option value="day" selected>Heldere Dag</option>
                <option value="sunset">Gouden Schemering</option>
                <option value="night">Verlichte Nacht</option>
              </select>
            </label>
            <label class="sb-field">
              <span>Verkeersdichtheid</span>
              <select class="sb-select" data-opt-traffic>
                <option value="low">Rustig (4 auto's)</option>
                <option value="normal" selected>Normaal (9 auto's)</option>
                <option value="busy">Spitsuur (16 auto's)</option>
              </select>
            </label>
            <div class="sb-field sb-checks">
              <label class="sb-check-row"><input type="checkbox" data-opt-disasters checked/><span>SimCity Rampen &amp; Stormen</span></label>
              <label class="sb-check-row"><input type="checkbox" data-opt-autobuild/><span>Auto-Bouw Autonome Groei</span></label>
            </div>
          </div>
          <div class="sb-modal-actions">
            <button type="button" class="sb-btn-primary" data-apply-options="live">Opslaan &amp; Toepassen</button>
            <button type="button" class="sb-btn-secondary" data-apply-options="newmap">Start Op Nieuwe Kaart</button>
          </div>
        </div>

        <!-- AI STADSARCHITECT -->
        <div class="sb-dialog-card" id="ai-panel" role="dialog" aria-modal="true" aria-label="AI Stadsarchitect">
          <div class="sb-drawer-head">
            <h2>AI Stadsarchitect (Gemini)</h2>
            <button type="button" class="sb-close-x" data-close-overlay="true" aria-label="Sluit AI Architect">×</button>
          </div>
          <p class="sb-modal-sub">Beschrijf wat voor stad, haven of metropool je wilt bouwen. Gemini ontwerpt wegen, treinstations, havens, luchthavens, hoogbouw, universiteit, stadion en groene of nucleaire energie rond jouw 16×16 terrein.</p>
          <div class="sb-chip-row">
            <button type="button" class="sb-chip-btn" data-ai-preset="Een duurzame haven- &amp; kennisstad met zeehaven, treinstation, universiteit, zonnepark en woonwijken langs de brug.">Haven- &amp; Kennisstad</button>
            <button type="button" class="sb-chip-btn" data-ai-preset="Een bruisende SimCity metropool met luchthaven, stadion, wolkenkrabbers, ziekenhuis, brandweer en kerncentrale.">Mega Metropool</button>
            <button type="button" class="sb-chip-btn" data-ai-preset="Een gezellig Nederlands polderdorp met treinstation, boerderij-parkjes, school, windmolens en bakstenen huisjes.">Nederlands Polderdorp</button>
          </div>
          <textarea class="sb-textarea" data-ai-prompt rows="3" placeholder="Bijv: Bouw een levendige kustmetropool met brug, zeehaven, stadion, universiteit en zonneparken..."></textarea>
          <p class="sb-status-note" data-ai-status></p>
          <div class="sb-modal-actions">
            <button type="button" class="sb-btn-primary" data-ai-build="true">Ontwerp &amp; Bouw met AI</button>
            <button type="button" class="sb-btn-secondary" data-step-autobuild="true">Auto-Bouw (Zonder API)</button>
          </div>
        </div>

        <!-- ONLINE SPELEN, LIVE KAMERS, GALERIJ & PEER-TO-PEER DELEN -->
        <div class="sb-dialog-card sb-dialog-wide" id="p2p-panel" role="dialog" aria-modal="true" aria-label="Online Spelen en Delen">
          <div class="sb-drawer-head">
            <h2>Online Spelen &amp; Steden Delen (Multiplayer Lobby)</h2>
            <button type="button" class="sb-close-x" data-close-overlay="true" aria-label="Sluit Online Hub">×</button>
          </div>

          <div class="sb-p2p-status-bar">
            <span class="sb-badge" data-p2p-badge>Offline</span>
            <span data-p2p-log>Niet verbonden met een online kamer.</span>
          </div>

          <div class="sb-chip-row sb-online-tabs" role="tablist">
            <button type="button" class="sb-chip-btn is-selected" data-online-tab="rooms">Live Online Kamers</button>
            <button type="button" class="sb-chip-btn" data-online-tab="gallery">Gedeelde Steden Galerij</button>
            <button type="button" class="sb-chip-btn" data-online-tab="share">Chat, Links &amp; JSON</button>
          </div>

          <!-- SUBTAB 1: LIVE ONLINE KAMERS -->
          <div class="sb-online-section is-active" data-online-section="rooms">
            <div class="sb-form-grid">
              <label class="sb-field">
                <span>Jouw Burgemeesternaam</span>
                <input type="text" class="sb-input" data-p2p-name value="Burgemeester" maxlength="20"/>
              </label>
              <label class="sb-field">
                <span>Kamercode (Maak zelf of sluit aan)</span>
                <input type="text" class="sb-input" data-p2p-room placeholder="STAD-3000" maxlength="14"/>
              </label>
            </div>
            <label class="sb-check-row">
              <input type="checkbox" data-p2p-public checked/>
              <span>Openbare kamer (zichtbaar voor andere spelers met jouw game-URL)</span>
            </label>
            <div class="sb-modal-actions">
              <button type="button" class="sb-btn-primary" data-p2p-connect="true">Start / Verbind Online Kamer</button>
              <button type="button" class="sb-btn-secondary" data-p2p-disconnect="true">Verbreek</button>
              <button type="button" class="sb-btn-secondary" data-refresh-lobby="true">Vernieuw Kamers</button>
            </div>
            <div class="sb-online-list" data-online-rooms-list>
              <p class="sb-peer-empty">Online kamers ophalen...</p>
            </div>
          </div>

          <!-- SUBTAB 2: GEDEELDE STEDEN GALERIJ -->
          <div class="sb-online-section" data-online-section="gallery">
            <div class="sb-publish-bar">
              <div>
                <strong>Deel jouw stad met de hele community</strong>
                <small>Iedereen met jouw gedeelde game-URL kan jouw creatie bekijken, liken en verder bouwen!</small>
              </div>
              <button type="button" class="sb-btn-primary sb-btn-compact" data-publish-city="true">Publiceer Huidige Stad Online</button>
            </div>
            <p class="sb-status-note" data-publish-status></p>
            <div class="sb-online-list" data-online-cities-list>
              <p class="sb-peer-empty">Gedeelde steden ophalen...</p>
            </div>
          </div>

          <!-- SUBTAB 3: CHAT, LINKS & JSON -->
          <div class="sb-online-section" data-online-section="share">
            <div class="sb-peer-list" data-p2p-peers></div>
            <div class="sb-chat-panel">
              <strong>Live Kamer Chat</strong>
              <div class="sb-chat-log" data-chat-log>
                <span class="sb-peer-empty">Verbind eerst met een kamer om te chatten met medespelers.</span>
              </div>
              <div class="sb-adv-ask">
                <input type="text" class="sb-input" data-chat-input placeholder="Typ een bericht aan je medespelers..." maxlength="180"/>
                <button type="button" class="sb-btn-primary sb-btn-compact" data-chat-send="true">Verstuur</button>
              </div>
            </div>
            <hr class="sb-divider"/>
            <div class="sb-share-export">
              <div class="sb-modal-actions">
                <button type="button" class="sb-btn-secondary" data-copy-share="true">Kopieer Directe Game-URL</button>
                <button type="button" class="sb-btn-secondary" data-export-json="true">Exporteer Stad (.json)</button>
                <button type="button" class="sb-btn-secondary" data-import-btn="true">Importeer Stadscode / JSON</button>
              </div>
              <textarea class="sb-textarea" data-p2p-import rows="2" placeholder="Plak hier een gedeelde stadscode, URL of JSON om een stad te laden..."></textarea>
            </div>
          </div>
        </div>

        <!-- ALLE FUNCTIES & SNELTOETSEN GIDS -->
        <div class="sb-dialog-card sb-dialog-wide" id="features-panel" role="dialog" aria-modal="true" aria-label="Alle Functies en Gids">
          <div class="sb-drawer-head">
            <h2>Alle SimCity 3000 + 4 Functies &amp; Bouwgids</h2>
            <button type="button" class="sb-close-x" data-close-overlay="true" aria-label="Sluit Gids">×</button>
          </div>
          <div class="sb-features-grid">
            <div class="sb-budget-box">
              <h3>SimCity 4 Regio's &amp; Synergie</h3>
              <p class="sb-modal-sub">3 grote 4×3 regiokaarten (36 steden). Aangrenzende steden leveren automatisch forensen-inkomsten en extra R/C/I-vraag via onderlinge weg- &amp; spoorgrenzen.</p>
              <h3>21 Bouw- &amp; 5 Terreintools</h3>
              <p class="sb-modal-sub">Nieuw: Treinstation (T), Zeehaven (P), Luchthaven (V), Zonnepark (Z), Kerncentrale (K), Universiteit (U) &amp; Stadion (S) plus God-Mode Terrein in alle spellen!</p>
            </div>
            <div class="sb-budget-box">
              <h3>Online Spelen &amp; AI Architect</h3>
              <p class="sb-modal-sub">Start een openbare kamer zodat vrienden die op jouw link klikken direct kunnen aansluiten via WebRTC/WebSocket, live chatten en steden publiceren in de Galerij.</p>
              <h3>Sneltoetsen</h3>
              <p class="sb-modal-sub">1-9/0 = Basistools · T/P/V/Z/K/U/S/F/C/H/L = Nieuwe &amp; Diensten gebouwen · G = Datakaarten · R = Draai gebouw · Q/E = Draai tafel · Esc = Pauze.</p>
            </div>
          </div>
          <div class="sb-modal-actions">
            <button type="button" class="sb-btn-primary" data-close-overlay="true">Terug naar bouwen</button>
          </div>
        </div>
      </div>

      <!-- 5. PAUSE / GAME OVER MODAL -->
      <div class="sb-modal-overlay" id="modal-overlay" aria-hidden="true">
        <div class="sb-modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <h2 class="sb-modal-title" id="modal-title" data-modal-title>Spel Gepauzeerd</h2>
          <p class="sb-modal-sub" data-modal-sub>Jouw stad wacht op je volgende bouwplan.</p>
          <div class="sb-modal-stats">
            <div class="sb-modal-stat">
              <span class="sb-modal-stat-label">Inwoners</span>
              <span class="sb-modal-stat-val" data-modal-pop>32</span>
            </div>
            <div class="sb-modal-stat">
              <span class="sb-modal-stat-label">Budget</span>
              <span class="sb-modal-stat-val" data-modal-budget>€1850</span>
            </div>
            <div class="sb-modal-stat">
              <span class="sb-modal-stat-label">Geluk</span>
              <span class="sb-modal-stat-val" data-modal-happy>82%</span>
            </div>
          </div>
          <div class="sb-modal-actions">
            <button type="button" class="sb-btn-primary" data-modal-resume="true">Hervatten</button>
            <button type="button" class="sb-btn-primary is-hidden" data-modal-continue="true">Verder Bouwen</button>
            <button type="button" class="sb-btn-secondary" data-modal-restart="true">Opnieuw</button>
            <button type="button" class="sb-btn-secondary" data-modal-titlebtn="true">Hoofdmenu</button>
          </div>
        </div>
      </div>
    `;

    this.bindElements();
  }

  private bindElements(): void {
    this.cityTitleEl = this.root.querySelector('[data-city-name]')!;
    this.tierNameEl = this.root.querySelector('[data-tier]')!;
    this.specRowEl = this.root.querySelector('[data-spec-row]')!;
    this.budgetValEl = this.root.querySelector('[data-budget]')!;
    this.budgetDeltaEl = this.root.querySelector('[data-budget-delta]')!;
    this.popValEl = this.root.querySelector('[data-pop]')!;
    this.popGoalEl = this.root.querySelector('[data-pop-goal]')!;
    this.happyValEl = this.root.querySelector('[data-happy]')!;
    this.happyStatusEl = this.root.querySelector('[data-happy-status]')!;
    this.powerValEl = this.root.querySelector('[data-power]')!;
    this.powerDetailEl = this.root.querySelector('[data-power-detail]')!;
    this.rciResBarEl = this.root.querySelector('[data-rci-res]')!;
    this.rciComBarEl = this.root.querySelector('[data-rci-com]')!;
    this.rciIndBarEl = this.root.querySelector('[data-rci-ind]')!;
    this.hoverToastEl = this.root.querySelector('[data-toast]')!;
    this.tickerEl = this.root.querySelector('[data-ticker]')!;
    this.titleOnlineStripEl = this.root.querySelector('[data-title-online-strip]')!;

    this.autoBuildBtnEl = this.root.querySelector('[data-toggle-autobuild]')!;
    this.dataOverlayBtnEl = this.root.querySelector('[data-cycle-overlay]')!;
    this.p2pBtnEl = this.root.querySelector('#hud-overlay [data-open-p2p]')!;
    this.advisorBtnEl = this.root.querySelector('#hud-overlay [data-open-advisor]')!;
    this.speedBtnEl = this.root.querySelector('[data-speed]')!;
    this.skyBtnEl = this.root.querySelector('[data-sky]')!;
    this.muteBtnEl = this.root.querySelector('[data-mute]')!;
    this.rotateBtnEl = this.root.querySelector('[data-rot-deg]')!;

    this.overlayBackdropEl = this.root.querySelector('#overlay-backdrop')!;
    this.optionsPanelEl = this.root.querySelector('#options-panel')!;
    this.aiPanelEl = this.root.querySelector('#ai-panel')!;
    this.p2pPanelEl = this.root.querySelector('#p2p-panel')!;
    this.regionsPanelEl = this.root.querySelector('#regions-panel')!;
    this.budgetPanelEl = this.root.querySelector('#budget-panel')!;
    this.featuresPanelEl = this.root.querySelector('#features-panel')!;
    this.advisorDrawerEl = this.root.querySelector('#advisor-drawer')!;

    this.regionTabsEl = this.root.querySelector('[data-region-tabs]')!;
    this.regionHeaderEl = this.root.querySelector('[data-region-header]')!;
    this.regionSummaryEl = this.root.querySelector('[data-region-summary]')!;
    this.regionGridEl = this.root.querySelector('[data-region-grid]')!;

    this.taxResSlider = this.root.querySelector('[data-tax-res]')!;
    this.taxComSlider = this.root.querySelector('[data-tax-com]')!;
    this.taxIndSlider = this.root.querySelector('[data-tax-ind]')!;
    this.taxResValEl = this.root.querySelector('[data-tax-res-val]')!;
    this.taxComValEl = this.root.querySelector('[data-tax-com-val]')!;
    this.taxIndValEl = this.root.querySelector('[data-tax-ind-val]')!;
    this.budgetLedgerEl = this.root.querySelector('[data-budget-ledger]')!;
    this.budgetSpecsEl = this.root.querySelector('[data-budget-specs]')!;
    this.ordinanceListEl = this.root.querySelector('[data-ordinance-list]')!;
    this.neighborTradeEl = this.root.querySelector('[data-neighbor-trade]')!;

    this.optCityNameInput = this.root.querySelector('[data-opt-cityname]')!;
    this.optDifficultySelect = this.root.querySelector('[data-opt-difficulty]')!;
    this.optPresetSelect = this.root.querySelector('[data-opt-preset]')!;
    this.optTimeSelect = this.root.querySelector('[data-opt-time]')!;
    this.optTrafficSelect = this.root.querySelector('[data-opt-traffic]')!;
    this.optDisastersCheck = this.root.querySelector('[data-opt-disasters]')!;
    this.optAutoBuildCheck = this.root.querySelector('[data-opt-autobuild]')!;

    this.aiPromptInput = this.root.querySelector('[data-ai-prompt]')!;
    this.aiBuildBtn = this.root.querySelector('[data-ai-build]')!;
    this.aiStatusEl = this.root.querySelector('[data-ai-status]')!;

    this.advNameEl = this.root.querySelector('[data-adv-name]')!;
    this.advRoleEl = this.root.querySelector('[data-adv-role]')!;
    this.advHeadlineEl = this.root.querySelector('[data-adv-headline]')!;
    this.advSummaryEl = this.root.querySelector('[data-adv-summary]')!;
    this.advTipsEl = this.root.querySelector('[data-adv-tips]')!;
    this.advQuickToolBtn = this.root.querySelector('[data-adv-select-tool]')!;
    this.advQuestionInput = this.root.querySelector('[data-adv-question]')!;
    this.advAskBtn = this.root.querySelector('[data-adv-ask]')!;
    this.advAiStatusEl = this.root.querySelector('[data-adv-ai-status]')!;

    this.p2pNameInput = this.root.querySelector('[data-p2p-name]')!;
    this.p2pRoomInput = this.root.querySelector('[data-p2p-room]')!;
    this.p2pPublicCheck = this.root.querySelector('[data-p2p-public]')!;
    this.p2pConnectBtn = this.root.querySelector('[data-p2p-connect]')!;
    this.p2pDisconnectBtn = this.root.querySelector('[data-p2p-disconnect]')!;
    this.p2pStatusBadgeEl = this.root.querySelector('[data-p2p-badge]')!;
    this.p2pLogEl = this.root.querySelector('[data-p2p-log]')!;
    this.p2pPeerListEl = this.root.querySelector('[data-p2p-peers]')!;
    this.p2pImportInput = this.root.querySelector('[data-p2p-import]')!;
    this.onlineRoomsListEl = this.root.querySelector('[data-online-rooms-list]')!;
    this.onlineCitiesListEl = this.root.querySelector('[data-online-cities-list]')!;
    this.publishBtnEl = this.root.querySelector('[data-publish-city]')!;
    this.publishStatusEl = this.root.querySelector('[data-publish-status]')!;
    this.chatLogEl = this.root.querySelector('[data-chat-log]')!;
    this.chatInputEl = this.root.querySelector('[data-chat-input]')!;
    this.liveChatDockEl = this.root.querySelector('#live-chat-dock')!;
    this.liveChatFeedEl = this.root.querySelector('[data-live-chat-feed]')!;
    this.liveChatInputEl = this.root.querySelector('[data-live-chat-input]')!;

    this.mapBrushBtn1 = this.root.querySelector('[data-brush="1"]')!;
    this.mapBrushBtn2 = this.root.querySelector('[data-brush="2"]')!;

    this.modalTitleEl = this.root.querySelector('[data-modal-title]')!;
    this.modalSubEl = this.root.querySelector('[data-modal-sub]')!;
    this.modalPopEl = this.root.querySelector('[data-modal-pop]')!;
    this.modalBudgetEl = this.root.querySelector('[data-modal-budget]')!;
    this.modalHappyEl = this.root.querySelector('[data-modal-happy]')!;
    this.modalResumeBtn = this.root.querySelector('[data-modal-resume]')!;
    this.modalContinueBtn = this.root.querySelector('[data-modal-continue]')!;
    this.modalRestartBtn = this.root.querySelector('[data-modal-restart]')!;

    this.root
      .querySelectorAll<HTMLButtonElement>('[data-dock-tab]')
      .forEach((btn) => {
        const tab = btn.dataset.dockTab as DockCategory;
        this.dockTabButtons.set(tab, btn);
        btn.addEventListener('click', () => this.callbacks.onSelectDockTab(tab));
      });
    this.root
      .querySelectorAll<HTMLElement>('[data-dock-group]')
      .forEach((grp) => {
        this.dockGroups.set(grp.dataset.dockGroup as DockCategory, grp);
      });

    this.root
      .querySelectorAll<HTMLButtonElement>('[data-online-tab]')
      .forEach((btn) => {
        const sub = btn.dataset.onlineTab as OnlineSubTab;
        this.onlineSubTabButtons.set(sub, btn);
        btn.addEventListener('click', () => this.setOnlineSubTab(sub));
      });
    this.root
      .querySelectorAll<HTMLElement>('[data-online-section]')
      .forEach((sec) => {
        this.onlineSubSections.set(sec.dataset.onlineSection as OnlineSubTab, sec);
      });

    this.root
      .querySelectorAll<HTMLButtonElement>('#hud-overlay [data-tool]')
      .forEach((btn) => {
        const tool = btn.dataset.tool as ToolId;
        this.toolButtons.set(tool, btn);
        btn.addEventListener('click', () => this.callbacks.onSelectTool(tool));
      });

    this.root
      .querySelectorAll<HTMLButtonElement>('#mapmaker-hud [data-terrain-tool]')
      .forEach((btn) => {
        const tool = btn.dataset.terrainTool as ToolId;
        this.terrainToolButtons.set(tool, btn);
        btn.addEventListener('click', () => this.callbacks.onSelectTool(tool));
      });

    this.root
      .querySelectorAll<HTMLButtonElement>('#mapmaker-hud [data-preset]')
      .forEach((btn) => {
        const preset = btn.dataset.preset as MapPresetId;
        this.presetButtons.set(preset, btn);
        btn.addEventListener('click', () =>
          this.callbacks.onSelectMapPreset(preset, false)
        );
      });

    this.root
      .querySelectorAll('[data-start]')
      .forEach((el) =>
        el.addEventListener('click', () => this.callbacks.onStartGame())
      );
    this.root
      .querySelectorAll('[data-open-mapmaker]')
      .forEach((el) =>
        el.addEventListener('click', () => this.callbacks.onOpenMapMaker())
      );
    this.root
      .querySelectorAll('[data-open-options]')
      .forEach((el) =>
        el.addEventListener('click', () => this.callbacks.onOpenOverlay('options'))
      );
    this.root
      .querySelectorAll('[data-open-ai]')
      .forEach((el) =>
        el.addEventListener('click', () => this.callbacks.onOpenOverlay('ai'))
      );
    this.root
      .querySelectorAll('[data-open-p2p]')
      .forEach((el) =>
        el.addEventListener('click', () => this.callbacks.onOpenOverlay('p2p'))
      );
    this.root
      .querySelectorAll('[data-open-regions]')
      .forEach((el) =>
        el.addEventListener('click', () => this.callbacks.onOpenOverlay('regions'))
      );
    this.root
      .querySelectorAll('[data-open-budget]')
      .forEach((el) =>
        el.addEventListener('click', () => this.callbacks.onOpenOverlay('budget'))
      );
    this.root
      .querySelectorAll('[data-open-features]')
      .forEach((el) =>
        el.addEventListener('click', () => this.callbacks.onOpenOverlay('features'))
      );
    this.root
      .querySelectorAll('[data-open-advisor]')
      .forEach((el) =>
        el.addEventListener('click', () =>
          this.callbacks.onOpenOverlay(
            this.activeOverlay === 'advisor' ? 'none' : 'advisor'
          )
        )
      );
    this.root
      .querySelectorAll('[data-close-overlay]')
      .forEach((el) =>
        el.addEventListener('click', () => this.callbacks.onOpenOverlay('none'))
      );

    this.regionTabsEl
      .querySelectorAll<HTMLButtonElement>('[data-region-tab]')
      .forEach((btn) =>
        btn.addEventListener('click', () =>
          this.callbacks.onSelectRegionTab(btn.dataset.regionTab as RegionId)
        )
      );

    const onTaxInput = () => {
      this.taxResValEl.textContent = `${this.taxResSlider.value}%`;
      this.taxComValEl.textContent = `${this.taxComSlider.value}%`;
      this.taxIndValEl.textContent = `${this.taxIndSlider.value}%`;
      this.callbacks.onSetTaxRates({
        residential: Number(this.taxResSlider.value),
        commercial: Number(this.taxComSlider.value),
        industrial: Number(this.taxIndSlider.value),
      });
    };
    this.taxResSlider.addEventListener('input', onTaxInput);
    this.taxComSlider.addEventListener('input', onTaxInput);
    this.taxIndSlider.addEventListener('input', onTaxInput);

    this.ordinanceListEl
      .querySelectorAll<HTMLInputElement>('[data-ordinance]')
      .forEach((chk) =>
        chk.addEventListener('change', () =>
          this.callbacks.onToggleOrdinance(chk.dataset.ordinance as OrdinanceId)
        )
      );

    this.root
      .querySelectorAll<HTMLButtonElement>('[data-trade-delta]')
      .forEach((btn) =>
        btn.addEventListener('click', () =>
          this.callbacks.onAdjustNeighborTrade(Number(btn.dataset.tradeDelta))
        )
      );

    this.root
      .querySelectorAll<HTMLButtonElement>('[data-disaster]')
      .forEach((btn) =>
        btn.addEventListener('click', () =>
          this.callbacks.onTriggerDisaster(btn.dataset.disaster as DisasterKind)
        )
      );

    this.root
      .querySelector('[data-new-seed]')
      ?.addEventListener('click', () =>
        this.callbacks.onSelectMapPreset(
          (this.optPresetSelect.value as MapPresetId) || 'random',
          true
        )
      );
    this.mapBrushBtn1.addEventListener('click', () =>
      this.callbacks.onSetBrushSize(1)
    );
    this.mapBrushBtn2.addEventListener('click', () =>
      this.callbacks.onSetBrushSize(2)
    );
    this.root
      .querySelector('[data-reset-town]')
      ?.addEventListener('click', () => this.callbacks.onResetStarterTown());
    this.root
      .querySelector('[data-finish-mapmaker]')
      ?.addEventListener('click', () => this.callbacks.onFinishMapMaker());
    this.root
      .querySelector('[data-mm-back]')
      ?.addEventListener('click', () => this.callbacks.onReturnTitle());

    this.root
      .querySelector('[data-rotate-building]')
      ?.addEventListener('click', () => this.callbacks.onRotateBuilding());
    this.root
      .querySelector('[data-rotate-board]')
      ?.addEventListener('click', () => this.callbacks.onRotateBoard());
    this.speedBtnEl.addEventListener('click', () =>
      this.callbacks.onCycleSpeed()
    );
    this.dataOverlayBtnEl.addEventListener('click', () =>
      this.callbacks.onCycleDataOverlay()
    );
    this.skyBtnEl.addEventListener('click', () =>
      this.callbacks.onToggleSkyMode()
    );
    this.muteBtnEl.addEventListener('click', () =>
      this.callbacks.onToggleMute()
    );
    this.autoBuildBtnEl.addEventListener('click', () =>
      this.callbacks.onToggleAutoBuild()
    );
    this.root
      .querySelector('[data-pause]')
      ?.addEventListener('click', () => this.callbacks.onPause());

    this.root
      .querySelector('[data-apply-options="live"]')
      ?.addEventListener('click', () => this.submitOptions(false));
    this.root
      .querySelector('[data-apply-options="newmap"]')
      ?.addEventListener('click', () => this.submitOptions(true));

    this.root
      .querySelectorAll<HTMLButtonElement>('[data-ai-preset]')
      .forEach((btn) =>
        btn.addEventListener('click', () => {
          this.aiPromptInput.value = btn.dataset.aiPreset || '';
        })
      );
    this.aiBuildBtn.addEventListener('click', () => {
      this.callbacks.onRunAiCityPlan(this.aiPromptInput.value);
    });

    this.advQuickToolBtn.addEventListener('click', () => {
      this.callbacks.onSelectTool(this.advRecommendedTool);
    });
    this.root
      .querySelectorAll('[data-step-autobuild]')
      .forEach((el) =>
        el.addEventListener('click', () => this.callbacks.onStepAutoBuildOnce())
      );
    this.advAskBtn.addEventListener('click', () => {
      this.callbacks.onAskAiAdvisor(this.advQuestionInput.value);
    });

    this.p2pConnectBtn.addEventListener('click', () => {
      this.callbacks.onConnectP2P(
        this.p2pRoomInput.value || `STAD-${Math.floor(1000 + Math.random() * 9000)}`,
        this.p2pNameInput.value,
        this.p2pPublicCheck.checked
      );
    });
    this.p2pDisconnectBtn.addEventListener('click', () =>
      this.callbacks.onDisconnectP2P()
    );
    this.root
      .querySelector('[data-refresh-lobby]')
      ?.addEventListener('click', () => this.callbacks.onRefreshOnlineLobby());
    this.publishBtnEl.addEventListener('click', () =>
      this.callbacks.onPublishCityOnline(this.p2pNameInput.value || 'Burgemeester')
    );

    const submitLobbyChat = () => {
      const txt = this.chatInputEl.value.trim();
      if (!txt) return;
      this.chatInputEl.value = '';
      this.callbacks.onSendChat(txt);
    };
    this.root
      .querySelector('[data-chat-send]')
      ?.addEventListener('click', submitLobbyChat);
    this.chatInputEl.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') submitLobbyChat();
    });

    const submitQuickChat = () => {
      const txt = this.liveChatInputEl.value.trim();
      if (!txt) return;
      this.liveChatInputEl.value = '';
      this.callbacks.onSendChat(txt);
    };
    this.root
      .querySelector('[data-live-chat-send]')
      ?.addEventListener('click', submitQuickChat);
    this.liveChatInputEl.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') submitQuickChat();
    });

    this.root
      .querySelector('[data-copy-share]')
      ?.addEventListener('click', () => this.callbacks.onCopyShareLink());
    this.root
      .querySelector('[data-export-json]')
      ?.addEventListener('click', () => this.callbacks.onExportCityJson());
    this.root
      .querySelector('[data-import-btn]')
      ?.addEventListener('click', () =>
        this.callbacks.onImportCityPayload(this.p2pImportInput.value)
      );

    this.modalResumeBtn.addEventListener('click', () =>
      this.callbacks.onResume()
    );
    this.modalContinueBtn.addEventListener('click', () =>
      this.callbacks.onContinueEndless()
    );
    this.modalRestartBtn.addEventListener('click', () =>
      this.callbacks.onRestart()
    );
    this.root
      .querySelector('[data-modal-titlebtn]')
      ?.addEventListener('click', () => this.callbacks.onReturnTitle());
  }

  setOnlineSubTab(tab: OnlineSubTab): void {
    this.activeOnlineSubTab = tab;
    for (const [k, btn] of this.onlineSubTabButtons.entries()) {
      btn.classList.toggle('is-selected', k === tab);
    }
    for (const [k, sec] of this.onlineSubSections.entries()) {
      sec.classList.toggle('is-active', k === tab);
    }
  }

  setActiveDockTab(tab: DockCategory): void {
    this.activeDockTab = tab;
    for (const [k, btn] of this.dockTabButtons.entries()) {
      btn.classList.toggle('is-selected', k === tab);
    }
    for (const [k, grp] of this.dockGroups.entries()) {
      grp.classList.toggle('is-active', k === tab);
    }
  }

  private submitOptions(regenerateMap: boolean): void {
    const partial: Partial<GameSettings> = {
      cityName: this.optCityNameInput.value.trim() || 'Nieuw-Amsterdam',
      difficulty: this.optDifficultySelect.value as DifficultyMode,
      mapPreset: this.optPresetSelect.value as MapPresetId,
      timeOfDay: this.optTimeSelect.value as TimeOfDay,
      trafficDensity: this.optTrafficSelect.value as TrafficDensity,
      disastersEnabled: this.optDisastersCheck.checked,
      autoBuildEnabled: this.optAutoBuildCheck.checked,
    };
    this.callbacks.onApplySettings(partial, regenerateMap);
  }

  setOverlay(overlay: ActiveOverlay, settings?: GameSettings): void {
    this.activeOverlay = overlay;
    if (settings) {
      this.optCityNameInput.value = settings.cityName;
      this.optDifficultySelect.value = settings.difficulty;
      this.optPresetSelect.value = settings.mapPreset;
      this.optTimeSelect.value = settings.timeOfDay;
      this.optTrafficSelect.value = settings.trafficDensity;
      this.optDisastersCheck.checked = settings.disastersEnabled;
      this.optAutoBuildCheck.checked = settings.autoBuildEnabled;
    }

    const modalOpen =
      overlay === 'options' ||
      overlay === 'ai' ||
      overlay === 'p2p' ||
      overlay === 'regions' ||
      overlay === 'budget' ||
      overlay === 'features';
    this.overlayBackdropEl.setAttribute('aria-hidden', String(!modalOpen));
    this.overlayBackdropEl.classList.toggle('is-open', modalOpen);

    this.regionsPanelEl.classList.toggle('is-open', overlay === 'regions');
    this.budgetPanelEl.classList.toggle('is-open', overlay === 'budget');
    this.optionsPanelEl.classList.toggle('is-open', overlay === 'options');
    this.aiPanelEl.classList.toggle('is-open', overlay === 'ai');
    this.p2pPanelEl.classList.toggle('is-open', overlay === 'p2p');
    this.featuresPanelEl.classList.toggle('is-open', overlay === 'features');

    const advisorOpen = overlay === 'advisor';
    this.advisorDrawerEl.setAttribute('aria-hidden', String(!advisorOpen));
    this.advisorDrawerEl.classList.toggle('is-open', advisorOpen);
  }

  updateRegions(
    region: RegionDefinition,
    summaries: RegionPlotSummary[],
    totalPopulation: number,
    totalPowerSurplus: number,
    activeMetrics?: CityMetrics
  ): void {
    this.regionTabsEl
      .querySelectorAll<HTMLButtonElement>('[data-region-tab]')
      .forEach((btn) =>
        btn.classList.toggle('is-selected', btn.dataset.regionTab === region.id)
      );

    const syn = activeMetrics?.neighborSynergy;
    const synNote = syn
      ? ` · Actieve buursynergie: ${syn.connectedNeighbors} buren (+€${syn.commuterIncomeBonus}/cyclus forensen, +${syn.demandBoost} RCI)`
      : '';

    this.regionHeaderEl.innerHTML = `
      <strong>${escapeHtml(region.name)}</strong>
      <p>${escapeHtml(region.subtitle)}${escapeHtml(synNote)}</p>
    `;

    const sign = totalPowerSurplus >= 0 ? '+' : '';
    this.regionSummaryEl.innerHTML = `
      <span>Regio-inwoners: <b>${totalPopulation}</b></span>
      <span>Stroombalans: <b>${sign}${totalPowerSurplus} MW</b></span>
    `;

    const ordered = [...summaries].sort((a, b) =>
      a.ry !== b.ry ? a.ry - b.ry : a.rx - b.rx
    );
    const byCoord = new Set(ordered.map((p) => `${p.rx},${p.ry}`));

    this.regionGridEl.innerHTML = ordered
      .map((plot) => {
        const kindBadge =
          plot.kind === 'metropool'
            ? 'Metropool'
            : plot.kind === 'stad'
              ? 'Stad'
              : plot.kind === 'dorp'
                ? 'Dorp'
                : 'Gehucht';
        const mwSign = plot.powerBalance >= 0 ? '+' : '';
        const hasRight = byCoord.has(`${plot.rx + 1},${plot.ry}`);
        const hasBottom = byCoord.has(`${plot.rx},${plot.ry + 1}`);
        const miniCells = plot.miniPreviewColors
          .map((c) => `<i style="background:${c}"></i>`)
          .join('');

        return `
          <div class="sb-plot-card ${plot.isActive ? 'is-active' : ''}" data-rx="${plot.rx}" data-ry="${plot.ry}">
            ${hasRight ? '<span class="sb-link-east" title="Snelweg & Spoor naar oosterbuur"></span>' : ''}
            ${hasBottom ? '<span class="sb-link-south" title="Snelweg & Spoor naar zuiderbuur"></span>' : ''}
            <div class="sb-plot-head">
              <strong>${escapeHtml(plot.name)}</strong>
              <span class="sb-kind-tag" data-kind="${plot.kind}">${kindBadge}</span>
            </div>
            <div class="sb-plot-top-body">
              <div class="sb-mini-map" aria-hidden="true">${miniCells}</div>
              <div class="sb-plot-meta">
                <span class="sb-plot-tier">${escapeHtml(plot.tierName)}</span>
                <p class="sb-plot-desc">${escapeHtml(plot.tagline)}</p>
              </div>
            </div>
            <div class="sb-plot-stats">
              <span>Inw <b>${plot.population}</b></span>
              <span>Geluk <b>${plot.happiness}%</b></span>
              <span>€${plot.budget}</span>
              <span>${mwSign}${plot.powerBalance}MW</span>
            </div>
            <div class="sb-plot-actions">
              <button type="button" class="sb-btn-primary sb-btn-compact" data-select-plot="${plot.plotId}">
                ${plot.isActive ? 'Actief' : 'Bouw'}
              </button>
              <button type="button" class="sb-btn-secondary sb-btn-compact" data-reset-plot="${plot.plotId}">
                Reset
              </button>
            </div>
          </div>
        `;
      })
      .join('');

    this.regionGridEl
      .querySelectorAll<HTMLButtonElement>('[data-select-plot]')
      .forEach((btn) =>
        btn.addEventListener('click', () =>
          this.callbacks.onSelectPlot(btn.dataset.selectPlot!)
        )
      );
    this.regionGridEl
      .querySelectorAll<HTMLButtonElement>('[data-reset-plot]')
      .forEach((btn) =>
        btn.addEventListener('click', () =>
          this.callbacks.onResetPlot(btn.dataset.resetPlot!)
        )
      );
  }

  updateBudgetModal(state: CityState, metrics: CityMetrics): void {
    this.taxResSlider.value = String(state.taxes.residential);
    this.taxComSlider.value = String(state.taxes.commercial);
    this.taxIndSlider.value = String(state.taxes.industrial);
    this.taxResValEl.textContent = `${state.taxes.residential}%`;
    this.taxComValEl.textContent = `${state.taxes.commercial}%`;
    this.taxIndValEl.textContent = `${state.taxes.industrial}%`;

    const specs = metrics.specializations.length > 0
      ? metrics.specializations
          .map((s) => `<span class="sb-spec-badge">${escapeHtml(s)}</span>`)
          .join('')
      : '<span class="sb-peer-empty">Nog geen specialisatie — bouw Zeehaven, Universiteit, Luchthaven, Stadion of Zonneparken.</span>';
    this.budgetSpecsEl.innerHTML = `<strong>Stadsspecialisaties:</strong> ${specs}`;

    const b = metrics.budgetBreakdown;
    const signNet = metrics.netIncome >= 0 ? '+' : '';
    const signTrade = b.neighborTrade >= 0 ? '+' : '';
    const commuter = metrics.neighborSynergy.commuterIncomeBonus;
    this.budgetLedgerEl.innerHTML = `
      <div><span>Woonbelasting (R)</span><b class="is-pos">+€${b.taxResidential}</b></div>
      <div><span>Commerciebelasting (C)</span><b class="is-pos">+€${b.taxCommercial}</b></div>
      <div><span>Industriebelasting (I)</span><b class="is-pos">+€${b.taxIndustrial}</b></div>
      <div><span>Regio Buurhandel &amp; Forensen (+€${commuter})</span><b class="${b.neighborTrade >= 0 ? 'is-pos' : 'is-neg'}">${signTrade}€${b.neighborTrade}</b></div>
      <div><span>Infra &amp; Energie onderhoud</span><b class="is-neg">-€${b.upkeepInfra}</b></div>
      <div><span>Diensten (Politie/School/Uni/etc.)</span><b class="is-neg">-€${b.upkeepCivic}</b></div>
      <div><span>Verordeningen (Wetten)</span><b class="is-neg">-€${b.upkeepOrdinances}</b></div>
      <div class="sb-ledger-total"><span>Netto Cyclus-resultaat</span><b class="${metrics.netIncome >= 0 ? 'is-pos' : 'is-neg'}">${signNet}€${metrics.netIncome}</b></div>
    `;

    this.ordinanceListEl
      .querySelectorAll<HTMLInputElement>('[data-ordinance]')
      .forEach((chk) => {
        chk.checked = state.ordinances.includes(chk.dataset.ordinance as OrdinanceId);
      });

    const trade = state.neighborTradeMw || 0;
    this.neighborTradeEl.textContent =
      trade > 0
        ? `Inkoop: +${trade} MW (-€${trade * 3}/cyclus)`
        : trade < 0
          ? `Verkoop: ${Math.abs(trade)} MW (+€${Math.abs(trade) * 3}/cyclus)`
          : `Stroomhandel: 0 MW · Buurforensen: +€${commuter}/cyclus`;
  }

  updateOnlineLobby(
    rooms: OnlineRoomSummary[],
    cities: PublishedCitySummary[]
  ): void {
    this.titleOnlineStripEl.textContent =
      rooms.length > 0
        ? `${rooms.length} live online kamer(s) actief · ${cities.length} gedeelde steden om samen of solo te bouwen`
        : `${cities.length} gedeelde community-steden beschikbaar · Start als eerste een openbare multiplayer kamer!`;

    if (rooms.length === 0) {
      this.onlineRoomsListEl.innerHTML =
        '<p class="sb-peer-empty">Nog geen actieve openbare kamers. Vul een kamercode in en klik op "Start / Verbind Online Kamer" — iedereen met jouw URL ziet hem hier meteen!</p>';
    } else {
      this.onlineRoomsListEl.innerHTML = rooms
        .map(
          (room) => `
          <div class="sb-online-card">
            <div class="sb-online-card-main">
              <strong>${escapeHtml(room.cityName)} <span class="sb-kind-tag">${escapeHtml(room.roomCode)}</span></strong>
              <small>${escapeHtml(room.regionName)} · Host: ${escapeHtml(room.hostName)} · ${room.population} inw · ${room.peerCount}/${room.maxPeers} spelers</small>
            </div>
            <button type="button" class="sb-btn-primary sb-btn-compact" data-join-room="${escapeHtml(room.roomCode)}">Doe Mee</button>
          </div>`
        )
        .join('');

      this.onlineRoomsListEl
        .querySelectorAll<HTMLButtonElement>('[data-join-room]')
        .forEach((btn) =>
          btn.addEventListener('click', () => {
            const code = btn.dataset.joinRoom!;
            this.p2pRoomInput.value = code;
            this.callbacks.onConnectP2P(
              code,
              this.p2pNameInput.value || 'Burgemeester',
              true
            );
          })
        );
    }

    if (cities.length === 0) {
      this.onlineCitiesListEl.innerHTML =
        '<p class="sb-peer-empty">Nog geen gepubliceerde steden.</p>';
    } else {
      this.onlineCitiesListEl.innerHTML = cities
        .map(
          (city) => `
          <div class="sb-online-card">
            <div class="sb-online-card-main">
              <strong>${escapeHtml(city.cityName)} <span class="sb-kind-tag" data-kind="dorp">${escapeHtml(city.tierName)}</span></strong>
              <small>Door ${escapeHtml(city.authorName)} · ${escapeHtml(city.regionName)} · ${city.population} inw · ${city.happiness}% geluk</small>
            </div>
            <div class="sb-online-card-actions">
              <button type="button" class="sb-chip-btn" data-like-city="${escapeHtml(city.id)}">👍 ${city.likes}</button>
              <button type="button" class="sb-btn-primary sb-btn-compact" data-load-city="${escapeHtml(city.id)}">Laad Stad</button>
            </div>
          </div>`
        )
        .join('');

      this.onlineCitiesListEl
        .querySelectorAll<HTMLButtonElement>('[data-like-city]')
        .forEach((btn) =>
          btn.addEventListener('click', () =>
            this.callbacks.onLikeOnlineCity(btn.dataset.likeCity!)
          )
        );
      this.onlineCitiesListEl
        .querySelectorAll<HTMLButtonElement>('[data-load-city]')
        .forEach((btn) =>
          btn.addEventListener('click', () => {
            const found = cities.find((c) => c.id === btn.dataset.loadCity);
            if (found) {
              this.callbacks.onLoadOnlineCity(found.encoded, found.cityName);
            }
          })
        );
    }
  }

  setPublishStatus(text: string, isError = false): void {
    this.publishStatusEl.textContent = text;
    this.publishStatusEl.style.color = isError ? '#f87171' : '#a7f3d0';
  }

  appendChatMessage(msg: ChatMessageEntry): void {
    this.chatHistory = [...this.chatHistory, msg].slice(-25);
    const renderMsg = (m: ChatMessageEntry) =>
      `<div class="sb-chat-line"><b style="color:${m.color}">${escapeHtml(m.author)}:</b> <span>${escapeHtml(m.text)}</span></div>`;

    this.chatLogEl.innerHTML =
      this.chatHistory.length > 0
        ? this.chatHistory.map(renderMsg).join('')
        : '<span class="sb-peer-empty">Nog geen berichten.</span>';
    this.chatLogEl.scrollTop = this.chatLogEl.scrollHeight;

    this.liveChatFeedEl.innerHTML = this.chatHistory.slice(-4).map(renderMsg).join('');
    this.liveChatFeedEl.scrollTop = this.liveChatFeedEl.scrollHeight;
  }

  setAiBusy(busy: boolean, statusText: string, isError = false): void {
    this.aiBuildBtn.disabled = busy;
    this.aiStatusEl.textContent = statusText;
    this.aiStatusEl.style.color = isError ? '#f87171' : '#a7f3d0';
  }

  updateAdvisor(report: AdvisorReport, aiNote?: string, isError = false): void {
    this.advNameEl.textContent = report.advisorName;
    this.advRoleEl.textContent = report.role;
    this.advHeadlineEl.textContent = report.headline;
    this.advHeadlineEl.dataset.mood = report.mood;
    this.advSummaryEl.textContent = report.summary;
    this.advTipsEl.innerHTML = report.tips
      .map((t) => `<li>${escapeHtml(t)}</li>`)
      .join('');
    this.advRecommendedTool = report.recommendedTool;
    const def = BUILDING_CATALOG[report.recommendedTool];
    this.advQuickToolBtn.textContent = `Bouw ${def?.label || 'Gebouw'}`;
    this.advisorBtnEl.dataset.mood = report.mood;
    if (aiNote !== undefined) {
      this.advAiStatusEl.textContent = aiNote;
      this.advAiStatusEl.style.color = isError ? '#f87171' : '#a7f3d0';
    }
  }

  setAdvisorBusy(busy: boolean, statusText = ''): void {
    this.advAskBtn.disabled = busy;
    if (statusText) {
      this.advAiStatusEl.textContent = statusText;
      this.advAiStatusEl.style.color = '#cbd5e1';
    }
  }

  updateP2PStatus(status: P2PStatus): void {
    if (status.roomCode && !this.p2pRoomInput.value) {
      this.p2pRoomInput.value = status.roomCode;
    }
    this.p2pStatusBadgeEl.textContent =
      status.transportMode === 'webrtc-p2p'
        ? 'WebRTC P2P Direct'
        : status.transportMode === 'ws-relay'
          ? 'Live Kamer (Relay)'
          : 'Offline';
    this.p2pStatusBadgeEl.dataset.mode = status.transportMode;
    this.p2pLogEl.textContent = status.lastEventText;
    this.p2pBtnEl.textContent = status.connected
      ? `Online (${status.peers.length})`
      : 'Online';
    this.p2pBtnEl.classList.toggle('is-active', status.connected);
    this.liveChatDockEl.classList.toggle('is-open', status.connected);

    this.p2pPeerListEl.innerHTML =
      status.peers.length === 0
        ? '<span class="sb-peer-empty">Nog geen actieve medespelers. Maak een kamer of klik Doe Mee.</span>'
        : status.peers
            .map(
              (p) =>
                `<span class="sb-peer-chip" style="border-color:${p.color}"><i style="background:${p.color}"></i>${escapeHtml(p.name)} ${p.rtcConnected ? '(WebRTC)' : ''}</span>`
            )
            .join('');
  }

  showToast(message: string, durationMs = 2400): void {
    this.hoverToastEl.textContent = message;
    this.hoverToastEl.classList.add('is-visible');
    if (this.toastTimer !== null) {
      window.clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
    if (durationMs > 0) {
      this.toastTimer = window.setTimeout(() => {
        this.hoverToastEl.classList.remove('is-visible');
      }, durationMs);
    }
  }

  hideToast(): void {
    if (this.toastTimer !== null) return;
    this.hoverToastEl.classList.remove('is-visible');
  }

  private updateRciBar(el: HTMLElement, demand: number): void {
    const clamped = Math.max(-100, Math.min(100, demand));
    const pct = Math.max(8, Math.round(((clamped + 100) / 200) * 100));
    el.style.height = `${pct}%`;
    el.style.opacity = clamped >= 0 ? '1' : '0.45';
  }

  update(
    state: CityState,
    metrics: CityMetrics,
    phase: GamePhase,
    skyMode: 'sky' | 'ar',
    isMuted: boolean
  ): void {
    document.body.dataset.state = phase;
    document.body.dataset.budget = String(Math.round(state.budget));
    document.body.dataset.population = String(metrics.population);
    document.body.dataset.tier = metrics.tierName;
    document.body.dataset.autobuild = String(state.settings.autoBuildEnabled);
    document.body.dataset.overlay = state.dataOverlay;

    this.cityTitleEl.textContent = state.settings.cityName;
    this.tierNameEl.textContent = metrics.tierName;
    this.specRowEl.innerHTML = metrics.specializations
      .slice(0, 2)
      .map((s) => `<span class="sb-spec-mini">${escapeHtml(s)}</span>`)
      .join('');

    this.budgetValEl.textContent =
      state.settings.difficulty === 'sandbox'
        ? 'Onbeperkt'
        : `€${Math.round(state.budget)}`;
    this.budgetValEl.style.color = state.budget >= 0 ? '#f5b942' : '#f87171';

    const sign = metrics.netIncome >= 0 ? '+' : '';
    this.budgetDeltaEl.textContent = `${sign}€${metrics.netIncome}/cyclus`;
    this.budgetDeltaEl.style.color =
      metrics.netIncome >= 0 ? '#34d399' : '#f87171';

    this.popValEl.textContent = String(metrics.population);
    const nbCount = metrics.neighborSynergy.connectedNeighbors;
    this.popGoalEl.textContent = metrics.nextTierTarget
      ? `Doel: ${metrics.nextTierTarget} · ${nbCount} buren`
      : `Wereldtop! · ${nbCount} buren`;

    this.happyValEl.textContent = `${metrics.happiness}%`;
    this.happyValEl.style.color =
      metrics.happiness >= 75
        ? '#34d399'
        : metrics.happiness >= 45
          ? '#f5b942'
          : '#f87171';
    this.happyStatusEl.textContent = `Waarde ${metrics.landValue}% · Veilig ${metrics.safety}%`;

    this.powerValEl.textContent =
      metrics.powerBalance >= 0
        ? `+${metrics.powerBalance}`
        : String(metrics.powerBalance);
    this.powerValEl.style.color = metrics.hasPower ? '#34d399' : '#f87171';
    this.powerDetailEl.textContent = `${metrics.powerSupply} / ${metrics.powerDemand} MW`;

    this.updateRciBar(this.rciResBarEl, metrics.rci.residential);
    this.updateRciBar(this.rciComBarEl, metrics.rci.commercial);
    this.updateRciBar(this.rciIndBarEl, metrics.rci.industrial);

    this.tickerEl.textContent = `${TIME_OF_DAY_LABELS[state.settings.timeOfDay]} · ${DIFFICULTY_LABELS[state.settings.difficulty].label.split(' ')[0]} · ${state.newsTicker}`;

    this.dataOverlayBtnEl.textContent = `Laag: ${DATA_OVERLAY_LABELS[state.dataOverlay]}`;
    this.dataOverlayBtnEl.classList.toggle('is-active', state.dataOverlay !== 'none');

    this.autoBuildBtnEl.textContent = state.settings.autoBuildEnabled
      ? 'Auto-Bouw: Aan'
      : 'Auto-Bouw: Uit';
    this.autoBuildBtnEl.setAttribute(
      'aria-pressed',
      String(state.settings.autoBuildEnabled)
    );
    this.autoBuildBtnEl.classList.toggle(
      'is-active',
      state.settings.autoBuildEnabled
    );

    this.speedBtnEl.textContent = `${state.speedMultiplier}×`;
    this.skyBtnEl.textContent = skyMode === 'sky' ? 'Lucht' : 'AR';
    this.muteBtnEl.style.opacity = isMuted ? '0.5' : '1';
    this.rotateBtnEl.textContent = `${state.buildRotation * 90}°`;

    // Sync active dock tab only when selectedTool actually changes (preserves manual tab clicks across sim ticks)
    if (state.selectedTool !== this.lastSyncedTool) {
      this.lastSyncedTool = state.selectedTool;
      if (state.selectedTool !== 'bulldoze') {
        const targetTab = BUILDING_CATALOG[state.selectedTool]?.dockTab;
        if (targetTab && targetTab !== this.activeDockTab) {
          this.setActiveDockTab(targetTab);
        }
      }
    }

    for (const [toolId, btn] of this.toolButtons.entries()) {
      const selected = state.selectedTool === toolId;
      btn.setAttribute('aria-pressed', String(selected));
      btn.classList.toggle('is-selected', selected);
    }

    for (const [toolId, btn] of this.terrainToolButtons.entries()) {
      const selected = state.selectedTool === toolId;
      btn.setAttribute('aria-pressed', String(selected));
      btn.classList.toggle('is-selected', selected);
    }

    for (const [presetId, btn] of this.presetButtons.entries()) {
      btn.classList.toggle('is-selected', state.settings.mapPreset === presetId);
    }
    this.mapBrushBtn1.setAttribute('aria-pressed', String(state.mapBrushSize === 1));
    this.mapBrushBtn2.setAttribute('aria-pressed', String(state.mapBrushSize === 2));

    if (this.activeOverlay === 'budget') {
      this.updateBudgetModal(state, metrics);
    }

    const modalEl = this.root.querySelector('#modal-overlay')!;
    const showModal = phase === 'paused' || phase === 'gameover';
    modalEl.setAttribute('aria-hidden', String(!showModal));
    if (showModal) {
      this.syncModal(state, metrics, phase, state.gameOverReason);
    }
  }

  private syncModal(
    state: CityState,
    metrics: CityMetrics,
    phase: GamePhase,
    reason: GameOverReason
  ): void {
    this.modalPopEl.textContent = String(metrics.population);
    this.modalBudgetEl.textContent = `€${Math.round(state.budget)}`;
    this.modalHappyEl.textContent = `${metrics.happiness}%`;

    this.modalResumeBtn.classList.add('is-hidden');
    this.modalContinueBtn.classList.add('is-hidden');

    if (phase === 'paused') {
      this.modalTitleEl.textContent = 'Spel Gepauzeerd';
      this.modalSubEl.textContent = `${state.settings.cityName} (${metrics.tierName}) wacht op je volgende bouwplan.`;
      this.modalResumeBtn.classList.remove('is-hidden');
      return;
    }

    if (reason === 'victory') {
      this.modalTitleEl.textContent = 'Wereldmetropool Bereikt!';
      this.modalSubEl.textContent = `${state.settings.cityName} telt ${metrics.population} blije inwoners!`;
      this.modalContinueBtn.classList.remove('is-hidden');
    } else if (reason === 'bankrupt') {
      this.modalTitleEl.textContent = 'Gemeentekas Leeg';
      this.modalSubEl.textContent =
        'De schulden liepen te hoog op. Start opnieuw of pas de strategie aan.';
    } else {
      this.modalTitleEl.textContent = 'Burgers Ontevreden';
      this.modalSubEl.textContent =
        'Langdurige stroomuitval of vervuiling maakte de stad onleefbaar.';
    }
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
