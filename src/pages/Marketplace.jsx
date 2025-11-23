import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import PageHeader from '../components/common/PageHeader.jsx';
import { fetchMarketplacePlugins, installPlugin } from '../lib/pluginManager.js';
import { useTenant } from '../context/TenantContext.jsx';
import { toast } from 'react-hot-toast';

export default function Marketplace() {
  const { activeTenantId } = useTenant();
  const [plugins, setPlugins] = useState([]);
  const [installing, setInstalling] = useState(null);

  useEffect(() => {
    const load = async () => {
      const catalogue = await fetchMarketplacePlugins();
      setPlugins(catalogue);
    };
    load().catch((error) => console.error('[Marketplace] Unable to fetch catalogue', error));
  }, []);

  const handleInstall = async (pluginId) => {
    if (!activeTenantId) {
      toast.error('Select a workspace to install plugins.');
      return;
    }
    try {
      setInstalling(pluginId);
      await installPlugin(pluginId, activeTenantId);
      toast.success('Plugin installed successfully.');
    } catch (error) {
      console.error('[Marketplace] Install failed', error);
      toast.error(error.message || 'Unable to install plugin.');
    } finally {
      setInstalling(null);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-16">
      <PageHeader
        title="Extension Marketplace"
        subtitle="Add AI templates, automation packs, and finance add-ons to your workspace."
      />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {plugins.map((plugin) => (
          <motion.article
            key={plugin.id}
            layout
            className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_25px_rgba(99,102,241,0.15)]"
            whileHover={{ y: -4, boxShadow: '0 12px 35px rgba(99,102,241,0.25)' }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{plugin.name ?? 'Hustle Studio Extension'}</h3>
              <span className="rounded-full bg-indigo-500/30 px-3 py-1 text-xs uppercase tracking-[0.25em] text-indigo-200">
                {plugin.category ?? 'General'}
              </span>
            </div>
            <p className="flex-1 text-sm text-white/70">{plugin.description ?? 'Deploy additional productivity features instantly.'}</p>
            <div className="mt-6 flex items-center justify-between text-sm text-white/60">
              <span>Version {plugin.version ?? '1.0.0'}</span>
              <span>{plugin.pricing ?? 'Included'}</span>
            </div>
            <button
              type="button"
              onClick={() => handleInstall(plugin.id)}
              disabled={installing === plugin.id}
              className="mt-6 inline-flex items-center justify-center rounded-full bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(99,102,241,0.35)] transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {installing === plugin.id ? 'Installing…' : 'Install plugin'}
            </button>
          </motion.article>
        ))}
        {plugins.length === 0 && (
          <div className="col-span-full rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-white/50">
            No marketplace listings available yet. Sync from the partner portal or run <code className="rounded bg-black/40 px-2 py-1">npm run plugins:sync</code>.
          </div>
        )}
      </div>
    </div>
  );
}
