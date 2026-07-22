import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCommand, FiX } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

/**
 * KeyboardShortcuts - Global keyboard shortcuts for power users
 * Press '?' to show help modal
 */
export default function KeyboardShortcuts() {
  const [showHelp, setShowHelp] = useState(false);
  const navigate = useNavigate();

  const shortcuts = [
    { key: '?', description: 'Show keyboard shortcuts', action: () => setShowHelp(true) },
    { key: 'g + d', description: 'Go to Dashboard', action: () => navigate('/dashboard') },
    { key: 'g + i', description: 'Go to Inventory', action: () => navigate('/inventory') },
    { key: 'g + t', description: 'Go to Till', action: () => navigate('/till') },
    { key: 'g + a', description: 'Go to Analytics', action: () => navigate('/analytics') },
    { key: 'g + f', description: 'Go to Finance', action: () => navigate('/finance') },
    { key: 'g + s', description: 'Go to Settings', action: () => navigate('/settings') },
    { key: 'Escape', description: 'Close modals/dialogs', action: () => setShowHelp(false) },
  ];

  const handleKeyPress = useCallback((event) => {
    const key = event.key?.toLowerCase() || '';
    const target = event.target;
    
    // Don't trigger shortcuts when typing in input fields
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    // Show help on '?'
    if (key === '?' && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      setShowHelp(true);
      return;
    }

    // Close modals on Escape
    if (key === 'escape') {
      setShowHelp(false);
      return;
    }

    // Navigation shortcuts with 'g' prefix
    if (event.key === 'g' && !event.metaKey && !event.ctrlKey) {
      // Wait for next key
      const handleSecondKey = (secondEvent) => {
        const secondKey = secondEvent.key.toLowerCase();
        secondEvent.preventDefault();
        
        const navMap = {
          'd': '/dashboard',
          'i': '/inventory',
          't': '/till',
          'a': '/analytics',
          'f': '/finance',
          's': '/settings',
        };

        if (navMap[secondKey]) {
          navigate(navMap[secondKey]);
          toast.success(`Navigated to ${navMap[secondKey].slice(1)}`);
        }

        window.removeEventListener('keydown', handleSecondKey);
      };

      window.addEventListener('keydown', handleSecondKey, { once: true });
      // Remove listener after 2 seconds if no second key pressed
      setTimeout(() => {
        window.removeEventListener('keydown', handleSecondKey);
      }, 2000);
    }
  }, [navigate]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  return (
    <AnimatePresence>
      {showHelp && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowHelp(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Help Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="relative max-w-2xl w-full rounded-2xl border border-white/20 bg-[var(--theme-surface)] backdrop-blur-xl shadow-2xl pointer-events-auto">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-indigo-500/20 p-2">
                    <FiCommand className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[var(--theme-text)]">
                      Keyboard Shortcuts
                    </h2>
                    <p className="text-sm text-[var(--theme-text)]/60">
                      Power user commands for faster navigation
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHelp(false)}
                  className="rounded-lg p-2 text-[var(--theme-text)]/60 transition hover:bg-white/10 hover:text-[var(--theme-text)]"
                  aria-label="Close shortcuts help"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              {/* Shortcuts List */}
              <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-3">
                  {shortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
                    >
                      <span className="text-sm text-[var(--theme-text)]/80">
                        {shortcut.description}
                      </span>
                      <kbd className="rounded bg-[var(--theme-background)] px-3 py-1.5 text-xs font-semibold text-[var(--theme-accent)] border border-[var(--theme-accent)]/30 shadow-sm">
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-4">
                  <p className="text-xs text-[var(--theme-text)]/70">
                    <strong className="text-indigo-400">Tip:</strong> Press <kbd className="mx-1 rounded bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-300">?</kbd> anytime to view these shortcuts. They won&apos;t work when typing in input fields.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
