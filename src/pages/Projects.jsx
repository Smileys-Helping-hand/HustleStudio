import React from 'react';
import { motion } from 'framer-motion';
import PageHeader from '../components/common/PageHeader.jsx';

const cards = [
  {
    title: 'Brand Refresh',
    description: 'Update signage, socials, and onboarding collateral for the Q4 push.',
    status: 'In progress',
  },
  {
    title: 'Pop-up Weekend',
    description: 'Coordinate staff roster, till hardware, and inventory staging.',
    status: 'Planning',
  },
  {
    title: 'Loyalty Program',
    description: 'Design rewards tiers and integrate POS enrolment workflow.',
    status: 'Backlog',
  },
];

const Projects = () => {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0e0e18] to-[#1b1830] px-4 pb-16 text-white sm:px-8">
      <PageHeader
        title="Projects & Tasks"
        subtitle="Track upcoming launches, assign workstreams, and keep your hustle roadmap visible."
      />

      <motion.div
        layout
        className="grid gap-6 md:grid-cols-2 xl:grid-cols-3"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        {cards.map((card) => (
          <motion.article
            key={card.title}
            whileHover={{ translateY: -4 }}
            className="flex h-full flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_30px_rgba(99,102,241,0.16)]"
          >
            <div>
              <h2 className="page-heading text-2xl font-semibold">{card.title}</h2>
              <p className="mt-3 text-sm text-white/70">{card.description}</p>
            </div>
            <span className="mt-6 inline-flex w-fit rounded-full border border-indigo-400/40 bg-indigo-500/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-indigo-200">
              {card.status}
            </span>
          </motion.article>
        ))}
        <motion.article
          whileHover={{ translateY: -4 }}
          className="flex h-full flex-col justify-center rounded-3xl border border-dashed border-white/20 bg-white/5 p-6 text-center text-white/70"
        >
          <p className="text-sm">Connect your favourite planning tools or import a CSV to hydrate your workspace.</p>
        </motion.article>
      </motion.div>
    </main>
  );
};

export default Projects;
