'use client';
// Left sidebar with Collections and History tabs.
// Collections shows nested collection → folder → request tree.
// History shows recent requests grouped by date.

import { useState } from 'react';
import { useApp } from '../../lib/store';
import {
  ChevronRight, ChevronDown, Search, Plus, Trash2,
  FolderOpen, Folder as FolderIcon, Clock, FileText,
  MoreHorizontal, Edit, Download, Upload
} from 'lucide-react';
import { MethodBadge, Button, EditableText } from '../ui';
import { groupByDate, formatTime, newTab, uid, emptyRow } from '../../lib/utils';
import type { Collection, Folder, SavedRequest, HistoryEntry } from '../../types';
import {
  deleteCollection, deleteRequest, deleteFolder,
  updateCollection, updateFolder, clearHistory,
  deleteHistoryEntry, exportCollection
} from '../../lib/api';
import toast from 'react-hot-toast';

interface SidebarProps {
  onNewCollection: () => void;
  onNewRequest: (collectionId: number, folderId?: number) => void;
  onNewFolder: (collectionId: number) => void;
  onImportCollection: () => void;
}

export default function Sidebar({ onNewCollection, onNewRequest, onNewFolder, onImportCollection }: SidebarProps) {
  const { state, dispatch, openRequest } = useApp();
  const [search, setSearch] = useState('');
  const [expandedCollections, setExpandedCollections] = useState<Set<number>>(new Set([1, 2]));
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set([1, 2]));
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: string; id: number; name: string } | null>(null);

  const isCollections = state.sidebarView === 'collections';

  const toggleCollection = (id: number) => {
    setExpandedCollections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleFolder = (id: number) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDeleteCollection = async (id: number) => {
    if (!confirm('Delete this collection and all its requests?')) return;
    try {
      await deleteCollection(id);
      dispatch({ type: 'REMOVE_COLLECTION', id });
      toast.success('Collection deleted');
    } catch { toast.error('Failed to delete collection'); }
    setContextMenu(null);
  };

  const handleDeleteRequest = async (req: SavedRequest) => {
    if (!confirm(`Delete "${req.name}"?`)) return;
    try {
      await deleteRequest(req.id);
      // Refresh collections
      const { getCollections } = await import('../../lib/api');
      const cols = await getCollections(state.workspaceId);
      dispatch({ type: 'SET_COLLECTIONS', collections: cols });
      toast.success('Request deleted');
    } catch { toast.error('Failed to delete request'); }
    setContextMenu(null);
  };

  const handleRenameCollection = async (id: number, name: string) => {
    try {
      const updated = await updateCollection(id, { name });
      dispatch({ type: 'UPSERT_COLLECTION', collection: updated as any });
    } catch { toast.error('Failed to rename'); }
  };

  const handleExport = async (id: number) => {
    try {
      const data = await exportCollection(id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.info?.name || 'collection'}.postman_collection.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Collection exported');
    } catch { toast.error('Export failed'); }
    setContextMenu(null);
  };

  const openHistoryEntry = (entry: HistoryEntry) => {
    const tab = {
      id: uid(),
      title: entry.url,
      method: entry.method,
      url: entry.url,
      headers: Object.entries(entry.headers_snapshot || {}).map(([key, value]) => ({
        id: uid(), key, value: value as string, description: '', is_active: true
      })).concat([emptyRow()]),
      query_params: Object.entries(entry.params_snapshot || {}).map(([key, value]) => ({
        id: uid(), key, value: value as string, description: '', is_active: true
      })).concat([emptyRow()]),
      body_type: (entry.body_type as any) || 'none',
      body_raw: entry.body_snapshot || '',
      body_language: 'json',
      body_form: [emptyRow()],
      auth: { type: 'none' as const },
      response: null,
      isLoading: false,
      isDirty: false,
    };
    dispatch({ type: 'OPEN_TAB', tab });
  };

  const filterText = search.toLowerCase();

  const filteredCollections = state.collections.map(col => ({
    ...col,
    folders: col.folders.map(f => ({
      ...f,
      requests: f.requests.filter(r =>
        !filterText || r.name.toLowerCase().includes(filterText) || r.url.toLowerCase().includes(filterText)
      )
    })).filter(f => !filterText || f.requests.length > 0 || f.name.toLowerCase().includes(filterText)),
    requests: col.requests.filter(r =>
      !filterText || r.name.toLowerCase().includes(filterText) || r.url.toLowerCase().includes(filterText)
    )
  })).filter(col =>
    !filterText || col.name.toLowerCase().includes(filterText) || col.folders.length > 0 || col.requests.length > 0
  );

  const groupedHistory = groupByDate(state.history as any[]) as Record<string, HistoryEntry[]>;

  return (
    <div
      className="flex flex-col h-full border-r"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
      onClick={() => setContextMenu(null)}
    >
      {/* Tab switcher */}
      <div className="flex border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
        {(['collections', 'history'] as const).map(view => (
          <button
            key={view}
            onClick={() => dispatch({ type: 'SET_SIDEBAR_VIEW', view })}
            className="flex-1 py-2 text-xs font-medium capitalize transition-all"
            style={{
              color: state.sidebarView === view ? 'var(--accent)' : 'var(--text-muted)',
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: state.sidebarView === view ? `2px solid var(--accent)` : '2px solid transparent',
            }}
          >
            {view === 'collections' ? '📁 Collections' : '🕐 History'}
          </button>
        ))}
      </div>

      {/* Search box */}
      <div className="px-2 py-2 shrink-0">
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={isCollections ? 'Search requests...' : 'Search history...'}
            className="w-full pl-7 pr-2 py-1.5 rounded text-xs"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isCollections ? (
          <>
            {/* Collections action bar */}
            <div className="flex items-center justify-between px-2 pb-1">
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                {state.collections.length} collections
              </span>
              <div className="flex gap-1">
                <button
                  onClick={onImportCollection}
                  title="Import collection"
                  className="p-1 rounded hover:bg-[var(--bg-hover)] transition-all"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Upload size={12} />
                </button>
                <button
                  onClick={onNewCollection}
                  title="New collection"
                  className="p-1 rounded hover:bg-[var(--bg-hover)] transition-all"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>

            {filteredCollections.length === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {search ? 'No results' : 'No collections yet'}
                </p>
                {!search && (
                  <button
                    onClick={onNewCollection}
                    className="mt-2 text-xs hover:underline"
                    style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Create one
                  </button>
                )}
              </div>
            )}

            {filteredCollections.map(col => (
              <CollectionItem
                key={col.id}
                collection={col}
                isExpanded={expandedCollections.has(col.id)}
                expandedFolders={expandedFolders}
                onToggle={() => toggleCollection(col.id)}
                onToggleFolder={toggleFolder}
                onRequestClick={openRequest}
                onNewRequest={(folderId?: number) => onNewRequest(col.id, folderId)}
                onNewFolder={() => onNewFolder(col.id)}
                onRename={(name: string) => handleRenameCollection(col.id, name)}
                onDelete={() => handleDeleteCollection(col.id)}
                onExport={() => handleExport(col.id)}
                onDeleteRequest={handleDeleteRequest}
              />
            ))}
          </>
        ) : (
          <>
            {/* History header */}
            <div className="flex items-center justify-between px-2 pb-1">
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                {state.history.length} requests
              </span>
              {state.history.length > 0 && (
                <button
                  onClick={async () => {
                    if (!confirm('Clear all history?')) return;
                    await clearHistory();
                    dispatch({ type: 'SET_HISTORY', history: [] });
                    toast.success('History cleared');
                  }}
                  className="text-xs px-1.5 py-0.5 rounded hover:bg-red-900/20 transition-all"
                  style={{ color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Clear all
                </button>
              )}
            </div>

            {state.history.length === 0 && (
              <div className="px-4 py-8 text-center">
                <Clock size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No history yet</p>
              </div>
            )}

            {Object.entries(groupedHistory).map(([date, entries]) => (
              <div key={date}>
                <div
                  className="px-3 py-1 text-xs font-semibold sticky top-0"
                  style={{ color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}
                >
                  {date}
                </div>
                {entries.filter(e =>
                  !filterText || e.url.toLowerCase().includes(filterText) || e.method.toLowerCase().includes(filterText)
                ).map((entry: HistoryEntry) => (
                  <HistoryItem
                    key={entry.id}
                    entry={entry}
                    onClick={() => openHistoryEntry(entry)}
                    onDelete={async () => {
                      await deleteHistoryEntry(entry.id);
                      dispatch({ type: 'SET_HISTORY', history: state.history.filter(h => h.id !== entry.id) });
                    }}
                  />
                ))}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ── Collection tree item ───────────────────────────────────────────────────

function CollectionItem({
  collection, isExpanded, expandedFolders, onToggle, onToggleFolder,
  onRequestClick, onNewRequest, onNewFolder, onRename, onDelete, onExport, onDeleteRequest
}: any) {
  const [hovered, setHovered] = useState(false);

  return (
    <div>
      <div
        className="flex items-center px-2 py-1.5 cursor-pointer group"
        style={{ background: hovered ? 'var(--bg-hover)' : 'transparent' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={onToggle}
      >
        <span style={{ color: 'var(--text-muted)', marginRight: 2 }}>
          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
        <FolderOpen size={13} className="mx-1.5 shrink-0" style={{ color: 'var(--accent)' }} />
        <span className="flex-1 text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          <EditableText value={collection.name} onSave={onRename} />
        </span>
        {hovered && (
          <div className="flex items-center gap-0.5 ml-1" onClick={e => e.stopPropagation()}>
            <button title="New request" onClick={() => onNewRequest()} className="p-0.5 rounded hover:bg-[var(--bg-active)]" style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
              <Plus size={11} />
            </button>
            <button title="New folder" onClick={onNewFolder} className="p-0.5 rounded hover:bg-[var(--bg-active)]" style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
              <FolderIcon size={11} />
            </button>
            <button title="Export" onClick={onExport} className="p-0.5 rounded hover:bg-[var(--bg-active)]" style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
              <Download size={11} />
            </button>
            <button title="Delete" onClick={onDelete} className="p-0.5 rounded hover:bg-red-900/20" style={{ color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer' }}>
              <Trash2 size={11} />
            </button>
          </div>
        )}
      </div>

      {isExpanded && (
        <div style={{ paddingLeft: 16 }}>
          {/* Direct requests (not in folders) */}
          {collection.requests?.map((req: SavedRequest) => (
            <RequestItem key={req.id} request={req} onClick={() => onRequestClick(req)} onDelete={() => onDeleteRequest(req)} />
          ))}
          {/* Folders */}
          {collection.folders?.map((folder: Folder) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              isExpanded={expandedFolders.has(folder.id)}
              onToggle={() => onToggleFolder(folder.id)}
              onRequestClick={onRequestClick}
              onNewRequest={() => onNewRequest(folder.id)}
              onDeleteRequest={onDeleteRequest}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FolderItem({ folder, isExpanded, onToggle, onRequestClick, onNewRequest, onDeleteRequest }: any) {
  const [hovered, setHovered] = useState(false);

  return (
    <div>
      <div
        className="flex items-center px-2 py-1.5 cursor-pointer"
        style={{ background: hovered ? 'var(--bg-hover)' : 'transparent' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={onToggle}
      >
        <span style={{ color: 'var(--text-muted)', marginRight: 2 }}>
          {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        </span>
        <FolderIcon size={12} className="mx-1.5 shrink-0" style={{ color: '#fca130' }} />
        <span className="flex-1 text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
          {folder.name}
        </span>
        {hovered && (
          <button title="New request" onClick={(e) => { e.stopPropagation(); onNewRequest(); }}
            className="p-0.5 rounded" style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <Plus size={10} />
          </button>
        )}
      </div>
      {isExpanded && (
        <div style={{ paddingLeft: 16 }}>
          {folder.requests?.map((req: SavedRequest) => (
            <RequestItem key={req.id} request={req} onClick={() => onRequestClick(req)} onDelete={() => onDeleteRequest(req)} />
          ))}
        </div>
      )}
    </div>
  );
}

function RequestItem({ request, onClick, onDelete }: { request: SavedRequest; onClick: () => void; onDelete: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="flex items-center px-2 py-1 cursor-pointer group"
      style={{ background: hovered ? 'var(--bg-hover)' : 'transparent' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <MethodBadge method={request.method} />
      <span className="flex-1 ml-2 text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
        {request.name}
      </span>
      {hovered && (
        <button
          title="Delete request"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-0.5 rounded hover:bg-red-900/20"
          style={{ color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <Trash2 size={10} />
        </button>
      )}
    </div>
  );
}

function HistoryItem({ entry, onClick, onDelete }: { entry: HistoryEntry; onClick: () => void; onDelete: () => void }) {
  const [hovered, setHovered] = useState(false);
  const time = new Date(entry.executed_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const statusColor = !entry.status_code ? '#8fa3b8' :
    entry.status_code < 300 ? '#49cc90' :
    entry.status_code < 400 ? '#fca130' :
    entry.status_code < 500 ? '#f9b031' : '#f93e3e';

  return (
    <div
      className="flex items-center px-3 py-1.5 cursor-pointer group"
      style={{ background: hovered ? 'var(--bg-hover)' : 'transparent' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <MethodBadge method={entry.method} />
      <span className="flex-1 ml-2 text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
        {entry.url.replace(/^https?:\/\//, '')}
      </span>
      <span className="text-xs font-mono ml-1" style={{ color: statusColor }}>
        {entry.status_code || (entry.is_error ? 'ERR' : '—')}
      </span>
      {hovered && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="ml-1 p-0.5 rounded hover:bg-red-900/20"
          style={{ color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <Trash2 size={10} />
        </button>
      )}
    </div>
  );
}
