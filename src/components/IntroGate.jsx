import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../theme/ThemeContext.jsx';
import { ASSETS } from '@/config/assets.js';

const FIRST_LAUNCH_KEY = 'hustle-studio-first-launch';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export default function IntroGate({ onComplete }) {
  const { showIntroOnStartup, introMedia } = useTheme();
  const [visible, setVisible] = useState(false);
  const [hasSeenIntro, setHasSeenIntro] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(FIRST_LAUNCH_KEY) === 'true';
    setHasSeenIntro(stored);
    // If the user has already seen the intro, respect that and skip it.
    if (stored) {
      onComplete?.();
      return;
    }
    // Otherwise, show the intro only if the theme setting enables it.
    setVisible(showIntroOnStartup);
  }, [showIntroOnStartup, onComplete]);

  useEffect(() => {
    if (!visible) return;
    const audio = audioRef.current;
    if (!audio) return;
    const play = async () => {
      try {
        await audio.play();
      } catch (error) {
        console.warn('[IntroGate] Autoplay blocked.', error);
      }
    };
    play();
  }, [visible]);

  const finishIntro = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(FIRST_LAUNCH_KEY, 'true');
    }
    setVisible(false);
    setTimeout(() => onComplete?.(), 350);
  };

  const skipIntro = () => {
    finishIntro();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={containerVariants}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <video
            className="absolute inset-0 h-full w-full object-cover opacity-80"
            src={introMedia?.videoUrl ?? ASSETS.videoIntro}
            autoPlay
            muted
            loop
            playsInline
            aria-label="Hustle Studio intro visual"
          >
            <track kind="captions" src={ASSETS.videoIntroCaptions} label="Intro visuals" />
          </video>
          <audio
            ref={audioRef}
            src={introMedia?.audioUrl ?? ASSETS.audioStartup}
            loop
            aria-label="Intro ambience"
          >
            <track kind="captions" src={ASSETS.audioStartupCaptions} label="Intro ambience" />
          </audio>
          <motion.div
            className="relative z-10 flex max-w-3xl flex-col items-center gap-6 rounded-3xl border border-white/10 bg-black/60 p-12 text-center text-white backdrop-blur-xl shadow-2xl"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <span className="text-sm uppercase tracking-[0.6em] text-white/70">Welcome to</span>
            <h1 className="text-4xl font-semibold tracking-widest text-white drop-shadow-[0_12px_35px_rgba(168,85,247,0.35)]">
              Hustle Studio
            </h1>
            <p className="max-w-xl text-base text-white/70">
              Cinematic control room for your operations. {hasSeenIntro ? 'Enjoy the quick revisit.' : 'Let the ambience set the tone before you enter.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={finishIntro}
                className="rounded-full border border-white/30 bg-white/10 px-6 py-2 text-sm uppercase tracking-[0.3em] text-white transition hover:bg-white/20 hover:text-white"
              >
                Enter Studio
              </button>
              <button
                type="button"
                onClick={skipIntro}
                className="rounded-full px-5 py-2 text-xs uppercase tracking-[0.35em] text-white/70 transition hover:text-white"
              >
                Skip Intro
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

IntroGate.propTypes = {
  onComplete: PropTypes.func,
};
