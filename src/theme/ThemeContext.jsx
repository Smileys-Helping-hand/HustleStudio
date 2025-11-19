import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext.jsx';
import { db } from '../lib/firebase';
import { themes, themeOrder } from './themes.js';

const STORAGE_KEY = 'hustle-studio-theme';
const INTRO_STORAGE_KEY = 'hustle-studio-intro';

const ThemeContext = createContext({
  themeKey: 'noctisGold',
  theme: themes.noctisGold,
  showIntroOnStartup: true,
  introMedia: null,
  cycleTheme: () => {},
  setTheme: () => {},
  setShowIntroOnStartup: () => {},
  setIntroMedia: () => {},
});

const applyThemeToDocument = (theme) => {
  const root = document.documentElement;
  root.style.setProperty('--theme-background', theme.palette.background);
  root.style.setProperty('--theme-surface', theme.palette.surface);
  root.style.setProperty('--theme-accent', theme.palette.accent);
  root.style.setProperty('--theme-accent-soft', theme.palette.accentSoft);
  root.style.setProperty('--theme-highlight', theme.palette.highlight);
  root.style.setProperty('--theme-text', theme.palette.text);
  document.body.style.backgroundColor = theme.palette.background;
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', theme.meta.themeColor);
  } else {
    const newMeta = document.createElement('meta');
    newMeta.name = 'theme-color';
    newMeta.content = theme.meta.themeColor;
    document.head.appendChild(newMeta);
  }
};

export const ThemeProvider = ({ children }) => {
  const { user, reportOffline } = useAuth();
  const [themeKey, setThemeKey] = useState('noctisGold');
  const [showIntroOnStartup, setShowIntroOnStartup] = useState(true);
  const [introMedia, setIntroMedia] = useState({});
  const initialisedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    const storedIntro = window.localStorage.getItem(INTRO_STORAGE_KEY);
    if (storedTheme && themes[storedTheme]) {
      setThemeKey(storedTheme);
    }
    if (storedIntro !== null) {
      setShowIntroOnStartup(storedIntro === 'true');
    }
    initialisedRef.current = true;
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = async () => {
      try {
        const snapshot = await getDoc(doc(db, 'userSettings', user.uid));
        if (!active) return;
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.theme && themes[data.theme]) {
            setThemeKey(data.theme);
          }
          if (typeof data.showIntroOnStartup === 'boolean') {
            setShowIntroOnStartup(data.showIntroOnStartup);
          }
          if (data.introMedia) {
            setIntroMedia(data.introMedia);
          } else {
            setIntroMedia({});
          }
        } else {
          setIntroMedia({});
        }
      } catch (error) {
        console.error('[Firestore] Failed to load user settings.', error);
        reportOffline();
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [user, reportOffline]);

  useEffect(() => {
    if (!initialisedRef.current || typeof window === 'undefined') return;
    const theme = themes[themeKey] ?? themes.noctisGold;
    applyThemeToDocument(theme);
    window.localStorage.setItem(STORAGE_KEY, theme.key);
  }, [themeKey]);

  useEffect(() => {
    if (!initialisedRef.current || typeof window === 'undefined') return;
    window.localStorage.setItem(INTRO_STORAGE_KEY, String(showIntroOnStartup));
  }, [showIntroOnStartup]);

  useEffect(() => {
    if (!user) return;
    const persist = async () => {
      try {
        await setDoc(
          doc(db, 'userSettings', user.uid),
          {
            theme: themeKey,
            showIntroOnStartup,
            introMedia: introMedia && Object.keys(introMedia).length ? introMedia : null,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        console.info('[Firestore] User settings updated.');
      } catch (error) {
        console.error('[Firestore] Failed to persist user settings.', error);
        reportOffline();
      }
    };
    persist();
  }, [user, themeKey, showIntroOnStartup, introMedia, reportOffline]);

  const cycleTheme = useCallback(() => {
    setThemeKey((current) => {
      const index = themeOrder.indexOf(current);
      const nextIndex = (index + 1) % themeOrder.length;
      return themeOrder[nextIndex];
    });
  }, []);

  const value = useMemo(
    () => ({
      themeKey,
      theme: themes[themeKey] ?? themes.noctisGold,
      showIntroOnStartup,
      introMedia,
      setTheme: setThemeKey,
      setShowIntroOnStartup,
      setIntroMedia,
      cycleTheme,
    }),
    [themeKey, showIntroOnStartup, introMedia, cycleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useTheme = () => useContext(ThemeContext);
