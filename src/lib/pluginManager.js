import { addDoc, deleteDoc } from 'firebase/firestore';
import { tenantCollection, tenantDoc } from './tenant.js';

const resolveApi = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MARKETPLACE_API) {
    return import.meta.env.VITE_MARKETPLACE_API;
  }
  if (typeof globalThis !== 'undefined' && globalThis.process?.env?.VITE_MARKETPLACE_API) {
    return globalThis.process.env.VITE_MARKETPLACE_API;
  }
  return 'https://api.hustlestudio.co.za/plugins';
};

export async function fetchMarketplacePlugins() {
  const endpoint = `${resolveApi()}`;
  try {
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error('Failed to load marketplace');
    const payload = await response.json();
    return Array.isArray(payload) ? payload : payload?.plugins ?? [];
  } catch (error) {
    console.warn('[Marketplace] Falling back to empty plugin list', error);
    return [];
  }
}

export async function installPlugin(pluginId, tenantId) {
  if (!pluginId || !tenantId) throw new Error('Plugin id and tenant id required');
  const response = await fetch(`${resolveApi()}/${pluginId}`);
  if (!response.ok) {
    throw new Error('Unable to fetch plugin metadata');
  }
  const plugin = await response.json();
  await addDoc(tenantCollection(tenantId, 'plugins'), {
    ...plugin,
    installedAt: new Date().toISOString(),
  });
  return plugin;
}

export async function removePlugin(tenantId, pluginId) {
  if (!tenantId || !pluginId) return;
  await deleteDoc(tenantDoc(tenantId, 'plugins', pluginId));
}
