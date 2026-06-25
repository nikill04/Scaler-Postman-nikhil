'use client';
// Top navigation bar — Postman-style header with workspace name,
// environment selector, and user info.

import { useApp } from '../lib/store';
import { ChevronDown, Settings, Plus, Search } from 'lucide-react';
import { Button } from './ui';

interface TopBarProps {
  onOpenEnvManager: () => void;
  onNewCollection: () => void;
}

export default function TopBar({ onOpenEnvManager, onNewCollection }: TopBarProps) {
  const { state, dispatch } = useApp();

  const selectedEnv = state.environments.find(e => e.id === state.selectedEnvId);

  return (
    <div
      className="flex items-center h-12 px-3 gap-2 border-b select-none shrink-0"
      style={{
        background: 'var(--bg-topbar)',
        borderColor: 'var(--border)',
        zIndex: 10,
      }}
    >
      {/* Logo + workspace */}
      <div className="flex items-center gap-2 mr-2">
        <div className="flex items-center gap-1.5">
          {/* Postman-like orange logo */}
          <div
            style={{
              width: 22, height: 22,
              background: 'var(--accent)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: 'white',
              letterSpacing: '-0.5px',
            }}
          >
            P
          </div>
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            PostmanClone
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="h-5 w-px bg-[var(--border)]" />

      {/* Workspace indicator */}
      <button
        className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-all"
      >
        <span>My Workspace</span>
        <ChevronDown size={11} />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* New button */}
      <Button
        variant="secondary"
        size="sm"
        onClick={onNewCollection}
        className="gap-1"
      >
        <Plus size={13} />
        New
      </Button>

      {/* Environment selector */}
      <div className="relative">
        <select
          value={state.selectedEnvId ?? ''}
          onChange={e => dispatch({ type: 'SET_ENV', id: e.target.value ? Number(e.target.value) : null })}
          className="appearance-none pl-2.5 pr-7 py-1.5 rounded text-xs border cursor-pointer"
          style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
            minWidth: '140px',
          }}
        >
          <option value="">No Environment</option>
          {state.environments.map(env => (
            <option key={env.id} value={env.id}>{env.name}</option>
          ))}
        </select>
        <ChevronDown
          size={11}
          className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--text-muted)' }}
        />
      </div>

      {/* Env manage button */}
      <Button variant="ghost" size="sm" onClick={onOpenEnvManager}>
        <Settings size={13} />
      </Button>

      {/* Divider */}
      <div className="h-5 w-px bg-[var(--border)]" />

      {/* User avatar (mock) */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer"
        style={{ background: 'var(--accent)', color: 'white' }}
        title="Nikhil (default user)"
      >
        N
      </div>
    </div>
  );
}
