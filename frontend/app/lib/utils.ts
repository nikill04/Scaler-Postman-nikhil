// Utility functions used throughout the app

import { KeyValueRow, TabState, SavedRequest } from '../types';

// Generate a simple unique ID for React keys (not for DB)
export function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

// Create an empty KeyValueRow
export function emptyRow(): KeyValueRow {
  return { id: uid(), key: '', value: '', description: '', is_active: true };
}

// Create a fresh empty tab
export function newTab(): TabState {
  return {
    id: uid(),
    title: 'Untitled',
    method: 'GET',
    url: '',
    headers: [emptyRow()],
    query_params: [emptyRow()],
    body_type: 'none',
    body_raw: '',
    body_language: 'json',
    body_form: [emptyRow()],
    auth: { type: 'none' },
    response: null,
    isLoading: false,
    isDirty: false,
  };
}

// Convert a SavedRequest from the DB into a TabState for the editor
export function savedRequestToTab(req: SavedRequest): TabState {
  return {
    id: uid(),
    title: req.name,
    method: req.method,
    url: req.url,
    headers: req.headers.length > 0
      ? req.headers.map(h => ({ id: uid(), key: h.key, value: h.value, description: h.description, is_active: h.is_active }))
      : [emptyRow()],
    query_params: req.query_params.length > 0
      ? req.query_params.map(p => ({ id: uid(), key: p.key, value: p.value, description: p.description, is_active: p.is_active }))
      : [emptyRow()],
    body_type: (req.body_type as TabState['body_type']) || 'none',
    body_raw: req.body_content || '',
    body_language: req.body_language || 'json',
    body_form: [emptyRow()],
    auth: {
      type: (req.auth_type as any) || 'none',
      ...req.auth_data,
    },
    response: null,
    isLoading: false,
    isDirty: false,
    savedRequestId: req.id,
    collectionId: req.collection_id,
  };
}

// Format file size for display (e.g. 1234 → "1.2 KB")
export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Format milliseconds for display (e.g. 1234 → "1.23 s")
export function formatTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

// Get color class for HTTP status code
export function getStatusColor(code: number | null): string {
  if (!code) return 'text-gray-400';
  if (code >= 200 && code < 300) return 'text-green-400';
  if (code >= 300 && code < 400) return 'text-yellow-400';
  if (code >= 400 && code < 500) return 'text-orange-400';
  if (code >= 500) return 'text-red-400';
  return 'text-gray-400';
}

// Try to pretty-print JSON, return original string if it's not JSON
export function prettyJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

// Check if a string looks like JSON
export function isJson(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

// Parse URL and extract query params
export function parseUrlParams(url: string): { key: string; value: string }[] {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return Array.from(u.searchParams.entries()).map(([key, value]) => ({ key, value }));
  } catch {
    return [];
  }
}

// Build URL from base + query params rows
export function buildUrl(base: string, params: KeyValueRow[]): string {
  const activeParams = params.filter(p => p.is_active && p.key);
  if (activeParams.length === 0) return base;

  try {
    // Strip existing query string from base
    const [basePath] = base.split('?');
    const query = activeParams
      .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
      .join('&');
    return `${basePath}?${query}`;
  } catch {
    return base;
  }
}

// Get a short title for a tab from method+url
export function tabTitle(method: string, url: string, savedName?: string): string {
  if (savedName) return savedName;
  if (!url) return 'Untitled';
  try {
    const u = new URL(url);
    return u.pathname.split('/').filter(Boolean).pop() || u.hostname;
  } catch {
    return url.split('/').filter(Boolean).pop() || 'Untitled';
  }
}

// Group history entries by date
export function groupByDate(entries: { executed_at: string }[]) {
  const groups: Record<string, typeof entries> = {};
  entries.forEach(entry => {
    const date = new Date(entry.executed_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    let label: string;
    if (date.toDateString() === today.toDateString()) {
      label = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      label = 'Yesterday';
    } else {
      label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    if (!groups[label]) groups[label] = [];
    groups[label].push(entry);
  });
  return groups;
}
