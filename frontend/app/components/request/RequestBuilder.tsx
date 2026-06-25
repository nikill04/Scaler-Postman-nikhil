'use client';
// RequestBuilder — the central panel.
// Contains: method selector, URL bar, Send button, and the 4 editor tabs.

import { useEffect, useCallback } from 'react';
import { useApp } from '../../lib/store';
import KVEditor from './KVEditor';
import AuthTab from './AuthTab';
import BodyEditor from './BodyEditor';
import { buildUrl, parseUrlParams, emptyRow, uid } from '../../lib/utils';
import type { KeyValueRow, TabState } from '../../types';
import { Spinner, Tooltip } from '../ui';
import { Save, Code2 } from 'lucide-react';
import { useState } from 'react';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

const METHOD_COLORS: Record<string, string> = {
  GET: '#61affe', POST: '#49cc90', PUT: '#fca130',
  PATCH: '#50e3c2', DELETE: '#f93e3e', HEAD: '#9012fe', OPTIONS: '#0d5aa7',
};

type RequestTab = 'params' | 'headers' | 'auth' | 'body';

interface RequestBuilderProps {
  onSend: () => void;
  onSave: () => void;
  onCodeSnippet: () => void;
}

export default function RequestBuilder({ onSend, onSave, onCodeSnippet }: RequestBuilderProps) {
  const { activeTab, updateActiveTab } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<RequestTab>('params');

  // Keyboard shortcut: Ctrl+Enter or Cmd+Enter to send
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        onSend();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSend, onSave]);

  if (!activeTab) return null;

  // When URL changes, parse query params out of it and sync to the params table
  const handleUrlChange = (newUrl: string) => {
    updateActiveTab({ url: newUrl, isDirty: true });

    // Only parse params if URL has a ? in it
    if (newUrl.includes('?')) {
      try {
        const parsed = parseUrlParams(newUrl);
        if (parsed.length > 0) {
          // Merge: keep existing non-URL params + add URL-parsed ones
          const urlKeys = new Set(parsed.map(p => p.key));
          const nonUrlRows = activeTab.query_params.filter(r => !urlKeys.has(r.key) && r.key);
          const newRows = parsed.map(p => ({ id: uid(), key: p.key, value: p.value, description: '', is_active: true }));
          updateActiveTab({
            url: newUrl,
            query_params: [...nonUrlRows, ...newRows, emptyRow()],
            isDirty: true,
          });
          return;
        }
      } catch { /* ignore parse errors */ }
    }
  };

  // When params change, rebuild the URL query string
  const handleParamsChange = (rows: KeyValueRow[]) => {
    const baseUrl = activeTab.url.split('?')[0];
    const newUrl = buildUrl(baseUrl, rows);
    updateActiveTab({ query_params: rows, url: newUrl, isDirty: true });
  };

  // Count active (non-empty) rows for tab badges
  const paramCount = activeTab.query_params.filter(p => p.is_active && p.key).length;
  const headerCount = activeTab.headers.filter(h => h.is_active && h.key).length;
  const bodyHasContent: boolean = activeTab.body_type !== 'none' &&
    (!!activeTab.body_raw || activeTab.body_form.some(f => f.key));

  const subTabs: { id: RequestTab; label: string; badge?: number; dot?: boolean }[] = [
    { id: 'params', label: 'Params', badge: paramCount || undefined },
    { id: 'headers', label: 'Headers', badge: headerCount || undefined },
    { id: 'auth', label: 'Auth', dot: activeTab.auth.type !== 'none' },
    { id: 'body', label: 'Body', dot: bodyHasContent },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-primary)' }}>

      {/* ── URL bar ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>

        {/* Method selector */}
        <select
          value={activeTab.method}
          onChange={e => updateActiveTab({ method: e.target.value, isDirty: true })}
          className="rounded px-2 py-1.5 text-xs font-bold border cursor-pointer shrink-0"
          style={{
            background: 'var(--bg-input)',
            borderColor: 'var(--border)',
            color: METHOD_COLORS[activeTab.method] || 'var(--text-primary)',
            outline: 'none',
            minWidth: '95px',
          }}
        >
          {METHODS.map(m => (
            <option key={m} value={m} style={{ color: METHOD_COLORS[m] }}>
              {m}
            </option>
          ))}
        </select>

        {/* URL input */}
        <input
          value={activeTab.url}
          onChange={e => handleUrlChange(e.target.value)}
          onPaste={e => {
            // Handle pasting a full URL with params
            setTimeout(() => handleUrlChange(e.currentTarget.value), 0);
          }}
          placeholder="https://api.example.com/endpoint"
          className="flex-1 rounded px-3 py-1.5 text-sm font-mono"
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            outline: 'none',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />

        {/* Action buttons */}
        <Tooltip tip="Save (Ctrl+S)">
          <button
            onClick={onSave}
            className="px-2.5 py-1.5 rounded text-xs transition-all"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <Save size={13} />
          </button>
        </Tooltip>

        <Tooltip tip="Code snippet">
          <button
            onClick={onCodeSnippet}
            className="px-2.5 py-1.5 rounded text-xs transition-all"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <Code2 size={13} />
          </button>
        </Tooltip>

        {/* Send button */}
        <button
          onClick={onSend}
          disabled={activeTab.isLoading || !activeTab.url}
          className="px-4 py-1.5 rounded text-sm font-semibold transition-all flex items-center gap-2"
          style={{
            background: activeTab.isLoading || !activeTab.url ? 'var(--bg-card)' : 'var(--accent)',
            color: activeTab.isLoading || !activeTab.url ? 'var(--text-muted)' : 'white',
            border: 'none',
            cursor: activeTab.isLoading || !activeTab.url ? 'not-allowed' : 'pointer',
            minWidth: '72px',
          }}
        >
          {activeTab.isLoading ? <Spinner size={14} /> : 'Send'}
        </button>
      </div>

      {/* ── Sub-tabs ─────────────────────────────────────────────────── */}
      <div className="flex items-center border-b shrink-0 px-1" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        {subTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className="relative flex items-center gap-1.5 px-3 py-2 text-xs transition-all"
            style={{
              color: activeSubTab === tab.id ? 'var(--accent)' : 'var(--text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderBottom: activeSubTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
              paddingBottom: activeSubTab === tab.id ? '6px' : '8px',
            }}
          >
            {tab.label}
            {/* Count badge */}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span
                className="px-1.5 py-0.5 rounded-full text-xs font-bold"
                style={{ background: 'var(--accent-dim)', color: 'var(--accent)', fontSize: '10px' }}
              >
                {tab.badge}
              </span>
            )}
            {/* Active dot */}
            {tab.dot && !tab.badge && (
              <span
                style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: 'var(--accent)', display: 'inline-block',
                }}
              />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        {activeSubTab === 'params' && (
          <KVEditor
            rows={activeTab.query_params}
            onChange={handleParamsChange}
            keyPlaceholder="Key"
            valuePlaceholder="Value"
            showDescription={true}
          />
        )}

        {activeSubTab === 'headers' && (
          <KVEditor
            rows={activeTab.headers}
            onChange={rows => updateActiveTab({ headers: rows, isDirty: true })}
            keyPlaceholder="Header"
            valuePlaceholder="Value"
            showDescription={true}
          />
        )}

        {activeSubTab === 'auth' && (
          <AuthTab
            auth={activeTab.auth}
            onChange={auth => updateActiveTab({ auth, isDirty: true })}
          />
        )}

        {activeSubTab === 'body' && (
          <BodyEditor
            bodyType={activeTab.body_type}
            bodyRaw={activeTab.body_raw}
            bodyLanguage={activeTab.body_language}
            bodyForm={activeTab.body_form}
            onBodyTypeChange={type => updateActiveTab({ body_type: type, isDirty: true })}
            onBodyRawChange={raw => updateActiveTab({ body_raw: raw, isDirty: true })}
            onBodyLanguageChange={lang => updateActiveTab({ body_language: lang, isDirty: true })}
            onBodyFormChange={form => updateActiveTab({ body_form: form, isDirty: true })}
          />
        )}
      </div>
    </div>
  );
}
