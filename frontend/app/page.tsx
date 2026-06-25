'use client';
// Main page — wires the entire app together.
// All modal state lives here. Data loading happens here on mount.

import { useEffect, useState, useRef, useCallback } from 'react';
import { useApp } from './lib/store';
import TopBar from './components/TopBar';
import TabBar from './components/TabBar';
import Sidebar from './components/sidebar/Sidebar';
import RequestBuilder from './components/request/RequestBuilder';
import ResponseViewer from './components/response/ResponseViewer';
import {
  NewCollectionModal, NewRequestModal, NewFolderModal,
  SaveRequestModal, EnvironmentModal, CodeSnippetModal, ImportModal
} from './components/modals/Modals';
import { getCollections, getEnvironments, getHistory, sendRequest } from './lib/api';
import toast from 'react-hot-toast';

export default function Home() {
  const { state, dispatch, activeTab, updateActiveTab } = useApp();

  useEffect(() => {
    async function loadData() {
      try {
        const [cols, envs, hist] = await Promise.all([
          getCollections(state.workspaceId),
          getEnvironments(state.workspaceId),
          getHistory(),
        ]);
        dispatch({ type: 'SET_COLLECTIONS', collections: cols });
        dispatch({ type: 'SET_ENVIRONMENTS', environments: envs });
        dispatch({ type: 'SET_HISTORY', history: hist });
        if (envs.length > 0) {
          dispatch({ type: 'SET_ENV', id: envs[0].id });
        }
      } catch {
        toast.error('Failed to connect to backend. Is the server running on port 8000?');
      }
    }
    loadData();
  }, []);

  const [showNewCollection, setShowNewCollection] = useState(false);
  const [showEnvManager, setShowEnvManager] = useState(false);
  const [showSaveRequest, setShowSaveRequest] = useState(false);
  const [showCodeSnippet, setShowCodeSnippet] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [newRequestTarget, setNewRequestTarget] = useState<{ collectionId: number; folderId?: number } | null>(null);
  const [newFolderCollectionId, setNewFolderCollectionId] = useState<number | null>(null);

  const [splitPercent, setSplitPercent] = useState(45);
  const isDragging = useRef(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  // Sidebar horizontal resize
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const isSidebarDragging = useRef(false);

  const onSidebarMouseDown = () => { isSidebarDragging.current = true; };
  const onSidebarMouseMove = useCallback((e: MouseEvent) => {
    if (!isSidebarDragging.current) return;
    setSidebarWidth(Math.max(180, Math.min(480, e.clientX)));
  }, []);
  const onSidebarMouseUp = () => { isSidebarDragging.current = false; };
  const onMouseDown = () => { isDragging.current = true; };
  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !splitContainerRef.current) return;
    const rect = splitContainerRef.current.getBoundingClientRect();
    const pct = ((e.clientY - rect.top) / rect.height) * 100;
    setSplitPercent(Math.max(25, Math.min(75, pct)));
  }, []);
  const onMouseUp = () => { isDragging.current = false; };

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onSidebarMouseMove);
    window.addEventListener('mouseup', onSidebarMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onSidebarMouseMove);
      window.removeEventListener('mouseup', onSidebarMouseUp);
    };
  }, [onMouseMove, onSidebarMouseMove]);

  const handleSend = useCallback(async () => {
    if (!activeTab || !activeTab.url) {
      toast.error('Please enter a URL');
      return;
    }
    updateActiveTab({ isLoading: true, response: null });
    try {
      const response = await sendRequest(activeTab, state.selectedEnvId || undefined);
      updateActiveTab({ response, isLoading: false });
      const histEntry = {
        id: response.history_id,
        request_id: activeTab.savedRequestId || null,
        method: activeTab.method,
        url: activeTab.url,
        headers_snapshot: {},
        params_snapshot: {},
        body_type: activeTab.body_type,
        body_snapshot: activeTab.body_raw || '',
        environment_id: state.selectedEnvId,
        environment_name: '',
        status_code: response.status_code,
        status_text: response.status_text,
        response_time_ms: response.response_time_ms,
        response_size_bytes: response.response_size_bytes,
        response_headers: response.response_headers,
        response_body: response.response_body,
        executed_at: new Date().toISOString(),
        is_error: response.is_error,
        error_message: response.error_message,
      };
      dispatch({ type: 'ADD_HISTORY_ENTRY', entry: histEntry });
      if (response.is_error) {
        toast.error(response.error_message || 'Request failed');
      }
    } catch (err: any) {
      updateActiveTab({ isLoading: false });
      toast.error('Network error: ' + (err?.message || 'Unknown error'));
    }
  }, [activeTab, state.selectedEnvId, updateActiveTab, dispatch]);

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <TopBar
        onOpenEnvManager={() => setShowEnvManager(true)}
        onNewCollection={() => setShowNewCollection(true)}
      />
      <div className="flex flex-1 overflow-hidden">
        <div style={{ width: `${sidebarWidth}px`, flexShrink: 0, overflow: 'hidden', display: 'flex' }}>
          <div style={{ flex: 1, overflow: 'hidden' }}>
          <Sidebar
            onNewCollection={() => setShowNewCollection(true)}
            onNewRequest={(collectionId, folderId) => setNewRequestTarget({ collectionId, folderId })}
            onNewFolder={(collectionId) => setNewFolderCollectionId(collectionId)}
            onImportCollection={() => setShowImport(true)}
          />
          </div>
          {/* Sidebar resize handle */}
          <div
            onMouseDown={onSidebarMouseDown}
            style={{
              width: '4px',
              background: 'var(--border)',
              cursor: 'col-resize',
              flexShrink: 0,
              userSelect: 'none',
              transition: 'background 0.15s',
            }}
            className="hover:bg-[var(--accent)]"
          />
        </div>
        <div className="flex flex-col flex-1 overflow-hidden">
          <TabBar />
          <div ref={splitContainerRef} className="flex-1 flex flex-col overflow-hidden">
            <div style={{ height: `${splitPercent}%`, overflow: 'hidden', flexShrink: 0 }}>
              <RequestBuilder
                onSend={handleSend}
                onSave={() => setShowSaveRequest(true)}
                onCodeSnippet={() => setShowCodeSnippet(true)}
              />
            </div>
            <div
              onMouseDown={onMouseDown}
              style={{ height: '4px', background: 'var(--border)', cursor: 'row-resize', flexShrink: 0, userSelect: 'none' }}
              className="hover:bg-[var(--accent)] transition-colors"
            />
            <div style={{ height: `${100 - splitPercent}%`, overflow: 'hidden' }}>
              <ResponseViewer
                response={activeTab?.response || null}
                isLoading={activeTab?.isLoading || false}
              />
            </div>
          </div>
        </div>
      </div>

      <NewCollectionModal isOpen={showNewCollection} onClose={() => setShowNewCollection(false)} />
      <EnvironmentModal isOpen={showEnvManager} onClose={() => setShowEnvManager(false)} />
      {activeTab && (
        <SaveRequestModal isOpen={showSaveRequest} onClose={() => setShowSaveRequest(false)} tab={activeTab} />
      )}
      <CodeSnippetModal isOpen={showCodeSnippet} onClose={() => setShowCodeSnippet(false)} tab={activeTab} />
      <ImportModal isOpen={showImport} onClose={() => setShowImport(false)} />
      {newRequestTarget && (
        <NewRequestModal
          isOpen={true}
          onClose={() => setNewRequestTarget(null)}
          collectionId={newRequestTarget.collectionId}
          folderId={newRequestTarget.folderId}
        />
      )}
      {newFolderCollectionId && (
        <NewFolderModal isOpen={true} onClose={() => setNewFolderCollectionId(null)} collectionId={newFolderCollectionId} />
      )}
    </div>
  );
}
