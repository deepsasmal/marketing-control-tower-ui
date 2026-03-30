import React, { useEffect, useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import { load as parseYaml } from 'js-yaml';
import {
  listCubeSchemas,
  getCubeSchema,
  createCubeSchema,
  updateCubeSchema,
  deleteCubeSchema,
} from '../api';
import { Modal } from './ui/Modal';
import { C } from '../lib/constants';

type Props = {
  open: boolean;
  token: string;
  onClose: () => void;
};

const NEW_CUBE_TEMPLATE = `cubes:
  - name: MyCube
    sql: "SELECT * FROM staging.stg_table"
    measures:
      - name: count
        type: count
    dimensions:
      - name: id
        sql: id
        type: string
        primary_key: true
`;

const NEW_VIEW_TEMPLATE = `views:
  - name: MyView
    cubes:
      - join_path: MyCube
        includes: "*"
`;

function parseUser(token: string): string {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload?.sub || payload?.email || payload?.name || 'unknown';
  } catch {
    return 'unknown';
  }
}

function validateYamlLike(fileName: string, content: string): string {
  const lower = (fileName || '').toLowerCase();
  if (lower.endsWith('.yaml') || lower.endsWith('.yml')) {
    try {
      parseYaml(content);
    } catch (e: any) {
      return e?.message || 'Invalid YAML content';
    }
  }
  return '';
}

export const CubeSchemaEditorModal = ({ open, token, onClose }: Props) => {
  const [includeInactive, setIncludeInactive] = useState(false);
  const [schemas, setSchemas] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState('');

  const [activeId, setActiveId] = useState<number | null>(null);
  const [activeFile, setActiveFile] = useState<any | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [fileError, setFileError] = useState('');

  const [editorContent, setEditorContent] = useState('');
  const [yamlError, setYamlError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newSchemaType, setNewSchemaType] = useState<'cube' | 'view'>('cube');
  const [creating, setCreating] = useState(false);

  const username = useMemo(() => parseUser(token), [token]);
  const isDirty = !!activeFile && editorContent !== (activeFile.content || '');

  const grouped = useMemo(() => {
    const activeOnly = schemas.filter((s: any) => includeInactive || s.is_active);
    return {
      cubes: activeOnly.filter((s: any) => s.schema_type === 'cube'),
      views: activeOnly.filter((s: any) => s.schema_type === 'view'),
      other: activeOnly.filter((s: any) => !['cube', 'view'].includes(s.schema_type)),
    };
  }, [schemas, includeInactive]);

  const loadList = async () => {
    setLoadingList(true);
    setListError('');
    try {
      const data = await listCubeSchemas(token, includeInactive);
      setSchemas(Array.isArray(data) ? data : []);
      if (!activeId && data?.length) setActiveId(data[0].id);
    } catch (err: any) {
      setListError(err.message || 'Failed to load schema files');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, includeInactive, token]);

  useEffect(() => {
    if (!open || !activeId) return;
    setLoadingFile(true);
    setFileError('');
    setStatusMessage('');
    getCubeSchema(activeId, token)
      .then((data) => {
        setActiveFile(data);
        setEditorContent(data?.content || '');
        setYamlError(validateYamlLike(data?.file_name || '', data?.content || ''));
      })
      .catch((err: any) => {
        setFileError(err.message || 'Failed to open schema file');
        setActiveFile(null);
        setEditorContent('');
      })
      .finally(() => setLoadingFile(false));
  }, [open, activeId, token]);

  const guardUnsaved = (): boolean => {
    if (!isDirty) return true;
    return window.confirm('You have unsaved changes. Continue and discard them?');
  };

  const handleSelectFile = (id: number) => {
    if (id === activeId) return;
    if (!guardUnsaved()) return;
    setActiveId(id);
  };

  const handleCreate = async () => {
    const name = newFileName.trim();
    if (!/\.(yaml|yml|js)$/i.test(name)) {
      setStatusMessage('File name must end with .yaml, .yml, or .js');
      return;
    }
    const content = newSchemaType === 'cube' ? NEW_CUBE_TEMPLATE : NEW_VIEW_TEMPLATE;
    const localValidation = validateYamlLike(name, content);
    if (localValidation) {
      setStatusMessage(localValidation);
      return;
    }
    setCreating(true);
    setStatusMessage('');
    try {
      const created = await createCubeSchema(
        {
          file_name: name,
          schema_type: newSchemaType,
          content,
          created_by: username,
        },
        token,
      );
      setShowCreate(false);
      setNewFileName('');
      setNewSchemaType('cube');
      await loadList();
      setActiveId(created.id);
      setStatusMessage('Schema file created.');
    } catch (err: any) {
      setStatusMessage(err.message || 'Failed to create schema file');
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async () => {
    if (!activeFile?.id) return;
    const localValidation = validateYamlLike(activeFile.file_name, editorContent);
    setYamlError(localValidation);
    if (localValidation) return;
    setSaving(true);
    setFileError('');
    setStatusMessage('');
    try {
      const saved = await updateCubeSchema(
        activeFile.id,
        { content: editorContent, updated_by: username },
        token,
      );
      setActiveFile(saved);
      setEditorContent(saved.content || '');
      await loadList();
      setStatusMessage(`Saved ${saved.file_name} (v${saved.version}).`);
    } catch (err: any) {
      const msg = err.message || 'Failed to save schema';
      setFileError(msg);
      setStatusMessage(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!activeFile?.id) return;
    const ok = window.confirm(`Delete "${activeFile.file_name}"?`);
    if (!ok) return;
    setDeleting(true);
    setStatusMessage('');
    try {
      await deleteCubeSchema(activeFile.id, token);
      const deletedId = activeFile.id;
      setActiveFile(null);
      setEditorContent('');
      await loadList();
      const next = schemas.find((s: any) => s.id !== deletedId && s.is_active)?.id || null;
      setActiveId(next);
      setStatusMessage('Schema file deleted.');
    } catch (err: any) {
      setStatusMessage(err.message || 'Failed to delete schema file');
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    if (!guardUnsaved()) return;
    onClose();
  };

  const lastSavedText = activeFile?.updated_at
    ? new Date(activeFile.updated_at).toLocaleString()
    : '—';

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Cube Schema Editor"
      subtitle="Edit Cube.js model files (YAML/JS) with versioned saves"
      nearlyFullscreen
    >
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 14, minHeight: 620 }}>
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', background: C.surface }}>
          <div style={{ padding: 10, borderBottom: `1px solid ${C.border}`, display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Files</div>
              <button
                onClick={() => setShowCreate(true)}
                style={{ border: `1px solid ${C.border}`, background: C.surfaceAlt, borderRadius: 8, padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}
              >
                + New File
              </button>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.textMuted }}>
              <input type="checkbox" checked={includeInactive} onChange={e => setIncludeInactive(e.target.checked)} />
              Include inactive
            </label>
          </div>
          <div style={{ maxHeight: 560, overflow: 'auto', padding: 8, display: 'grid', gap: 10 }}>
            {loadingList ? (
              <div style={{ fontSize: 12, color: C.textMuted }}>Loading files...</div>
            ) : listError ? (
              <div style={{ fontSize: 12, color: C.red }}>{listError}</div>
            ) : (
              <>
                {[
                  { title: 'Cubes', list: grouped.cubes },
                  { title: 'Views', list: grouped.views },
                  { title: 'Other', list: grouped.other },
                ].map(group => (
                  <div key={group.title} style={{ display: 'grid', gap: 6 }}>
                    {group.list.length > 0 && (
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        {group.title}
                      </div>
                    )}
                    {group.list.map((f: any) => {
                      const active = f.id === activeId;
                      return (
                        <button
                          key={f.id}
                          onClick={() => handleSelectFile(f.id)}
                          style={{
                            textAlign: 'left',
                            border: `1px solid ${active ? C.black : C.border}`,
                            borderRadius: 10,
                            background: active ? C.surfaceAlt : C.surface,
                            padding: '8px 10px',
                            cursor: 'pointer',
                            opacity: f.is_active ? 1 : 0.65,
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 600, color: C.textPrimary }}>{f.file_name}</div>
                          <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>
                            v{f.version} • {f.schema_type} • {f.updated_by || 'system'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, background: C.surface, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 12, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary }}>
                {activeFile?.file_name || 'Select a schema file'}
                {activeFile?.version ? `  v${activeFile.version}` : ''}
              </div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                {isDirty ? '● Unsaved changes' : 'Saved'} • Last saved: {lastSavedText}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleSave}
                disabled={!activeFile || saving || !!yamlError}
                style={{ border: 'none', background: C.black, color: '#fff', borderRadius: 8, padding: '7px 11px', cursor: 'pointer', opacity: (!activeFile || saving || !!yamlError) ? 0.6 : 1 }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleDelete}
                disabled={!activeFile || deleting}
                style={{ border: `1px solid ${C.red}`, background: C.redLight, color: C.red, borderRadius: 8, padding: '7px 11px', cursor: 'pointer', opacity: (!activeFile || deleting) ? 0.6 : 1 }}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 420 }}>
            {loadingFile ? (
              <div style={{ padding: 12, color: C.textMuted, fontSize: 12 }}>Loading file content...</div>
            ) : activeFile ? (
              <Editor
                height="100%"
                language={activeFile.file_name?.toLowerCase().endsWith('.js') ? 'javascript' : 'yaml'}
                value={editorContent}
                onChange={(value) => {
                  const next = value || '';
                  setEditorContent(next);
                  setYamlError(validateYamlLike(activeFile.file_name, next));
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  wordWrap: 'on',
                  scrollBeyondLastLine: false,
                  tabSize: 2,
                }}
              />
            ) : (
              <div style={{ padding: 12, color: C.textMuted, fontSize: 12 }}>Select a file from the left sidebar.</div>
            )}
          </div>

          <div style={{ borderTop: `1px solid ${C.border}`, padding: 10, fontSize: 12 }}>
            {yamlError ? (
              <span style={{ color: C.red }}>YAML validation error: {yamlError}</span>
            ) : (
              <span style={{ color: C.green }}>YAML syntax looks valid.</span>
            )}
            {fileError && <span style={{ color: C.red, marginLeft: 12 }}>{fileError}</span>}
            {statusMessage && <span style={{ color: statusMessage.toLowerCase().includes('failed') ? C.red : C.textMuted, marginLeft: 12 }}>{statusMessage}</span>}
          </div>
        </div>
      </div>

      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 460, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, display: 'grid', gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>New Schema File</div>
            <input
              placeholder="File name (e.g. Accounts.yaml)"
              value={newFileName}
              onChange={e => setNewFileName(e.target.value)}
              style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px' }}
            />
            <select
              value={newSchemaType}
              onChange={e => setNewSchemaType(e.target.value as 'cube' | 'view')}
              style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px' }}
            >
              <option value="cube">cube</option>
              <option value="view">view</option>
            </select>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowCreate(false)} style={{ border: `1px solid ${C.border}`, background: C.surfaceAlt, borderRadius: 8, padding: '7px 11px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleCreate} disabled={creating} style={{ border: 'none', background: C.black, color: '#fff', borderRadius: 8, padding: '7px 11px', cursor: 'pointer', opacity: creating ? 0.7 : 1 }}>
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

