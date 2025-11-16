import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { listTenantCvHistory } from '../../lib/candidateManager';
import { useAuth } from '../../context/AuthContext.jsx';

const TEMPLATE_FILTERS = ['all', 'modern', 'minimal', 'corporate'];

const CVManager = () => {
  const { tenantId } = useAuth();
  const [history, setHistory] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    async function load() {
      setLoading(true);
      try {
        const records = await listTenantCvHistory({ tenantId });
        setHistory(records);
      } catch (error) {
        console.error('Unable to load CV history', error);
        toast.error('Unable to load CV history');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tenantId]);

  const filtered = useMemo(() => {
    if (filter === 'all') return history;
    return history.filter((entry) => (entry.template ?? '').toLowerCase().includes(filter));
  }, [filter, history]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-semibold text-white">CV manager</h1>
          <p className="text-white/60">Review generated CVs, manage templates, and audit AI usage across tenants.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1">
          {TEMPLATE_FILTERS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                option === filter ? 'bg-gold/20 text-gold' : 'text-white/60 hover:text-white'
              }`}
            >
              {option.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-white/60">Loading CV records…</p>}
      {!loading && filtered.length === 0 && (
        <div className="rounded-3xl border border-dashed border-white/10 bg-black/30 p-12 text-center text-white/60">
          No CV history yet. Generate a CV to populate this dashboard.
        </div>
      )}

      <div className="grid gap-4">
        {filtered.map((entry) => (
          <motion.div
            key={`${entry.candidateId}-${entry.id}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-black/40 p-6 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <p className="text-sm uppercase tracking-widest text-white/40">{entry.template}</p>
              <p className="text-lg font-semibold text-white">Candidate {entry.candidateId}</p>
              <p className="text-xs text-white/50">
                Generated {entry.generatedAt?.toDate?.().toLocaleString?.() ?? 'recently'} · Cost {entry.metrics?.cost ?? 0} credits
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {entry.downloadUrl && (
                <a
                  href={entry.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-gold/30 px-4 py-2 text-xs font-semibold text-gold hover:bg-gold/10"
                >
                  Download
                </a>
              )}
              {entry.storagePath && (
                <span className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/60">
                  {entry.storagePath}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default CVManager;
