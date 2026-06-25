'use client';
// Body editor — handles all request body types.
// Tabs: none | raw | form-data | urlencoded

import { useState } from 'react';
import KVEditor from './KVEditor';
import type { KeyValueRow, TabState } from '../../types';

interface BodyEditorProps {
  bodyType: TabState['body_type'];
  bodyRaw: string;
  bodyLanguage: string;
  bodyForm: KeyValueRow[];
  onBodyTypeChange: (type: TabState['body_type']) => void;
  onBodyRawChange: (val: string) => void;
  onBodyLanguageChange: (lang: string) => void;
  onBodyFormChange: (rows: KeyValueRow[]) => void;
}

const BODY_TYPES = [
  { value: 'none', label: 'none' },
  { value: 'raw', label: 'raw' },
  { value: 'form-data', label: 'form-data' },
  { value: 'urlencoded', label: 'x-www-form-urlencoded' },
];

const LANGUAGES = ['json', 'text', 'xml', 'html'];

export default function BodyEditor({
  bodyType, bodyRaw, bodyLanguage, bodyForm,
  onBodyTypeChange, onBodyRawChange, onBodyLanguageChange, onBodyFormChange,
}: BodyEditorProps) {

  return (
    <div className="flex flex-col h-full">
      {/* Sub-type selector row */}
      <div className="flex items-center gap-3 px-3 py-2 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
        {BODY_TYPES.map(bt => (
          <label key={bt.value} className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="body_type"
              value={bt.value}
              checked={bodyType === bt.value}
              onChange={() => onBodyTypeChange(bt.value as TabState['body_type'])}
              style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
            <span className="text-xs" style={{ color: bodyType === bt.value ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              {bt.label}
            </span>
          </label>
        ))}

        {/* Language selector shown only for raw */}
        {bodyType === 'raw' && (
          <div className="ml-auto">
            <select
              value={bodyLanguage}
              onChange={e => onBodyLanguageChange(e.target.value)}
              className="rounded px-2 py-1 text-xs border cursor-pointer"
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)', outline: 'none' }}
            >
              {LANGUAGES.map(l => (
                <option key={l} value={l}>{l.toUpperCase()}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto">
        {bodyType === 'none' && (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              This request does not have a body.
              <br />
              <span className="mt-1 block">Select a body type above to add one.</span>
            </p>
          </div>
        )}

        {bodyType === 'raw' && (
          <div className="relative h-full">
            <textarea
              value={bodyRaw}
              onChange={e => onBodyRawChange(e.target.value)}
              placeholder={bodyLanguage === 'json'
                ? '{\n  "key": "value"\n}'
                : `Enter ${bodyLanguage} content here...`}
              spellCheck={false}
              className="w-full h-full resize-none font-mono text-xs p-3 outline-none"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                lineHeight: 1.6,
                minHeight: '200px',
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
              }}
            />
          </div>
        )}

        {bodyType === 'form-data' && (
          <KVEditor
            rows={bodyForm}
            onChange={onBodyFormChange}
            keyPlaceholder="Key"
            valuePlaceholder="Value"
          />
        )}

        {bodyType === 'urlencoded' && (
          <KVEditor
            rows={bodyForm}
            onChange={onBodyFormChange}
            keyPlaceholder="Key"
            valuePlaceholder="Value"
          />
        )}
      </div>
    </div>
  );
}
