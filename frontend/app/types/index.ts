// TypeScript types matching the backend Pydantic schemas.
// Think of these as the "shape" of all data in the app.

export interface Variable {
  id: number;
  environment_id: number;
  key: string;
  value: string;
  is_secret: boolean;
  is_active: boolean;
}

export interface Environment {
  id: number;
  workspace_id: number;
  name: string;
  created_at: string;
  updated_at: string;
  variables: Variable[];
}

export interface Header {
  id: number;
  request_id: number;
  key: string;
  value: string;
  description: string;
  is_active: boolean;
}

export interface QueryParam {
  id: number;
  request_id: number;
  key: string;
  value: string;
  description: string;
  is_active: boolean;
}

export interface SavedRequest {
  id: number;
  collection_id: number;
  folder_id: number | null;
  name: string;
  method: string;
  url: string;
  description: string;
  body_type: string;
  body_content: string;
  body_language: string;
  auth_type: string;
  auth_data: Record<string, any>;
  created_at: string;
  updated_at: string;
  headers: Header[];
  query_params: QueryParam[];
}

export interface Folder {
  id: number;
  collection_id: number;
  name: string;
  created_at: string;
  requests: SavedRequest[];
}

export interface Collection {
  id: number;
  workspace_id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  folders: Folder[];
  requests: SavedRequest[];
}

export interface Workspace {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface HistoryEntry {
  id: number;
  request_id: number | null;
  method: string;
  url: string;
  headers_snapshot: Record<string, string>;
  params_snapshot: Record<string, string>;
  body_type: string;
  body_snapshot: string;
  environment_id: number | null;
  environment_name: string;
  status_code: number | null;
  status_text: string;
  response_time_ms: number | null;
  response_size_bytes: number | null;
  response_headers: Record<string, string>;
  response_body: string;
  executed_at: string;
  is_error: boolean;
  error_message: string;
}

export interface SendResponse {
  status_code: number | null;
  status_text: string;
  response_time_ms: number;
  response_size_bytes: number;
  response_headers: Record<string, string>;
  response_body: string;
  is_error: boolean;
  error_message: string;
  history_id: number;
}

// The "working state" of the request builder — not yet saved to DB
export interface KeyValueRow {
  id: string;          // local UUID for React keys
  key: string;
  value: string;
  description: string;
  is_active: boolean;
}

export interface AuthConfig {
  type: 'none' | 'bearer' | 'basic' | 'api-key';
  token?: string;
  username?: string;
  password?: string;
  api_key?: string;
  api_value?: string;
  api_in?: 'header' | 'query';
}

export interface TabState {
  id: string;               // local tab UUID
  title: string;
  method: string;
  url: string;
  headers: KeyValueRow[];
  query_params: KeyValueRow[];
  body_type: 'none' | 'raw' | 'form-data' | 'urlencoded';
  body_raw: string;
  body_language: string;
  body_form: KeyValueRow[];
  auth: AuthConfig;
  response: SendResponse | null;
  isLoading: boolean;
  isDirty: boolean;          // unsaved changes
  savedRequestId?: number;   // if opened from a collection
  collectionId?: number;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export const METHOD_COLORS: Record<string, string> = {
  GET: '#61affe',
  POST: '#49cc90',
  PUT: '#fca130',
  PATCH: '#50e3c2',
  DELETE: '#f93e3e',
  HEAD: '#9012fe',
  OPTIONS: '#0d5aa7',
};
