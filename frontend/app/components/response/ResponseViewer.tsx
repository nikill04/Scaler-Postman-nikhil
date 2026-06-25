'use client';
// Response Viewer — shows the result after a request is sent.
// Three tabs: Body | Headers | Info
// Body has Pretty / Raw toggle with simple JSON colorizer.

import { useState } from 'react';
import { formatSize, formatTime, prettyJson, isJson } from '../../lib/utils';
import type { SendResponse } from '../../types';
import { Spinner } from '../ui';
import { Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface ResponseViewerProps {
  response: SendResponse | null;
  isLoading: boolean;
}

export default function ResponseViewer({ response, isLoading }: ResponseViewerProps) {
  const [activeTab, setActiveTab] = useState<'body' | 'headers' | 'info'>('body');
  const [viewMode, setViewMode] = useState<'pretty' | 'raw'>('pretty');
  const [copied, setCopied] = useState(false);

  const copyResponse = () => {
    if (!response) return;
    navigator.clipboard.writeText(response.response_body);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3" style={{ background: 'var(--bg-primary)' }}>
        <Spinner size={24} />
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Sending request...</span>
      </div>
    );
  }

  // Empty state (no request sent yet)
  if (!response) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-2" style={{ background: 'var(--bg-primary)' }}>
        <div style={{ fontSize: 32 }}>📨</div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Enter a URL and click Send
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          The response will appear here
        </p>
      </div>
    );
  }

  // Error state (network error, timeout, etc.)
  if (response.is_error) {
    return (
      <div className="flex flex-col h-full" style={{ background: 'var(--bg-primary)' }}>
        <ResponseStatusBar response={response} />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="text-3xl mb-3">⚠️</div>
            <p className="text-sm font-semibold mb-2" style={{ color: '#f93e3e' }}>
              Request Failed
            </p>
            <p className="text-xs font-mono p-3 rounded" style={{ background: 'var(--bg-card)', color: '#f93e3e', border: '1px solid #f93e3e33' }}>
              {response.error_message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const headerCount = Object.keys(response.response_headers).length;
  const bodyText = viewMode === 'pretty' && isJson(response.response_body)
    ? prettyJson(response.response_body)
    : response.response_body;

  const tabs = [
    { id: 'body', label: 'Body' },
    { id: 'headers', label: `Headers (${headerCount})` },
    { id: 'info', label: 'Info' },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-primary)' }}>
      {/* Status bar */}
      <ResponseStatusBar response={response} />

      {/* Tab bar + controls */}
      <div className="flex items-center border-b shrink-0 px-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="flex gap-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className="px-3 py-2 text-xs transition-all"
              style={{
                color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: activeTab === tab.id ? `2px solid var(--accent)` : '2px solid transparent',
                paddingBottom: activeTab === tab.id ? '6px' : '8px',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Pretty/Raw toggle for body tab */}
          {activeTab === 'body' && (
            <div className="flex rounded overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              {(['pretty', 'raw'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className="px-2 py-1 text-xs capitalize"
                  style={{
                    background: viewMode === mode ? 'var(--accent)' : 'var(--bg-card)',
                    color: viewMode === mode ? 'white' : 'var(--text-muted)',
                    border: 'none', cursor: 'pointer',
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
          )}

          {/* Copy button */}
          <button
            onClick={copyResponse}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-all"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            {copied ? <Check size={12} style={{ color: 'var(--green)' }} /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'body' && (
          <pre
            className="p-4 text-xs font-mono leading-relaxed"
            style={{
              color: 'var(--text-primary)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              margin: 0,
            }}
          >
            {viewMode === 'pretty' && isJson(response.response_body)
              ? <JsonHighlighter json={bodyText} />
              : bodyText || <span style={{ color: 'var(--text-muted)' }}>Empty response body</span>
            }
          </pre>
        )}

        {activeTab === 'headers' && (
          <div>
            {headerCount === 0 ? (
              <p className="p-4 text-xs" style={{ color: 'var(--text-muted)' }}>No response headers</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                    <th className="text-left px-4 py-2 font-medium" style={{ color: 'var(--text-muted)', width: '40%' }}>Key</th>
                    <th className="text-left px-4 py-2 font-medium" style={{ color: 'var(--text-muted)' }}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(response.response_headers).map(([key, value]) => (
                    <tr key={key} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="px-4 py-2 font-mono" style={{ color: '#61affe' }}>{key}</td>
                      <td className="px-4 py-2 font-mono" style={{ color: 'var(--text-secondary)' }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'info' && (
          <div className="p-4 space-y-3">
            <InfoRow label="Status" value={`${response.status_code} ${response.status_text}`} />
            <InfoRow label="Response Time" value={formatTime(response.response_time_ms)} />
            <InfoRow label="Response Size" value={formatSize(response.response_size_bytes)} />
            <InfoRow
              label="Content Type"
              value={response.response_headers['Content-Type'] || response.response_headers['content-type'] || 'unknown'}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Status bar ─────────────────────────────────────────────────────────────

function ResponseStatusBar({ response }: { response: SendResponse }) {
  const code = response.status_code;
  let color = '#8fa3b8';
  if (code && code >= 200 && code < 300) color = '#49cc90';
  else if (code && code >= 300 && code < 400) color = '#fca130';
  else if (code && code >= 400 && code < 500) color = '#f9b031';
  else if (code && code >= 500) color = '#f93e3e';
  if (response.is_error) color = '#f93e3e';

  return (
    <div className="flex items-center gap-4 px-4 py-2 shrink-0 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
      {response.is_error ? (
        <span className="text-xs font-semibold" style={{ color: '#f93e3e' }}>Error</span>
      ) : (
        <>
          <span className="text-xs font-bold font-mono" style={{ color }}>
            {response.status_code} {response.status_text}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Time: <span style={{ color: 'var(--text-secondary)' }}>{formatTime(response.response_time_ms)}</span>
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Size: <span style={{ color: 'var(--text-secondary)' }}>{formatSize(response.response_size_bytes)}</span>
          </span>
        </>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4">
      <span className="text-xs w-32 shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

// ── Simple JSON syntax highlighter ─────────────────────────────────────────
// Parses JSON and renders colored spans. No external library needed.

function JsonHighlighter({ json }: { json: string }) {
  // Tokenize the JSON string into colored segments
  const tokens: { text: string; color: string }[] = [];

  // Regex to find JSON tokens
  const tokenRegex = /("(?:[^"\\]|\\.)*")\s*(:)?|(\b(?:true|false|null)\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}\[\],])/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(json)) !== null) {
    // Add any whitespace/characters before this match
    if (match.index > lastIndex) {
      tokens.push({ text: json.slice(lastIndex, match.index), color: 'var(--text-primary)' });
    }

    const [full, stringVal, colon, keyword, number, punctuation] = match;

    if (stringVal && colon) {
      // Object key
      tokens.push({ text: stringVal, color: '#61affe' });  // blue key
      tokens.push({ text: ':', color: 'var(--text-primary)' });
    } else if (stringVal) {
      // String value
      tokens.push({ text: stringVal, color: '#49cc90' });  // green string
    } else if (keyword) {
      tokens.push({ text: keyword, color: '#fca130' });    // orange keyword
    } else if (number) {
      tokens.push({ text: number, color: '#ff79c6' });     // pink number
    } else if (punctuation) {
      tokens.push({ text: punctuation, color: 'var(--text-secondary)' });
    }

    lastIndex = match.index + full.length;
  }

  if (lastIndex < json.length) {
    tokens.push({ text: json.slice(lastIndex), color: 'var(--text-primary)' });
  }

  return (
    <>
      {tokens.map((t, i) => (
        <span key={i} style={{ color: t.color }}>{t.text}</span>
      ))}
    </>
  );
}
