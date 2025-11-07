import { useEffect, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';
import { trackEvent } from '../lib/amplifyMonitor.js';

const fallbackTelemetry = [
  { label: '12:00', sessions: 12, installs: 2 },
  { label: '13:00', sessions: 18, installs: 3 },
  { label: '14:00', sessions: 22, installs: 4 },
  { label: '15:00', sessions: 25, installs: 5 },
  { label: '16:00', sessions: 28, installs: 7 },
  { label: '17:00', sessions: 32, installs: 8 },
];

const Monitor = () => {
  const [telemetry, setTelemetry] = useState(fallbackTelemetry);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        trackEvent('MonitorPing', { page: 'Monitor' });
      } catch (error) {
        console.warn('[Amplify] Unable to record monitor ping.', error);
      }
      setTelemetry((current) =>
        current.map((point, index) => ({
          ...point,
          sessions: point.sessions + ((index % 2) * 2 + 1),
          installs: point.installs + (index % 3 === 0 ? 1 : 0),
        }))
      );
      setLoading(false);
    };
    loadAnalytics();
  }, []);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-[var(--theme-text)]">Amplify analytics</h1>
        <p className="text-sm text-[color-mix(in_srgb,var(--theme-text)_60%,transparent)]">
          Real-time insight placeholder showcasing how Hustle Studio streams events into AWS Amplify.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-white/5 bg-black/40 p-6 shadow-[0_25px_60px_rgba(0,0,0,0.35)] backdrop-blur"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Session telemetry</h2>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">
              Hourly breakdown (mocked when offline)
            </p>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.35em] text-white/50">
            {loading ? 'Syncing...' : 'Live'}
          </span>
        </div>
        <div className="mt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={telemetry}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="label" stroke="#aaa" />
              <YAxis stroke="#aaa" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f1f1f', border: 'none', color: '#fff' }}
                formatter={(value, name) => [value, name === 'sessions' ? 'Sessions' : 'Installs']}
              />
              <Line type="monotone" dataKey="sessions" stroke="#a855f7" strokeWidth={3} dot />
              <Line type="monotone" dataKey="installs" stroke="#b8a46c" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
};

export default Monitor;
