import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Settings, Save, Upload, Download, RefreshCw } from 'lucide-react';
import { clearAllTransactions, clearAllBudgets, clearAllSettings, createBackup, restoreFromBackup, type BackupData } from '../services/db';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tags: string[];
  names: string[];
  onSave: (tags: string[], names: string[]) => void;
  onFlush?: () => void;
}

export function SettingsModal({ isOpen, onClose, tags: initialTags, names: initialNames, onSave, onFlush }: SettingsModalProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [names, setNames] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [newName, setNewName] = useState('');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('replace');
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTags(initialTags);
      setNames(initialNames);
    }
  }, [isOpen, initialTags, initialNames]);

  const addTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags(prev => [...prev, trimmed].sort());
      setNewTag('');
    }
  };

  const addName = () => {
    const trimmed = newName.trim();
    if (trimmed && !names.includes(trimmed)) {
      setNames(prev => [...prev, trimmed].sort());
      setNewName('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  };

  const removeName = (name: string) => {
    setNames(prev => prev.filter(n => n !== name));
  };

  const handleSave = () => {
    onSave(tags, names);
    onClose();
  };

  const handleFlushData = async () => {
    if (window.confirm('Are you sure you want to delete ALL data? This includes transactions, budgets, tags, and person names. This cannot be undone.')) {
      await clearAllTransactions();
      await clearAllBudgets();
      await clearAllSettings();
      // Force full page reload to reset everything
      window.location.reload();
    }
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      console.log('Starting backup creation...');
      const backupData = await createBackup();
      console.log('Backup data created:', backupData);
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      console.log('Blob created, size:', blob.size);
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expense-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
      
      // Use appendChild + click + removeChild for better browser support
      document.body.appendChild(a);
      
      // Try click with timeout to ensure it works
      setTimeout(() => {
        try {
          a.click();
          console.log('Download triggered');
        } catch (e) {
          console.error('Click failed:', e);
          // Fallback: create link and click
          const link = document.createElement('a');
          link.href = url;
          link.download = `expense-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
          link.click();
        }
      }, 100);
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('Cleanup done');
      }, 200);
    } catch (error) {
      console.error('Failed to create backup:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to create backup: ${errorMessage}\n\nPlease check the browser console for more details.`);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreClick = () => {
    setShowRestoreConfirm(true);
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const backupData = JSON.parse(text) as BackupData;
      
      // Validate backup data structure
      if (!backupData.version || !backupData.transactions || !backupData.settings) {
        throw new Error('Invalid backup file format');
      }

      setIsRestoring(true);
      await restoreFromBackup(backupData, restoreMode);
      
      alert(`Successfully restored ${backupData.transactions.length} transactions from backup.`);
      onFlush?.();
      onClose();
    } catch (error) {
      console.error('Failed to restore backup:', error);
      alert('Failed to restore backup. Please check the file format.');
    } finally {
      setIsRestoring(false);
      setShowRestoreConfirm(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-6">
          {/* Backup & Restore Section */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Backup & Restore</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Export your data as a JSON file or restore from a backup.
            </p>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleBackup}
                disabled={isBackingUp}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {isBackingUp ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Backup Data
              </button>
              
              <button
                onClick={handleRestoreClick}
                disabled={isRestoring}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {isRestoring ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Restore
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleRestoreFile}
                className="hidden"
              />
            </div>

            {/* Restore Confirmation Modal */}
            {showRestoreConfirm && (
              <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Select Restore Mode</h4>
                
                <div className="space-y-2 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="restoreMode"
                      value="replace"
                      checked={restoreMode === 'replace'}
                      onChange={() => setRestoreMode('replace')}
                      className="w-4 h-4 text-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      <strong>Complete Replace</strong> - Delete all existing data and replace with backup
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="restoreMode"
                      value="merge"
                      checked={restoreMode === 'merge'}
                      onChange={() => setRestoreMode('merge')}
                      className="w-4 h-4 text-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      <strong>Merge</strong> - Add backup data to existing data (skip duplicates)
                    </span>
                  </label>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowRestoreConfirm(false);
                      fileInputRef.current?.click();
                    }}
                    className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    Choose Backup File
                  </button>
                  <button
                    onClick={() => setShowRestoreConfirm(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tags and Names Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tags Section */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Tags</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Predefined tags for transactions. Only these tags can be used.
              </p>
              
              {/* Add Tag */}
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTag()}
                  placeholder="Add new tag..."
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={addTag}
                  disabled={!newTag.trim()}
                  className="px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Tags List */}
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                {tags.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">No tags configured</p>
                ) : (
                  tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Names Section */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Person Names</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Predefined names for transactions. Only these names can be used.
              </p>
              
              {/* Add Name */}
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addName()}
                  placeholder="Add new name..."
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={addName}
                  disabled={!newName.trim()}
                  className="px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Names List */}
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                {names.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">No names configured</p>
                ) : (
                  names.map(name => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm"
                    >
                      {name}
                      <button
                        onClick={() => removeName(name)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={handleFlushData}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Flush All Data
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

