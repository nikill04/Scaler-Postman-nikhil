'use client';
// Reusable key-value table editor.
// Used for Headers, Query Params, Form Data.
// Each row has: checkbox (active), key input, value input, description, delete button.

import { Plus, Trash2 } from 'lucide-react';
import type { KeyValueRow } from '../../types';
import { uid } from '../../lib/utils';

interface KVEditorProps {
  rows: KeyValueRow[];
  onChange: (rows: KeyValueRow[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  showDescription?: boolean;
}

export default function KVEditor({
  rows,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  showDescription = false,
}: KVEditorProps) {

  // Update a single field in a single row
  const updateRow = (id: string, field: keyof KeyValueRow, value: any) => {
    const updated = rows.map(r => r.id === id ? { ...r, [field]: value } : r);
    // Auto-add a new empty row if the last row now has content
    const last = updated[updated.length - 1];
    if (last && (last.key || last.value)) {
      updated.push({ id: uid(), key: '', value: '', description: '', is_active: true });
    }
    onChange(updated);
  };

  const deleteRow = (id: string) => {
    const updated = rows.filter(r => r.id !== id);
    if (updated.length === 0) {
      updated.push({ id: uid(), key: '', value: '', description: '', is_active: true });
    }
    onChange(updated);
  };

  const addRow = () => {
    onChange([...rows, { id: uid(), key: '', value: '', description: '', is_active: true }]);
  };

  const inputStyle = {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    outline: 'none',
    width: '100%',
    fontSize: '12px',
    padding: '0 4px',
    fontFamily: 'inherit',
  };

  return (
    <div className="w-full">
      {/* Header row */}
      <div
        className="grid text-xs font-medium"
        style={{
          gridTemplateColumns: showDescription ? '32px 1fr 1fr 1fr 28px' : '32px 1fr 1fr 28px',
          color: 'var(--text-muted)',
          padding: '4px 8px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div />
        <div>{keyPlaceholder}</div>
        <div>{valuePlaceholder}</div>
        {showDescription && <div>Description</div>}
        <div />
      </div>

      {/* Rows */}
      {rows.map((row, idx) => (
        <div
          key={row.id}
          className="grid items-center group"
          style={{
            gridTemplateColumns: showDescription ? '32px 1fr 1fr 1fr 28px' : '32px 1fr 1fr 28px',
            borderBottom: '1px solid var(--border)',
            minHeight: '32px',
            opacity: row.is_active ? 1 : 0.4,
          }}
        >
          {/* Active toggle */}
          <div className="flex justify-center">
            <input
              type="checkbox"
              checked={row.is_active}
              onChange={e => updateRow(row.id, 'is_active', e.target.checked)}
              style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
            />
          </div>

          {/* Key */}
          <div style={{ borderRight: '1px solid var(--border)', padding: '0 4px' }}>
            <input
              value={row.key}
              onChange={e => updateRow(row.id, 'key', e.target.value)}
              placeholder={idx === rows.length - 1 ? `Add ${keyPlaceholder.toLowerCase()}` : keyPlaceholder}
              style={inputStyle}
            />
          </div>

          {/* Value */}
          <div style={{ borderRight: showDescription ? '1px solid var(--border)' : 'none', padding: '0 4px' }}>
            <input
              value={row.value}
              onChange={e => updateRow(row.id, 'value', e.target.value)}
              placeholder={valuePlaceholder}
              style={inputStyle}
            />
          </div>

          {/* Description (optional) */}
          {showDescription && (
            <div style={{ borderRight: '1px solid var(--border)', padding: '0 4px' }}>
              <input
                value={row.description}
                onChange={e => updateRow(row.id, 'description', e.target.value)}
                placeholder="Description"
                style={{ ...inputStyle, color: 'var(--text-muted)' }}
              />
            </div>
          )}

          {/* Delete button */}
          <div className="flex justify-center opacity-0 group-hover:opacity-100 transition-all">
            <button
              onClick={() => deleteRow(row.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}
              className="hover:text-red-400 rounded"
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>
      ))}

      {/* Add row button */}
      <div className="p-2">
        <button
          onClick={addRow}
          className="flex items-center gap-1 text-xs hover:underline"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px 4px' }}
        >
          <Plus size={11} />
          Add row
        </button>
      </div>
    </div>
  );
}
