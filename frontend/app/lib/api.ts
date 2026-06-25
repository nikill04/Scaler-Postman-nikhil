// API client — all calls to the FastAPI backend in one place.
// Using axios for cleaner error handling.

import axios from 'axios';
import type {
  Workspace, Collection, Environment, SavedRequest,
  HistoryEntry, SendResponse, TabState, Variable
} from '../types';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
});

// ── Workspaces ────────────────────────────────────────────────────────────

export async function getWorkspaces(): Promise<Workspace[]> {
  const { data } = await api.get('/workspaces');
  return data;
}

export async function createWorkspace(name: string, description = ''): Promise<Workspace> {
  const { data } = await api.post('/workspaces', { name, description });
  return data;
}

// ── Collections ───────────────────────────────────────────────────────────

export async function getCollections(workspaceId: number): Promise<Collection[]> {
  const { data } = await api.get(`/workspaces/${workspaceId}/collections`);
  return data;
}

export async function createCollection(
  workspaceId: number, name: string, description = ''
): Promise<Collection> {
  const { data } = await api.post('/collections', { workspace_id: workspaceId, name, description });
  return data;
}

export async function updateCollection(
  id: number, updates: { name?: string; description?: string }
): Promise<Collection> {
  const { data } = await api.patch(`/collections/${id}`, updates);
  return data;
}

export async function deleteCollection(id: number): Promise<void> {
  await api.delete(`/collections/${id}`);
}

export async function exportCollection(id: number): Promise<any> {
  const { data } = await api.get(`/collections/${id}/export`);
  return data;
}

export async function importCollection(workspaceId: number, collectionData: any): Promise<any> {
  const { data } = await api.post(
    `/collections/import?workspace_id=${workspaceId}`,
    collectionData
  );
  return data;
}

// ── Folders ───────────────────────────────────────────────────────────────

export async function createFolder(collectionId: number, name: string) {
  const { data } = await api.post('/folders', { collection_id: collectionId, name });
  return data;
}

export async function updateFolder(id: number, name: string) {
  const { data } = await api.patch(`/folders/${id}`, { name });
  return data;
}

export async function deleteFolder(id: number) {
  await api.delete(`/folders/${id}`);
}

// ── Requests ──────────────────────────────────────────────────────────────

export async function getRequest(id: number): Promise<SavedRequest> {
  const { data } = await api.get(`/requests/${id}`);
  return data;
}

export async function createRequest(body: {
  collection_id: number;
  folder_id?: number | null;
  name: string;
  method: string;
  url: string;
  description?: string;
  body_type?: string;
  body_content?: string;
  body_language?: string;
  auth_type?: string;
  auth_data?: Record<string, any>;
  headers?: { key: string; value: string; description: string; is_active: boolean }[];
  query_params?: { key: string; value: string; description: string; is_active: boolean }[];
}): Promise<SavedRequest> {
  const { data } = await api.post('/requests', body);
  return data;
}

export async function updateRequest(
  id: number,
  updates: Partial<{
    name: string;
    method: string;
    url: string;
    description: string;
    body_type: string;
    body_content: string;
    body_language: string;
    auth_type: string;
    auth_data: Record<string, any>;
    folder_id: number | null;
    headers: { key: string; value: string; description: string; is_active: boolean }[];
    query_params: { key: string; value: string; description: string; is_active: boolean }[];
  }>
): Promise<SavedRequest> {
  const { data } = await api.patch(`/requests/${id}`, updates);
  return data;
}

export async function deleteRequest(id: number): Promise<void> {
  await api.delete(`/requests/${id}`);
}

// ── Environments ──────────────────────────────────────────────────────────

export async function getEnvironments(workspaceId: number): Promise<Environment[]> {
  const { data } = await api.get(`/workspaces/${workspaceId}/environments`);
  return data;
}

export async function createEnvironment(
  workspaceId: number, name: string, variables: Partial<Variable>[] = []
): Promise<Environment> {
  const { data } = await api.post('/environments', {
    workspace_id: workspaceId, name, variables
  });
  return data;
}

export async function updateEnvironment(id: number, name: string): Promise<Environment> {
  const { data } = await api.patch(`/environments/${id}`, { name });
  return data;
}

export async function deleteEnvironment(id: number): Promise<void> {
  await api.delete(`/environments/${id}`);
}

export async function replaceVariables(
  envId: number,
  variables: { key: string; value: string; is_secret: boolean; is_active: boolean }[]
): Promise<Environment> {
  const { data } = await api.put(`/environments/${envId}/variables`, variables);
  return data;
}

// ── History ───────────────────────────────────────────────────────────────

export async function getHistory(limit = 100): Promise<HistoryEntry[]> {
  const { data } = await api.get(`/history?limit=${limit}`);
  return data;
}

export async function clearHistory(): Promise<void> {
  await api.delete('/history');
}

export async function deleteHistoryEntry(id: number): Promise<void> {
  await api.delete(`/history/${id}`);
}

// ── Runner ────────────────────────────────────────────────────────────────

export async function sendRequest(tab: TabState, environmentId?: number): Promise<SendResponse> {
  // Convert KeyValueRow arrays to the format the backend expects
  const headers = tab.headers
    .filter(h => h.key)
    .map(h => ({ key: h.key, value: h.value, is_active: h.is_active }));

  const query_params = tab.query_params
    .filter(p => p.key)
    .map(p => ({ key: p.key, value: p.value, is_active: p.is_active }));

  const body_form = tab.body_form
    .filter(f => f.key)
    .map(f => ({ key: f.key, value: f.value, type: 'text', is_active: f.is_active }));

  const payload = {
    method: tab.method,
    url: tab.url,
    headers,
    query_params,
    body_type: tab.body_type,
    body_raw: tab.body_raw || undefined,
    body_language: tab.body_language,
    body_form,
    auth: tab.auth,
    environment_id: environmentId || undefined,
    request_id: tab.savedRequestId || undefined,
  };

  const { data } = await api.post('/run', payload);
  return data;
}

// ── Code Snippets (Bonus) ─────────────────────────────────────────────────

export async function getSnippet(
  method: string,
  url: string,
  headers: { key: string; value: string; is_active: boolean }[],
  bodyType: string,
  bodyRaw: string,
  language: string
): Promise<string> {
  const { data } = await api.post('/snippet', {
    method, url, headers, body_type: bodyType, body_raw: bodyRaw, language
  });
  return data.code;
}
