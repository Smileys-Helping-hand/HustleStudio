import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCheck } from 'react-icons/fi';
import { useTenant } from '../context/TenantContext.jsx';

const WorkspaceModal = ({ isOpen, onClose }) => {
  const { createTenant } = useTenant();
  const [formData, setFormData] = useState({
    name: '',
    accent: '#6366f1',
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const colorPresets = [
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#10b981' },
    { name: 'Orange', value: '#f97316' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Please enter a workspace name');
      return;
    }

    setCreating(true);
    try {
      console.log('[WorkspaceModal] Submitting workspace creation:', formData);
      const tenantId = await createTenant({
        name: formData.name.trim(),
        accent: formData.accent,
      });
      console.log('[WorkspaceModal] Workspace created successfully:', tenantId);
      setFormData({ name: '', accent: '#6366f1' });
      setError('');
      onClose();
    } catch (err) {
      console.error('[WorkspaceModal] Failed to create workspace', err);
      setError(err.message || 'Failed to create workspace. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)' }}>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a1a2e] to-[#16213e] p-6 shadow-2xl"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 text-white/60 transition hover:text-white"
          >
            <FiX size={20} />
          </button>

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white">Create Workspace</h2>
            <p className="mt-2 text-sm text-white/60">
              Set up a new workspace to organize your projects and team
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Workspace Name */}
            <div>
              <label htmlFor="workspace-name" className="block text-sm font-medium text-white/80">
                Workspace Name <span className="text-red-400">*</span>
              </label>
              <input
                id="workspace-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., My Business, Acme Corp, etc."
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
                disabled={creating}
                autoFocus
              />
            </div>

            {/* Theme Color */}
            <div>
              <label className="block text-sm font-medium text-white/80">Theme Color</label>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {colorPresets.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, accent: color.value }))}
                    className="group relative overflow-hidden rounded-lg border-2 transition"
                    style={{
                      borderColor: formData.accent === color.value ? color.value : 'transparent',
                      backgroundColor: `${color.value}20`,
                    }}
                    disabled={creating}
                  >
                    <div
                      className="flex h-12 items-center justify-center text-sm font-medium text-white"
                      style={{ backgroundColor: color.value }}
                    >
                      {color.name}
                      {formData.accent === color.value && (
                        <FiCheck className="ml-2" size={16} />
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="color"
                  value={formData.accent}
                  onChange={(e) => setFormData(prev => ({ ...prev, accent: e.target.value }))}
                  className="h-10 w-16 cursor-pointer rounded border border-white/10 bg-white/5"
                  disabled={creating}
                />
                <span className="text-sm text-white/60">Custom color</span>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={creating}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || !formData.name.trim()}
                className="flex-1 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-3 text-sm font-semibold text-white transition hover:from-indigo-600 hover:to-purple-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Workspace'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default WorkspaceModal;
