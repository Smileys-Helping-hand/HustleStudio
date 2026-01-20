import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiUsers, FiKey, FiDatabase, FiBell, FiDownload, FiTrash2, FiSave, FiCode, FiCpu } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../theme/ThemeContext.jsx';
import { themes } from '../theme/themes.js';
import { useTenant } from '../context/TenantContext.jsx';
import { toast } from 'react-hot-toast';
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { useNavigate } from 'react-router-dom';
import AIProviderStatus from '../components/AIProviderStatus.jsx';

export default function Settings() {
  const { user, role } = useAuth();
  const { themeKey, setTheme, cycleTheme } = useTheme();
  const themeOptions = Object.entries(themes);
  const { activeTenant, activeTenantId, activeMembership, updateTelemetryPreference, updateWorkspace } = useTenant();
  const [telemetryEnabled, setTelemetryEnabled] = useState(activeTenant?.telemetryEnabled ?? true);
  const [isSavingTelemetry, setIsSavingTelemetry] = useState(false);
  const [isSavingWorkspace, setIsSavingWorkspace] = useState(false);
  const navigate = useNavigate();
  
  // Workspace settings
  const [workspaceName, setWorkspaceName] = useState(activeTenant?.name || '');
  
  // Team members
  const [members, setMembers] = useState([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  
  // Notifications
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  
  // API Keys
  const [apiKeys, setApiKeys] = useState([]);
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');

  useEffect(() => {
    setTelemetryEnabled(activeTenant?.telemetryEnabled ?? true);
    setWorkspaceName(activeTenant?.name || '');
    if (activeTenantId) {
      loadMembers();
      loadApiKeys();
    }
  }, [activeTenant?.telemetryEnabled, activeTenant?.id, activeTenant?.name, activeTenantId]);

  const canManageTelemetry = ['Owner', 'Admin', 'owner', 'admin'].includes(
    activeMembership?.role ?? role ?? ''
  );

  const loadMembers = async () => {
    if (!activeTenantId) return;
    try {
      const snapshot = await getDocs(collection(db, 'tenants', activeTenantId, 'members'));
      setMembers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error('[Settings] Failed to load members', error);
    }
  };

  const loadApiKeys = async () => {
    if (!activeTenantId) return;
    try {
      const snapshot = await getDocs(collection(db, 'tenants', activeTenantId, 'apiKeys'));
      setApiKeys(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error('[Settings] Failed to load API keys', error);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberEmail.trim() || !activeTenantId) return;
    
    try {
      await addDoc(collection(db, 'tenants', activeTenantId, 'members'), {
        email: newMemberEmail,
        role: 'Member',
        addedAt: serverTimestamp(),
      });
      toast.success('Member added');
      setNewMemberEmail('');
      loadMembers();
    } catch (error) {
      console.error('[Settings] Failed to add member', error);
      toast.error('Failed to add member');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      await deleteDoc(doc(db, 'tenants', activeTenantId, 'members', memberId));
      toast.success('Member removed');
      loadMembers();
    } catch (error) {
      console.error('[Settings] Failed to remove member', error);
      toast.error('Failed to remove member');
    }
  };

  const handleCreateApiKey = async (e) => {
    e.preventDefault();
    if (!newKeyName.trim() || !activeTenantId) return;
    
    try {
      const key = 'hs_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      await addDoc(collection(db, 'tenants', activeTenantId, 'apiKeys'), {
        name: newKeyName,
        key,
        createdAt: serverTimestamp(),
      });
      toast.success('API key created');
      setNewKeyName('');
      setShowNewKeyForm(false);
      loadApiKeys();
    } catch (error) {
      console.error('[Settings] Failed to create API key', error);
      toast.error('Failed to create API key');
    }
  };

  const handleDeleteApiKey = async (keyId) => {
    if (!window.confirm('Delete this API key? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'tenants', activeTenantId, 'apiKeys', keyId));
      toast.success('API key deleted');
      loadApiKeys();
    } catch (error) {
      console.error('[Settings] Failed to delete API key', error);
      toast.error('Failed to delete API key');
    }
  };

  const handleTelemetryToggle = async () => {
    if (!canManageTelemetry) {
      toast.error('Only workspace admins can change telemetry preferences.');
      return;
    }
    try {
      setIsSavingTelemetry(true);
      const nextValue = !telemetryEnabled;
      setTelemetryEnabled(nextValue);
      await updateTelemetryPreference(nextValue);
    } catch (error) {
      console.error('[Settings] Unable to update telemetry preference.', error);
      setTelemetryEnabled((current) => !current);
    } finally {
      setIsSavingTelemetry(false);
    }
  };

  const handleExportData = () => {
    toast.success('Exporting workspace data...');
    // TODO: Implement data export
  };

  const handleSaveWorkspace = async () => {
    if (!activeTenantId) {
      toast.error('Select a workspace first.');
      return;
    }
    if (!workspaceName.trim()) {
      toast.error('Workspace name is required.');
      return;
    }
    try {
      setIsSavingWorkspace(true);
      await updateWorkspace({ name: workspaceName.trim() });
    } catch (error) {
      console.error('[Settings] Failed to save workspace name', error);
      toast.error('Failed to save workspace settings');
    } finally {
      setIsSavingWorkspace(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0e0e18] to-[#1b1830] px-6 pb-24 pt-8 text-white sm:px-10 lg:px-12">
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <h1 className="text-4xl font-bold">Workspace Settings</h1>
          <p className="mt-2 text-white/70">
            Manage your workspace, team, integrations, and preferences.
          </p>
        </div>

        {/* Profile Section */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur"
        >
          <h2 className="text-xl font-semibold">Profile</h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-white/50">Email</p>
              <p className="mt-2 text-lg">{user?.email}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-white/50">Role</p>
              <p className="mt-2 text-lg capitalize">{role}</p>
            </div>
          </div>
        </motion.section>

        {/* Workspace Settings */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Workspace</h2>
            <button
              onClick={handleSaveWorkspace}
              disabled={isSavingWorkspace || !workspaceName.trim() || workspaceName === activeTenant?.name}
              className="flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-2.5 font-medium transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiSave size={16} />
              {isSavingWorkspace ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
          <div className="mt-4">
            <label htmlFor="workspace-name" className="block text-sm font-medium text-white/80">
              Workspace Name
            </label>
            <input
              id="workspace-name"
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="Enter workspace name..."
              className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-white/40 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
            />
          </div>
        </motion.section>

        {/* AI Provider Configuration */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur"
        >
          <div className="flex items-center gap-3">
            <FiCpu className="text-2xl text-purple-400" />
            <h2 className="text-xl font-semibold">AI Configuration</h2>
          </div>
          <div className="mt-4">
            <AIProviderStatus />
          </div>
        </motion.section>

        {/* Theme Section */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur"
        >
          <h2 className="text-xl font-semibold">Theme</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {themeOptions.map(([key, value]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTheme(key)}
                className={`rounded-lg border px-5 py-2.5 text-sm font-medium transition ${
                  key === themeKey
                    ? 'border-indigo-400 bg-indigo-500/20 text-white'
                    : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white'
                }`}
              >
                {value.name === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </button>
            ))}
            <button
              type="button"
              onClick={cycleTheme}
              className="rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/70 transition hover:border-white/20 hover:text-white"
            >
              Cycle Theme
            </button>
          </div>
        </motion.section>

        {/* Team Management */}
        {canManageTelemetry && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur"
          >
            <div className="flex items-center gap-3">
              <FiUsers className="text-2xl text-indigo-400" />
              <h2 className="text-xl font-semibold">Team Members</h2>
            </div>
            
            <form onSubmit={handleAddMember} className="mt-4 flex gap-3">
              <input
                type="email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                placeholder="Enter email to add member..."
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-white/40 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
              />
              <button
                type="submit"
                className="rounded-lg bg-indigo-500 px-5 py-2.5 font-medium transition hover:bg-indigo-600"
              >
                Add
              </button>
            </form>

            <div className="mt-4 space-y-2">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4">
                  <div>
                    <p className="font-medium">{member.email}</p>
                    <p className="text-sm text-white/50">{member.role}</p>
                  </div>
                  {member.email !== user?.email && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-red-400/70 transition hover:text-red-400"
                    >
                      <FiTrash2 />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* API Keys */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-6 shadow-lg backdrop-blur"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FiCode className="text-2xl text-purple-400" />
              <div>
                <h2 className="text-xl font-semibold">Developer & API Settings</h2>
                <p className="text-sm text-white/60">Manage API keys and integrations</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/settings/developer')}
              className="rounded-lg bg-purple-500 px-4 py-2 text-sm font-medium transition hover:bg-purple-600"
            >
              Manage APIs
            </button>
          </div>

          <div className="mt-4 rounded-lg border border-purple-400/30 bg-purple-500/10 p-4">
            <p className="text-sm text-purple-200/80">
              <strong>Hustle Connect</strong> enables external apps like WorkspaceOS to securely access your business data.
              Create API keys with specific permissions to integrate with your workflows.
            </p>
          </div>
        </motion.section>

        {/* Legacy API Keys Section - Hidden, keeping for backward compatibility */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="hidden rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FiKey className="text-2xl text-purple-400" />
              <h2 className="text-xl font-semibold">API Keys</h2>
            </div>
            <button
              onClick={() => setShowNewKeyForm(!showNewKeyForm)}
              className="rounded-lg bg-purple-500 px-4 py-2 text-sm font-medium transition hover:bg-purple-600"
            >
              New Key
            </button>
          </div>

          {showNewKeyForm && (
            <form onSubmit={handleCreateApiKey} className="mt-4 flex gap-3">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Key name (e.g., Production API)"
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-white/40 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20"
              />
              <button
                type="submit"
                className="rounded-lg bg-purple-500 px-5 py-2.5 font-medium transition hover:bg-purple-600"
              >
                Create
              </button>
            </form>
          )}

          <div className="mt-4 space-y-2">
            {apiKeys.map((apiKey) => (
              <div key={apiKey.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4">
                <div>
                  <p className="font-medium">{apiKey.name}</p>
                  <p className="font-mono text-sm text-white/50">{apiKey.key}</p>
                </div>
                <button
                  onClick={() => handleDeleteApiKey(apiKey.id)}
                  className="text-red-400/70 transition hover:text-red-400"
                >
                  <FiTrash2 />
                </button>
              </div>
            ))}
            {apiKeys.length === 0 && !showNewKeyForm && (
              <p className="text-center text-sm text-white/50">No API keys yet</p>
            )}
          </div>
        </motion.section>

        {/* Notifications */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur"
        >
          <div className="flex items-center gap-3">
            <FiBell className="text-2xl text-yellow-400" />
            <h2 className="text-xl font-semibold">Notifications</h2>
          </div>
          
          <div className="mt-4 space-y-4">
            <label className="flex items-center justify-between">
              <span>Email notifications</span>
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                className="h-5 w-5 rounded border-white/20 bg-white/10 text-indigo-500 focus:ring-2 focus:ring-indigo-400/20"
              />
            </label>
            <label className="flex items-center justify-between">
              <span>Push notifications</span>
              <input
                type="checkbox"
                checked={pushNotifications}
                onChange={(e) => setPushNotifications(e.target.checked)}
                className="h-5 w-5 rounded border-white/20 bg-white/10 text-indigo-500 focus:ring-2 focus:ring-indigo-400/20"
              />
            </label>
          </div>
        </motion.section>

        {/* Data Management */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur"
        >
          <div className="flex items-center gap-3">
            <FiDatabase className="text-2xl text-green-400" />
            <h2 className="text-xl font-semibold">Data Management</h2>
          </div>
          
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleExportData}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 font-medium transition hover:border-white/20 hover:bg-white/10"
            >
              <FiDownload /> Export Data
            </button>
          </div>
        </motion.section>

        {/* Telemetry */}
        {canManageTelemetry && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Privacy & Telemetry</h2>
                <p className="mt-2 text-sm text-white/70">
                  Allow Hustle Studio to collect anonymized performance metrics for this workspace.
                </p>
              </div>
              <button
                type="button"
                onClick={handleTelemetryToggle}
                disabled={isSavingTelemetry}
                className={`flex items-center gap-3 rounded-lg border px-5 py-2.5 text-sm font-medium transition ${
                  telemetryEnabled
                    ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100'
                    : 'border-white/10 bg-white/5 text-white/70 hover:text-white'
                }`}
              >
                <span className="inline-flex h-5 w-10 items-center rounded-full bg-black/30">
                  <span
                    className={`h-4 w-4 rounded-full bg-white transition-all ${
                      telemetryEnabled ? 'translate-x-[18px]' : 'translate-x-1'
                    }`}
                  />
                </span>
                {telemetryEnabled ? 'Enabled' : 'Disabled'}
                {isSavingTelemetry && <span className="text-xs text-white/50">Saving…</span>}
              </button>
            </div>
          </motion.section>
        )}
      </div>
    </div>
  );
}
