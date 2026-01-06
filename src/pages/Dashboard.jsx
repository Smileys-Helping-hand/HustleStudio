import React, { useEffect, useMemo, useState } from 'react';
import logger from '../lib/logger.js';
import { Link } from 'react-router-dom';
import logger from '../lib/logger.js';
import { motion } from 'framer-motion';
import logger from '../lib/logger.js';
import { getDocs, limit, orderBy, query } from 'firebase/firestore';
import logger from '../lib/logger.js';
import MetricCard from '../components/MetricCard.jsx';
import logger from '../lib/logger.js';
import PageHeader from '../components/common/PageHeader.jsx';
import logger from '../lib/logger.js';
import { toast } from 'react-hot-toast';
import logger from '../lib/logger.js';
import { useTenant } from '../context/TenantContext.jsx';
import logger from '../lib/logger.js';
import { tenantCollection } from '../lib/tenant.js';

import logger from '../lib/logger.js';
const Dashboard = () => {
  const [inventoryCount, setInventoryCount] = useState(0);
  const [teamCount, setTeamCount] = useState(0);
  const [sales, setSales] = useState([]);
  const [reportsCount, setReportsCount] = useState(0);
  const { activeTenantId } = useTenant();

  useEffect(() => {
    document.title = 'Dashboard • Hustle Studio';
  }, []);

  useEffect(() => {
    const loadMetrics = async () => {
      if (!activeTenantId) {
        setInventoryCount(0);
        setTeamCount(0);
        setReportsCount(0);
        setSales([]);
        return;
      }
      try {
        const [inventorySnapshot, teamSnapshot, reportsSnapshot, salesSnapshot] = await Promise.all([
          getDocs(tenantCollection(activeTenantId, 'inventory')),
          getDocs(tenantCollection(activeTenantId, 'users')),
          getDocs(tenantCollection(activeTenantId, 'reports')),
          getDocs(query(tenantCollection(activeTenantId, 'sales'), orderBy('createdAt', 'desc'), limit(6))),
        ]);

        setInventoryCount(inventorySnapshot.size);
        setTeamCount(teamSnapshot.size);
        setReportsCount(reportsSnapshot.size);
        setSales(
          salesSnapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            createdAt: docSnap.data().createdAt?.toDate?.() ?? new Date(),
            total: docSnap.data().totals?.total ?? 0,
            paymentType: docSnap.data().paymentType ?? 'Cash',
          }))
        );
      } catch (error) {
        logger.warn('[Dashboard] metrics fallback', error);
      }
    };

    loadMetrics().catch(() => {});
  }, [activeTenantId]);

  const revenueTotal = useMemo(() => sales.reduce((sum, sale) => sum + sale.total, 0), [sales]);

  useEffect(() => {
    if (sales.length === 0) return;
    const threshold = 50000;
    if (revenueTotal >= threshold) {
      const seenKey = `hs_sales_milestone_${threshold}`;
      if (typeof window !== 'undefined' && !window.sessionStorage.getItem(seenKey)) {
        toast.success('Sales milestone reached! Review the finance tab for celebration insights.');
        window.sessionStorage.setItem(seenKey, 'true');
      }
    }
  }, [revenueTotal, sales.length]);

  const activityFeed = useMemo(
    () =>
      sales.map((sale) => ({
        id: sale.id,
        title: 'Sale captured',
        detail: `R${sale.total.toFixed(2)} via ${sale.paymentType}`,
        time: sale.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      })),
    [sales]
  );

  const quickSummary = [
    { label: 'Revenue (7d)', value: `R${revenueTotal.toFixed(2)}`, to: '/finance' },
    { label: 'Active team', value: `${teamCount}`, to: '/team' },
    { label: 'Inventory SKUs', value: `${inventoryCount}`, to: '/inventory' },
    { label: 'Reports queued', value: `${reportsCount}`, to: '/reports' },
    { label: 'Analytics', value: 'Live dashboards', to: '/analytics' },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0a0a14] via-[#14122a] to-[#1e1640] px-6 pb-24 text-white sm:px-10 lg:px-12 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative z-10">
        <PageHeader
          title="Business Operations Hub"
          subtitle="Launch tills, sync visuals, review cashflow, and brief your AI copilots from a single command centre."
          actions={
            <div className="flex flex-wrap gap-4">
              <Link
                to="/analytics"
                className="inline-flex items-center gap-2 rounded-full border border-indigo-400/40 bg-indigo-500/20 px-4 py-2 text-sm text-indigo-100 transition hover:bg-indigo-500/30 hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/20"
            >
              View Analytics
            </Link>
            <Link
              to="/till"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white/80 transition hover:bg-white/20"
            >
              Start Till Session
            </Link>
          </div>
        }
      />

      <div className="mt-8 flex flex-wrap gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 text-xs uppercase tracking-[0.3em] text-white/70 shadow-[0_0_30px_rgba(99,102,241,0.12)]">
        <Link
          to="/marketing/lab"
          className="inline-flex items-center gap-2 rounded-full bg-indigo-500/30 px-4 py-2 text-indigo-100 transition hover:bg-indigo-500/40"
        >
          ➕ New Campaign
        </Link>
        <Link
          to="/analytics"
          className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-white/80 transition hover:border-indigo-400/60"
        >
          📈 View Analytics
        </Link>
        <Link
          to="/ai/growth-coach"
          className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-white/80 transition hover:border-indigo-400/60"
        >
          🤖 Ask Growth Coach
        </Link>
      </div>

      <section className="grid gap-5 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_0_30px_rgba(99,102,241,0.15)] md:grid-cols-4">
        {quickSummary.map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className="group flex flex-col rounded-2xl border border-white/10 bg-black/30 p-5 transition hover:-translate-y-1 hover:border-indigo-400/50"
          >
            <span className="text-xs uppercase tracking-[0.3em] text-white/50">{item.label}</span>
            <span className="mt-3 text-2xl font-semibold text-white group-hover:text-indigo-200">{item.value}</span>
            <span className="mt-2 text-xs text-indigo-200/70 group-hover:text-indigo-200">View details →</span>
          </Link>
        ))}
      </section>

      <section className="mt-12 grid gap-8 lg:grid-cols-[2fr_1fr]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="grid gap-6 sm:grid-cols-2"
        >
          <MetricCard
            title="Projects & Tasks"
            value="Coordinate launches"
            trend={<Link to="/projects" className="text-indigo-300 underline">Open board</Link>}
          />
          <MetricCard
            title="Finance Control"
            value="Track spend"
            trend={<Link to="/finance" className="text-indigo-300 underline">Review cashflow</Link>}
          />
          <MetricCard
            title="CRM Pipeline"
            value="Engage leads"
            trend={<Link to="/crm" className="text-indigo-300 underline">View pipeline</Link>}
          />
          <MetricCard
            title="AI Command Hub"
            value="Deploy copilots"
            trend={<Link to="/ai-hub" className="text-indigo-300 underline">Launch AI</Link>}
          />
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6"
        >
          <h2 className="page-heading text-lg font-semibold">Activity feed</h2>
          <ul className="space-y-3 text-sm text-white/70">
            {activityFeed.length === 0 && <li className="rounded-2xl border border-dashed border-white/20 p-4 text-center">No recent sales captured.</li>}
            {activityFeed.map((item) => (
              <li key={item.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                <div>
                  <p className="font-semibold text-white">{item.title}</p>
                  <p className="text-xs text-white/50">{item.detail}</p>
                </div>
                <span className="text-xs text-white/40">{item.time}</span>
              </li>
            ))}
          </ul>
        </motion.aside>
      </section>
      </div>
    </main>
  );
};

export default Dashboard;
