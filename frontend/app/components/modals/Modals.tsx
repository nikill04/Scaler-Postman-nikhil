'use client';
// All modals used in the app.
// Keeping them in one file since they are all small and closely related.

import { useState, useRef } from 'react';
import { Modal, Button } from '../ui';
import KVEditor from '../request/KVEditor';
import { useApp } from '../../lib/store';
import {
  createCollection, createRequest, updateRequest,
  createEnvironment, updateEnvironment, deleteEnvironment,
  replaceVariables, getCollections, importCollection, getSnippet
} from '../../lib/api';
import { emptyRow, uid } from '../../lib/utils';
import type { TabState, Collection, Variable, KeyValueRow } from '../../types';
import { Trash2, Plus, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

// ═══════════════════════════════════════════════════════════════
// 1. New Collection Modal
// ═══════════════════════════════════════════════════════════════

interface NewCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewCollectionModal({ isOpen, onClose }: NewCollectionModalProps) {
  const { state, dispatch } = useApp();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) { toast.error('Collection name is required'); return; }
    setLoading(true);
    try {
      const col = await createCollection(state.workspaceId, name.trim(), desc.trim());
      dispatch({ type: 'UPSERT_COLLECTION', collection: col as any });
      toast.success(`Collection "${name}" created`);
      setName(''); setDesc('');
      onClose();
    } catch { toast.error('Failed to create collection'); }
    finally { setLoading(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Collection">
      <div className="space-y-3">
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            Collection Name <span style={{ color: 'var(--accent)' }}>*</span>
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="My API Collection"
            autoFocus
            className="w-full rounded px-2.5 py-1.5 text-sm"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}
          />
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Description</label>
          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="Optional description..."
            rows={3}
            className="w-full rounded px-2.5 py-1.5 text-sm resize-none"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleCreate} disabled={loading}>
            {loading ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════
// 2. New Request Modal (quick-create from sidebar)
// ═══════════════════════════════════════════════════════════════

interface NewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  collectionId: number;
  folderId?: number;
}

export function NewRequestModal({ isOpen, onClose, collectionId, folderId }: NewRequestModalProps) {
  const { state, dispatch, openRequest } = useApp();
  const [name, setName] = useState('New Request');
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<number | undefined>(folderId);
  const [loading, setLoading] = useState(false);

  const collection = state.collections.find(c => c.id === collectionId);

  const handleCreate = async () => {
    if (!name.trim()) { toast.error('Request name is required'); return; }
    setLoading(true);
    try {
      const req = await createRequest({
        collection_id: collectionId,
        folder_id: selectedFolder || null,
        name: name.trim(), method, url,
        headers: [], query_params: [],
      });
      // Refresh collections to show in sidebar
      const cols = await getCollections(state.workspaceId);
      dispatch({ type: 'SET_COLLECTIONS', collections: cols });
      openRequest(req);
      toast.success(`Request "${name}" created`);
      setName('New Request'); setMethod('GET'); setUrl('');
      onClose();
    } catch { toast.error('Failed to create request'); }
    finally { setLoading(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Request">
      <div className="space-y-3">
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Name <span style={{ color: 'var(--accent)' }}>*</span></label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            className="w-full rounded px-2.5 py-1.5 text-sm"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}
          />
        </div>
        <div className="flex gap-2">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Method</label>
            <select value={method} onChange={e => setMethod(e.target.value)}
              className="rounded px-2 py-1.5 text-xs border"
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}>
              {['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS'].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>URL</label>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..."
              className="w-full rounded px-2.5 py-1.5 text-sm font-mono"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }} />
          </div>
        </div>
        {collection && collection.folders.length > 0 && (
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Folder (optional)</label>
            <select value={selectedFolder ?? ''} onChange={e => setSelectedFolder(e.target.value ? Number(e.target.value) : undefined)}
              className="rounded px-2 py-1.5 text-xs border w-full"
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}>
              <option value="">No folder</option>
              {collection.folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleCreate} disabled={loading}>
            {loading ? 'Creating...' : 'Create Request'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════
// 3. New Folder Modal
// ═══════════════════════════════════════════════════════════════

interface NewFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  collectionId: number;
}

export function NewFolderModal({ isOpen, onClose, collectionId }: NewFolderModalProps) {
  const { state, dispatch } = useApp();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const { createFolder } = await import('../../lib/api');
      await createFolder(collectionId, name.trim());
      const cols = await getCollections(state.workspaceId);
      dispatch({ type: 'SET_COLLECTIONS', collections: cols });
      toast.success('Folder created');
      setName(''); onClose();
    } catch { toast.error('Failed to create folder'); }
    finally { setLoading(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Folder">
      <div className="space-y-3">
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Folder Name</label>
          <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="My Folder" autoFocus
            className="w-full rounded px-2.5 py-1.5 text-sm"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleCreate} disabled={loading}>{loading ? 'Creating...' : 'Create'}</Button>
        </div>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════
// 4. Save Request Modal
// ═══════════════════════════════════════════════════════════════

interface SaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  tab: TabState;
}

export function SaveRequestModal({ isOpen, onClose, tab }: SaveRequestModalProps) {
  const { state, dispatch, updateActiveTab } = useApp();
  const [name, setName] = useState(tab.title || 'New Request');
  const [selectedCollectionId, setSelectedCollectionId] = useState<number>(
    tab.collectionId || state.collections[0]?.id || 0
  );
  const [selectedFolderId, setSelectedFolderId] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const selectedCollection = state.collections.find(c => c.id === selectedCollectionId);

  // Build payload from current tab state
  const buildPayload = () => ({
    collection_id: selectedCollectionId,
    folder_id: selectedFolderId || null,
    name: name.trim(),
    method: tab.method,
    url: tab.url,
    body_type: tab.body_type,
    body_content: tab.body_raw,
    body_language: tab.body_language,
    auth_type: tab.auth.type,
    auth_data: tab.auth,
    headers: tab.headers.filter(h => h.key).map(h => ({ key: h.key, value: h.value, description: h.description, is_active: h.is_active })),
    query_params: tab.query_params.filter(p => p.key).map(p => ({ key: p.key, value: p.value, description: p.description, is_active: p.is_active })),
  });

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Request name required'); return; }
    if (!selectedCollectionId) { toast.error('Select a collection'); return; }
    setLoading(true);
    try {
      let saved;
      if (tab.savedRequestId) {
        // Update existing saved request
        saved = await updateRequest(tab.savedRequestId, buildPayload());
      } else {
        // Create new
        saved = await createRequest(buildPayload());
      }
      // Refresh sidebar
      const cols = await getCollections(state.workspaceId);
      dispatch({ type: 'SET_COLLECTIONS', collections: cols });
      // Update tab state
      updateActiveTab({ title: name.trim(), savedRequestId: saved.id, collectionId: selectedCollectionId, isDirty: false });
      toast.success(`Saved "${name}"`);
      onClose();
    } catch { toast.error('Failed to save request'); }
    finally { setLoading(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={tab.savedRequestId ? 'Update Request' : 'Save Request'}>
      <div className="space-y-3">
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Request Name</label>
          <input value={name} onChange={e => setName(e.target.value)} autoFocus
            className="w-full rounded px-2.5 py-1.5 text-sm"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }} />
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Collection</label>
          <select value={selectedCollectionId} onChange={e => { setSelectedCollectionId(Number(e.target.value)); setSelectedFolderId(undefined); }}
            className="w-full rounded px-2 py-1.5 text-xs border"
            style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}>
            {state.collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {selectedCollection && selectedCollection.folders.length > 0 && (
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Folder (optional)</label>
            <select value={selectedFolderId ?? ''} onChange={e => setSelectedFolderId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full rounded px-2 py-1.5 text-xs border"
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}>
              <option value="">No folder</option>
              {selectedCollection.folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : tab.savedRequestId ? 'Update' : 'Save'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════
// 5. Environment Manager Modal
// ═══════════════════════════════════════════════════════════════

interface EnvironmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EnvironmentModal({ isOpen, onClose }: EnvironmentModalProps) {
  const { state, dispatch } = useApp();
  const [selectedEnvId, setSelectedEnvId] = useState<number | null>(null);
  const [newEnvName, setNewEnvName] = useState('');
  const [envName, setEnvName] = useState('');
  const [variables, setVariables] = useState<KeyValueRow[]>([emptyRow()]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const selectedEnv = state.environments.find(e => e.id === selectedEnvId);

  const selectEnv = (envId: number) => {
    const env = state.environments.find(e => e.id === envId);
    if (!env) return;
    setSelectedEnvId(envId);
    setEnvName(env.name);
    setVariables(
      env.variables.length > 0
        ? env.variables.map(v => ({ id: uid(), key: v.key, value: v.value, description: v.is_secret ? 'secret' : '', is_active: v.is_active }))
        : [emptyRow()]
    );
  };

  const handleSave = async () => {
    if (!selectedEnvId) return;
    setLoading(true);
    try {
      // Update name if changed
      if (envName !== selectedEnv?.name) {
        const updated = await updateEnvironment(selectedEnvId, envName);
        dispatch({ type: 'UPSERT_ENVIRONMENT', env: updated });
      }
      // Replace variables
      const vars = variables.filter(v => v.key).map(v => ({
        key: v.key, value: v.value,
        is_secret: v.description === 'secret',
        is_active: v.is_active,
      }));
      const updated = await replaceVariables(selectedEnvId, vars);
      dispatch({ type: 'UPSERT_ENVIRONMENT', env: updated });
      toast.success('Environment saved');
    } catch { toast.error('Failed to save environment'); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!selectedEnvId || !confirm('Delete this environment?')) return;
    try {
      await deleteEnvironment(selectedEnvId);
      dispatch({ type: 'REMOVE_ENVIRONMENT', id: selectedEnvId });
      setSelectedEnvId(null);
      toast.success('Environment deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const handleCreateEnv = async () => {
    if (!newEnvName.trim()) return;
    setCreating(true);
    try {
      const env = await createEnvironment(state.workspaceId, newEnvName.trim());
      dispatch({ type: 'UPSERT_ENVIRONMENT', env });
      setNewEnvName('');
      selectEnv(env.id);
      toast.success('Environment created');
    } catch { toast.error('Failed to create environment'); }
    finally { setCreating(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Environments" width="720px">
      <div className="flex gap-4 min-h-[400px]">
        {/* Left: env list */}
        <div className="w-48 shrink-0">
          <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Environments</div>
          <div className="space-y-1">
            {state.environments.map(env => (
              <button
                key={env.id}
                onClick={() => selectEnv(env.id)}
                className="w-full text-left px-2.5 py-2 rounded text-xs truncate"
                style={{
                  background: selectedEnvId === env.id ? 'var(--accent-dim)' : 'var(--bg-card)',
                  color: selectedEnvId === env.id ? 'var(--accent)' : 'var(--text-secondary)',
                  border: `1px solid ${selectedEnvId === env.id ? 'var(--accent)' : 'var(--border)'}`,
                  cursor: 'pointer',
                }}
              >
                {env.name}
              </button>
            ))}
          </div>

          {/* Create new env */}
          <div className="mt-3">
            <input
              value={newEnvName}
              onChange={e => setNewEnvName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateEnv()}
              placeholder="New environment..."
              className="w-full rounded px-2 py-1.5 text-xs"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}
            />
            <button
              onClick={handleCreateEnv}
              disabled={creating || !newEnvName.trim()}
              className="w-full mt-1.5 py-1.5 rounded text-xs font-medium transition-all"
              style={{
                background: 'var(--accent-dim)', color: 'var(--accent)',
                border: '1px solid var(--accent)', cursor: 'pointer',
              }}
            >
              <Plus size={11} className="inline mr-1" />
              Add
            </button>
          </div>
        </div>

        {/* Right: env editor */}
        <div className="flex-1 flex flex-col">
          {!selectedEnvId ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Select an environment to edit</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <input
                  value={envName}
                  onChange={e => setEnvName(e.target.value)}
                  className="flex-1 rounded px-2.5 py-1.5 text-sm font-medium"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}
                />
                <button onClick={handleDelete}
                  className="p-1.5 rounded hover:bg-red-900/20 transition-all"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)' }}>
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                Variables — use as <code className="font-mono px-1 rounded" style={{ background: 'var(--bg-card)' }}>{'{{variable_name}}'}</code> in requests
              </div>

              <div className="flex-1 overflow-auto rounded" style={{ border: '1px solid var(--border)' }}>
                <KVEditor
                  rows={variables}
                  onChange={setVariables}
                  keyPlaceholder="Variable"
                  valuePlaceholder="Value"
                  showDescription={false}
                />
              </div>

              <div className="flex justify-end gap-2 mt-3">
                <Button variant="primary" onClick={handleSave} disabled={loading}>
                  {loading ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════
// 6. Code Snippet Modal
// ═══════════════════════════════════════════════════════════════

interface CodeSnippetModalProps {
  isOpen: boolean;
  onClose: () => void;
  tab: TabState | undefined;
}

export function CodeSnippetModal({ isOpen, onClose, tab }: CodeSnippetModalProps) {
  const [language, setLanguage] = useState('curl');
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const LANGUAGES = [
    { value: 'curl', label: 'cURL' },
    { value: 'fetch', label: 'JavaScript (fetch)' },
    { value: 'python', label: 'Python (requests)' },
    { value: 'nodejs', label: 'Node.js (axios)' },
  ];

  const generate = async (lang: string) => {
    if (!tab) return;
    setLoading(true);
    try {
      const headers = tab.headers.filter(h => h.key && h.is_active)
        .map(h => ({ key: h.key, value: h.value, is_active: true }));
      const snippet = await getSnippet(tab.method, tab.url, headers, tab.body_type, tab.body_raw, lang);
      setCode(snippet);
    } catch { setCode('// Failed to generate snippet'); }
    finally { setLoading(false); }
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    generate(lang);
  };

  // Generate on open
  if (isOpen && !code && tab) {
    generate(language);
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); setCode(''); }} title="Code Snippet" width="600px">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <label className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>Language:</label>
          <select value={language} onChange={e => handleLanguageChange(e.target.value)}
            className="rounded px-2 py-1.5 text-xs border cursor-pointer"
            style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)', outline: 'none' }}>
            {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
          <button onClick={handleCopy}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium"
            style={{ background: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer' }}>
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div className="rounded overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {loading ? (
            <div className="p-4 text-xs" style={{ color: 'var(--text-muted)' }}>Generating...</div>
          ) : (
            <pre className="p-4 text-xs font-mono overflow-auto" style={{ background: '#0d1117', color: '#e8edf2', margin: 0, maxHeight: '400px' }}>
              {code}
            </pre>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════
// 7. Import Collection Modal
// ═══════════════════════════════════════════════════════════════

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportModal({ isOpen, onClose }: ImportModalProps) {
  const { state, dispatch } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setLoading(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importCollection(state.workspaceId, data);
      const cols = await getCollections(state.workspaceId);
      dispatch({ type: 'SET_COLLECTIONS', collections: cols });
      toast.success('Collection imported successfully');
      onClose();
    } catch (err: any) {
      setError('Invalid Postman collection JSON. Make sure it is a valid Postman v2 collection.');
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Collection">
      <div className="space-y-4">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Import a Postman Collection v2 / v2.1 JSON file.
        </p>
        <div
          className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all"
          style={{ borderColor: 'var(--border)' }}
          onClick={() => fileRef.current?.click()}
        >
          <div className="text-3xl mb-2">📂</div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Click to select a .json file
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Postman Collection v2 / v2.1 format
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            onChange={handleFile}
            style={{ display: 'none' }}
          />
        </div>
        {loading && <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>Importing...</p>}
        {error && <p className="text-xs" style={{ color: 'var(--red)' }}>{error}</p>}
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  );
}
