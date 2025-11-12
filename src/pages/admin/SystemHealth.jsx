import { useEffect, useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { motion } from 'framer-motion';

const defaultHealth = {
  firestore: false,
  ai: false,
  stripe: false,
  storage: false,
  cvGenerator: false,
  uptime: [],
};

const SystemHealth = () => {
  const [health, setHealth] = useState(defaultHealth);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const runHealthCheck = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/health');
      if (!response.ok) {
        throw new Error(`Health endpoint returned ${response.status}`);
      }
      const payload = await response.json();
      setHealth(payload);
      setError(null);
    } catch (err) {
      console.error('Health check failed', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  const uptimeSeries = health.uptime?.length
    ? health.uptime
    : Array.from({ length: 7 }).map((_, index) => ({
        label: `Day ${index + 1}`,
        value: 99 - index * 0.2,
      }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-semibold text-white">System health</h1>
          <p className="text-white/60">Monitor integrations and uptime across Firebase, AI, Stripe, and CV services.</p>
        </div>
        <button
          type="button"
          onClick={runHealthCheck}
          className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-black shadow-lg hover:bg-brand-600"
        >
          Re-run health check
        </button>
      </div>

      {loading && <p className="text-white/60">Checking services…</p>}
      {error && <p className="text-red-400">Unable to refresh health: {error.message}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-3xl border ${health.firestore ? 'border-olive/60 bg-olive/10' : 'border-red-500/40 bg-red-500/10'} p-6`}
        >
          <p className="text-xs uppercase tracking-widest text-white/50">Firestore</p>
          <p className="text-2xl font-semibold text-white">{health.firestore ? 'Online' : 'Offline'}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-3xl border ${health.ai ? 'border-olive/60 bg-olive/10' : 'border-red-500/40 bg-red-500/10'} p-6`}
        >
          <p className="text-xs uppercase tracking-widest text-white/50">AI</p>
          <p className="text-2xl font-semibold text-white">{health.ai ? 'Online' : 'Offline'}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-3xl border ${health.stripe ? 'border-olive/60 bg-olive/10' : 'border-red-500/40 bg-red-500/10'} p-6`}
        >
          <p className="text-xs uppercase tracking-widest text-white/50">Stripe</p>
          <p className="text-2xl font-semibold text-white">{health.stripe ? 'Online' : 'Offline'}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-3xl border ${health.storage ? 'border-olive/60 bg-olive/10' : 'border-red-500/40 bg-red-500/10'} p-6`}
        >
          <p className="text-xs uppercase tracking-widest text-white/50">Storage</p>
          <p className="text-2xl font-semibold text-white">{health.storage ? 'Online' : 'Offline'}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-3xl border ${health.cvGenerator ? 'border-olive/60 bg-olive/10' : 'border-red-500/40 bg-red-500/10'} p-6`}
        >
          <p className="text-xs uppercase tracking-widest text-white/50">CV Generator</p>
          <p className="text-2xl font-semibold text-white">{health.cvGenerator ? 'Online' : 'Offline'}</p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3 rounded-3xl border border-white/10 bg-black/40 p-6"
      >
        <div>
          <p className="text-xs uppercase tracking-widest text-white/40">Uptime</p>
          <h2 className="text-lg font-semibold text-white">Rolling availability</h2>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={uptimeSeries}>
              <XAxis dataKey="label" stroke="#888" />
              <YAxis domain={[95, 100]} stroke="#888" />
              <Tooltip
                cursor={{ stroke: '#D4C19C', strokeWidth: 2 }}
                contentStyle={{
                  background: 'rgba(15,15,20,0.9)',
                  borderRadius: '1rem',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                }}
              />
              <Line type="monotone" dataKey="value" stroke="#D4C19C" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
};

export default SystemHealth;
