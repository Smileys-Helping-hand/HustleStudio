import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { FiCpu, FiLoader, FiPlus } from 'react-icons/fi';
import PageHeader from '../components/common/PageHeader.jsx';
import { useTenant } from '../context/TenantContext.jsx';
import { useNotify } from '../context/NotificationContext.jsx';
import { tenantCollection } from '../lib/tenant.js';
import {
  generateCampaignBrief,
  generateCaptions,
  generateEmailSequence,
  generateHashtags,
  summarizeCampaignPerformance,
} from '../lib/marketingAI.js';

const tabs = [
  { key: 'content', label: 'Content Studio' },
  { key: 'campaigns', label: 'Campaigns' },
  { key: 'performance', label: 'Performance' },
];

const MarketingLab = () => {
  const { activeTenantId } = useTenant();
  const notify = useNotify();
  const [activeTab, setActiveTab] = useState('content');
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ product: '', audience: '', tone: 'modern' });
  const [result, setResult] = useState('');

  useEffect(() => {
    if (!activeTenantId) {
      setCampaigns([]);
      return () => {};
    }
    const campaignQuery = query(
      tenantCollection(activeTenantId, 'marketingCampaigns'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(campaignQuery, (snapshot) => {
      setCampaigns(snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() })));
    });
    return () => unsubscribe();
  }, [activeTenantId]);

  const runGenerator = async (type) => {
    if (!form.product.trim()) {
      notify({ type: 'warning', title: 'Add product details first.' });
      return;
    }
    try {
      setLoading(true);
      let response = '';
      if (type === 'brief') {
        response = await generateCampaignBrief(form.product, form.audience || 'general');
      } else if (type === 'captions') {
        response = await generateCaptions(form.product, form.tone);
      } else if (type === 'hashtags') {
        response = await generateHashtags(form.audience || form.product, form.tone);
      } else if (type === 'emails') {
        response = await generateEmailSequence(form.product, form.audience || 'subscribers');
      }
      setResult(response);
      notify({ type: 'success', title: 'AI content generated' });
    } catch (error) {
      console.error('[MarketingLab] generation failed', error);
      notify({ type: 'error', title: 'Unable to generate content', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const saveCampaign = async () => {
    if (!activeTenantId || !result.trim()) {
      notify({ type: 'warning', title: 'Generate a campaign before saving.' });
      return;
    }
    await addDoc(tenantCollection(activeTenantId, 'marketingCampaigns'), {
      product: form.product,
      audience: form.audience,
      tone: form.tone,
      content: result,
      createdAt: serverTimestamp(),
    });
    notify({ type: 'success', title: 'Campaign saved to workspace' });
  };

  const performanceInsights = useMemo(() => campaigns.slice(0, 5), [campaigns]);

  const summarisePerformance = async () => {
    if (!performanceInsights.length) {
      notify({ type: 'info', title: 'Capture campaign results to summarise performance.' });
      return;
    }
    try {
      setLoading(true);
      const summary = await summarizeCampaignPerformance(performanceInsights);
      setResult(summary);
      setActiveTab('performance');
    } catch (error) {
      notify({ type: 'error', title: 'Unable to summarise performance', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#101022] to-[#1b1340] px-4 pb-16 text-white sm:px-8">
      <PageHeader
        title="AI Marketing Lab"
        subtitle="Generate on-brand content, store campaigns, and review performance insights for every workspace."
        actions={
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={summarisePerformance}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/70 transition hover:border-indigo-400/60"
            >
              <FiCpu /> AI Summary
            </button>
            <button
              type="button"
              onClick={saveCampaign}
              className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-indigo-100 transition hover:bg-indigo-500/30"
            >
              <FiPlus /> Save Campaign
            </button>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap gap-3">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.3em] transition ${
              activeTab === tab.key
                ? 'bg-indigo-500/30 text-white shadow-[0_0_20px_rgba(99,102,241,0.35)]'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'content' && (
        <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <motion.div
            layout
            className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_35px_rgba(99,102,241,0.16)]"
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="text-xs uppercase tracking-[0.3em] text-white/60">
                Product
                <input
                  type="text"
                  value={form.product}
                  onChange={(event) => setForm((prev) => ({ ...prev, product: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
                />
              </label>
              <label className="text-xs uppercase tracking-[0.3em] text-white/60">
                Audience
                <input
                  type="text"
                  value={form.audience}
                  onChange={(event) => setForm((prev) => ({ ...prev, audience: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
                />
              </label>
              <label className="text-xs uppercase tracking-[0.3em] text-white/60">
                Tone
                <select
                  value={form.tone}
                  onChange={(event) => setForm((prev) => ({ ...prev, tone: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
                >
                  <option value="modern">Modern</option>
                  <option value="luxury">Luxury</option>
                  <option value="playful">Playful</option>
                  <option value="professional">Professional</option>
                </select>
              </label>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => runGenerator('brief')}
                className="rounded-full border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-indigo-100 transition hover:border-indigo-400"
              >
                Campaign Brief
              </button>
              <button
                type="button"
                onClick={() => runGenerator('captions')}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/70 transition hover:border-indigo-400/60"
              >
                Captions
              </button>
              <button
                type="button"
                onClick={() => runGenerator('hashtags')}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/70 transition hover:border-indigo-400/60"
              >
                Hashtags
              </button>
              <button
                type="button"
                onClick={() => runGenerator('emails')}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/70 transition hover:border-indigo-400/60"
              >
                Email Sequence
              </button>
            </div>
            <textarea
              value={loading ? 'Generating content…' : result}
              onChange={(event) => setResult(event.target.value)}
              placeholder="Generated content will appear here."
              rows={12}
              className="h-[320px] w-full rounded-3xl border border-white/10 bg-black/40 px-4 py-4 text-sm text-white focus:border-indigo-400 focus:outline-none"
            />
          </motion.div>

          <aside className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/70 shadow-[0_0_35px_rgba(99,102,241,0.1)]">
            <h3 className="text-lg font-semibold text-white">Workspace resources</h3>
            <p>
              Pull visuals from the CDN, attach product links, and save campaigns to collaborate with your team across tenants.
            </p>
            <div className="rounded-2xl border border-dashed border-white/20 bg-black/30 p-4 text-xs text-white/50">
              Tip: Use the scheduler to plan posts across Instagram, TikTok, and LinkedIn.
            </div>
            {loading && (
              <div className="flex items-center gap-2 text-indigo-200">
                <FiLoader className="animate-spin" /> Generating copy…
              </div>
            )}
          </aside>
        </section>
      )}

      {activeTab === 'campaigns' && (
        <motion.section
          layout
          className="grid gap-6 md:grid-cols-2"
        >
          {campaigns.map((campaign) => (
            <article
              key={campaign.id}
              className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_35px_rgba(99,102,241,0.16)]"
            >
              <h3 className="text-lg font-semibold text-white">{campaign.product}</h3>
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">{campaign.audience || 'General audience'}</p>
              <pre className="mt-4 max-h-48 overflow-y-auto whitespace-pre-wrap text-sm text-white/70">{campaign.content}</pre>
            </article>
          ))}
          {!campaigns.length && (
            <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-6 text-sm text-white/60">
              Generate and save your first campaign to populate this view.
            </div>
          )}
        </motion.section>
      )}

      {activeTab === 'performance' && (
        <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_35px_rgba(99,102,241,0.12)]">
          <h3 className="text-lg font-semibold text-white">Performance summary</h3>
          <p className="text-sm text-white/70">
            Paste metrics from ads managers or use the scheduler auto-tracking to build richer summaries.
          </p>
          <textarea
            value={result}
            onChange={(event) => setResult(event.target.value)}
            rows={12}
            className="w-full rounded-3xl border border-white/10 bg-black/40 px-4 py-4 text-sm text-white focus:border-indigo-400 focus:outline-none"
          />
        </section>
      )}
    </main>
  );
};

export default MarketingLab;
