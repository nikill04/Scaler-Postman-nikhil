'use client';
// Small reusable UI primitives.
// Keeping them simple — no third-party component library overhead.

import React, { useState, useRef } from 'react';
import { X, ChevronDown } from 'lucide-react';

// ── Button ────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'secondary';
  size?: 'sm' | 'md';
}

export function Button({ variant = 'ghost', size = 'md', className = '', children, ...props }: ButtonProps) {
  const base = 'inline-flex items-center gap-1.5 font-medium rounded cursor-pointer border-0 transition-all select-none';
  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
  };
  const variants = {
    primary: 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]',
    ghost: 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
    secondary: 'bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--border-light)]',
    danger: 'bg-transparent text-[var(--red)] hover:bg-red-900/20',
  };
  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      style={{ fontSize: size === 'sm' ? '11px' : '13px' }}
      {...props}
    >
      {children}
    </button>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  fullWidth?: boolean;
}

export function Input({ fullWidth = false, className = '', ...props }: InputProps) {
  return (
    <input
      className={`rounded px-2.5 py-1.5 text-sm bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] focus:border-[var(--accent)] outline-none placeholder:text-[var(--text-muted)] ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    />
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}

export function Modal({ isOpen, onClose, title, children, width = '480px' }: ModalProps) {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-lg border shadow-2xl"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border)',
          width,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <span className="font-semibold text-sm text-[var(--text-primary)]">{title}</span>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded p-0.5 hover:bg-[var(--bg-hover)] transition-all"
          >
            <X size={14} />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Select ────────────────────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
}

export function Select({ options, className = '', ...props }: SelectProps) {
  return (
    <select
      className={`rounded px-2 py-1.5 text-sm bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] focus:border-[var(--accent)] outline-none cursor-pointer ${className}`}
      {...props}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// ── Tooltip ────────────────────────────────────────────────────────────────

export function Tooltip({ children, tip }: { children: React.ReactNode; tip: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded text-xs whitespace-nowrap pointer-events-none"
          style={{ background: '#0a0f1e', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        >
          {tip}
        </div>
      )}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────

export function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: '#61affe', POST: '#49cc90', PUT: '#fca130',
    PATCH: '#50e3c2', DELETE: '#f93e3e', HEAD: '#9012fe', OPTIONS: '#0d5aa7',
  };
  const color = colors[method?.toUpperCase()] || '#8fa3b8';
  return (
    <span
      className="font-mono font-bold text-xs"
      style={{ color, minWidth: '48px', display: 'inline-block' }}
    >
      {method?.toUpperCase()}
    </span>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────

export function StatusBadge({ code }: { code: number | null }) {
  if (!code) return null;
  let color = '#8fa3b8';
  if (code >= 200 && code < 300) color = '#49cc90';
  else if (code >= 300 && code < 400) color = '#fca130';
  else if (code >= 400 && code < 500) color = '#f9b031';
  else if (code >= 500) color = '#f93e3e';
  return (
    <span className="font-mono font-semibold text-sm" style={{ color }}>
      {code}
    </span>
  );
}

// ── Inline editable text ──────────────────────────────────────────────────

interface EditableTextProps {
  value: string;
  onSave: (val: string) => void;
  className?: string;
}

export function EditableText({ value, onSave, className = '' }: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  const start = () => {
    setDraft(value);
    setEditing(true);
    setTimeout(() => ref.current?.select(), 10);
  };

  const save = () => {
    setEditing(false);
    if (draft.trim() && draft !== value) onSave(draft.trim());
    else setDraft(value);
  };

  if (editing) {
    return (
      <input
        ref={ref}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setEditing(false); setDraft(value); } }}
        className={`bg-[var(--bg-input)] border border-[var(--accent)] rounded px-1 outline-none text-[var(--text-primary)] ${className}`}
        style={{ fontSize: 'inherit', width: `${Math.max(draft.length + 2, 8)}ch` }}
        autoFocus
      />
    );
  }

  return (
    <span onDoubleClick={start} className={`cursor-text ${className}`} title="Double-click to rename">
      {value}
    </span>
  );
}

// ── Spinner ────────────────────────────────────────────────────────────────

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <div
      style={{
        width: size, height: size,
        border: `2px solid var(--border)`,
        borderTopColor: 'var(--accent)',
        borderRadius: '50%',
        animation: 'spin 0.6s linear infinite',
      }}
    />
  );
}
