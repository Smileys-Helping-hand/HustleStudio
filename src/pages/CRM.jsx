import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMail, FiPhone, FiUserPlus } from 'react-icons/fi';
import PageHeader from '../components/common/PageHeader.jsx';

const leads = [
  { name: 'Aisha Daniels', stage: 'Proposal Sent', contact: 'aisha@northstar.agency' },
  { name: 'Neo Molefe', stage: 'Discovery', contact: '+27 82 555 0199' },
  { name: 'Cape Events Co.', stage: 'Negotiation', contact: 'hello@capeevents.co.za' },
];

const CRM = () => {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0e0e18] to-[#1b1830] px-4 pb-16 text-white sm:px-8">
      <PageHeader
        title="CRM Pipeline"
        subtitle="Capture leads, track follow-ups, and keep client conversations moving towards the close."
        actions={
          <div className="flex flex-wrap gap-3">
            <button type="button" className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-2 text-sm text-emerald-200 transition hover:bg-emerald-500/30">
              <FiUserPlus /> New Contact
            </button>
            <Link
              to="/crm/invoices"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:border-indigo-400/60 hover:text-white"
            >
              Generate Invoice
            </Link>
          </div>
        }
      />

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="space-y-4"
        >
          {leads.map((lead) => (
            <article
              key={lead.name}
              className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_30px_rgba(99,102,241,0.14)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="page-heading text-xl font-semibold">{lead.name}</h2>
                  <p className="text-sm text-white/60">{lead.contact}</p>
                </div>
                <span className="rounded-full border border-indigo-400/40 bg-indigo-500/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-indigo-200">
                  {lead.stage}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-white/60">
                <button type="button" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 hover:border-indigo-400/60 hover:text-white">
                  <FiMail /> Send Email
                </button>
                <button type="button" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 hover:border-indigo-400/60 hover:text-white">
                  <FiPhone /> Schedule Call
                </button>
              </div>
            </article>
          ))}
        </motion.div>

        <aside className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h3 className="page-heading text-lg font-semibold">Pipeline health</h3>
          <p className="mt-3 text-sm text-white/70">
            Sync your CRM automations or import a lead list to unlock conversion insights and AI follow-up prompts.
          </p>
          <div className="mt-6 h-40 rounded-2xl border border-dashed border-white/20 bg-black/30" />
        </aside>
      </section>
    </main>
  );
};

export default CRM;
