import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { FiCheck, FiDroplet } from 'react-icons/fi';
import { useTheme } from '../theme/ThemeContext';
import { themes } from '../theme/themes';

const ThemeSelector = () => {
  const { themeKey, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const themeEntries = Object.entries(themes);

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 backdrop-blur-sm transition hover:border-white/20 hover:bg-white/10"
      >
        <FiDroplet className="w-4 h-4" />
        <span className="hidden sm:inline">Theme</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40"
            />

            {/* Theme Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-full mt-2 z-50 w-80 rounded-2xl border border-white/10 bg-black/95 backdrop-blur-xl shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-white/10">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <FiDroplet className="w-4 h-4" />
                  Choose Your Theme
                </h3>
                <p className="text-xs text-white/50 mt-1">
                  Select the visual style that matches your brand
                </p>
              </div>

              <div className="p-3 max-h-96 overflow-y-auto custom-scrollbar">
                <div className="space-y-2">
                  {themeEntries.map(([key, theme]) => (
                    <motion.button
                      key={key}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setTheme(key);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        themeKey === key
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-white">
                              {theme.name}
                            </span>
                            {themeKey === key && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500"
                              >
                                <FiCheck className="w-3 h-3 text-white" />
                              </motion.div>
                            )}
                          </div>
                          <p className="text-xs text-white/60">
                            {theme.description}
                          </p>
                        </div>

                        {/* Color Preview */}
                        <div className="flex gap-1 mt-1">
                          <div
                            className="w-6 h-6 rounded-md border border-white/20"
                            style={{ background: theme.background }}
                          />
                          <div
                            className="w-6 h-6 rounded-md border border-white/20"
                            style={{ background: theme.accent }}
                          />
                          <div
                            className="w-6 h-6 rounded-md border border-white/20"
                            style={{ background: theme.secondary }}
                          />
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThemeSelector;
