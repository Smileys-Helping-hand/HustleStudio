const rawCdn = (import.meta.env.VITE_CDN_DOMAIN || '').trim();
const normalizedBase = rawCdn ? rawCdn.replace(/\/$/, '') : '';
const defaultBase = '/assets';
const assetBase = (normalizedBase || defaultBase).replace(/\/$/, '');

export const ASSET_BASE = assetBase;
export const ASSET_CDN = assetBase; // Backwards compatibility

export function asset(path = '') {
  if (!path) {
    return `${assetBase}/`;
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const cleaned = path.replace(/^\/+/, '').replace(/^assets\//, '');
  return `${assetBase}/${cleaned}`;
}

export const ASSET_MANIFEST_URL = asset('manifest.json');

export const ASSETS = {
  videoIntro: null, // asset('media/intro-loop.mp4'),
  videoIntroCaptions: null, // asset('media/intro-loop.vtt'),
  audioStartup: null, // asset('media/startup-ambience.mp3'),
  audioStartupCaptions: null, // asset('media/startup-ambience.vtt'),
  logoMain: '/assets/logos/hustle-logo.png',
  logoLight: '/assets/logos/hustle-logo.png',
  logoDark: '/assets/logos/hustle-logo.png',
  backgroundHero: null, // asset('backgrounds/hero-gradient.webp'),
  backgroundLogin: null, // asset('backgrounds/login-flare.webp'),
  backgroundDashboard: null, // asset('backgrounds/dashboard-dust.webp'),
  backgroundBanner: null, // asset('backgrounds/hustle-abstract-banner.webp'),
  patternGrid: null, // asset('patterns/pattern-grid.webp'),
  patternWave: null, // asset('patterns/pattern-wave.webp'),
  patternOverlay: null, // asset('patterns/overlay-noise.png'),
  iconDashboard: null, // asset('icons/icon-dashboard.svg'),
  iconInventory: null, // asset('icons/icon-inventory.svg'),
  iconReports: null, // asset('icons/icon-reports.svg'),
  iconSettings: null, // asset('icons/icon-settings.svg'),
  iconVisuals: null, // asset('icons/icon-visuals.svg'),
  appIcon192: asset('icons/app-icon-192.png'),
  appIcon512: asset('icons/app-icon-512.png'),
};
