import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  getCandidate,
  listCandidateCvHistory,
  saveCandidateNotes,
  updateCandidate,
} from '../lib/candidateManager';
import { generateCandidateInsights } from '../lib/cvGenerator';
import { useAuth } from '../context/AuthContext.jsx';

const ACTIONS = [
  { label: 'Send to interview', status: 'interview', tone: 'bg-olive/30 text-olive' },
  { label: 'Hire candidate', status: 'hired', tone: 'bg-gold/20 text-gold' },
  { label: 'Reject', status: 'rejected', tone: 'bg-red-500/20 text-red-300' },
];

const CandidateProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tenantId, role } = useAuth();

  const [candidate, setCandidate] = useState(null);
  const [notes, setNotes] = useState('');
  const [insights, setInsights] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingNotes, setSavingNotes] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(true);

  const canManage = useMemo(() => ['owner', 'admin', 'hr_manager', 'hr manager', 'hr'].includes((role ?? '').toLowerCase()), [role]);

  useEffect(() => {
    if (!tenantId || !id) return;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      try {
        const data = await getCandidate(id, tenantId);
        if (!data) {
          toast.error('Candidate not found');
          navigate('/candidates');
          return;
        }
        setCandidate(data);
        setNotes(data.notes ?? '');
        const cvHistory = await listCandidateCvHistory({ tenantId, candidateId: id });
        setHistory(cvHistory);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Failed to load candidate profile', error);
          toast.error('Unable to load candidate');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    load();
    return () => controller.abort();
  }, [id, tenantId, navigate]);

  useEffect(() => {
    if (!candidate) return;
    const controller = new AbortController();

    async function loadInsights() {
      setInsightsLoading(true);
      try {
        const data = await generateCandidateInsights(candidate, { signal: controller.signal });
        setInsights(data);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('AI insight generation failed', error);
          toast.error('Unable to load AI insights');
        }
      } finally {
        if (!controller.signal.aborted) {
          setInsightsLoading(false);
        }
      }
    }

    loadInsights();
    return () => controller.abort();
  }, [candidate]);

  const handleStatus = async (status) => {
    if (!tenantId) return;
    try {
      const updated = await updateCandidate(id, tenantId, { status });
      setCandidate(updated);
      toast.success(`Candidate moved to ${status}`);
    } catch (error) {
      console.error('Candidate status transition failed', error);
      toast.error('Unable to update candidate status');
    }
  };

  const handleSaveNotes = async () => {
    if (!tenantId) return;
    setSavingNotes(true);
    try {
      const updated = await saveCandidateNotes(id, tenantId, notes);
      setCandidate(updated);
      toast.success('Notes saved');
    } catch (error) {
      console.error('Failed to save candidate notes', error);
      toast.error('Unable to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  if (loading) {
    return <p className="text-white/60">Loading candidate profile…</p>;
  }

  if (!candidate) {
    return (
      <div className="rounded-3xl border border-white/10 bg-black/40 p-12 text-center text-white/60">
        Candidate unavailable.
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 rounded-3xl border border-white/10 bg-black/40 p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-white">{candidate.name}</h1>
              <p className="text-white/60">{candidate.email}</p>
              <p className="text-xs uppercase tracking-widest text-white/40">
                {candidate.status?.toUpperCase()} · {candidate.source ?? 'Unassigned'} · {candidate.experience ?? 0} yrs exp.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {ACTIONS.map((action) => (
                <button
                  key={action.status}
                  type="button"
                  onClick={() => handleStatus(action.status)}
                  disabled={!canManage}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${action.tone} ${
                    !canManage ? 'opacity-60' : 'hover:opacity-90'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-white/40">Skills</p>
            <div className="flex flex-wrap gap-2">
              {(candidate.skills ?? []).map((skill) => (
                <span key={skill} className="rounded-full bg-white/10 px-3 py-1 text-xs text-gold">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 rounded-3xl border border-white/10 bg-black/40 p-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Notes</h2>
            <button
              type="button"
              onClick={handleSaveNotes}
              disabled={!canManage || savingNotes}
              className="rounded-full bg-gold px-4 py-2 text-xs font-semibold text-black disabled:opacity-60"
            >
              {savingNotes ? 'Saving…' : 'Save notes'}
            </button>
          </div>
          <textarea
            rows={6}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            readOnly={!canManage}
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white focus:outline-none focus:ring focus:ring-gold/40 disabled:opacity-60"
            placeholder="Summaries, interview takeaways, or reminders go here."
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 rounded-3xl border border-white/10 bg-black/40 p-6"
        >
          <h2 className="text-lg font-semibold text-white">CV history</h2>
          {history.length === 0 ? (
            <p className="text-sm text-white/60">No CV versions generated yet.</p>
          ) : (
            <ul className="space-y-3 text-sm text-white/80">
              {history.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">{entry.template}</p>
                    <p className="text-xs text-white/40">
                      Generated {entry.generatedAt?.toDate?.().toLocaleString?.() ?? 'recently'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {entry.storagePath && (
                      <a
                        href={`https://storage.googleapis.com/${entry.storagePath}`}
                        className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/80 hover:text-white"
                      >
                        Storage path
                      </a>
                    )}
                    {entry.summary && (
                      <span className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/50">
                        {entry.summary.slice(0, 64)}…
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      </div>

      <motion.aside
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4 rounded-3xl border border-white/10 bg-black/40 p-6"
      >
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">AI INSIGHTS</p>
          <h2 className="text-xl font-semibold text-white">Talent summary</h2>
        </div>

        {insightsLoading && <p className="text-sm text-white/60">Generating AI summary…</p>}
        {!insightsLoading && insights && (
          <div className="space-y-4 text-sm text-white/80">
            <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white/80">{insights.summary}</p>
            <p className="rounded-full border border-gold/30 px-4 py-2 text-xs font-semibold text-gold">
              Fit score: {insights.rating}
            </p>
            <div>
              <p className="text-xs uppercase tracking-widest text-white/40">Recommended actions</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {insights.recommendedActions?.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-white/40">Suggested questions</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {insights.suggestedQuestions?.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </motion.aside>
    </div>
  );
};

export default CandidateProfile;
