'use client';
// TabBar — the horizontal row of open request tabs.
// Postman-style: each tab shows method + name, orange dot if unsaved, X to close.

import { X, Plus } from 'lucide-react';
import { useApp } from '../lib/store';
import { METHOD_COLORS } from '../types';
import { useState } from 'react';

export default function TabBar() {
  const { state, dispatch, openNewTab } = useApp();

  return (
    <div
      className="flex items-center border-b overflow-x-auto shrink-0"
      style={{
        background: 'var(--bg-tabbar)',
        borderColor: 'var(--border)',
        minHeight: '36px',
        scrollbarWidth: 'none',   // hide scrollbar in Firefox
      }}
    >
      {/* Tabs */}
      <div className="flex items-stretch">
        {state.tabs.map(tab => (
          <TabItem
            key={tab.id}
            tab={tab}
            isActive={tab.id === state.activeTabId}
            onActivate={() => dispatch({ type: 'SET_ACTIVE_TAB', id: tab.id })}
            onClose={() => dispatch({ type: 'CLOSE_TAB', id: tab.id })}
          />
        ))}
      </div>

      {/* New tab button */}
      <button
        onClick={openNewTab}
        className="flex items-center justify-center px-2 py-1 mx-1 rounded transition-all shrink-0"
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          height: '28px',
          width: '28px',
        }}
        title="New tab (Ctrl+T)"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

interface TabItemProps {
  tab: { id: string; title: string; method: string; isDirty: boolean };
  isActive: boolean;
  onActivate: () => void;
  onClose: () => void;
}

function TabItem({ tab, isActive, onActivate, onClose }: TabItemProps) {
  const [hovered, setHovered] = useState(false);
  const methodColor = (METHOD_COLORS as Record<string, string>)[tab.method] || 'var(--text-muted)';

  return (
    <div
      className="flex items-center group cursor-pointer shrink-0"
      style={{
        background: isActive ? 'var(--bg-primary)' : 'transparent',
        borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
        borderRight: '1px solid var(--border)',
        maxWidth: '200px',
        minWidth: '120px',
        height: '36px',
        paddingLeft: '10px',
        paddingRight: hovered ? '4px' : '10px',
        position: 'relative',
      }}
      onClick={onActivate}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Method label */}
      <span
        className="text-xs font-bold font-mono shrink-0 mr-1.5"
        style={{ color: methodColor, fontSize: '10px' }}
      >
        {tab.method}
      </span>

      {/* Tab title */}
      <span
        className="text-xs truncate flex-1"
        style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}
      >
        {tab.title || 'Untitled'}
      </span>

      {/* Dirty indicator or close button */}
      <div className="ml-1.5 shrink-0 flex items-center">
        {hovered ? (
          // Close button on hover
          <button
            onClick={e => { e.stopPropagation(); onClose(); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: '2px', borderRadius: '2px',
              display: 'flex', alignItems: 'center',
            }}
            className="hover:bg-[var(--bg-hover)]"
          >
            <X size={11} />
          </button>
        ) : tab.isDirty ? (
          // Orange dot if unsaved
          <span
            style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--accent)', display: 'inline-block',
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
