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
  videoIntro: asset('media/intro-loop.mp4'),
  videoIntroCaptions: asset('media/intro-loop.vtt'),
  audioStartup: asset('media/startup-ambience.mp3'),
  audioStartupCaptions: asset('media/startup-ambience.vtt'),
  logoMain: asset('logos/hustle-logo.svg'),
  logoLight: asset('logos/hustle-logo.svg'),
  logoDark: asset('logos/hustle-logo.svg'),
  backgroundHero: asset('backgrounds/hero-gradient.webp'),
  backgroundLogin: asset('backgrounds/login-flare.webp'),
  backgroundDashboard: asset('backgrounds/dashboard-dust.webp'),
  backgroundBanner: asset('backgrounds/hustle-abstract-banner.webp'),
  patternGrid: asset('patterns/pattern-grid.webp'),
  patternWave: asset('patterns/pattern-wave.webp'),
  patternOverlay: asset('patterns/overlay-noise.png'),
  iconDashboard: asset('icons/icon-dashboard.svg'),
  iconInventory: asset('icons/icon-inventory.svg'),
  iconReports: asset('icons/icon-reports.svg'),
  iconSettings: asset('icons/icon-settings.svg'),
  iconVisuals: asset('icons/icon-visuals.svg'),
  appIcon192: asset('icons/app-icon-192.png'),
  appIcon512: asset('icons/app-icon-512.png'),
};
