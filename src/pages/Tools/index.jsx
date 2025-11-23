import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowRight, FiCalendar, FiFeather } from 'react-icons/fi';
import ROICalculator from './components/ROICalculator.jsx';
import MarginCalculator from './components/MarginCalculator.jsx';
import BreakEvenAnalyzer from './components/BreakEvenAnalyzer.jsx';
import CsvToWorkbook from './components/CsvToWorkbook.jsx';
import FinancialHealthChart from './components/FinancialHealthChart.jsx';
import PriceOptimizer from './components/PriceOptimizer.jsx';

const ToolsHome = () => {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold text-white">Business Tools</h1>
        <p className="text-sm text-white/60">
          Financial utilities, marketing boosters, and exports purpose-built for Hustle Studio operators.
        </p>
        <div className="flex flex-wrap gap-3 text-xs text-white/70">
          <Link
            to="/tools/marketing"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 uppercase tracking-[0.3em] transition hover:border-indigo-400/60 hover:text-white"
          >
            <FiFeather /> Caption lab
          </Link>
          <Link
            to="/tools/scheduler"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 uppercase tracking-[0.3em] transition hover:border-indigo-400/60 hover:text-white"
          >
            <FiCalendar /> Campaign planner
          </Link>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <ROICalculator />
        <MarginCalculator />
        <BreakEvenAnalyzer />
        <CsvToWorkbook />
      </div>

      <PriceOptimizer />

      <FinancialHealthChart />

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/70 shadow-[0_0_30px_rgba(99,102,241,0.12)]">
        <h2 className="text-lg font-semibold text-white">Need deeper automation?</h2>
        <p className="mt-2">
          The marketing and scheduling modules plug straight into your CDN assets. Configure them to auto-sync with the visual manager for consistent branding.
        </p>
        <Link
          to="/visuals"
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-indigo-400/40 bg-indigo-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-indigo-100 transition hover:border-indigo-300/60"
        >
          Manage visuals <FiArrowRight />
        </Link>
      </section>
    </motion.div>
  );
};

export default ToolsHome;
