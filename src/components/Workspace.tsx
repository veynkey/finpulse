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
} from 'lucide-react';

// Panels
import WatchlistPanel from '../panels/WatchlistPanel';
import ChartPanel from '../panels/ChartPanel';
import OrderBookPanel from '../panels/OrderBookPanel';
import OrderFlowPanel from '../panels/OrderFlowPanel';
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

const STORAGE_SCHEMA_VERSION = 'layout_schema_version_2';
const STORAGE_ACTIVE_TAB = 'finpulse_active_workspace_tab';
const STORAGE_CUSTOM_PRESETS = 'finpulse_dock_custom_presets_v2';

interface WorkspaceTab {
  id: string;
  name: string;
  presetId: string;
}

export default function Workspace() {
  const layoutRef = useRef<any>(null);

  // Modals state
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);

  // Multi-workspace tabs state
  const [workspaceTabs] = useState<WorkspaceTab[]>([
    { id: 'desk_trading', name: 'TRADING', presetId: 'TRADING' },
    { id: 'desk_research', name: 'RESEARCH', presetId: 'RESEARCH' },
    { id: 'desk_macro', name: 'MACRO', presetId: 'MACRO' },
    { id: 'desk_orderflow', name: 'ORDER FLOW', presetId: 'ORDER_FLOW' },
  ]);

  const [activeTabId, setActiveTabId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_ACTIVE_TAB) || 'desk_trading';
  });

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
        return Model.fromJson(JSON.parse(savedLayout));
      }
    } catch {
      // Safe fallback
    }
    return Model.fromJson(DEFAULT_PRESET.modelJson);
  });

  // Load layout on workspace tab switch
  useEffect(() => {
    localStorage.setItem(STORAGE_ACTIVE_TAB, activeTabId);
    try {
      const savedLayout = localStorage.getItem(`finpulse_layout_${STORAGE_SCHEMA_VERSION}_${activeTabId}`);
      if (savedLayout) {
        setModel(Model.fromJson(JSON.parse(savedLayout)));
        return;
      }
    } catch {
      // Ignore
    }

    const currentTab = workspaceTabs.find((t) => t.id === activeTabId);
    const targetPreset =
      BUILTIN_WORKSPACE_PRESETS.find((p) => p.id === currentTab?.presetId) || DEFAULT_PRESET;
    setActivePresetId(targetPreset.id);
    setModel(Model.fromJson(targetPreset.modelJson));
  }, [activeTabId, workspaceTabs]);

  // Persist model changes
  const handleModelChange = useCallback((updatedModel: Model) => {
    try {
      const json = updatedModel.toJson();
      localStorage.setItem(
        `finpulse_layout_${STORAGE_SCHEMA_VERSION}_${activeTabId}`,
        JSON.stringify(json)
      );
    } catch {
      // Storage safe
    }
  }, [activeTabId]);

  // Load a preset
  const handleSelectPreset = (preset: WorkspacePresetConfig) => {
    setActivePresetId(preset.id);
    const newModel = Model.fromJson(preset.modelJson);
    setModel(newModel);
    try {
      localStorage.setItem(
        `finpulse_layout_${STORAGE_SCHEMA_VERSION}_${activeTabId}`,
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
    localStorage.removeItem(`finpulse_layout_${STORAGE_SCHEMA_VERSION}_${activeTabId}`);
    setActivePresetId(DEFAULT_PRESET.id);
    setModel(Model.fromJson(DEFAULT_PRESET.modelJson));
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
      default:
        return (
          <div className="p-4 text-muted text-xs font-mono">
            Unrecognized panel component: {component}
          </div>
        );
    }
  };

  // Close a single panel tab. flexlayout automatically reflows siblings into freed space.
  // The underlying module is never destroyed — it remains available in Add Panel.
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
          try {
            localStorage.setItem(
              `finpulse_layout_${STORAGE_SCHEMA_VERSION}_${activeTabId}`,
              JSON.stringify(model.toJson())
            );
          } catch {
            // Storage safe
          }
        }, 0);
      }
      return action;
    },
    [model, activeTabId]
  );

  const allPresets = [...BUILTIN_WORKSPACE_PRESETS, ...customPresets];
  const activePreset = allPresets.find((p) => p.id === activePresetId) || DEFAULT_PRESET;


  return (
    <div className="flex flex-col h-full bg-[#07080a] text-xs font-mono select-none overflow-hidden relative">
      {/* Top Professional Workstation Ribbon */}
      <div className="h-7 bg-[#0b0d13] border-b border-border/50 px-2 flex items-center justify-between text-[11px] text-muted shrink-0 z-20">
        {/* Left: Workspace Desks Bar (Trading, Research, Macro, Order Flow) */}
        <div className="flex items-center space-x-1">
          <div className="flex items-center bg-[#11141c] rounded p-0.5 border border-border/40">
            {workspaceTabs.map((tab) => {
              const isActive = activeTabId === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTabId(tab.id)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider transition-colors ${
                    isActive
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-muted hover:text-text hover:bg-surface'
                  }`}
                >
                  {tab.name}
                </button>
              );
            })}
          </div>

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
