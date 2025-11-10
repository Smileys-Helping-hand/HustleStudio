import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';

const MotionSection = motion.section;

const PageHeader = ({ title, subtitle, actions }) => {
  return (
    <MotionSection
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="mb-10 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-8 text-white shadow-[0_0_30px_rgba(99,102,241,0.18)] backdrop-blur"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="page-heading text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 max-w-2xl text-sm text-white/70">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-3 text-sm">{actions}</div>}
      </div>
    </MotionSection>
  );
};

PageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.node,
  actions: PropTypes.node,
};

export default PageHeader;
