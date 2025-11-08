import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { themes } from './themes.js';
import { useAuth } from '../context/AuthContext.jsx';
import { db } from '../lib/firebase';

const STORAGE_KEY = 'hs-theme';
const themeKeys = Object.keys(themes);

const ThemeContext = createContext({
  themeKey: 'dark',
  theme: themes.dark,
  setTheme: () => {},
  cycleTheme: () => {},
});

const applyThemeToDocument = (theme) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--theme-background', theme.background);
  root.style.setProperty('--theme-surface', theme.surface);
  root.style.setProperty('--theme-text', theme.text);
  root.style.setProperty('--theme-accent', theme.accent);
  root.style.setProperty('--theme-secondary', theme.secondary);
  root.style.setProperty('--theme-highlight', theme.secondary);
  document.body.style.backgroundColor = theme.background;

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', theme.background);
  } else {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = theme.background;
    document.head.appendChild(meta);
  }
};

export const ThemeProvider = ({ children }) => {
  const { user, reportOffline } = useAuth();
  const [themeKey, setThemeKey] = useState('dark');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && themes[stored]) {
      setThemeKey(stored);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const fetchSettings = async () => {
      try {
        const ref = doc(db, 'userSettings', user.uid);
        const snapshot = await getDoc(ref);
        if (!active) return;
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.theme && themes[data.theme]) {
            setThemeKey(data.theme);
          }
        }
      } catch (error) {
        console.error('[Firestore] Failed to load theme preference.', error);
        reportOffline();
      }
    };
    fetchSettings();
    return () => {
      active = false;
    };
  }, [user, reportOffline]);

  useEffect(() => {
    const theme = themes[themeKey] ?? themes.dark;
    applyThemeToDocument(theme);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, themeKey);
    }
  }, [themeKey]);

  useEffect(() => {
    if (!user) return;
    const persist = async () => {
      try {
        await setDoc(
          doc(db, 'userSettings', user.uid),
          {
            theme: themeKey,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (error) {
        console.error('[Firestore] Unable to persist theme preference.', error);
        reportOffline();
      }
    };
    persist();
  }, [user, themeKey, reportOffline]);

  const cycleTheme = useCallback(() => {
    setThemeKey((current) => {
      const index = themeKeys.indexOf(current);
      const nextIndex = (index + 1) % themeKeys.length;
      return themeKeys[nextIndex];
    });
  }, []);

  const value = useMemo(
    () => ({
      themeKey,
      theme: themes[themeKey] ?? themes.dark,
      setTheme: setThemeKey,
      cycleTheme,
    }),
    [themeKey, cycleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useTheme = () => useContext(ThemeContext);
