import type { IJsonModel } from 'flexlayout-react';

export interface WorkspacePresetConfig {
  id: string;
  name: string;
  description: string;
  isCustom?: boolean;
  modelJson: IJsonModel;
}

const GLOBAL_CONFIG = {
  tabEnableClose: true,
  tabCloseType: 2,            // ICloseType.Always: X visible on every tab at all times
  tabEnableRename: false,
  tabEnableFloat: false,
  tabSetEnableMaximize: true,
  tabSetEnableClose: true,    // Allow tabsets to be closed
  tabSetEnableCloseButton: true, // Show X button in the tabset toolbar
  tabSetEnableDeleteWhenEmpty: true, // Auto-remove empty tabsets, freeing space
  splitterSize: 4,
  tabSetMinWidth: 200,
  tabSetMinHeight: 140,
};

// 1. DEFAULT WORKSPACE (Trader Core: Clean 4-zone layout)
export const DEFAULT_PRESET: WorkspacePresetConfig = {
  id: 'DEFAULT',
  name: 'Trader Core (Clean Default)',
  description: 'Balanced 4-quadrant layout: Watchlist, Main Chart, Radar/News, and bottom Contextual Dock.',
  modelJson: {
    global: GLOBAL_CONFIG,
    layout: {
      type: 'row',
      weight: 100,
      children: [
        {
          type: 'row',
          weight: 65,
          children: [
            {
              type: 'tabset',
              weight: 22,
              id: 'tabset_left',
              children: [
                {
                  type: 'tab',
                  name: 'WATCHLIST',
                  component: 'watchlist',
                  id: 'tab_watchlist',
                  config: { contextGroup: 'BLUE' },
                },
              ],
            },
            {
              type: 'tabset',
              weight: 54,
              id: 'tabset_center',
              children: [
                {
                  type: 'tab',
                  name: 'CHART [BTC/USDT]',
                  component: 'chart',
                  id: 'tab_chart_main',
                  config: { contextGroup: 'BLUE' },
                },
              ],
            },
            {
              type: 'tabset',
              weight: 24,
              id: 'tabset_right',
              children: [
                {
                  type: 'tab',
                  name: 'MARKET RADAR',
                  component: 'radar',
                  id: 'tab_radar',
                  config: { contextGroup: 'BLUE' },
                },
                {
                  type: 'tab',
                  name: 'NEWS INTELLIGENCE',
                  component: 'news',
                  id: 'tab_news',
                  config: { contextGroup: 'BLUE' },
                },
              ],
            },
          ],
        },
        {
          type: 'tabset',
          weight: 35,
          id: 'tabset_bottom',
          children: [
            {
              type: 'tab',
              name: 'MARKET CONDITIONS',
              component: 'marketconditions',
              id: 'tab_marketconditions',
              config: { contextGroup: 'BLUE' },
            },
            {
              type: 'tab',
              name: 'TIME & SALES',
              component: 'orderflow',
              id: 'tab_orderflow',
              config: { contextGroup: 'BLUE' },
            },
            {
              type: 'tab',
              name: 'ORDER BOOK',
              component: 'orderbook',
              id: 'tab_orderbook',
              config: { contextGroup: 'BLUE' },
            },
            {
              type: 'tab',
              name: 'CORRELATION MATRIX',
              component: 'correlation',
              id: 'tab_correlation',
              config: { contextGroup: 'BLUE' },
            },
            {
              type: 'tab',
              name: 'VOLUME PROFILE (VPVR)',
              component: 'volumeprofile',
              id: 'tab_volumeprofile',
              config: { contextGroup: 'BLUE' },
            },
            {
              type: 'tab',
              name: 'MACRO CALENDAR',
              component: 'macro',
              id: 'tab_macro',
              config: { contextGroup: 'BLUE' },
            },
            {
              type: 'tab',
              name: 'AI ANALYST',
              component: 'ai',
              id: 'tab_ai',
              config: { contextGroup: 'BLUE' },
            },
            {
              type: 'tab',
              name: 'PORTFOLIO RISK',
              component: 'portrisk',
              id: 'tab_portrisk',
              config: { contextGroup: 'BLUE' },
            },
          ],
        },
      ],
    },
  },
};

// 2. TRADING EXECUTION PRESET
export const TRADING_PRESET: WorkspacePresetConfig = {
  id: 'TRADING',
  name: 'Trading & Order Flow Execution',
  description: 'Deep liquidity depth, order flow tape, execution chart, and positions.',
  modelJson: {
    global: GLOBAL_CONFIG,
    layout: {
      type: 'row',
      weight: 100,
      children: [
        {
          type: 'row',
          weight: 70,
          children: [
            {
              type: 'tabset',
              weight: 20,
              children: [
                {
                  type: 'tab',
                  name: 'WATCHLIST',
                  component: 'watchlist',
                  id: 'trade_watchlist',
                  config: { contextGroup: 'BLUE' },
                },
              ],
            },
            {
              type: 'tabset',
              weight: 55,
              children: [
                {
                  type: 'tab',
                  name: 'MAIN CHART',
                  component: 'chart',
                  id: 'trade_chart',
                  config: { contextGroup: 'BLUE' },
                },
              ],
            },
            {
              type: 'tabset',
              weight: 25,
              children: [
                {
                  type: 'tab',
                  name: 'L2 DEPTH BOOK',
                  component: 'orderbook',
                  id: 'trade_book',
                  config: { contextGroup: 'BLUE' },
                },
                {
                  type: 'tab',
                  name: 'TIME & SALES',
                  component: 'orderflow',
                  id: 'trade_flow',
                  config: { contextGroup: 'BLUE' },
                },
              ],
            },
          ],
        },
        {
          type: 'tabset',
          weight: 30,
          children: [
            {
              type: 'tab',
              name: 'VOLUME PROFILE (VPVR)',
              component: 'volumeprofile',
              id: 'trade_vpvr',
              config: { contextGroup: 'BLUE' },
            },
            {
              type: 'tab',
              name: 'PORTFOLIO & VAR',
              component: 'portrisk',
              id: 'trade_risk',
              config: { contextGroup: 'BLUE' },
            },
            {
              type: 'tab',
              name: 'MARKET CONDITIONS',
              component: 'marketconditions',
              id: 'trade_conditions',
              config: { contextGroup: 'BLUE' },
            },
          ],
        },
      ],
    },
  },
};

// 3. RESEARCH & QUANT ANALYST PRESET
export const RESEARCH_PRESET: WorkspacePresetConfig = {
  id: 'RESEARCH',
  name: 'Quantitative Research & Screener',
  description: 'FinQL asset scanner, cross-asset correlation matrix, macro calendar, and AI analyst.',
  modelJson: {
    global: GLOBAL_CONFIG,
    layout: {
      type: 'row',
      weight: 100,
      children: [
        {
          type: 'row',
          weight: 55,
          children: [
            {
              type: 'tabset',
              weight: 50,
              children: [
                {
                  type: 'tab',
                  name: 'FINQL SCANNER',
                  component: 'scanner',
                  id: 'res_scanner',
                  config: { contextGroup: 'BLUE' },
                },
              ],
            },
            {
              type: 'tabset',
              weight: 50,
              children: [
                {
                  type: 'tab',
                  name: 'CORRELATION MATRIX',
                  component: 'correlation',
                  id: 'res_correlation',
                  config: { contextGroup: 'BLUE' },
                },
              ],
            },
          ],
        },
        {
          type: 'row',
          weight: 45,
          children: [
            {
              type: 'tabset',
              weight: 50,
              children: [
                {
                  type: 'tab',
                  name: 'MACRO CALENDAR',
                  component: 'macro',
                  id: 'res_macro',
                  config: { contextGroup: 'BLUE' },
                },
                {
                  type: 'tab',
                  name: 'NEWS INTELLIGENCE',
                  component: 'news',
                  id: 'res_news',
                  config: { contextGroup: 'BLUE' },
                },
              ],
            },
            {
              type: 'tabset',
              weight: 50,
              children: [
                {
                  type: 'tab',
                  name: 'EVIDENCE AI ANALYST',
                  component: 'ai',
                  id: 'res_ai',
                  config: { contextGroup: 'BLUE' },
                },
                {
                  type: 'tab',
                  name: 'MARKET CONDITIONS',
                  component: 'marketconditions',
                  id: 'res_conditions',
                  config: { contextGroup: 'BLUE' },
                },
              ],
            },
          ],
        },
      ],
    },
  },
};

// 4. ORDER FLOW PRESET
export const ORDER_FLOW_PRESET: WorkspacePresetConfig = {
  id: 'ORDER_FLOW',
  name: 'Order Flow & Microstructure',
  description: 'Split-screen order book depth, Time & Sales tape, and volume profile.',
  modelJson: {
    global: GLOBAL_CONFIG,
    layout: {
      type: 'row',
      weight: 100,
      children: [
        {
          type: 'tabset',
          weight: 60,
          children: [
            {
              type: 'tab',
              name: 'WORKSTATION CHART',
              component: 'chart',
              id: 'of_chart',
              config: { contextGroup: 'BLUE' },
            },
          ],
        },
        {
          type: 'tabset',
          weight: 40,
          children: [
            {
              type: 'tab',
              name: 'L2 DEPTH BOOK',
              component: 'orderbook',
              id: 'of_book',
              config: { contextGroup: 'BLUE' },
            },
            {
              type: 'tab',
              name: 'TIME & SALES TAPE',
              component: 'orderflow',
              id: 'of_flow',
              config: { contextGroup: 'BLUE' },
            },
            {
              type: 'tab',
              name: 'CVD SPOT & FUTURES',
              component: 'cvd',
              id: 'of_cvd',
              config: { contextGroup: 'BLUE' },
            },
            {
              type: 'tab',
              name: 'VOLUME PROFILE',
              component: 'volumeprofile',
              id: 'of_vpvr',
              config: { contextGroup: 'BLUE' },
            },
          ],
        },
      ],
    },
  },
};

// 5. GLOBAL MACRO PRESET
export const MACRO_PRESET: WorkspacePresetConfig = {
  id: 'MACRO',
  name: 'Global Macro & Sentiment',
  description: 'Global economic releases, news intelligence, and cross-asset correlation.',
  modelJson: {
    global: GLOBAL_CONFIG,
    layout: {
      type: 'row',
      weight: 100,
      children: [
        {
          type: 'tabset',
          weight: 50,
          children: [
            {
              type: 'tab',
              name: 'GLOBAL MACRO CALENDAR',
              component: 'macro',
              id: 'macro_cal',
              config: { contextGroup: 'BLUE' },
            },
            {
              type: 'tab',
              name: 'NEWS INTELLIGENCE',
              component: 'news',
              id: 'macro_news',
              config: { contextGroup: 'BLUE' },
            },
          ],
        },
        {
          type: 'tabset',
          weight: 50,
          children: [
            {
              type: 'tab',
              name: 'CORRELATION MATRIX',
              component: 'correlation',
              id: 'macro_matrix',
              config: { contextGroup: 'BLUE' },
            },
            {
              type: 'tab',
              name: 'EVIDENCE AI ANALYST',
              component: 'ai',
              id: 'macro_ai',
              config: { contextGroup: 'BLUE' },
            },
          ],
        },
      ],
    },
  },
};

// 6. BLANK PRESET (Clean Slate)
export const BLANK_PRESET: WorkspacePresetConfig = {
  id: 'BLANK',
  name: 'Blank Workstation (Clean Slate)',
  description: 'Empty canvas ready for complete user customization via Add Panel.',
  modelJson: {
    global: GLOBAL_CONFIG,
    layout: {
      type: 'row',
      weight: 100,
      children: [
        {
          type: 'tabset',
          weight: 100,
          children: [
            {
              type: 'tab',
              name: 'WORKSTATION CHART',
              component: 'chart',
              id: 'blank_chart',
              config: { contextGroup: 'BLUE' },
            },
          ],
        },
      ],
    },
  },
};

export const BUILTIN_WORKSPACE_PRESETS: WorkspacePresetConfig[] = [
  DEFAULT_PRESET,
  TRADING_PRESET,
  RESEARCH_PRESET,
  ORDER_FLOW_PRESET,
  MACRO_PRESET,
  BLANK_PRESET,
];
