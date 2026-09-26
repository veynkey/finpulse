import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Layout,
  Model,
  TabNode,
  TabSetNode,
  TabGroupNode,
  BorderNode,
  Actions,
  DockLocation,
  showPopupMenu,
  ContextMenuBuilder,
  type IJsonTabNode,
  type ITabSetRenderValues,
  type IKeyMap,
} from 'flexlayout-react';
import '../styles/docking.css';
import ErrorBoundary from './ErrorBoundary';
import PanelLibraryModal, { PANEL_DEFINITIONS } from './PanelLibraryModal';
import PresetManagerModal from './PresetManagerModal';
import {
  BUILTIN_WORKSPACE_PRESETS,
  DEFAULT_PRESET,
  type WorkspacePresetConfig,
} from '../config/workspacePresets';
import type { LinkGroup, PanelDefinition } from '../types';
import {
  Plus,
  Layout as LayoutIcon,
  RotateCcw,
  ChevronDown,
  X,
  ExternalLink,
  Monitor,
} from 'lucide-react';

// Panels
import WatchlistPanel from '../panels/WatchlistPanel';
import ChartPanel from '../panels/ChartPanel';
import OrderBookPanel from '../panels/OrderBookPanel';
import OrderFlowPanel from '../panels/OrderFlowPanel';
import CVDPanel from '../panels/CVDPanel';
import RadarPanel from '../panels/RadarPanel';
import NewsPanel from '../panels/NewsPanel';
import AIPanel from '../panels/AIPanel';
import PortfolioRiskPanel from '../panels/PortfolioRiskPanel';
import ScannerPanel from '../panels/ScannerPanel';
import MacroCalendarPanel from '../panels/MacroCalendarPanel';
import ReplayPanel from '../panels/ReplayPanel';
import MarketConditionsPanel from '../panels/MarketConditionsPanel';
import CorrelationMatrixPanel from '../panels/CorrelationMatrixPanel';
import VolumeProfilePanel from '../panels/VolumeProfilePanel';
import TrendDirectionPanel from '../panels/TrendDirectionPanel';
import ZScorePanel from '../panels/ZScorePanel';
import RSIPanel from '../panels/RSIPanel';
import VolumeAnalysisPanel from '../panels/VolumeAnalysisPanel';
import RegimeIndicatorPanel from '../panels/RegimeIndicatorPanel';

const STORAGE_SCHEMA_VERSION = 'layout_schema_version_2';
const STORAGE_ACTIVE_TAB = 'finpulse_active_workspace_tab';
const STORAGE_CUSTOM_PRESETS = 'finpulse_dock_custom_presets_v2';
const STORAGE_DESKS = 'finpulse_workspace_tabs_v3';

export interface WorkspaceTab {
  id: string;
  name: string;
  presetId: string;
}

const DEFAULT_WORKSPACE_TABS: WorkspaceTab[] = [
  { id: 'desk_trading', name: 'TRADING', presetId: 'TRADING' },
  { id: 'desk_cvd', name: 'CVD & ORDER FLOW', presetId: 'ORDER_FLOW' },
  { id: 'desk_indicators', name: 'QUANT & INDICATORS', presetId: 'QUANT_INDICATORS' },
  { id: 'desk_research', name: 'RESEARCH', presetId: 'RESEARCH' },
  { id: 'desk_macro', name: 'MACRO', presetId: 'MACRO' },
];

interface WorkspaceProps {
  forcedDeskId?: string;
  isDetachedMode?: boolean;
}

export default function Workspace({ forcedDeskId, isDetachedMode = false }: WorkspaceProps = {}) {
  const layoutRef = useRef<any>(null);

  // Modals state
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [isNewDeskOpen, setIsNewDeskOpen] = useState(false);
  const [newDeskName, setNewDeskName] = useState('');
  const [newDeskPreset, setNewDeskPreset] = useState('TRADING');

  // Dynamic multi-workspace desks state
  const [workspaceTabs, setWorkspaceTabs] = useState<WorkspaceTab[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_DESKS);
      if (stored) {
        const parsed: WorkspaceTab[] = JSON.parse(stored);
        if (!parsed.some((t) => t.id === 'desk_indicators')) {
          const insertIdx = parsed.findIndex((t) => t.id === 'desk_cvd');
          if (insertIdx >= 0) {
            parsed.splice(insertIdx + 1, 0, {
              id: 'desk_indicators',
              name: 'QUANT & INDICATORS',
              presetId: 'QUANT_INDICATORS',
            });
          } else {
            parsed.push({
              id: 'desk_indicators',
              name: 'QUANT & INDICATORS',
              presetId: 'QUANT_INDICATORS',
            });
          }
          localStorage.setItem(STORAGE_DESKS, JSON.stringify(parsed));
        }
        return parsed;
      }
    } catch {}
    return DEFAULT_WORKSPACE_TABS;
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => {
    if (forcedDeskId) return forcedDeskId;
    return localStorage.getItem(STORAGE_ACTIVE_TAB) || 'desk_trading';
  });

  const currentDeskIdRef = useRef<string>(activeTabId);
  const isSwitchingDeskRef = useRef<boolean>(false);
  const modelRef = useRef<Model | null>(null);

  // Custom presets state
  const [customPresets, setCustomPresets] = useState<WorkspacePresetConfig[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_CUSTOM_PRESETS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Active preset ID
  const [activePresetId, setActivePresetId] = useState<string>('DEFAULT');

  // Active FlexLayout Model
  const [model, setModel] = useState<Model>(() => {
    try {
      const savedLayout = localStorage.getItem(`finpulse_layout_${STORAGE_SCHEMA_VERSION}_${activeTabId}`);
      if (savedLayout) {
        const parsedModel = Model.fromJson(JSON.parse(savedLayout));
        modelRef.current = parsedModel;
        return parsedModel;
      }
    } catch {
      // Safe fallback
    }
    const defModel = Model.fromJson(DEFAULT_PRESET.modelJson);
    modelRef.current = defModel;
    return defModel;
  });

  // Safe desk switch that saves current desk first and prevents cross-contamination
  const handleSwitchDesk = useCallback((newDeskId: string) => {
    if (newDeskId === currentDeskIdRef.current) return;
    if (modelRef.current) {
      try {
        localStorage.setItem(
          `finpulse_layout_${STORAGE_SCHEMA_VERSION}_${currentDeskIdRef.current}`,
          JSON.stringify(modelRef.current.toJson())
        );
      } catch {}
    }
    isSwitchingDeskRef.current = true;
    currentDeskIdRef.current = newDeskId;
    setActiveTabId(newDeskId);
  }, []);

  // Listen to hotbar desk switches
  useEffect(() => {
    const handleSwitch = (e: any) => {
      if (e?.detail) handleSwitchDesk(e.detail);
    };
    window.addEventListener('finpulse-switch-desk', handleSwitch);
    return () => window.removeEventListener('finpulse-switch-desk', handleSwitch);
  }, [handleSwitchDesk]);

  // Load layout on workspace tab switch
  useEffect(() => {
    if (!isDetachedMode) {
      localStorage.setItem(STORAGE_ACTIVE_TAB, activeTabId);
    }
    currentDeskIdRef.current = activeTabId;

    let targetModel: Model | null = null;
    let targetPresetId = 'DEFAULT';

    try {
      const savedLayout = localStorage.getItem(`finpulse_layout_${STORAGE_SCHEMA_VERSION}_${activeTabId}`);
      if (savedLayout) {
        targetModel = Model.fromJson(JSON.parse(savedLayout));
      }
    } catch {
      // Ignore
    }

    if (!targetModel) {
      const currentTab = workspaceTabs.find((t) => t.id === activeTabId);
      const targetPreset =
        BUILTIN_WORKSPACE_PRESETS.find((p) => p.id === currentTab?.presetId) || DEFAULT_PRESET;
      targetPresetId = targetPreset.id;
      targetModel = Model.fromJson(targetPreset.modelJson);
    }

    setActivePresetId(targetPresetId);
    setModel(targetModel);
    modelRef.current = targetModel;

    // Reset switching lockout on next animation frame after mount
    requestAnimationFrame(() => {
      isSwitchingDeskRef.current = false;
    });
  }, [activeTabId, workspaceTabs, isDetachedMode]);

  // Persist model changes reliably to active desk
  const handleModelChange = useCallback((updatedModel: Model) => {
    modelRef.current = updatedModel;
    if (isSwitchingDeskRef.current) return;
    try {
      const json = updatedModel.toJson();
      localStorage.setItem(
        `finpulse_layout_${STORAGE_SCHEMA_VERSION}_${currentDeskIdRef.current}`,
        JSON.stringify(json)
      );
    } catch {
      // Storage safe
    }
  }, []);

  // Load a preset
  const handleSelectPreset = (preset: WorkspacePresetConfig) => {
    setActivePresetId(preset.id);
    const newModel = Model.fromJson(preset.modelJson);
    setModel(newModel);
    modelRef.current = newModel;
    try {
      localStorage.setItem(
        `finpulse_layout_${STORAGE_SCHEMA_VERSION}_${currentDeskIdRef.current}`,
        JSON.stringify(newModel.toJson())
      );
    } catch {
      // Safe ignore
    }
  };

  // Save current workspace as custom preset
  const handleSaveCurrentAsPreset = (name: string) => {
    const currentJson = model.toJson();
    const newPreset: WorkspacePresetConfig = {
      id: `custom_${Date.now()}`,
      name,
      description: 'Custom user-saved docking arrangement',
      isCustom: true,
      modelJson: currentJson,
    };
    const updated = [...customPresets, newPreset];
    setCustomPresets(updated);
    setActivePresetId(newPreset.id);
    try {
      localStorage.setItem(STORAGE_CUSTOM_PRESETS, JSON.stringify(updated));
    } catch {
      // Safe ignore
    }
  };

  // Duplicate preset
  const handleDuplicatePreset = (preset: WorkspacePresetConfig) => {
    const duplicated: WorkspacePresetConfig = {
      ...preset,
      id: `custom_${Date.now()}`,
      name: `${preset.name} (Copy)`,
      isCustom: true,
    };
    const updated = [...customPresets, duplicated];
    setCustomPresets(updated);
    try {
      localStorage.setItem(STORAGE_CUSTOM_PRESETS, JSON.stringify(updated));
    } catch {
      // Safe ignore
    }
  };

  // Delete custom preset
  const handleDeleteCustomPreset = (id: string) => {
    const updated = customPresets.filter((p) => p.id !== id);
    setCustomPresets(updated);
    try {
      localStorage.setItem(STORAGE_CUSTOM_PRESETS, JSON.stringify(updated));
    } catch {
      // Safe ignore
    }
    if (activePresetId === id) {
      handleSelectPreset(DEFAULT_PRESET);
    }
  };

  // Import JSON preset
  const handleImportPreset = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.layout) return false;
      const importedModel = Model.fromJson(parsed);
      setModel(importedModel);
      handleSaveCurrentAsPreset(`Imported Desk ${new Date().toLocaleTimeString()}`);
      return true;
    } catch {
      return false;
    }
  };

  // Reset to default layout
  const handleResetToDefault = () => {
    localStorage.removeItem(`finpulse_layout_${STORAGE_SCHEMA_VERSION}_${currentDeskIdRef.current}`);
    const currentTab = workspaceTabs.find((t) => t.id === currentDeskIdRef.current);
    const targetPreset =
      BUILTIN_WORKSPACE_PRESETS.find((p) => p.id === currentTab?.presetId) || DEFAULT_PRESET;
    setActivePresetId(targetPreset.id);
    const newModel = Model.fromJson(targetPreset.modelJson);
    setModel(newModel);
    modelRef.current = newModel;
  };

  // Create new custom Desk workspace
  const handleCreateNewDesk = () => {
    const cleanName = newDeskName.trim() || `DESK ${workspaceTabs.length + 1}`;
    const newTab: WorkspaceTab = {
      id: `desk_${Date.now()}`,
      name: cleanName.toUpperCase(),
      presetId: newDeskPreset,
    };
    const updated = [...workspaceTabs, newTab];
    setWorkspaceTabs(updated);
    try {
      localStorage.setItem(STORAGE_DESKS, JSON.stringify(updated));
    } catch {
      // Safe fallback
    }
    handleSwitchDesk(newTab.id);
    setIsNewDeskOpen(false);
    setNewDeskName('');
  };

  // Delete custom desk workspace
  const handleDeleteDesk = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (workspaceTabs.length <= 1) return;
    const updated = workspaceTabs.filter((t) => t.id !== id);
    setWorkspaceTabs(updated);
    try {
      localStorage.setItem(STORAGE_DESKS, JSON.stringify(updated));
      localStorage.removeItem(`finpulse_layout_${STORAGE_SCHEMA_VERSION}_${id}`);
    } catch {
      // Safe fallback
    }
    if (activeTabId === id) {
      handleSwitchDesk(updated[0].id);
    }
  };

  // Detach / Pop-out Desk into a dedicated Monitor 2 secondary window
  const handlePopoutDesk = (e: React.MouseEvent, tab: WorkspaceTab) => {
    e.stopPropagation();
    const url = new URL(window.location.href);
    url.searchParams.set('windowType', 'detached_desk');
    url.searchParams.set('deskId', tab.id);
    url.searchParams.set('deskName', tab.name);
    window.open(
      url.toString(),
      `FinPulse_Desk_${tab.id}`,
      'width=1440,height=900,left=150,top=150,menubar=no,toolbar=no,location=no,status=no'
    );
  };

  // Add panel to active tabset
  const handleAddPanel = (panelId: string, title: string) => {
    const jsonTab: IJsonTabNode = {
      type: 'tab',
      name: title.toUpperCase(),
      component: panelId,
      id: `${panelId}_${Date.now().toString().slice(-4)}`,
      config: { contextGroup: 'BLUE' },
    };

    if (layoutRef.current) {
      layoutRef.current.addTabToActiveTabSet(jsonTab);
    } else {
      model.doAction(Actions.addNode(jsonTab, 'root', DockLocation.CENTER, -1));
    }
  };

  // Drag start from Tool Library / Panel card into workspace
  const handleDragStartPanel = (e: React.DragEvent<HTMLElement>, panelDef: PanelDefinition) => {
    const jsonTab: IJsonTabNode = {
      type: 'tab',
      name: panelDef.title.toUpperCase(),
      component: panelDef.id,
      id: `${panelDef.id}_${Date.now().toString().slice(-4)}`,
      config: { contextGroup: 'BLUE' },
    };

    if (layoutRef.current) {
      layoutRef.current.addTabWithDragAndDrop(e.nativeEvent, jsonTab);
    }
  };

  // Factory function rendering panels inside FlexLayout tabs
  const factory = (node: TabNode) => {
    const component = node.getComponent();
    const config = node.getConfig() || {};
    const contextGroup: LinkGroup = config.contextGroup || 'BLUE';

    switch (component) {
      case 'watchlist':
        return (
          <ErrorBoundary fallbackTitle="Watchlist Panel Error">
            <WatchlistPanel defaultGroup={contextGroup} />
          </ErrorBoundary>
        );
      case 'chart':
        return (
          <ErrorBoundary fallbackTitle="Chart Workstation Error">
            <ChartPanel
              defaultGroup={contextGroup}
              onMaximize={() => model.doAction(Actions.maximizeToggle(node.getParent()?.getId() || ''))}
              isMaximized={Boolean((node.getParent() as any)?.isMaximized?.())}
            />
          </ErrorBoundary>
        );
      case 'orderbook':
        return (
          <ErrorBoundary fallbackTitle="Order Book Error">
            <OrderBookPanel defaultGroup={contextGroup} />
          </ErrorBoundary>
        );
      case 'orderflow':
        return (
          <ErrorBoundary fallbackTitle="Time & Sales Tape Error">
            <OrderFlowPanel defaultGroup={contextGroup} />
          </ErrorBoundary>
        );
      case 'cvd':
        return (
          <ErrorBoundary fallbackTitle="CVD Spot & Futures Delta Error">
            <CVDPanel
              defaultGroup={contextGroup}
              onMaximize={() => model.doAction(Actions.maximizeToggle(node.getParent()?.getId() || ''))}
              isMaximized={Boolean((node.getParent() as any)?.isMaximized?.())}
            />
          </ErrorBoundary>
        );
      case 'radar':
        return (
          <ErrorBoundary fallbackTitle="Market Radar Error">
            <RadarPanel defaultGroup={contextGroup} />
          </ErrorBoundary>
        );
      case 'news':
        return (
          <ErrorBoundary fallbackTitle="News Intelligence Error">
            <NewsPanel defaultGroup={contextGroup} />
          </ErrorBoundary>
        );
      case 'ai':
        return (
          <ErrorBoundary fallbackTitle="AI Analyst Error">
            <AIPanel defaultGroup={contextGroup} />
          </ErrorBoundary>
        );
      case 'volumeprofile':
        return (
          <ErrorBoundary fallbackTitle="Volume Profile Error">
            <VolumeProfilePanel defaultGroup={contextGroup} />
          </ErrorBoundary>
        );
      case 'marketconditions':
        return (
          <ErrorBoundary fallbackTitle="Market Conditions Error">
            <MarketConditionsPanel defaultGroup={contextGroup} />
          </ErrorBoundary>
        );
      case 'correlation':
        return (
          <ErrorBoundary fallbackTitle="Correlation Matrix Error">
            <CorrelationMatrixPanel />
          </ErrorBoundary>
        );
      case 'scanner':
        return (
          <ErrorBoundary fallbackTitle="FinQL Scanner Error">
            <ScannerPanel />
          </ErrorBoundary>
        );
      case 'portrisk':
        return (
          <ErrorBoundary fallbackTitle="Portfolio Risk Error">
            <PortfolioRiskPanel />
          </ErrorBoundary>
        );
      case 'macro':
        return (
          <ErrorBoundary fallbackTitle="Macro Calendar Error">
            <MacroCalendarPanel />
          </ErrorBoundary>
        );
      case 'replay':
        return (
          <ErrorBoundary fallbackTitle="Market Replay Error">
            <ReplayPanel />
          </ErrorBoundary>
        );
      case 'trend_direction':
        return (
          <ErrorBoundary fallbackTitle="Trend Direction Error">
            <TrendDirectionPanel defaultGroup={contextGroup} />
          </ErrorBoundary>
        );
      case 'zscore':
        return (
          <ErrorBoundary fallbackTitle="Z-Score Error">
            <ZScorePanel defaultGroup={contextGroup} />
          </ErrorBoundary>
        );
      case 'rsi_standalone':
        return (
          <ErrorBoundary fallbackTitle="RSI Oscillator Error">
            <RSIPanel defaultGroup={contextGroup} />
          </ErrorBoundary>
        );
      case 'volume_analysis':
        return (
          <ErrorBoundary fallbackTitle="Volume Dynamics Error">
            <VolumeAnalysisPanel defaultGroup={contextGroup} />
          </ErrorBoundary>
        );
      case 'regime_indicator':
        return (
          <ErrorBoundary fallbackTitle="Market Regime Error">
            <RegimeIndicatorPanel defaultGroup={contextGroup} />
          </ErrorBoundary>
        );
      default:
        return (
          <div className="p-4 text-muted text-xs font-mono">
            Unrecognized panel component: {component}
          </div>
        );
    }
  };

  // Close a single panel tab. flexlayout automatically reflows siblings into freed space.
  // The underlying module is never destroyed, it remains available in Add Panel.
  const handleClosePanel = useCallback((node: TabNode) => {
    model.doAction(Actions.deleteTab(node.getId()));
  }, [model]);

  // Ctrl+W = close the focused panel tab (native flexlayout shortcut via keyMap)
  const LAYOUT_KEYMAP: IKeyMap = {
    closeTab: 'Ctrl+W',
  };

  // Inject a small X button into every tabset's right-side toolbar.
  // When a tab is selected, closes that tab. When the tabset is empty, closes the whole tabset.
  const handleRenderTabSet = useCallback(
    (tabSetNode: TabSetNode | BorderNode, renderValues: ITabSetRenderValues) => {
      if (!(tabSetNode instanceof TabSetNode)) return;

      const selectedNode = tabSetNode.getSelectedNode();
      const capturedTabsetId = tabSetNode.getId();

      // Determine what gets closed: the active tab, or the whole empty tabset
      const isEmptyTabset = !selectedNode || !(selectedNode instanceof TabNode);
      const capturedTabNode = isEmptyTabset ? null : (selectedNode as TabNode);

      renderValues.buttons.push(
        <button
          key="fp-close-panel"
          type="button"
          title={isEmptyTabset ? 'Close empty panel area' : 'Close Panel (Ctrl+W)'}
          aria-label={isEmptyTabset ? 'Close empty panel area' : 'Close panel'}
          className="fp-tabset-close-btn"
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (capturedTabNode) {
              handleClosePanel(capturedTabNode);
            } else {
              model.doAction(Actions.deleteTabset(capturedTabsetId));
            }
          }}
        >
          <X size={11} strokeWidth={2.5} />
        </button>
      );
    },
    [handleClosePanel, model]
  );


  // Right-click on a tab or tabset shows a context menu with Close Panel.
  const handleContextMenu = useCallback(
    (node: TabNode | TabSetNode | BorderNode | TabGroupNode, event: React.MouseEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();

      // Determine the tab to close: if right-clicked directly on a tab use it,
      // otherwise use the selected tab in the tabset.
      let target: TabNode | null = null;
      if (node instanceof TabNode) {
        target = node;
      } else if (node instanceof TabSetNode) {
        const sel = node.getSelectedNode();
        if (sel instanceof TabNode) target = sel;
      }

      if (!target) return;

      const capturedTarget = target;
      const items = new ContextMenuBuilder(node, {
        onAction: (action) => model.doAction(action),
      })
        .add('maximize')
        .addDivider()
        .addCustom({
          key: 'fp-close',
          label: 'Close Panel',
          icon: <X size={11} />,
          onSelect: () => handleClosePanel(capturedTarget),
        })
        .build();

      showPopupMenu({
        anchor: { x: event.clientX, y: event.clientY },
        items,
        onClose: () => {},
      });
    },
    [model, handleClosePanel]
  );

  // Persist layout immediately when a tab or tabset is deleted
  const handleAction = useCallback(
    (action: ReturnType<typeof Actions.deleteTab>) => {
      if (
        action.type === Actions.DELETE_TAB ||
        action.type === Actions.DELETE_TABSET
      ) {
        // Allow the action to proceed, then persist on next tick
        setTimeout(() => {
          if (isSwitchingDeskRef.current) return;
          try {
            localStorage.setItem(
              `finpulse_layout_${STORAGE_SCHEMA_VERSION}_${currentDeskIdRef.current}`,
              JSON.stringify(model.toJson())
            );
          } catch {
            // Storage safe
          }
        }, 0);
      }
      return action;
    },
    [model]
  );

  const allPresets = [...BUILTIN_WORKSPACE_PRESETS, ...customPresets];
  const activePreset = allPresets.find((p) => p.id === activePresetId) || DEFAULT_PRESET;


  return (
    <div className="flex flex-col h-full bg-[#07080a] text-xs font-mono select-none overflow-hidden relative">
      {/* Top Professional Workstation Ribbon */}
      <div className="h-7 bg-[#0b0d13] border-b border-border/50 px-2 flex items-center justify-between text-[11px] text-muted shrink-0 z-20">
        {/* Left: Workspace Desks Bar (Trading, CVD, Research, Macro, + Custom) */}
        <div className="flex items-center space-x-1">
          {!isDetachedMode && (
            <div className="flex items-center bg-[#11141c] rounded p-0.5 border border-border/40">
              {workspaceTabs.map((tab) => {
                const isActive = activeTabId === tab.id;
                const isCustom =
                  !tab.id.startsWith('desk_trading') &&
                  !tab.id.startsWith('desk_cvd') &&
                  !tab.id.startsWith('desk_indicators') &&
                  !tab.id.startsWith('desk_research') &&
                  !tab.id.startsWith('desk_macro');
                return (
                  <div
                    key={tab.id}
                    onClick={() => handleSwitchDesk(tab.id)}
                    className={`group flex items-center space-x-1.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-accent text-white shadow-sm'
                        : 'text-muted hover:text-text hover:bg-surface'
                    }`}
                  >
                    <span>{tab.name}</span>

                    {/* Pop-Out / Detach Icon (Click to open in a separate window for Monitor 2) */}
                    <button
                      type="button"
                      onClick={(e) => handlePopoutDesk(e, tab)}
                      className="p-0.5 text-white/50 hover:text-white rounded hover:bg-black/30 transition-colors"
                      title="Pop out Desk into a separate window for Monitor 2"
                    >
                      <ExternalLink size={10} />
                    </button>

                    {/* Delete custom desk */}
                    {isCustom && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteDesk(e, tab.id)}
                        className="p-0.5 text-white/40 hover:text-red-400 rounded hover:bg-black/30 transition-colors"
                        title="Delete this custom Desk"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* + Add New Desk Workspace Button */}
              <button
                type="button"
                onClick={() => setIsNewDeskOpen(true)}
                className="px-1.5 py-0.5 rounded text-[10px] text-muted hover:text-accent hover:bg-accent/10 transition-colors font-bold flex items-center space-x-0.5 ml-0.5"
                title="Create New Custom Desk Workspace"
              >
                <Plus size={11} />
                <span>Desk</span>
              </button>
            </div>
          )}

          {isDetachedMode && (
            <div className="flex items-center space-x-1.5 bg-accent/20 px-2 py-0.5 rounded text-accent font-bold border border-accent/40 text-[10px]">
              <Monitor size={11} />
              <span>DESK: {(workspaceTabs.find((t) => t.id === activeTabId)?.name || 'SECONDARY').toUpperCase()}</span>
            </div>
          )}

          <div className="w-[1px] h-3 bg-border/40 mx-1" />

          {/* Preset Selector Button */}
          <button
            type="button"
            onClick={() => setIsPresetsOpen(true)}
            className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-surface hover:bg-surface-hover text-text border border-border/60 transition-colors text-[10px]"
            title="Manage Workspace Desks & Presets"
          >
            <LayoutIcon size={11} className="text-accent" />
            <span className="font-bold">{activePreset.name}</span>
            <ChevronDown size={10} className="text-muted" />
          </button>
        </div>

        {/* Right: Add Panel, Tool Library, Reset */}
        <div className="flex items-center space-x-2">
          {/* Quick Tool Library Button */}
          <button
            type="button"
            onClick={() => setIsLibraryOpen(true)}
            className="flex items-center space-x-1 px-2 py-0.5 rounded bg-accent/20 hover:bg-accent/30 text-accent border border-accent/40 font-bold transition-colors text-[10px]"
            title="Open Panel Toolbox (Click or Drag panels into workspace)"
          >
            <Plus size={11} />
            <span>Add Panel</span>
          </button>

          {/* Reset Clean Default */}
          <button
            type="button"
            onClick={handleResetToDefault}
            className="p-1 text-muted hover:text-text hover:bg-surface rounded transition-colors"
            title="Reset Active Workspace to Clean Default Layout"
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </div>

      {/* Main Docking Layout Area */}
      <div className="flex-grow w-full h-full relative overflow-hidden">
        <Layout
          ref={layoutRef}
          model={model}
          factory={factory}
          onModelChange={handleModelChange}
          onAction={handleAction}
          onRenderTabSet={handleRenderTabSet}
          onContextMenu={handleContextMenu}
          keyMap={LAYOUT_KEYMAP}
          supportsPopout={false}
          realtimeResize={true}
        />
      </div>

      {/* New Desk Workspace Modal */}
      {isNewDeskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-[#0e1118] border border-border rounded-lg shadow-2xl w-full max-w-md p-4 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-3">
              <span className="font-bold text-text flex items-center gap-1.5">
                <Monitor size={13} className="text-accent" /> CREATE NEW DESK WORKSPACE
              </span>
              <button
                type="button"
                onClick={() => setIsNewDeskOpen(false)}
                className="text-muted hover:text-text p-1 rounded"
              >
                <X size={13} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-muted block mb-1 uppercase font-semibold">
                  Desk Title / Label
                </label>
                <input
                  type="text"
                  value={newDeskName}
                  onChange={(e) => setNewDeskName(e.target.value)}
                  placeholder="e.g. MONITOR 2, CVD LAB, ORDERFLOW PRO"
                  className="w-full bg-[#141722] border border-border px-2.5 py-1.5 rounded text-text placeholder-muted focus:outline-none focus:border-accent text-xs font-bold"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateNewDesk();
                    if (e.key === 'Escape') setIsNewDeskOpen(false);
                  }}
                />
              </div>

              <div>
                <label className="text-[10px] text-muted block mb-1 uppercase font-semibold">
                  Starting Template / Preset
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'TRADING', label: 'Trading Pro Workstation' },
                    { id: 'ORDER_FLOW', label: 'Order Flow & CVD' },
                    { id: 'RESEARCH', label: 'Quant Screener' },
                    { id: 'MACRO', label: 'Macro & News' },
                    { id: 'DEFAULT', label: 'Clean 4-Quadrant' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setNewDeskPreset(p.id)}
                      className={`text-left p-2 rounded border text-[11px] font-bold transition-colors ${
                        newDeskPreset === p.id
                          ? 'bg-accent/20 border-accent text-accent'
                          : 'bg-[#141722] border-border/60 text-muted hover:text-text'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => setIsNewDeskOpen(false)}
                  className="px-3 py-1.5 rounded bg-surface hover:bg-surface-hover text-muted hover:text-text border border-border text-[11px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewDesk}
                  className="px-3.5 py-1.5 rounded bg-accent hover:bg-accent/90 text-white font-bold text-[11px] shadow-sm flex items-center space-x-1"
                >
                  <Plus size={12} />
                  <span>Create Desk</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <PanelLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onAddPanel={handleAddPanel}
        onDragStartPanel={handleDragStartPanel}
        activePanelIds={PANEL_DEFINITIONS.map((p) => p.id)}
      />

      <PresetManagerModal
        isOpen={isPresetsOpen}
        onClose={() => setIsPresetsOpen(false)}
        currentPresetId={activePresetId}
        onSelectPreset={handleSelectPreset}
        onSaveCurrentAsPreset={handleSaveCurrentAsPreset}
        customPresets={customPresets}
        onDeleteCustomPreset={handleDeleteCustomPreset}
        onDuplicatePreset={handleDuplicatePreset}
        onImportPreset={handleImportPreset}
        onResetToDefault={handleResetToDefault}
        getCurrentLayoutJson={() => JSON.stringify(model.toJson(), null, 2)}
      />
    </div>
  );
}
