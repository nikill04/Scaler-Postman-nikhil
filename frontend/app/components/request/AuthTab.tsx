'use client';
// Authorization tab in the request builder.
// Supports: None, Bearer Token, Basic Auth, API Key.

import { Input, Select } from '../ui';
import type { AuthConfig } from '../../types';

interface AuthTabProps {
  auth: AuthConfig;
  onChange: (auth: AuthConfig) => void;
}

export default function AuthTab({ auth, onChange }: AuthTabProps) {
  const update = (updates: Partial<AuthConfig>) => onChange({ ...auth, ...updates });

  const inputStyle = "w-full rounded px-2.5 py-1.5 text-xs font-mono";

  return (
    <div className="p-4 space-y-4">
      {/* Auth type selector */}
      <div>
        <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
          Auth Type
        </label>
        <select
          value={auth.type}
          onChange={e => update({ type: e.target.value as AuthConfig['type'] })}
          className="rounded px-2.5 py-1.5 text-xs border cursor-pointer"
          style={{
            background: 'var(--bg-input)', borderColor: 'var(--border)',
            color: 'var(--text-primary)', outline: 'none', minWidth: '200px',
          }}
        >
          <option value="none">No Auth</option>
          <option value="bearer">Bearer Token</option>
          <option value="basic">Basic Auth</option>
          <option value="api-key">API Key</option>
        </select>
      </div>

      {/* No auth message */}
      {auth.type === 'none' && (
        <div className="py-4 text-center">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            No auth configured. Select an auth type above to add authorization.
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Auth headers can also be set manually in the Headers tab.
          </p>
        </div>
      )}

      {/* Bearer Token */}
      {auth.type === 'bearer' && (
        <div>
          <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
            Token
          </label>
          <input
            value={auth.token || ''}
            onChange={e => update({ token: e.target.value })}
            placeholder="Enter your bearer token..."
            className={inputStyle}
            style={{
              background: 'var(--bg-input)', border: '1px solid var(--border)',
              color: 'var(--text-primary)', outline: 'none',
            }}
          />
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            Will be sent as: <code className="font-mono px-1 rounded" style={{ background: 'var(--bg-card)' }}>
              Authorization: Bearer {'<token>'}
            </code>
          </p>
        </div>
      )}

      {/* Basic Auth */}
      {auth.type === 'basic' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Username</label>
            <input
              value={auth.username || ''}
              onChange={e => update({ username: e.target.value })}
              placeholder="Username"
              className={inputStyle}
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Password</label>
            <input
              type="password"
              value={auth.password || ''}
              onChange={e => update({ password: e.target.value })}
              placeholder="Password"
              className={inputStyle}
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}
            />
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Credentials will be Base64-encoded and sent as <code className="font-mono px-1 rounded" style={{ background: 'var(--bg-card)' }}>Authorization: Basic</code> header.
          </p>
        </div>
      )}

      {/* API Key */}
      {auth.type === 'api-key' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Key</label>
            <input
              value={auth.api_key || ''}
              onChange={e => update({ api_key: e.target.value })}
              placeholder="e.g. X-API-Key"
              className={inputStyle}
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Value</label>
            <input
              value={auth.api_value || ''}
              onChange={e => update({ api_value: e.target.value })}
              placeholder="Your API key value"
              className={inputStyle}
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Add to</label>
            <select
              value={auth.api_in || 'header'}
              onChange={e => update({ api_in: e.target.value as 'header' | 'query' })}
              className="rounded px-2.5 py-1.5 text-xs border cursor-pointer"
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)', outline: 'none' }}
            >
              <option value="header">Header</option>
              <option value="query">Query Param</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
