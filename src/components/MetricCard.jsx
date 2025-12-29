import PropTypes from 'prop-types';
import { motion } from 'framer-motion';

const MetricCard = ({ title, value, trend, label }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ scale: 1.02, y: -3 }}
    transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
    className="group relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 shadow-xl backdrop-blur-sm overflow-hidden hover:border-indigo-400/40 hover:shadow-2xl hover:shadow-indigo-500/20"
  >
    {/* Animated gradient overlay */}
    <motion.div
      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
      initial={{ x: '-100%' }}
      animate={{ x: '200%' }}
      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
    />
    
    <div className="relative z-10">
      <p className="text-xs uppercase tracking-[0.2em] text-white/50 group-hover:text-indigo-300/70 transition-colors">
        {title || label}
      </p>
      <p className="mt-3 text-3xl font-bold bg-gradient-to-br from-white to-white/80 bg-clip-text text-transparent group-hover:from-indigo-200 group-hover:to-white transition-all">
        {value}
      </p>
      {trend && (
        <div className="mt-4 text-sm font-medium text-indigo-300/90 group-hover:text-indigo-200">
          {trend}
        </div>
      )}
    </div>
  </motion.div>
);

MetricCard.propTypes = {
  title: PropTypes.string,
  label: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  trend: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
};

export default MetricCard;
