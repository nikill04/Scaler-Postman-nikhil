'use client';
// Global app state using React context + useReducer.
// This is the single source of truth for the entire UI.
// Think of it like a simple Redux store.

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type { TabState, Collection, Environment, HistoryEntry, Workspace } from '../types';
import { newTab, savedRequestToTab } from '../lib/utils';
import type { SavedRequest } from '../types';

// ── State shape ────────────────────────────────────────────────────────────

interface AppState {
  workspaceId: number;
  collections: Collection[];
  environments: Environment[];
  selectedEnvId: number | null;
  history: HistoryEntry[];
  tabs: TabState[];
  activeTabId: string;
  sidebarView: 'collections' | 'history';
  sidebarWidth: number;
}

// ── Actions ────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_COLLECTIONS'; collections: Collection[] }
  | { type: 'SET_ENVIRONMENTS'; environments: Environment[] }
  | { type: 'SET_HISTORY'; history: HistoryEntry[] }
  | { type: 'SET_ENV'; id: number | null }
  | { type: 'OPEN_TAB'; tab: TabState }
  | { type: 'CLOSE_TAB'; id: string }
  | { type: 'SET_ACTIVE_TAB'; id: string }
  | { type: 'UPDATE_TAB'; id: string; updates: Partial<TabState> }
  | { type: 'SET_SIDEBAR_VIEW'; view: 'collections' | 'history' }
  | { type: 'ADD_HISTORY_ENTRY'; entry: HistoryEntry }
  | { type: 'UPSERT_COLLECTION'; collection: Collection }
  | { type: 'REMOVE_COLLECTION'; id: number }
  | { type: 'UPSERT_ENVIRONMENT'; env: Environment }
  | { type: 'REMOVE_ENVIRONMENT'; id: number };

// ── Initial state ──────────────────────────────────────────────────────────

const initialTab = newTab();
const initialState: AppState = {
  workspaceId: 1,   // default workspace (seeded)
  collections: [],
  environments: [],
  selectedEnvId: null,
  history: [],
  tabs: [initialTab],
  activeTabId: initialTab.id,
  sidebarView: 'collections',
  sidebarWidth: 260,
};

// ── Reducer ────────────────────────────────────────────────────────────────

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_COLLECTIONS':
      return { ...state, collections: action.collections };

    case 'SET_ENVIRONMENTS':
      return { ...state, environments: action.environments };

    case 'SET_HISTORY':
      return { ...state, history: action.history };

    case 'SET_ENV':
      return { ...state, selectedEnvId: action.id };

    case 'OPEN_TAB': {
      // Check if this saved request is already open
      const existing = state.tabs.find(
        t => t.savedRequestId && t.savedRequestId === action.tab.savedRequestId
      );
      if (existing) {
        return { ...state, activeTabId: existing.id };
      }
      return {
        ...state,
        tabs: [...state.tabs, action.tab],
        activeTabId: action.tab.id,
      };
    }

    case 'CLOSE_TAB': {
      if (state.tabs.length === 1) return state;  // keep at least one tab
      const newTabs = state.tabs.filter(t => t.id !== action.id);
      const newActive =
        state.activeTabId === action.id
          ? newTabs[Math.max(0, state.tabs.findIndex(t => t.id === action.id) - 1)].id
          : state.activeTabId;
      return { ...state, tabs: newTabs, activeTabId: newActive };
    }

    case 'SET_ACTIVE_TAB':
      return { ...state, activeTabId: action.id };

    case 'UPDATE_TAB':
      return {
        ...state,
        tabs: state.tabs.map(t =>
          t.id === action.id ? { ...t, ...action.updates } : t
        ),
      };

    case 'SET_SIDEBAR_VIEW':
      return { ...state, sidebarView: action.view };

    case 'ADD_HISTORY_ENTRY':
      return { ...state, history: [action.entry, ...state.history] };

    case 'UPSERT_COLLECTION': {
      const exists = state.collections.some(c => c.id === action.collection.id);
      return {
        ...state,
        collections: exists
          ? state.collections.map(c => c.id === action.collection.id ? action.collection : c)
          : [...state.collections, action.collection],
      };
    }

    case 'REMOVE_COLLECTION':
      return { ...state, collections: state.collections.filter(c => c.id !== action.id) };

    case 'UPSERT_ENVIRONMENT': {
      const exists = state.environments.some(e => e.id === action.env.id);
      return {
        ...state,
        environments: exists
          ? state.environments.map(e => e.id === action.env.id ? action.env : e)
          : [...state.environments, action.env],
      };
    }

    case 'REMOVE_ENVIRONMENT':
      return {
        ...state,
        environments: state.environments.filter(e => e.id !== action.id),
        selectedEnvId: state.selectedEnvId === action.id ? null : state.selectedEnvId,
      };

    default:
      return state;
  }
}

// ── Context ────────────────────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  openRequest: (req: SavedRequest) => void;
  openNewTab: () => void;
  activeTab: TabState | undefined;
  updateActiveTab: (updates: Partial<TabState>) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const activeTab = state.tabs.find(t => t.id === state.activeTabId);

  const openRequest = useCallback((req: SavedRequest) => {
    const tab = savedRequestToTab(req);
    dispatch({ type: 'OPEN_TAB', tab });
  }, []);

  const openNewTab = useCallback(() => {
    const tab = newTab();
    dispatch({ type: 'OPEN_TAB', tab });
  }, []);

  const updateActiveTab = useCallback((updates: Partial<TabState>) => {
    if (activeTab) {
      dispatch({ type: 'UPDATE_TAB', id: activeTab.id, updates });
    }
  }, [activeTab]);

  return (
    <AppContext.Provider value={{ state, dispatch, openRequest, openNewTab, activeTab, updateActiveTab }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
