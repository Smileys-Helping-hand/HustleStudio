import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

const LoadingSpinner = ({ size = 'md', message = 'Loading...' }) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <div className="relative">
        {/* Outer ring */}
        <motion.div
          className={`${sizes[size]} rounded-full border-4 border-indigo-500/20`}
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Inner spinning ring */}
        <motion.div
          className={`${sizes[size]} absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-500 border-r-purple-500`}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Center pulse */}
        <motion.div
          className="absolute inset-0 m-auto w-3 h-3 rounded-full bg-indigo-400"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [1, 0.5, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>
      
      {message && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-white/60 font-medium"
        >
          {message}
        </motion.p>
      )}
    </div>
  );
};

LoadingSpinner.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  message: PropTypes.string,
};

export default LoadingSpinner;
