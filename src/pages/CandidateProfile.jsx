import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  getCandidate,
  saveCandidateNotes,
  updateCandidate,
} from '../lib/candidateManager';
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
  const [loading, setLoading] = useState(true);
  const [savingNotes, setSavingNotes] = useState(false);

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
    </div>
  );
};

export default CandidateProfile;
