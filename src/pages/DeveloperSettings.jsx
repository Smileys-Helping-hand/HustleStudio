import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiKey, FiCopy, FiTrash2, FiAlertCircle, FiCheck, FiCode, FiExternalLink } from 'react-icons/fi';
import { useTenant } from '../context/TenantContext.jsx';
import { toast } from 'react-hot-toast';
import {
  createApiKey,
  listApiKeys,
  deleteApiKey,
  API_SCOPES,
} from '../lib/apiKeys.js';

export default function DeveloperSettings() {
  const { activeTenantId, activeMembership } = useTenant();
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [newKey, setNewKey] = useState(null);
  
  // New key form state
  const [keyName, setKeyName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState([]);
  const [environment, setEnvironment] = useState('live');
  const [creating, setCreating] = useState(false);

  const canManageKeys = ['Owner', 'Admin', 'owner', 'admin'].includes(activeMembership?.role ?? '');

  useEffect(() => {
    if (activeTenantId && canManageKeys) {
      loadKeys();
    }
  }, [activeTenantId, canManageKeys]);

  const loadKeys = async () => {
    try {
      setLoading(true);
      const keys = await listApiKeys(activeTenantId);
      setApiKeys(keys);
    } catch (error) {
      console.error('[Developer] Failed to load API keys', error);
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async (e) => {
    e.preventDefault();
    if (!keyName.trim()) {
      toast.error('Please enter a key name');
      return;
    }
    if (selectedScopes.length === 0) {
      toast.error('Please select at least one scope');
      return;
    }

    try {
      setCreating(true);
      const result = await createApiKey({
        tenantId: activeTenantId,
        name: keyName,
        scopes: selectedScopes,
        environment,
      });
      
      setNewKey(result);
      setKeyName('');
      setSelectedScopes([]);
      setEnvironment('live');
      await loadKeys();
      toast.success('API key created successfully');
    } catch (error) {
      console.error('[Developer] Failed to create API key', error);
      toast.error('Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteKey = async (keyId, keyName) => {
    if (!window.confirm(`Delete API key "${keyName}"? This cannot be undone and will break any integrations using this key.`)) {
      return;
    }

    try {
      await deleteApiKey(keyId);
      await loadKeys();
      toast.success('API key deleted');
    } catch (error) {
      console.error('[Developer] Failed to delete API key', error);
      toast.error('Failed to delete API key');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const toggleScope = (scope) => {
    setSelectedScopes(prev =>
      prev.includes(scope)
        ? prev.filter(s => s !== scope)
        : [...prev, scope]
    );
  };

  if (!canManageKeys) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0e0e18] to-[#1b1830] px-6 pb-24 pt-8 text-white sm:px-10 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-6">
            <div className="flex items-start gap-3">
              <FiAlertCircle className="mt-1 text-xl text-yellow-400" />
              <div>
                <h3 className="font-semibold text-yellow-100">Access Restricted</h3>
                <p className="mt-1 text-sm text-yellow-200/80">
                  Only workspace owners and administrators can manage API keys and developer settings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0e0e18] to-[#1b1830] px-6 pb-24 pt-8 text-white sm:px-10 lg:px-12">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold">Developer Settings</h1>
          <p className="mt-2 text-white/70">
            Manage API keys and integrations for Hustle Connect
          </p>
        </div>

        {/* API Documentation Card */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-6 shadow-lg backdrop-blur"
        >
          <div className="flex items-start gap-4">
            <FiCode className="text-2xl text-indigo-400" />
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-indigo-100">Hustle Connect API</h2>
              <p className="mt-2 text-sm text-indigo-200/80">
                Connect external applications to Hustle Studio. Use API keys to securely access your business data
                from WorkspaceOS and other integrated apps.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <span className="rounded-lg border border-indigo-400/30 bg-indigo-500/20 px-3 py-1.5 text-xs font-medium text-indigo-200">
                  GET /api/v1/business-health
                </span>
                <span className="rounded-lg border border-indigo-400/30 bg-indigo-500/20 px-3 py-1.5 text-xs font-medium text-indigo-200">
                  POST /api/v1/invoices/draft
                </span>
                <span className="rounded-lg border border-indigo-400/30 bg-indigo-500/20 px-3 py-1.5 text-xs font-medium text-indigo-200">
                  GET /api/v1/clients
                </span>
              </div>
            </div>
          </div>
        </motion.section>

        {/* API Keys Section */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FiKey className="text-2xl text-purple-400" />
              <div>
                <h2 className="text-xl font-semibold">API Keys</h2>
                <p className="text-sm text-white/60">Manage access tokens for external integrations</p>
              </div>
            </div>
            <button
              onClick={() => setShowNewKeyModal(true)}
              className="flex items-center gap-2 rounded-lg bg-purple-500 px-4 py-2 text-sm font-medium transition hover:bg-purple-600"
            >
              <FiKey /> Generate New Key
            </button>
          </div>

          {/* API Keys List */}
          <div className="mt-6 space-y-3">
            {loading ? (
              <div className="text-center text-sm text-white/50">Loading keys...</div>
            ) : apiKeys.length === 0 ? (
              <div className="text-center py-8">
                <FiKey className="mx-auto text-4xl text-white/20" />
                <p className="mt-3 text-sm text-white/50">No API keys yet</p>
                <p className="mt-1 text-xs text-white/40">Create your first key to start integrating</p>
              </div>
            ) : (
              apiKeys.map((key) => (
                <motion.div
                  key={key.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className="font-medium">{key.name}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        key.environment === 'test'
                          ? 'bg-yellow-500/20 text-yellow-300'
                          : 'bg-green-500/20 text-green-300'
                      }`}>
                        {key.environment}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-sm text-white/50">{key.keyPreview}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {key.scopes?.map(scope => (
                        <span key={scope} className="rounded bg-purple-500/20 px-2 py-0.5 text-xs text-purple-300">
                          {API_SCOPES[scope]?.label || scope}
                        </span>
                      ))}
                    </div>
                    {key.lastUsed && (
                      <p className="mt-2 text-xs text-white/40">
                        Last used: {new Date(key.lastUsed?.seconds * 1000).toLocaleDateString()}
                        {key.usageCount > 0 && ` • ${key.usageCount.toLocaleString()} requests`}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteKey(key.id, key.name)}
                    className="ml-4 text-red-400/70 transition hover:text-red-400"
                    title="Delete key"
                  >
                    <FiTrash2 className="text-lg" />
                  </button>
                </motion.div>
              ))
            )}
          </div>
        </motion.section>

        {/* Deep Link Documentation */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur"
        >
          <div className="flex items-center gap-3">
            <FiExternalLink className="text-2xl text-cyan-400" />
            <h2 className="text-xl font-semibold">Deep Links</h2>
          </div>
          <p className="mt-2 text-sm text-white/60">
            Pre-fill forms and workflows with URL parameters
          </p>
          <div className="mt-4 rounded-lg border border-white/10 bg-black/30 p-4 font-mono text-sm">
            <p className="text-cyan-300">/link/invoice-builder?project=Unity&hours=20&rate=50</p>
          </div>
          <p className="mt-3 text-xs text-white/50">
            Available parameters: project, client, hours, rate, description, dueDate
          </p>
        </motion.section>
      </div>

      {/* New Key Modal */}
      <AnimatePresence>
        {showNewKeyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => !newKey && !creating && setShowNewKeyModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0e0e18] p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {newKey ? (
                // Show the generated key (once)
                <div>
                  <div className="flex items-center gap-3 text-green-400">
                    <FiCheck className="text-2xl" />
                    <h2 className="text-2xl font-bold">API Key Created</h2>
                  </div>
                  <p className="mt-3 text-sm text-white/70">
                    Make sure to copy your API key now. You won't be able to see it again!
                  </p>
                  
                  <div className="mt-6 rounded-lg border border-purple-500/30 bg-purple-500/10 p-4">
                    <div className="flex items-center justify-between">
                      <code className="flex-1 break-all font-mono text-sm text-purple-200">{newKey.key}</code>
                      <button
                        onClick={() => copyToClipboard(newKey.key)}
                        className="ml-3 rounded-lg bg-purple-500 p-2 transition hover:bg-purple-600"
                        title="Copy to clipboard"
                      >
                        <FiCopy />
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setNewKey(null);
                        setShowNewKeyModal(false);
                      }}
                      className="rounded-lg bg-white/10 px-6 py-2.5 font-medium transition hover:bg-white/20"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                // New key form
                <form onSubmit={handleCreateKey}>
                  <h2 className="text-2xl font-bold">Generate New API Key</h2>
                  <p className="mt-2 text-sm text-white/70">
                    Create a new API key with specific permissions
                  </p>

                  <div className="mt-6 space-y-5">
                    {/* Key Name */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-white/80">
                        Key Name
                      </label>
                      <input
                        type="text"
                        value={keyName}
                        onChange={(e) => setKeyName(e.target.value)}
                        placeholder="e.g., Production WorkspaceOS"
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-white/40 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20"
                        required
                      />
                    </div>

                    {/* Environment */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-white/80">
                        Environment
                      </label>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setEnvironment('live')}
                          className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition ${
                            environment === 'live'
                              ? 'border-green-400 bg-green-500/20 text-green-100'
                              : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20'
                          }`}
                        >
                          Live
                        </button>
                        <button
                          type="button"
                          onClick={() => setEnvironment('test')}
                          className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition ${
                            environment === 'test'
                              ? 'border-yellow-400 bg-yellow-500/20 text-yellow-100'
                              : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20'
                          }`}
                        >
                          Test
                        </button>
                      </div>
                    </div>

                    {/* Scopes */}
                    <div>
                      <label className="mb-3 block text-sm font-medium text-white/80">
                        Permissions (Scopes)
                      </label>
                      <div className="space-y-2">
                        {Object.entries(API_SCOPES).map(([scope, info]) => (
                          <label
                            key={scope}
                            className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-3 transition hover:border-white/20 hover:bg-white/10"
                          >
                            <input
                              type="checkbox"
                              checked={selectedScopes.includes(scope)}
                              onChange={() => toggleScope(scope)}
                              className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/10 text-purple-500 focus:ring-2 focus:ring-purple-400/20"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-white">{info.label}</p>
                              <p className="text-xs text-white/50">{info.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowNewKeyModal(false)}
                      disabled={creating}
                      className="rounded-lg bg-white/10 px-6 py-2.5 font-medium transition hover:bg-white/20 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creating || selectedScopes.length === 0}
                      className="rounded-lg bg-purple-500 px-6 py-2.5 font-medium transition hover:bg-purple-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {creating ? 'Generating...' : 'Generate Key'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
