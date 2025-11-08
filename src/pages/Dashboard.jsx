import React, { useEffect } from 'react';
import MetricCard from '../components/MetricCard.jsx';
import { motion } from 'framer-motion';

export default function Dashboard() {
  useEffect(() => {
    document.title = 'Dashboard • Hustle Studio';
  }, []);

  return (
    <main className="min-h-screen px-6 py-10 bg-gradient-to-br from-[#0f0f17] to-[#1c1b29] text-white">
      <section className="max-w-6xl mx-auto text-center">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-4xl font-bold mb-4"
        >
          Welcome to Hustle Studio
        </motion.h1>
        <p className="text-gray-300 text-lg mb-10">
          Manage your operations, track inventory, and visualize progress — all in one focused workspace.
        </p>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        <MetricCard title="Active Inventory" value="42 items" trend="Stable" />
        <MetricCard title="Team Members" value="7" trend="Onboarded" />
        <MetricCard title="Monthly Revenue" value="R12,340" trend="↑ 4.2%" />
        <MetricCard title="Open Tills" value="2" trend="Operational" />
        <MetricCard title="Pending Reports" value="3" trend="Action needed" />
        <MetricCard title="CDN Sync Status" value="Up to date" trend="Healthy" />
      </section>
    </main>
  );
}
