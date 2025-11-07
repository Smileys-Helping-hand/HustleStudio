import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import PropTypes from 'prop-types';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext.jsx';
import MetricCard from '../components/MetricCard.jsx';
import { trackEvent } from '../lib/amplifyMonitor.js';
import { mockInventory } from '../mockData/inventory.js';
import { mockReports } from '../mockData/reports.js';
import { useTheme } from '../theme/ThemeContext.jsx';
import { ASSETS } from '@/config/assets.js';

const Dashboard = ({ introComplete }) => {
  const { role, reportOffline } = useAuth();
  const { theme } = useTheme();
  const [inventory, setInventory] = useState(mockInventory);
  const [reports, setReports] = useState(mockReports);
  const [loading, setLoading] = useState(true);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [versionInfo, setVersionInfo] = useState(null);
  const parallax = useMotionValue(0);
  const backgroundOffset = useTransform(parallax, [0, 1], ['0%', '12%']);
  const shimmer = useMotionValue(introComplete ? 1 : 0);

  useEffect(() => {
    trackEvent('PageView', { page: 'Dashboard' });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const inventorySnapshot = await getDocs(collection(db, 'inventory'));
      const inventoryItems = inventorySnapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      }));

      const reportQuery = query(collection(db, 'reports'), orderBy('total', 'desc'), limit(7));
      const reportSnapshot = await getDocs(reportQuery);
      const reportItems = reportSnapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      }));

      setInventory(inventoryItems.length ? inventoryItems : mockInventory);
      setReports(reportItems.length ? reportItems : mockReports);
      console.info('[Firestore] Dashboard data loaded.');
    } catch (error) {
      console.error('[Firestore] Unable to load dashboard data', error);
      reportOffline();
      setInventory(mockInventory);
      setReports(mockReports);
    } finally {
      setLoading(false);
    }
  }, [reportOffline]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handlePrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener('beforeinstallprompt', handlePrompt);
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    console.info('[PWA] Install choice', choice.outcome);
    setInstallPrompt(null);
  }, [installPrompt]);

  useEffect(() => {
    let active = true;
    const loadVersion = async () => {
      try {
        const res = await fetch('/VERSION.txt', { cache: 'no-store' });
        if (!res.ok) return;
        const text = await res.text();
        if (active) {
          setVersionInfo(text.trim());
        }
      } catch (error) {
        console.warn('[Diagnostics] Unable to fetch version metadata.', error);
      }
    };
    loadVersion();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const progress = Math.min(1, window.scrollY / 300);
      parallax.set(progress);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [parallax]);

  useEffect(() => {
    if (introComplete) {
      shimmer.set(1);
    }
  }, [introComplete, shimmer]);

  useEffect(() => {
    const handler = (event) => {
      if (event.ctrlKey && !event.shiftKey) {
        const key = event.key.toLowerCase();
        if (key === 'e') {
          event.preventDefault();
          document.dispatchEvent(new CustomEvent('dashboard-export-reports'));
        }
        if (key === 'l') {
          event.preventDefault();
          window.location.href = '/login';
        }
        if (key === 'r') {
          event.preventDefault();
          fetchData();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [fetchData]);

  const chartData = useMemo(() => {
    if (!reports || reports.length === 0) {
      return mockReports.map((report) => ({ day: report.id, revenue: report.total }));
    }
    return reports
      .map((item) => ({ day: item.id, revenue: item.total ?? 0 }))
      .reverse();
  }, [reports]);

  const totalInventory = inventory.reduce((acc, item) => acc + (item.quantity ?? 0), 0);
  const totalValue = inventory.reduce((acc, item) => acc + (item.quantity ?? 0) * (item.price ?? 0), 0);

  return (
    <div className="relative space-y-10">
      <motion.div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        style={{
          backgroundImage: `url(${ASSETS.backgroundDashboard})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <motion.div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage: `url(${ASSETS.patternGrid})`,
            backgroundSize: '1200px',
            backgroundPositionY: backgroundOffset,
          }}
        />
      </motion.div>

      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col gap-3"
        >
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs uppercase tracking-[0.4em] text-white/70">
            {theme.label}
          </span>
          <h1 className="text-4xl font-semibold text-white drop-shadow-[0_15px_45px_rgba(0,0,0,0.4)]">
            Welcome back, {role === 'admin' ? 'Captain' : 'Teammate'}
          </h1>
          <p className="max-w-2xl text-white/70">
            Command centre status feed with live telemetry, asset mood boards, and export tools ready at your fingertips.
          </p>
        </motion.div>

        <div className="flex flex-wrap items-center gap-4">
          {installPrompt && (
            <button
              type="button"
              onClick={handleInstall}
              className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm uppercase tracking-[0.3em] text-white shadow-lg transition hover:border-white/40 hover:bg-white/20"
            >
              Install App
            </button>
          )}
          <div className="rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs uppercase tracking-[0.35em] text-white/60">
            Offline ready · Secure · Amplify connected
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Inventory Items" value={totalInventory} trend={loading ? 'Loading...' : 'Synced'} />
        <MetricCard title="Inventory Value" value={`R${totalValue.toFixed(2)}`} trend="Forecast +6%" />
        <MetricCard title="Weekly Revenue" value="R124 820" trend="+4%" />
        <MetricCard title="Active Staff" value="12" trend="Operational" />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="relative overflow-hidden rounded-3xl border border-white/5 bg-black/50 p-6 shadow-[0_25px_60px_rgba(0,0,0,0.35)] backdrop-blur"
        >
          <motion.div
            className="absolute inset-x-10 top-0 h-24 rounded-b-full bg-[var(--theme-accent)]/30 blur-3xl"
            style={{ opacity: shimmer }}
          />
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Revenue overview</h2>
              <p className="text-sm text-white/50">Last {chartData.length} reporting periods</p>
            </div>
          </div>
          <div className="mt-8 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <defs>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={theme.palette.highlight} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={theme.palette.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#aaa" />
                <YAxis stroke="#aaa" tickFormatter={(value) => `R${value}`} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(17, 17, 24, 0.9)',
                    borderRadius: '1rem',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white',
                  }}
                  formatter={(value) => [`R${Number(value).toLocaleString()}`, 'Revenue']}
                />
                <Line type="monotone" dataKey="revenue" stroke="url(#lineGradient)" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="space-y-4 rounded-3xl border border-white/5 bg-black/50 p-6 shadow-[0_25px_60px_rgba(0,0,0,0.35)] backdrop-blur"
        >
          <div>
            <h2 className="text-lg font-semibold text-white">Low stock alerts</h2>
            <p className="text-sm text-white/50">Live from Firestore with offline resilience</p>
          </div>
          <div className="space-y-3">
            {loading && <p className="text-white/50">Synchronising inventory...</p>}
            {!loading && inventory.length === 0 && (
              <p className="text-white/50">No inventory data yet — offline mock data active.</p>
            )}
            {inventory
              .filter((item) => (item.quantity ?? 0) < 15)
              .map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-white">{item.name ?? item.id}</p>
                    <p className="text-xs uppercase tracking-widest text-white/40">
                      {item.category ?? 'General stock'}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-[var(--theme-highlight)]">
                    {item.quantity ?? 0} units
                  </span>
                </div>
              ))}
          </div>
        </motion.div>
      </div>

      <footer className="flex flex-col items-start gap-2 rounded-3xl border border-white/10 bg-black/40 p-6 text-sm text-white/50 shadow-lg">
        <p>Keyboard shortcuts: Ctrl+E export reports · Ctrl+L login · Ctrl+R refresh cache</p>
        {versionInfo && <p className="text-xs text-white/40">Build {versionInfo}</p>}
      </footer>
    </div>
  );
};

Dashboard.propTypes = {
  introComplete: PropTypes.bool,
};

Dashboard.defaultProps = {
  introComplete: false,
};

export default Dashboard;
