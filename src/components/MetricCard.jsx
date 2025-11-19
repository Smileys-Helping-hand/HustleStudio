import PropTypes from 'prop-types';
import { motion } from 'framer-motion';

const MetricCard = ({ title, value, trend }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    className="rounded-3xl border border-white/5 bg-black/40 p-6 shadow-[0_20px_45px_rgba(0,0,0,0.35)] backdrop-blur"
  >
    <p className="text-xs uppercase tracking-widest text-white/40">{title}</p>
    <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
    <p className="mt-4 text-sm font-medium text-[var(--theme-highlight)]">{trend}</p>
  </motion.div>
);

MetricCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  trend: PropTypes.string.isRequired,
};

export default MetricCard;
