import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { FiDownload, FiSave, FiRefreshCw } from 'react-icons/fi';
import { listCandidates } from '../lib/candidateManager';
import { generateCvDraft, saveCvDraft, exportCvAsPDF, CV_TEMPLATES } from '../lib/cvGenerator';
import { useAuth } from '../context/AuthContext.jsx';

const CVGenerator = () => {
  const { tenantId, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [candidates, setCandidates] = useState([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState(searchParams.get('candidateId') ?? '');
  const [template, setTemplate] = useState('modern');
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
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
      const draftResult = await generateCvDraft({ 
        candidate: selectedCandidate, 
        template,
        tenantId,
        userId: user?.uid,
      });
      setDraft(draftResult);
      if (draftResult.aiEnhanced) {
        toast.success('AI-enhanced CV generated successfully!');
      } else {
        toast.success('CV draft generated');
      }
    } catch (error) {
      console.error('CV draft generation failed', error);
      toast.error(error.message || 'Unable to generate CV draft');
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

  const handleExportPDF = async () => {
    if (!draft || !selectedCandidate) {
      toast.error('Generate a CV first');
      return;
    }
    
    setExporting(true);
    try {
      const fileName = await exportCvAsPDF(draft, selectedCandidate);
      toast.success(`CV exported as ${fileName}`);
    } catch (error) {
      console.error('PDF export failed', error);
      toast.error('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  const templateOptions = Object.values(CV_TEMPLATES);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-white">Professional CV Generator</h1>
        <p className="text-white/60">Create stunning, ATS-friendly CVs with AI-powered content generation</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 rounded-3xl border border-white/10 bg-black/40 p-6"
        >
          <div className="space-y-4">
            {/* Candidate Selection */}
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

            {/* Template Selection */}
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-widest text-white/40">Template Style</span>
              <div className="grid grid-cols-2 gap-2">
                {templateOptions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTemplate(item.id)}
                    className={`flex flex-col items-start rounded-2xl border p-3 text-left transition ${
                      template === item.id
                        ? 'border-gold/60 bg-gold/10 text-gold'
                        : 'border-white/10 bg-black/30 text-white/70 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <span className="font-semibold text-sm">{item.name}</span>
                    <span className="text-xs mt-1 opacity-70">{item.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Cost Estimate */}
            <div className="grid grid-cols-2 gap-4">
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
              <div className="flex items-end">
                <div className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                  <p className="text-xs text-white/40">AI Enhanced</p>
                  <p className="text-sm font-medium text-white">
                    {draft?.aiEnhanced ? '✓ Yes' : '- Not yet'}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!selectedCandidate || loading}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold to-orange-400 px-4 py-3 text-sm font-semibold text-black disabled:opacity-60 hover:shadow-lg hover:shadow-gold/20 transition-all"
              >
                {loading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full"
                    />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <FiRefreshCw className="w-4 h-4" />
                    <span>Generate CV</span>
                  </>
                )}
              </button>
            </div>

            {draft && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-black/30 px-4 py-3 text-sm text-white hover:bg-black/40 disabled:opacity-60 transition-all"
                >
                  {saving ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <FiSave className="w-4 h-4" />
                      <span>Save to Library</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleExportPDF}
                  disabled={exporting}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold hover:bg-gold/20 disabled:opacity-60 transition-all"
                >
                  {exporting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-gold/30 border-t-gold rounded-full"
                      />
                      <span>Exporting...</span>
                    </>
                  ) : (
                    <>
                      <FiDownload className="w-4 h-4" />
                      <span>Export PDF</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 rounded-3xl border border-white/10 bg-black/40 p-6"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">Generated Preview</p>
            <h2 className="text-xl font-semibold text-white">
              {draft ? `${draft.template?.name || 'Modern'} Template` : 'Awaiting generation'}
            </h2>
            {draft?.aiEnhanced && (
              <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/30 text-xs text-gold">
                ✨ AI Enhanced
              </span>
            )}
          </div>

          {!draft && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <FiRefreshCw className="w-8 h-8 text-white/30" />
              </div>
              <p className="text-white/60">Select a candidate and generate a CV to see the preview.</p>
            </div>
          )}
          
          {draft && (
            <div className="space-y-4">
              <div className="max-h-[500px] overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="prose prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-white/80 leading-relaxed">
                    {draft.markdown}
                  </pre>
                </div>
              </div>

              {draft.downloadUrl && (
                <a
                  href={draft.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-gold/30 bg-gold/5 px-5 py-2 text-sm font-semibold text-gold hover:bg-gold/10 transition-colors"
                >
                  <FiDownload className="w-4 h-4" />
                  Download Saved Version
                </a>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default CVGenerator;
