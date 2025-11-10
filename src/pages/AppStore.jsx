import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import PageHeader from '../components/common/PageHeader.jsx';
import {
  fetchAppCatalog,
  fetchInstalledApps,
  installApp,
  submitApp,
  recordAppRating,
} from '../lib/appStoreClient.js';
import { useTenant } from '../context/TenantContext.jsx';

const tabs = [
  { key: 'discover', label: 'Discover Apps' },
  { key: 'installed', label: 'My Installs' },
  { key: 'submit', label: 'Submit App' },
];

const badgeColors = {
  marketing: 'bg-pink-500/20 text-pink-200',
  finance: 'bg-emerald-500/20 text-emerald-200',
  automation: 'bg-indigo-500/20 text-indigo-200',
};

const AppCard = ({ app, onInstall, onRate }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_25px_rgba(99,102,241,0.1)]"
  >
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">{app.name}</h3>
        <span className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.35em] ${badgeColors[app.category] || 'bg-white/10 text-white/70'}`}>
          {app.category || 'general'}
        </span>
      </div>
      <p className="text-sm text-white/70">{app.description}</p>
      {app.version ? (
        <p className="text-xs text-white/50">Version {app.version}</p>
      ) : null}
      <p className="text-xs text-white/60">Publisher: {app.publisher || 'Marketplace'}</p>
    </div>
    <div className="mt-4 flex items-center justify-between">
      <button
        type="button"
        onClick={() => onInstall(app)}
        className="rounded-full bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
      >
        Install
      </button>
      <button
        type="button"
        onClick={() => onRate(app)}
        className="rounded-full bg-white/10 px-4 py-2 text-sm text-white/80 transition hover:bg-white/20"
      >
        Rate ★ {Number(app.rating || 0).toFixed(1)}
      </button>
    </div>
  </motion.div>
);

export default function AppStore() {
  const { activeTenantId } = useTenant();
  const [tab, setTab] = useState('discover');
  const [catalog, setCatalog] = useState([]);
  const [installed, setInstalled] = useState([]);
  const [submission, setSubmission] = useState({ name: '', description: '', url: '', contactEmail: '' });

  useEffect(() => {
    fetchAppCatalog().then(setCatalog);
  }, []);

  useEffect(() => {
    if (!activeTenantId) return;
    fetchInstalledApps(activeTenantId).then(setInstalled);
  }, [activeTenantId]);

  const filteredCatalog = useMemo(() => {
    if (tab !== 'discover') return catalog;
    return catalog.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
  }, [catalog, tab]);

  const handleInstall = async (app) => {
    if (!activeTenantId) {
      toast.error('Select a workspace before installing apps.');
      return;
    }
    try {
      await installApp(activeTenantId, app);
      toast.success(`${app.name} installed successfully.`);
      const apps = await fetchInstalledApps(activeTenantId);
      setInstalled(apps);
      setTab('installed');
    } catch (error) {
      console.error(error);
      toast.error('Installation failed.');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await submitApp(submission);
      toast.success('Submission received! The review team will follow up shortly.');
      setSubmission({ name: '', description: '', url: '', contactEmail: '' });
      setTab('discover');
    } catch (error) {
      console.error(error);
      toast.error('Submission failed.');
    }
  };

  const handleRate = async (app) => {
    if (!activeTenantId) {
      toast.error('Select a workspace to record ratings.');
      return;
    }
    const rating = Number(window.prompt(`Rate ${app.name} from 1-5`, '5'));
    if (!rating || Number.isNaN(rating)) return;
    await recordAppRating(activeTenantId, app.id, rating);
    toast.success('Rating saved.');
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-12">
      <PageHeader
        title="Hustle Studio App Store"
        subtitle="Install extensions to expand your workspace capabilities."
        actions={[
          {
            label: 'Submit App',
            onClick: () => setTab('submit'),
          },
        ]}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              tab === item.key
                ? 'bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.35)]'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'submit' ? (
        <form
          onSubmit={handleSubmit}
          className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 text-white shadow-[0_0_25px_rgba(99,102,241,0.08)]"
        >
          <label className="grid gap-1 text-sm">
            <span>App Name</span>
            <input
              required
              value={submission.name}
              onChange={(event) => setSubmission((state) => ({ ...state, name: event.target.value }))}
              className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>Description</span>
            <textarea
              required
              value={submission.description}
              onChange={(event) => setSubmission((state) => ({ ...state, description: event.target.value }))}
              className="min-h-[120px] rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>Support Email</span>
            <input
              type="email"
              required
              value={submission.contactEmail}
              onChange={(event) => setSubmission((state) => ({ ...state, contactEmail: event.target.value }))}
              className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>Documentation URL</span>
            <input
              type="url"
              value={submission.url}
              onChange={(event) => setSubmission((state) => ({ ...state, url: event.target.value }))}
              className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </label>
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-full bg-indigo-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
            >
              Submit for Review
            </button>
          </div>
        </form>
      ) : null}

      {tab === 'discover' ? (
        <motion.div layout className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCatalog.map((app) => (
            <AppCard key={app.id} app={app} onInstall={handleInstall} onRate={handleRate} />
          ))}
        </motion.div>
      ) : null}

      {tab === 'installed' ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {installed.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
              Install your first extension from the Discover tab.
            </div>
          ) : (
            installed.map((app) => (
              <div key={app.id || app.appId} className="rounded-xl border border-white/10 bg-white/5 p-6 text-white">
                <h3 className="text-lg font-semibold">{app.name}</h3>
                <p className="text-sm text-white/70">{app.description}</p>
              </div>
            ))
          )}
        </div>
      ) : null}
    </main>
  );
}
