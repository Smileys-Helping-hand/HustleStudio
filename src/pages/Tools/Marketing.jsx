import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FiCopy, FiHash, FiStar } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader.jsx';

const tonePresets = [
  { label: 'Bold Launch', value: 'bold', helper: 'High-energy announcement copy with momentum.' },
  { label: 'Luxury Experience', value: 'luxury', helper: 'Elegant, premium positioning for affluent audiences.' },
  { label: 'Community Builder', value: 'community', helper: 'Warm, collaborative tone for social groups.' },
];

const hashtagBuckets = {
  generic: ['#HustleStudio', '#BusinessOps', '#TeamWorkflow', '#SouthAfricaBusiness'],
  retail: ['#PointOfSale', '#RetailSuccess', '#StoreLaunch', '#LocalVendors'],
  hospitality: ['#EventExperience', '#VenueLife', '#CapeTownEvents', '#LuxuryHospitality'],
};

const marketingScenarios = [
  {
    label: 'Product Spotlight',
    prompt:
      'Highlight the signature feature of the product and encourage followers to book a demo or visit in-store today.',
  },
  {
    label: 'Behind-the-scenes',
    prompt: 'Share a short story about the team preparing for a big launch with a warm prompt to follow along.',
  },
  {
    label: 'Customer Story',
    prompt: 'Celebrate a recent client win and encourage referrals with a limited-time incentive.',
  },
];

const buildHashtags = (segment) => hashtagBuckets[segment] ?? hashtagBuckets.generic;

const generateCaption = (tone, scenario, custom) => {
  const base = marketingScenarios.find((item) => item.label === scenario)?.prompt ?? '';
  const toneHelper = tonePresets.find((item) => item.value === tone)?.helper ?? '';
  return `${base}\n\n${toneHelper}\n\n${custom}`.trim();
};

const Marketing = () => {
  const [tone, setTone] = useState(tonePresets[0].value);
  const [segment, setSegment] = useState('generic');
  const [scenario, setScenario] = useState(marketingScenarios[0].label);
  const [customNotes, setCustomNotes] = useState('Add a punchy CTA to drive traffic back to the dashboard.');

  const caption = useMemo(() => generateCaption(tone, scenario, customNotes), [tone, scenario, customNotes]);
  const hashtags = useMemo(() => buildHashtags(segment), [segment]);

  const copyToClipboard = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied to clipboard.`);
    } catch {
      toast.error('Unable to copy to clipboard.');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0e0e18] to-[#1b1830] px-4 pb-16 text-white sm:px-8">
      <PageHeader
        title="Marketing Caption Lab"
        subtitle="Craft launch-ready captions and hashtags tailored for your current campaign."
        actions={
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/60">
            <FiStar /> Instant generator
          </span>
        }
      />

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"
      >
        <article className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_30px_rgba(99,102,241,0.12)]">
          <h2 className="text-lg font-semibold">Define the brief</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-white/70">
              Tone preset
              <select
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
                value={tone}
                onChange={(event) => setTone(event.target.value)}
              >
                {tonePresets.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-white/70">
              Audience segment
              <select
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
                value={segment}
                onChange={(event) => setSegment(event.target.value)}
              >
                {Object.keys(hashtagBuckets).map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-white/70 sm:col-span-2">
              Scenario
              <select
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
                value={scenario}
                onChange={(event) => setScenario(event.target.value)}
              >
                {marketingScenarios.map((item) => (
                  <option key={item.label} value={item.label}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-white/70 sm:col-span-2">
              Custom notes
              <textarea
                className="mt-1 h-32 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
                value={customNotes}
                onChange={(event) => setCustomNotes(event.target.value)}
              />
            </label>
          </div>
        </article>

        <article className="space-y-6 rounded-3xl border border-indigo-400/40 bg-indigo-500/10 p-6 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-indigo-100">Generated caption</h2>
            <button
              type="button"
              onClick={() => copyToClipboard(caption, 'Caption')}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/80 transition hover:border-white/40"
            >
              <FiCopy /> Copy
            </button>
          </div>
          <p className="rounded-2xl bg-black/40 p-4 text-sm leading-relaxed text-white/80">{caption}</p>
          <div>
            <h3 className="text-sm font-semibold text-indigo-100">Suggested hashtags</h3>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-indigo-200">
              {hashtags.map((tag) => (
                <span key={tag} className="rounded-full border border-indigo-400/40 bg-indigo-500/20 px-3 py-1">
                  <FiHash className="mr-1 inline" />
                  {tag}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(hashtags.join(' '), 'Hashtags')}
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/80 transition hover:border-white/40"
            >
              <FiCopy /> Copy hashtags
            </button>
          </div>
        </article>
      </motion.section>
    </main>
  );
};

export default Marketing;
