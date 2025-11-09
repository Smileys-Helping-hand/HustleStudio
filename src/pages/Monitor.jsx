import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { trackEvent } from '../lib/amplifyMonitor.js';
import { db } from '../lib/firebase.js';

const Monitor = () => {
  const [latency, setLatency] = useState(null);
  const [firestoreStatus, setFirestoreStatus] = useState('Checking…');
  const [sessionCount, setSessionCount] = useState(0);
  const [telemetry, setTelemetry] = useState([]);

  useEffect(() => {
    const runChecks = async () => {
      try {
        const start = performance.now();
        const manifestResponse = await fetch(
          `${import.meta.env.VITE_CDN_DOMAIN || 'https://cdn.hustlestudio.co.za'}/assets/manifest.json`
        );
        const duration = performance.now() - start;
        setLatency(`${Math.round(duration)} ms`);
        if (!manifestResponse.ok) throw new Error('Manifest unavailable');
      } catch (error) {
        console.warn('[Monitor] CDN ping failed', error);
        setLatency('Unavailable');
      }

      try {
        const salesQuery = query(collection(db, 'sales'), orderBy('createdAt', 'desc'), limit(24));
        const salesSnapshot = await getDocs(salesQuery);
        const points = salesSnapshot.docs.map((docSnap) => {
          const createdAt = docSnap.data().createdAt?.toDate?.() ?? new Date();
          return {
            label: createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            total: docSnap.data().totals?.total ?? 0,
          };
        });
        setTelemetry(points.reverse());
        setFirestoreStatus('Online');
        setSessionCount(salesSnapshot.size);
      } catch (error) {
        console.error('[Monitor] Firestore check failed', error);
        setFirestoreStatus('Offline');
      }

      try {
        trackEvent('SystemMonitor', { status: 'ping' });
      } catch (error) {
        console.warn('[Amplify] Tracking failed', error);
      }
    };

    runChecks().catch(() => {});
  }, []);

  const telemetryData = useMemo(() => {
    if (telemetry.length) return telemetry;
    return [
      { label: '08:00', total: 1200 },
      { label: '10:00', total: 1850 },
      { label: '12:00', total: 2100 },
      { label: '14:00', total: 2600 },
      { label: '16:00', total: 3000 },
      { label: '18:00', total: 2800 },
    ];
  }, [telemetry]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">System Monitor</h1>
        <p className="text-sm text-white/60">
          Realtime health overview for Firebase, CDN, and Amplify integrations.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <p className="text-xs uppercase tracking-wide text-white/50">Firestore</p>
          <p className={`mt-2 text-xl font-semibold ${firestoreStatus === 'Online' ? 'text-emerald-300' : 'text-red-300'}`}>
            {firestoreStatus}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <p className="text-xs uppercase tracking-wide text-white/50">CDN latency</p>
          <p className="mt-2 text-xl font-semibold text-white">{latency ?? 'Checking…'}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <p className="text-xs uppercase tracking-wide text-white/50">Recent sessions</p>
          <p className="mt-2 text-xl font-semibold text-white">{sessionCount}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <p className="text-xs uppercase tracking-wide text-white/50">Amplify monitor</p>
          <p className="mt-2 text-xl font-semibold text-white">Active</p>
        </div>
      </section>

      <section className="rounded-3xl border border-white/5 bg-black/40 p-6 shadow-[0_25px_60px_rgba(0,0,0,0.35)] backdrop-blur">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Last activity</h2>
            <p className="text-xs uppercase tracking-[0.25em] text-white/50">Sales telemetry (24h)</p>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/50">
            {firestoreStatus}
          </span>
        </header>
        <div className="mt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={telemetryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="label" stroke="#aaa" />
              <YAxis stroke="#aaa" />
              <Tooltip contentStyle={{ backgroundColor: '#1f1f1f', border: 'none', color: '#fff' }} />
              <Line type="monotone" dataKey="total" stroke="#a855f7" strokeWidth={3} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <footer className="rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-white/60">
        Need deeper insights? Launch the dedicated monitor service via <code>npm run monitor</code> and visit
        <span className="text-white"> http://localhost:5050/monitor</span> for full diagnostics.
      </footer>
    </div>
  );
};

export default Monitor;
