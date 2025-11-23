import { ASSETS, ASSET_BASE, asset } from './assets.js';

export const defaultBrand = {
  name: 'Hustle Studio',
  logo: ASSETS.logoLight,
  favicon: ASSETS.logoMain,
  colors: {
    primary: '#6366f1',
    accent: '#8b5cf6',
    surface: '#0f0f17',
    text: '#f5f5f5',
  },
  domain: 'hustlestudio.co.za',
  marketplaceUrl: asset(''),
  assetBase: ASSET_BASE,
};

export function getBrandConfig(tenantId, override = {}) {
  const themedOverride = override?.colors
    ? {
        ...override,
        colors: {
          ...defaultBrand.colors,
          ...override.colors,
        },
      }
    : override;

  return {
    ...defaultBrand,
    ...themedOverride,
    tenantId: tenantId ?? themedOverride?.tenantId ?? null,
  };
}
