import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { FiArrowUpRight, FiCreditCard, FiTrendingUp } from 'react-icons/fi';
import PageHeader from '../components/common/PageHeader.jsx';
import { exportToCSV, exportToGoogleSheets, exportToPDF } from '../lib/exportUtils.js';

const financeHighlights = [
  { label: 'Monthly Revenue', value: 'R128,400', delta: '+12.6%' },
  { label: 'Operating Expenses', value: 'R68,920', delta: '-4.2%' },
  { label: 'Net Profit', value: 'R59,480', delta: '+18.3%' },
];

const Finance = () => {
  const exportFinance = useCallback((type) => {
    const rows = financeHighlights.map((item) => ({
      metric: item.label,
      value: item.value,
      delta: item.delta,
    }));

    if (type === 'csv') {
      exportToCSV(rows, 'finance-summary.csv');
    } else if (type === 'pdf') {
      exportToPDF({
        title: 'Hustle Studio Finance Summary',
        head: [['Metric', 'Value', 'Change']],
        body: rows.map((row) => [row.metric, row.value, row.delta]),
        filename: 'finance-summary.pdf',
      });
    } else if (type === 'sheets') {
      exportToGoogleSheets(rows, 'Finance Summary');
    }
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0e0e18] to-[#1b1830] px-4 pb-16 text-white sm:px-8">
      <PageHeader
        title="Finance Control"
        subtitle="Monitor revenue streams, track spend, and spotlight the health of your operations in one console."
        actions={
          <div className="flex flex-wrap gap-3 text-sm">
            <button
              type="button"
              onClick={() => exportFinance('csv')}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.35em] text-white/70 transition hover:bg-white/20"
            >
              CSV
            </button>
            <button
              type="button"
              onClick={() => exportFinance('pdf')}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.35em] text-white/70 transition hover:bg-white/20"
            >
              <FiArrowUpRight /> PDF
            </button>
            <button
              type="button"
              onClick={() => exportFinance('sheets')}
              className="inline-flex items-center gap-2 rounded-full border border-indigo-400/40 bg-indigo-500/20 px-4 py-2 text-xs uppercase tracking-[0.35em] text-indigo-100 transition hover:bg-indigo-500/30"
            >
              Sheets
            </button>
          </div>
        }
      />

      <section className="grid gap-6 md:grid-cols-3">
        {financeHighlights.map((item) => (
          <article
            key={item.label}
            className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_30px_rgba(99,102,241,0.16)]"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">{item.label}</p>
            <p className="mt-4 text-3xl font-semibold">{item.value}</p>
            <span className="mt-2 inline-flex items-center gap-2 text-xs text-emerald-300">
              <FiTrendingUp />
              {item.delta}
            </span>
          </article>
        ))}
      </section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="mt-10 grid gap-6 lg:grid-cols-[2fr_1fr]"
      >
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="page-heading text-xl font-semibold">Cashflow outlook</h2>
          <p className="mt-3 text-sm text-white/70">
            Connect your accounting stack to surface rolling forecasts, receivables, and settlement reminders automatically.
          </p>
          <div className="mt-6 h-48 rounded-2xl border border-dashed border-white/20 bg-black/30" />
        </div>

        <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6">
          <h3 className="page-heading text-lg font-semibold">Payment mix</h3>
          <ul className="space-y-3 text-sm text-white/70">
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-2"><FiCreditCard /> Card</span>
              <span>52%</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Cash</span>
              <span>34%</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Account</span>
              <span>14%</span>
            </li>
          </ul>
        </div>
      </motion.section>
    </main>
  );
};

export default Finance;
