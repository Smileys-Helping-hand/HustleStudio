import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiLock, FiShield, FiAlertTriangle, FiCheck, 
  FiSettings, FiKey, FiActivity, FiUsers,
  FiClock, FiInfo
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTenant } from '../../context/TenantContext.jsx';
import { collection, doc, getDoc, getDocs, addDoc, serverTimestamp, query, orderBy, limit, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase.js';

const SecurityCard = ({ title, description, children, icon: Icon }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 shadow-lg backdrop-blur-sm"
  >
    <div className="flex items-start gap-3 mb-4">
      <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
        <Icon className="text-xl text-indigo-400" />
      </div>
      <div className="flex-1">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm text-white/60">{description}</p>
      </div>
    </div>
    <div className="space-y-3">{children}</div>
  </motion.div>
);

const ToggleSwitch = ({ enabled, onChange, label, description }) => (
  <div className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-black/20 hover:bg-black/30 transition">
    <div className="flex-1">
      <p className="font-medium text-white">{label}</p>
      {description && <p className="text-xs text-white/50 mt-1">{description}</p>}
    </div>
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-indigo-500' : 'bg-white/20'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

export default function Security() {
  const { role, user } = useAuth();
  const { brand, activeTenantId } = useTenant();
  const [loading, setLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);

  // Security settings state
  const [settings, setSettings] = useState({
    ssoGoogle: false,
    ssoMicrosoft: false,
    require2FA: true,
    autoExpireSessions: true,
    sessionDays: 14,
    ipWhitelist: false,
    apiRateLimit: true,
    auditLogging: true,
    alertsEnabled: true,
    passwordMinLength: 8,
    requireStrongPassword: true,
  });

  useEffect(() => {
    loadSecuritySettings();
    loadAuditLogs();
  }, [activeTenantId]);

  const loadSecuritySettings = async () => {
    if (!activeTenantId) return;
    
    try {
      const settingsRef = doc(db, 'tenants', activeTenantId, 'settings', 'security');
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        setSettings((prev) => ({ ...prev, ...settingsSnap.data() }));
      }
    } catch (error) {
      console.error('[Security] Failed to load settings:', error);
    }
  };

  const loadAuditLogs = async () => {
    if (!activeTenantId) return;

    try {
      const logsQuery = query(
        collection(db, 'tenants', activeTenantId, 'auditLogs'),
        orderBy('timestamp', 'desc'),
        limit(10)
      );
      const snapshot = await getDocs(logsQuery);
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAuditLogs(logs);
    } catch (error) {
      console.error('[Security] Failed to load audit logs:', error);
    }
  };

  const updateSetting = async (key, value) => {
    if (!activeTenantId) {
      toast.error('No active workspace');
      return;
    }

    const previousValue = settings[key];
    setSettings((prev) => ({ ...prev, [key]: value }));

    try {
      const settingsRef = doc(db, 'tenants', activeTenantId, 'settings', 'security');
      await setDoc(
        settingsRef,
        {
          [key]: value,
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid,
        },
        { merge: true }
      );

      // Log the change
      await addDoc(collection(db, 'tenants', activeTenantId, 'auditLogs'), {
        type: 'security_setting_changed',
        action: `Changed ${key} to ${value}`,
        userId: user?.uid,
        userEmail: user?.email,
        timestamp: serverTimestamp(),
        details: { setting: key, value },
      });

      toast.success('Security setting updated');
      loadAuditLogs();
    } catch (error) {
      console.error('[Security] Failed to update setting:', error);
      toast.error('Failed to update setting');
      // Revert on error
      setSettings((prev) => ({ ...prev, [key]: previousValue }));
    }
  };

  const triggerTestAlert = async () => {
    setLoading(true);
    try {
      await addDoc(collection(db, 'tenants', activeTenantId, 'auditLogs'), {
        type: 'security_test_alert',
        action: 'Test security alert triggered',
        userId: user?.uid,
        userEmail: user?.email,
        timestamp: serverTimestamp(),
        severity: 'info',
      });

      toast.success('🚨 Test alert sent! Check your notifications.', { duration: 4000 });
      loadAuditLogs();
    } catch (error) {
      console.error('[Security] Test alert failed:', error);
      toast.error('Failed to send test alert');
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="px-4 pb-16">
      <PageHeader
        title="Enterprise Security"
        subtitle="Configure SSO, enforce 2FA, and audit access for your workspace"
      />

      <div className="mb-6 rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 p-4 flex items-start gap-3">
        <FiInfo className="text-indigo-400 text-xl flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-white/90">
            Signed in as <strong>{role}</strong> in the <strong>{brand?.name || 'Hustle Studio'}</strong> workspace.
          </p>
          <p className="text-sm text-white/60 mt-1">
            Security policies apply immediately to all members.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* SSO Configuration */}
        <SecurityCard 
          title="SSO Providers" 
          description="Enable Single Sign-On for workspace members"
          icon={FiKey}
        >
          <ToggleSwitch
            enabled={settings.ssoGoogle}
            onChange={() => updateSetting('ssoGoogle', !settings.ssoGoogle)}
            label="Google Workspace"
            description="Allow members to sign in with Google accounts"
          />
          <ToggleSwitch
            enabled={settings.ssoMicrosoft}
            onChange={() => updateSetting('ssoMicrosoft', !settings.ssoMicrosoft)}
            label="Microsoft Entra ID"
            description="Allow members to sign in with Microsoft accounts"
          />
          <div className="mt-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-xs text-blue-300">
              <FiShield className="inline mr-1" />
              Configure redirect URIs in your identity provider dashboard.
            </p>
          </div>
        </SecurityCard>

        {/* Authentication Policies */}
        <SecurityCard 
          title="Authentication" 
          description="Strengthen access with security policies"
          icon={FiLock}
        >
          <ToggleSwitch
            enabled={settings.require2FA}
            onChange={() => updateSetting('require2FA', !settings.require2FA)}
            label="Require 2FA for admins"
            description="Force two-factor authentication for admin users"
          />
          <ToggleSwitch
            enabled={settings.autoExpireSessions}
            onChange={() => updateSetting('autoExpireSessions', !settings.autoExpireSessions)}
            label={`Auto-expire sessions after ${settings.sessionDays} days`}
            description="Automatically log out inactive users"
          />
          <ToggleSwitch
            enabled={settings.requireStrongPassword}
            onChange={() => updateSetting('requireStrongPassword', !settings.requireStrongPassword)}
            label="Require strong passwords"
            description="Enforce password complexity requirements"
          />
        </SecurityCard>

        {/* API Security */}
        <SecurityCard 
          title="API Security" 
          description="Control API access and rate limiting"
          icon={FiSettings}
        >
          <ToggleSwitch
            enabled={settings.ipWhitelist}
            onChange={() => updateSetting('ipWhitelist', !settings.ipWhitelist)}
            label="IP Whitelist"
            description="Restrict API access to whitelisted IP ranges"
          />
          <ToggleSwitch
            enabled={settings.apiRateLimit}
            onChange={() => updateSetting('apiRateLimit', !settings.apiRateLimit)}
            label="Rate Limiting"
            description="Prevent API abuse with rate limits"
          />
          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <p className="text-xs text-white/70">
              <FiActivity className="inline mr-1" />
              Current rate limit: 100 requests/minute per API key
            </p>
          </div>
        </SecurityCard>

        {/* Incident Response */}
        <SecurityCard 
          title="Incident Response" 
          description="Automated alerts and monitoring"
          icon={FiAlertTriangle}
        >
          <ToggleSwitch
            enabled={settings.auditLogging}
            onChange={() => updateSetting('auditLogging', !settings.auditLogging)}
            label="Audit Logging"
            description="Log all sensitive actions for compliance"
          />
          <ToggleSwitch
            enabled={settings.alertsEnabled}
            onChange={() => updateSetting('alertsEnabled', !settings.alertsEnabled)}
            label="Security Alerts"
            description="Send notifications for security events"
          />
          <button
            onClick={triggerTestAlert}
            disabled={loading || !settings.alertsEnabled}
            className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-red-500 to-rose-500 text-white font-semibold hover:from-red-600 hover:to-rose-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Sending...
              </>
            ) : (
              <>
                <FiAlertTriangle />
                Trigger Test Alert
              </>
            )}
          </button>
        </SecurityCard>
      </div>

      {/* Audit Trail */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] overflow-hidden"
      >
        <div className="p-6 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <FiActivity className="text-2xl text-green-400" />
            <div>
              <h2 className="text-xl font-semibold text-white">Security Audit Trail</h2>
              <p className="text-sm text-white/60 mt-1">Recent security events and changes</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {auditLogs.length === 0 ? (
            <div className="text-center py-8 text-white/50">
              <FiShield className="inline text-4xl mb-2" />
              <p>No audit logs yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {auditLogs.map((log, index) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition"
                >
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <FiCheck className="text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white">{log.action}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-white/50">
                      <span className="flex items-center gap-1">
                        <FiUsers />
                        {log.userEmail || 'System'}
                      </span>
                      <span className="flex items-center gap-1">
                        <FiClock />
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          <div className="mt-4 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <p className="text-xs text-indigo-300">
              <FiInfo className="inline mr-1" />
              Detailed logs are stored for 90 days and available for compliance exports.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
