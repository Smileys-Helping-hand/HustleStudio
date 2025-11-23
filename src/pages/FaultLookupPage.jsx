import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import PageHeader from '../components/common/PageHeader.jsx';
import { asset } from '../config/assets.js';

const formatText = (value) => value ?? '';

export default function FaultLookupPage() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const diagramSource = useMemo(() => {
    if (!result?.diagramUrl) return null;
    const url = String(result.diagramUrl).trim();
    if (!url) return null;
    return /^https?:\/\//i.test(url) ? url : asset(url);
  }, [result]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!code.trim()) {
      setError('Please enter a diagnostic code.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/codes?code=${encodeURIComponent(code.trim())}`);
      const payload = await response.json();
      if (!response.ok) {
        setResult(null);
        setError(payload?.error ?? 'Code not found.');
        return;
      }
      setResult(payload);
    } catch (fetchError) {
      console.error('[FaultLookup] fetch error', fetchError);
      setError('Unable to reach the fault code service.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[calc(100vh-10rem)] w-full max-w-5xl flex-col gap-8 px-4 pb-16">
      <PageHeader
        title="OBD-II Fault Lookup"
        subtitle="Search common diagnostic trouble codes and review recommended checks before swapping parts."
      />
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_30px_rgba(99,102,241,0.15)] backdrop-blur">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row">
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="Enter code (e.g. P0301)"
            className="flex-1 rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Diagnostic trouble code"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
          >
            {loading ? 'Checking…' : 'Lookup'}
          </button>
        </form>
        {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
      </section>
      {result && (
        <motion.section
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid gap-6 rounded-2xl border border-white/10 bg-black/40 p-6 text-sm shadow-[0_0_25px_rgba(147,51,234,0.15)] sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <h2 className="text-2xl font-semibold text-indigo-300">
              {result.code} — {result.description}
            </h2>
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/50">
              Subsystem · {result.subsystem}
            </p>
          </div>
          <div className="space-y-3 rounded-xl border border-white/5 bg-white/5 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">Typical Causes</h3>
            <pre className="whitespace-pre-wrap text-sm text-white/80">{formatText(result.causes)}</pre>
          </div>
          <div className="space-y-3 rounded-xl border border-white/5 bg-white/5 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">Checks Before Replacing Parts</h3>
            <pre className="whitespace-pre-wrap text-sm text-white/80">{formatText(result.checks)}</pre>
          </div>
          <div className="space-y-3 rounded-xl border border-white/5 bg-white/5 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">Likely Repairs</h3>
            <pre className="whitespace-pre-wrap text-sm text-white/80">{formatText(result.repairs)}</pre>
          </div>
          {diagramSource && (
            <div className="space-y-3 rounded-xl border border-white/5 bg-white/5 p-4 sm:col-span-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">Component Diagram</h3>
              <img
                src={diagramSource}
                alt={`${result.code} diagram`}
                className="h-full max-h-72 w-full rounded-lg border border-white/5 bg-black/60 object-contain"
                loading="lazy"
              />
            </div>
          )}
        </motion.section>
      )}
    </main>
  );
}
