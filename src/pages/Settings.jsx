import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../theme/ThemeContext.jsx';
import { themes } from '../theme/themes.js';
import { useTenant } from '../context/TenantContext.jsx';
import { toast } from 'react-hot-toast';

export default function Settings() {
  const { user, role } = useAuth();
  const { themeKey, setTheme, cycleTheme } = useTheme();
  const themeOptions = Object.entries(themes);
  const { activeTenant, activeMembership, updateTelemetryPreference } = useTenant();
  const [telemetryEnabled, setTelemetryEnabled] = useState(activeTenant?.telemetryEnabled ?? true);
  const [isSavingTelemetry, setIsSavingTelemetry] = useState(false);

  useEffect(() => {
    setTelemetryEnabled(activeTenant?.telemetryEnabled ?? true);
  }, [activeTenant?.telemetryEnabled, activeTenant?.id]);

  const canManageTelemetry = ['Owner', 'Admin', 'owner', 'admin'].includes(
    activeMembership?.role ?? role ?? ''
  );

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-[var(--theme-text)]">Workspace preferences</h1>
        <p className="text-sm text-[color-mix(in_srgb,var(--theme-text)_60%,transparent)]">
          Tune the dashboard theme and review who has access to Hustle Studio.
        </p>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-white/10 bg-[var(--theme-surface)]/80 p-6 shadow-lg backdrop-blur"
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/50">Signed in</p>
            <p className="mt-2 text-lg font-semibold text-[var(--theme-text)]">{user?.email}</p>
            <p className="text-xs uppercase tracking-widest text-white/40">Role: {role}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/50">Theme</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {themeOptions.map(([key, value]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTheme(key)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    key === themeKey
                      ? 'border-indigo-400 bg-indigo-500/20 text-white'
                      : 'border-white/10 bg-white/5 text-white/60 hover:text-white'
                  }`}
                >
                  {value.name === 'dark' ? 'Dark mode' : 'Light mode'}
                </button>
              ))}
              <button
                type="button"
                onClick={cycleTheme}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:border-white/30 hover:text-white"
              >
                Cycle theme
              </button>
            </div>
          </div>
        </div>
      </motion.section>

      {canManageTelemetry && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/10 bg-[var(--theme-surface)]/80 p-6 shadow-lg backdrop-blur"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/50">Telemetry</p>
              <h2 className="mt-2 text-lg font-semibold text-[var(--theme-text)]">
                Privacy-aware analytics sharing
              </h2>
              <p className="text-sm text-[color-mix(in_srgb,var(--theme-text)_60%,transparent)]">
                Allow Hustle Studio to collect anonymised performance metrics for this workspace. This helps
                surface uptime alerts and AI usage insights.
              </p>
            </div>
            <button
              type="button"
              onClick={handleTelemetryToggle}
              disabled={isSavingTelemetry}
              className={`flex items-center gap-3 rounded-full border px-4 py-2 text-sm transition ${
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
              {telemetryEnabled ? 'Telemetry enabled' : 'Telemetry disabled'}
              {isSavingTelemetry && <span className="text-xs uppercase tracking-[0.2em] text-white/50">Saving…</span>}
            </button>
          </div>
        </motion.section>
      )}
    </div>
  );
}
