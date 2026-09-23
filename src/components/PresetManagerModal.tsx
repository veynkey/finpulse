import { useState } from 'react';
import { BUILTIN_WORKSPACE_PRESETS, type WorkspacePresetConfig } from '../config/workspacePresets';
import {
  Layout,
  Save,
  Trash2,
  Check,
  X,
  Bookmark,
  RotateCcw,
  Download,
  Upload,
  Copy,
} from 'lucide-react';

interface PresetManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPresetId: string;
  onSelectPreset: (preset: WorkspacePresetConfig) => void;
  onSaveCurrentAsPreset: (name: string) => void;
  customPresets: WorkspacePresetConfig[];
  onDeleteCustomPreset: (id: string) => void;
  onDuplicatePreset: (preset: WorkspacePresetConfig) => void;
  onImportPreset: (jsonString: string) => boolean;
  onResetToDefault: () => void;
  getCurrentLayoutJson: () => string;
}

export default function PresetManagerModal({
  isOpen,
  onClose,
  currentPresetId,
  onSelectPreset,
  onSaveCurrentAsPreset,
  customPresets,
  onDeleteCustomPreset,
  onDuplicatePreset,
  onImportPreset,
  onResetToDefault,
  getCurrentLayoutJson,
}: PresetManagerModalProps) {
  const [newPresetName, setNewPresetName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [copiedNotification, setCopiedNotification] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;
    onSaveCurrentAsPreset(newPresetName.trim());
    setNewPresetName('');
    setIsSaving(false);
  };

  const handleExportJson = () => {
    try {
      const json = getCurrentLayoutJson();
      navigator.clipboard.writeText(json);
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2500);
    } catch {
      // Safe ignore
    }
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setImportError(null);
    const success = onImportPreset(importJsonText);
    if (success) {
      setImportJsonText('');
      setIsImporting(false);
      onClose();
    } else {
      setImportError('Invalid workspace JSON schema. Please ensure valid FlexLayout JSON.');
    }
  };

  const allPresets = [...BUILTIN_WORKSPACE_PRESETS, ...customPresets];
  const activePreset = allPresets.find((p) => p.id === currentPresetId) || BUILTIN_WORKSPACE_PRESETS[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111319] border border-border/80 rounded-lg shadow-2xl w-full max-w-xl max-h-[88vh] flex flex-col overflow-hidden text-xs font-mono">
        {/* Header */}
        <div className="p-3 bg-[#151922] border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layout size={16} className="text-accent" />
            <span className="font-bold text-text text-sm">WORKSPACE PRESET & LAYOUT MANAGER</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-text p-1 rounded"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="p-3 overflow-y-auto space-y-4 flex-grow">
          {/* Active Preset Banner */}
          <div className="bg-[#151923] p-2.5 rounded border border-border/60 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-muted uppercase">Active Workstation Preset</div>
              <div className="text-text font-bold text-sm">
                {activePreset.name}
              </div>
              <div className="text-muted text-[10px]">{activePreset.description}</div>
            </div>
            <button
              type="button"
              onClick={() => {
                onResetToDefault();
                onClose();
              }}
              className="flex items-center space-x-1 px-2.5 py-1 bg-surface hover:bg-surface-hover text-muted hover:text-text rounded border border-border/50 text-[10px] transition-colors"
            >
              <RotateCcw size={11} />
              <span>Reset Clean Default</span>
            </button>
          </div>

          {/* Export & Import Action Bar */}
          <div className="flex items-center space-x-2 bg-[#0c0e14] p-2 rounded border border-border/40">
            <button
              type="button"
              onClick={handleExportJson}
              className="flex items-center space-x-1 px-2.5 py-1 bg-surface hover:bg-surface-hover text-text rounded text-[10px] font-semibold border border-border/50 transition-colors"
              title="Export current workspace JSON to clipboard"
            >
              <Download size={11} className="text-accent" />
              <span>{copiedNotification ? 'Copied to Clipboard!' : 'Export Layout JSON'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsImporting(!isImporting)}
              className="flex items-center space-x-1 px-2.5 py-1 bg-surface hover:bg-surface-hover text-text rounded text-[10px] font-semibold border border-border/50 transition-colors"
              title="Import workspace layout from JSON"
            >
              <Upload size={11} className="text-warning" />
              <span>Import Layout JSON</span>
            </button>
          </div>

          {/* Import JSON Form */}
          {isImporting && (
            <form onSubmit={handleImportSubmit} className="bg-[#151924] p-3 rounded border border-warning/60 space-y-2">
              <div className="text-[10px] text-text font-semibold flex items-center justify-between">
                <span>Paste FlexLayout Workspace JSON:</span>
                <button
                  type="button"
                  onClick={() => setIsImporting(false)}
                  className="text-muted hover:text-text"
                >
                  Cancel
                </button>
              </div>
              <textarea
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder='{"global": {...}, "layout": {...}}'
                rows={4}
                className="w-full bg-[#0a0c10] border border-border/70 rounded p-2 text-[10px] text-text font-mono focus:outline-none focus:border-accent"
              />
              {importError && <div className="text-down text-[10px]">{importError}</div>}
              <button
                type="submit"
                disabled={!importJsonText.trim()}
                className="px-3 py-1 bg-warning hover:bg-warning/80 text-black font-bold rounded text-[10px] transition-colors disabled:opacity-40"
              >
                Apply Imported Workspace
              </button>
            </form>
          )}

          {/* Built-in Presets */}
          <div className="space-y-1.5">
            <div className="text-[10px] text-muted uppercase font-bold tracking-wider">
              Standard Professional Desks ({BUILTIN_WORKSPACE_PRESETS.length})
            </div>
            <div className="space-y-1">
              {BUILTIN_WORKSPACE_PRESETS.map((preset) => {
                const isActive = preset.id === currentPresetId;
                return (
                  <div
                    key={preset.id}
                    className={`p-2 rounded border flex items-center justify-between transition-colors ${
                      isActive
                        ? 'bg-accent/15 border-accent text-accent font-bold'
                        : 'bg-[#141720] border-border/60 hover:border-accent/50 text-text'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Bookmark size={13} className={isActive ? 'text-accent' : 'text-muted'} />
                      <div>
                        <div>{preset.name}</div>
                        <div className="text-[9px] text-muted font-normal">{preset.description}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectPreset(preset);
                          onClose();
                        }}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold transition-colors ${
                          isActive
                            ? 'bg-accent text-white'
                            : 'bg-surface hover:bg-accent/20 text-muted hover:text-accent'
                        }`}
                      >
                        {isActive ? 'Active' : 'Load Desk'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Saved Presets */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted uppercase font-bold tracking-wider">
                Saved User Desks ({customPresets.length})
              </span>
              {!isSaving && (
                <button
                  type="button"
                  onClick={() => setIsSaving(true)}
                  className="flex items-center space-x-1 text-accent hover:text-accent/80 text-[10px] font-bold"
                >
                  <Save size={11} />
                  <span>Save Current Workspace</span>
                </button>
              )}
            </div>

            {isSaving && (
              <form onSubmit={handleSave} className="bg-[#141720] p-2.5 rounded border border-accent/60 space-y-2">
                <div className="text-[10px] text-muted">Enter desk name:</div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="e.g. Multi-Monitor Order Flow Desk"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    autoFocus
                    className="flex-grow bg-[#0c0e13] border border-border/70 rounded px-2 py-1 text-xs text-text focus:outline-none focus:border-accent"
                  />
                  <button
                    type="submit"
                    disabled={!newPresetName.trim()}
                    className="bg-accent hover:bg-accent/80 disabled:opacity-40 text-white font-bold px-3 py-1 rounded text-xs transition-colors flex items-center space-x-1"
                  >
                    <Check size={12} />
                    <span>Save</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSaving(false)}
                    className="bg-surface hover:bg-surface-hover text-muted hover:text-text px-2 py-1 rounded text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {customPresets.length === 0 ? (
              <div className="p-3 bg-[#0c0e13] rounded border border-border/40 text-center text-muted text-[11px]">
                No custom desks saved yet. Customize your workspace docking layout and click &quot;Save Current Workspace&quot;.
              </div>
            ) : (
              <div className="space-y-1">
                {customPresets.map((preset) => {
                  const isActive = preset.id === currentPresetId;
                  return (
                    <div
                      key={preset.id}
                      className={`p-2 rounded border flex items-center justify-between transition-colors ${
                        isActive
                          ? 'bg-accent/15 border-accent text-accent font-bold'
                          : 'bg-[#141720] border-border/60 hover:border-accent/50 text-text'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <Bookmark size={13} className={isActive ? 'text-accent' : 'text-muted'} />
                        <div>
                          <div>{preset.name}</div>
                          <div className="text-[9px] text-muted font-normal">Custom User Preset</div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectPreset(preset);
                            onClose();
                          }}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold transition-colors ${
                            isActive
                              ? 'bg-accent text-white'
                              : 'bg-surface hover:bg-accent/20 text-muted hover:text-accent'
                          }`}
                        >
                          {isActive ? 'Active' : 'Load Desk'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDuplicatePreset(preset)}
                          className="p-1 rounded text-muted hover:text-text hover:bg-surface transition-colors"
                          title="Duplicate Desk"
                        >
                          <Copy size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteCustomPreset(preset.id)}
                          className="p-1 rounded text-muted hover:text-down hover:bg-down/10 transition-colors"
                          title="Delete Custom Desk"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-2.5 bg-[#151922] border-t border-border/60 flex items-center justify-between text-[10px] text-muted">
          <span>Desk arrangements persist automatically to local storage with schema version 2.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-surface hover:bg-surface-hover text-text rounded font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
