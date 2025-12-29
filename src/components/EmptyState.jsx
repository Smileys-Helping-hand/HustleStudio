import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import { FiInbox } from 'react-icons/fi';

const EmptyState = ({ 
  icon: Icon = FiInbox,
  title = 'No data yet',
  message = 'Get started by adding your first item',
  action,
  actionLabel = 'Get Started'
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center p-12 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="relative mb-6"
      >
        {/* Animated rings */}
        <motion.div
          className="absolute inset-0 -m-4 rounded-full border-2 border-indigo-500/20"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute inset-0 -m-2 rounded-full border-2 border-purple-500/20"
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
        />
        
        <div className="relative z-10 flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10">
          <Icon className="w-8 h-8 text-indigo-300" />
        </div>
      </motion.div>

      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-xl font-semibold text-white mb-2"
      >
        {title}
      </motion.h3>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-white/60 max-w-md mb-6"
      >
        {message}
      </motion.p>

      {action && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={action}
          className="px-6 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold shadow-lg hover:shadow-xl hover:shadow-indigo-500/50 transition-all"
        >
          {actionLabel}
        </motion.button>
      )}
    </motion.div>
  );
};

EmptyState.propTypes = {
  icon: PropTypes.elementType,
  title: PropTypes.string,
  message: PropTypes.string,
  action: PropTypes.func,
  actionLabel: PropTypes.string,
};

export default EmptyState;
