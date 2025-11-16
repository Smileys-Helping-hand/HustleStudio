import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { listCandidates } from '../lib/candidateManager';
import { generateCvDraft, saveCvDraft } from '../lib/cvGenerator';
import { useAuth } from '../context/AuthContext.jsx';

const TEMPLATES = [
  { id: 'modern', name: 'Modern Elegance' },
  { id: 'minimal', name: 'Minimal Focus' },
  { id: 'corporate', name: 'Corporate Classic' },
];

const CVGenerator = () => {
  const { tenantId } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [candidates, setCandidates] = useState([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState(searchParams.get('candidateId') ?? '');
  const [template, setTemplate] = useState('modern');
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [costEstimate, setCostEstimate] = useState(0.5);

  useEffect(() => {
    if (!tenantId) return;
    async function load() {
      try {
        const records = await listCandidates({ tenantId });
        setCandidates(records);
      } catch (error) {
        console.error('Unable to load candidates for CV generator', error);
        toast.error('Unable to load candidates');
      }
    }
    load();
  }, [tenantId]);

  useEffect(() => {
    if (selectedCandidateId) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('candidateId', selectedCandidateId);
        return next;
      });
    }
  }, [selectedCandidateId, setSearchParams]);

  const selectedCandidate = useMemo(
    () => candidates.find((candidate) => candidate.id === selectedCandidateId) ?? null,
    [candidates, selectedCandidateId]
  );

  const handleGenerate = async () => {
    if (!selectedCandidate) {
      toast.error('Select a candidate first');
      return;
    }
    setLoading(true);
    try {
      const draftResult = await generateCvDraft({ candidate: selectedCandidate, template });
      setDraft(draftResult);
      toast.success('CV draft generated');
    } catch (error) {
      console.error('CV draft generation failed', error);
      toast.error('Unable to generate CV draft');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!draft || !selectedCandidate || !tenantId) return;
    setSaving(true);
    try {
      const upload = await saveCvDraft({
        tenantId,
        candidateId: selectedCandidate.id,
        draft,
        cost: costEstimate,
      });
      toast.success('CV saved to library');
      setDraft((prev) => ({ ...prev, downloadUrl: upload.url }));
    } catch (error) {
      console.error('Saving CV draft failed', error);
      toast.error('Unable to save CV');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-white">AI CV Generator</h1>
        <p className="text-white/60">Craft polished CVs with Hustle Studio templates and AI assistance.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 rounded-3xl border border-white/10 bg-black/40 p-6"
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-white/40" htmlFor="cv-candidate">
                Candidate
              </label>
              <select
                id="cv-candidate"
                value={selectedCandidateId}
                onChange={(event) => setSelectedCandidateId(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white focus:outline-none focus:ring focus:ring-gold/40"
              >
                <option value="">Select candidate</option>
                {candidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name} · {candidate.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-widest text-white/40">Template</span>
              <div className="flex gap-2">
                {TEMPLATES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTemplate(item.id)}
                    className={`flex-1 rounded-2xl border px-4 py-3 text-sm transition ${
                      template === item.id
                        ? 'border-gold/60 bg-gold/10 text-gold'
                        : 'border-white/10 bg-black/30 text-white/70 hover:text-white'
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="text-xs uppercase tracking-widest text-white/40" htmlFor="cv-cost">
                Cost estimate (credits)
              </label>
              <input
                id="cv-cost"
                type="number"
                min="0"
                step="0.1"
                value={costEstimate}
                onChange={(event) => setCostEstimate(Number(event.target.value))}
                className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white focus:outline-none focus:ring focus:ring-gold/40"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!selectedCandidate || loading}
                className="flex-1 rounded-2xl bg-gold px-4 py-3 text-sm font-semibold text-black disabled:opacity-60"
              >
                {loading ? 'Generating…' : 'Generate CV'}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!draft || saving}
                className="flex-1 rounded-2xl border border-white/20 px-4 py-3 text-sm text-white/80 hover:text-white disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save to library'}
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 rounded-3xl border border-white/10 bg-black/40 p-6"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">Generated preview</p>
            <h2 className="text-xl font-semibold text-white">{draft?.template?.name ?? 'Awaiting generation'}</h2>
          </div>

          {!draft && <p className="text-white/60">Generate a CV to preview the output.</p>}
          {draft && (
            <div className="max-h-[420px] overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-6 text-sm leading-relaxed text-white/80">
              <pre className="whitespace-pre-wrap font-sans text-sm text-white/80">{draft.markdown}</pre>
            </div>
          )}

          {draft?.downloadUrl && (
            <a
              href={draft.downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-gold/30 px-5 py-2 text-sm font-semibold text-gold hover:bg-gold/10"
            >
              Download latest version
            </a>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default CVGenerator;
