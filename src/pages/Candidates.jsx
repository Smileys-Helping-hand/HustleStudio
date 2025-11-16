import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  createCandidate,
  listCandidates,
  removeCandidate,
  updateCandidate,
} from '../lib/candidateManager';
import { useAuth } from '../context/AuthContext.jsx';

const STATUS_OPTIONS = ['new', 'screening', 'interview', 'offer', 'hired', 'rejected'];

const UploadModal = ({ isOpen, onClose, onSubmit }) => {
  const [file, setFile] = useState(null);
  const [candidate, setCandidate] = useState({
    name: '',
    email: '',
    phone: '',
    source: 'Direct',
    status: 'new',
    experience: 0,
    skills: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        file,
        candidate: {
          ...candidate,
          skills: candidate.skills
            .split(',')
            .map((skill) => skill.trim())
            .filter(Boolean),
        },
      });
      setCandidate({ name: '', email: '', phone: '', source: 'Direct', status: 'new', experience: 0, skills: '' });
      setFile(null);
      onClose();
    } catch (error) {
      console.error('Upload candidate failed', error);
      toast.error(error.message || 'Unable to upload candidate.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-40">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl space-y-6 rounded-3xl border border-white/10 bg-black/90 p-8 text-white shadow-2xl">
                <div>
                  <Dialog.Title className="text-2xl font-semibold">Upload candidate</Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm text-white/60">
                    Drag in a CV or upload manually to start tracking this candidate.
                  </Dialog.Description>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                  <label className="block rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-center hover:border-gold/60">
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx"
                      onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                    />
                    <p className="text-lg font-semibold">Drag & drop CV</p>
                    <p className="mt-1 text-sm text-white/50">
                      {file ? file.name : 'Supported formats: PDF, DOC, DOCX'}
                    </p>
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs uppercase tracking-widest text-white/40" htmlFor="candidate-name">
                        Name
                      </label>
                      <input
                        id="candidate-name"
                        required
                        type="text"
                        value={candidate.name}
                        onChange={(event) => setCandidate((prev) => ({ ...prev, name: event.target.value }))}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring focus:ring-gold/40"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-widest text-white/40" htmlFor="candidate-email">
                        Email
                      </label>
                      <input
                        id="candidate-email"
                        required
                        type="email"
                        value={candidate.email}
                        onChange={(event) => setCandidate((prev) => ({ ...prev, email: event.target.value }))}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring focus:ring-gold/40"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-widest text-white/40" htmlFor="candidate-phone">
                        Phone
                      </label>
                      <input
                        id="candidate-phone"
                        type="tel"
                        value={candidate.phone}
                        onChange={(event) => setCandidate((prev) => ({ ...prev, phone: event.target.value }))}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring focus:ring-gold/40"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-widest text-white/40" htmlFor="candidate-source">
                        Source
                      </label>
                      <input
                        id="candidate-source"
                        type="text"
                        value={candidate.source}
                        onChange={(event) => setCandidate((prev) => ({ ...prev, source: event.target.value }))}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring focus:ring-gold/40"
                      />
                    </div>
                    <div>
                      <label
                        className="text-xs uppercase tracking-widest text-white/40"
                        htmlFor="candidate-experience"
                      >
                        Experience (years)
                      </label>
                      <input
                        id="candidate-experience"
                        type="number"
                        min="0"
                        value={candidate.experience}
                        onChange={(event) => setCandidate((prev) => ({ ...prev, experience: Number(event.target.value) }))}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring focus:ring-gold/40"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-widest text-white/40" htmlFor="candidate-skills">
                        Skills
                      </label>
                      <input
                        id="candidate-skills"
                        type="text"
                        placeholder="Design, React, Firebase"
                        value={candidate.skills}
                        onChange={(event) => setCandidate((prev) => ({ ...prev, skills: event.target.value }))}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring focus:ring-gold/40"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <select
                      value={candidate.status}
                      onChange={(event) => setCandidate((prev) => ({ ...prev, status: event.target.value }))}
                      className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring focus:ring-gold/40"
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status} className="bg-zinc-900">
                          {status.toUpperCase()}
                        </option>
                      ))}
                    </select>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/70 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-brand-600 disabled:opacity-60"
                      >
                        {saving ? 'Uploading…' : 'Save candidate'}
                      </button>
                    </div>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

const Candidates = () => {
  const { tenantId, role } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState('all');
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  const canManage = useMemo(() => ['owner', 'admin', 'hr_manager', 'hr manager', 'hr'].includes((role ?? '').toLowerCase()), [role]);

  useEffect(() => {
    if (!tenantId) return;
    const controller = new AbortController();

    async function fetchCandidates() {
      setLoading(true);
      try {
        const records = await listCandidates({ tenantId, searchTerm, status });
        if (!controller.signal.aborted) {
          setCandidates(records);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Failed to load candidates', error);
          toast.error('Unable to load candidates');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchCandidates();
    return () => controller.abort();
  }, [tenantId, searchTerm, status]);

  const handleUpload = async ({ candidate, file }) => {
    if (!tenantId) {
      throw new Error('Tenant ID missing. Unable to save candidate.');
    }
    await createCandidate({ tenantId, candidate, file });
    toast.success('Candidate uploaded');
    const refreshed = await listCandidates({ tenantId, searchTerm, status });
    setCandidates(refreshed);
  };

  const handleStatusChange = async (candidateId, newStatus) => {
    try {
      await updateCandidate(candidateId, tenantId, { status: newStatus });
      setCandidates((previous) =>
        previous.map((item) => (item.id === candidateId ? { ...item, status: newStatus } : item))
      );
      toast.success('Status updated');
    } catch (error) {
      console.error('Status update failed', error);
      toast.error('Unable to update status');
    }
  };

  const handleDelete = async (candidateId) => {
    try {
      await removeCandidate(candidateId, tenantId);
      setCandidates((previous) => previous.filter((candidate) => candidate.id !== candidateId));
      toast.success('Candidate removed');
    } catch (error) {
      console.error('Candidate removal failed', error);
      toast.error('Unable to remove candidate');
    }
  };

  const filtered = useMemo(() => candidates, [candidates]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-semibold text-white">Candidate workspace</h1>
          <p className="text-white/60">Manage inbound applicants, track their status, and generate AI-powered CVs.</p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowUpload(true)}
            className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-black shadow-lg hover:bg-brand-600"
          >
            Upload CV
          </button>
        )}
      </div>

      <div className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 sm:grid-cols-[2fr_1fr_1fr]">
        <input
          type="search"
          placeholder="Search name, skills, source…"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white focus:outline-none focus:ring focus:ring-gold/40"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white focus:outline-none focus:ring focus:ring-gold/40"
        >
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option.toUpperCase()}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => navigate('/cv-generator')}
          className="rounded-2xl border border-gold/30 px-4 py-3 text-sm font-semibold text-gold hover:bg-gold/10"
        >
          Launch CV Generator
        </button>
      </div>

      <div className="space-y-4">
        {loading && <p className="text-white/60">Loading candidates…</p>}
        {!loading && filtered.length === 0 && (
          <div className="rounded-3xl border border-dashed border-white/10 bg-black/30 p-10 text-center text-white/60">
            <p>No candidates found yet. Upload a CV to get started.</p>
          </div>
        )}

        <div className="grid gap-4">
          {filtered.map((candidate) => (
            <motion.div
              key={candidate.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-black/40 p-6 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <p className="text-lg font-semibold text-white">{candidate.name}</p>
                <p className="text-sm text-white/60">{candidate.email}</p>
                <p className="text-xs uppercase tracking-widest text-white/40">
                  {candidate.source || 'Unassigned'} · Uploaded {candidate.uploadedAt?.toDate?.().toLocaleDateString?.() ?? 'recently'}
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  {(candidate.skills ?? []).slice(0, 6).map((skill) => (
                    <span key={skill} className="rounded-full bg-white/10 px-3 py-1 text-xs text-gold">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:items-end">
                <div className="flex items-center gap-3">
                  <select
                    value={candidate.status ?? 'new'}
                    onChange={(event) => handleStatusChange(candidate.id, event.target.value)}
                    disabled={!canManage}
                    className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white focus:outline-none focus:ring focus:ring-gold/40"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option} className="bg-zinc-900">
                        {option.toUpperCase()}
                      </option>
                    ))}
                  </select>
                  {candidate.cvUrl && (
                    <a
                      href={candidate.cvUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 hover:text-white"
                    >
                      Preview CV
                    </a>
                  )}
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <Link
                    to={`/candidate/${candidate.id}`}
                    className="rounded-full border border-gold/30 px-4 py-2 text-sm font-semibold text-gold hover:bg-gold/10"
                  >
                    View profile
                  </Link>
                  <Link
                    to={`/cv-generator?candidateId=${candidate.id}`}
                    className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 hover:text-white"
                  >
                    Generate CV
                  </Link>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleDelete(candidate.id)}
                      className="rounded-full border border-red-400/40 px-4 py-2 text-sm text-red-300 hover:bg-red-400/10"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <UploadModal isOpen={showUpload} onClose={() => setShowUpload(false)} onSubmit={handleUpload} />
    </div>
  );
};

export default Candidates;
