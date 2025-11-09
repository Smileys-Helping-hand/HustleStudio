import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import MetricCard from '../components/MetricCard.jsx';
import { db } from '../lib/firebase.js';

const Dashboard = () => {
  const [inventoryCount, setInventoryCount] = useState(0);
  const [teamCount, setTeamCount] = useState(0);
  const [sales, setSales] = useState([]);
  const [reportsCount, setReportsCount] = useState(0);

  useEffect(() => {
    document.title = 'Dashboard • Hustle Studio';
  }, []);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const inventorySnapshot = await getDocs(collection(db, 'inventory'));
        const teamSnapshot = await getDocs(collection(db, 'users'));
        const reportsSnapshot = await getDocs(collection(db, 'reports'));
        const salesSnapshot = await getDocs(query(collection(db, 'sales'), orderBy('createdAt', 'desc'), limit(6)));

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
        console.warn('[Dashboard] metrics fallback', error);
      }
    };

    loadMetrics().catch(() => {});
  }, []);

  const revenueTotal = useMemo(() => sales.reduce((sum, sale) => sum + sale.total, 0), [sales]);

  const activityFeed = useMemo(() => {
    return sales.map((sale) => ({
      id: sale.id,
      title: 'Sale captured',
      detail: `R${sale.total.toFixed(2)} via ${sale.paymentType}`,
      time: sale.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }));
  }, [sales]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0f0f17] via-[#121129] to-[#1c1b29] px-6 py-10 text-white">
      <section className="mx-auto max-w-6xl text-center">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-4xl font-bold"
        >
          Hustle Studio operations hub
        </motion.h1>
        <p className="mt-3 text-gray-300">
          Monitor tills, manage team productivity, and broadcast new visuals in one launchpad.
        </p>
      </section>

      <section className="mx-auto mt-10 grid max-w-6xl gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60 sm:grid-cols-4">
        <div className="rounded-xl bg-black/40 p-4">
          <p className="text-xs uppercase tracking-wide text-white/40">Inventory SKUs</p>
          <p className="mt-2 text-2xl font-semibold text-white">{inventoryCount}</p>
        </div>
        <div className="rounded-xl bg-black/40 p-4">
          <p className="text-xs uppercase tracking-wide text-white/40">Active team</p>
          <p className="mt-2 text-2xl font-semibold text-white">{teamCount}</p>
        </div>
        <div className="rounded-xl bg-black/40 p-4">
          <p className="text-xs uppercase tracking-wide text-white/40">This week revenue</p>
          <p className="mt-2 text-2xl font-semibold text-white">R{revenueTotal.toFixed(2)}</p>
        </div>
        <div className="rounded-xl bg-black/40 p-4">
          <p className="text-xs uppercase tracking-wide text-white/40">Open reports</p>
          <p className="mt-2 text-2xl font-semibold text-white">{reportsCount}</p>
        </div>
      </section>

      <section className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="grid gap-6 sm:grid-cols-2">
          <MetricCard
            title="Launch Till"
            value="Start selling"
            trend={(
              <Link to="/till" className="text-indigo-300 underline">
                Open till
              </Link>
            )}
          />
          <MetricCard title="Visual alerts" value={`${activityFeed.length}`} trend="Live" />
          <MetricCard
            title="Recent uploads"
            value="Sync CDN"
            trend={(
              <Link to="/visuals" className="text-indigo-300 underline">
                Go to visuals
              </Link>
            )}
          />
          <MetricCard
            title="System health"
            value="Monitor"
            trend={(
              <Link to="/monitor" className="text-indigo-300 underline">
                View status
              </Link>
            )}
          />
        </div>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-white">Activity feed</h2>
          <ul className="space-y-3 text-sm text-white/70">
            {activityFeed.length === 0 && <li>No recent sales captured.</li>}
            {activityFeed.map((item) => (
              <li key={item.id} className="flex items-center justify-between rounded-lg bg-black/40 px-3 py-2">
                <div>
                  <p className="font-semibold text-white">{item.title}</p>
                  <p className="text-xs text-white/50">{item.detail}</p>
                </div>
                <span className="text-xs text-white/40">{item.time}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
};

export default Dashboard;
