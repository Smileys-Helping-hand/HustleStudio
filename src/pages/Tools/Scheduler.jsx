import React, { useEffect, useMemo, useState } from 'react';
import { FiCalendar, FiClock, FiEdit2, FiSave, FiTrash2 } from 'react-icons/fi';
import { motion } from 'framer-motion';
import PageHeader from '../../components/common/PageHeader.jsx';
import { toast } from 'react-hot-toast';

const storageKey = 'hs_content_schedule';

const Scheduler = () => {
  const [entries, setEntries] = useState(() => {
    if (typeof window === 'undefined') return [];
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.warn('[Scheduler] Failed to parse entries', error);
      return [];
    }
  });
  const [draft, setDraft] = useState({ title: '', channel: 'Instagram', schedule: '', notes: '' });
  const [editingIndex, setEditingIndex] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey, JSON.stringify(entries));
  }, [entries]);

  const upcoming = useMemo(
    () =>
      [...entries].sort(
        (a, b) => new Date(a.schedule).getTime() - new Date(b.schedule).getTime()
      ),
    [entries]
  );

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!draft.title || !draft.schedule) {
      toast.error('Please provide a title and schedule time.');
      return;
    }

    if (editingIndex !== null) {
      const next = [...entries];
      next[editingIndex] = draft;
      setEntries(next);
      toast.success('Schedule updated.');
    } else {
      setEntries((current) => [...current, draft]);
      toast.success('Post scheduled.');
    }

    setDraft({ title: '', channel: 'Instagram', schedule: '', notes: '' });
    setEditingIndex(null);
  };

  const handleEdit = (index) => {
    setDraft(entries[index]);
    setEditingIndex(index);
  };

  const handleDelete = (index) => {
    setEntries((current) => current.filter((_, itemIndex) => itemIndex !== index));
    toast('Schedule removed.', { icon: '🗓️' });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0e0e18] to-[#1b1830] px-4 pb-16 text-white sm:px-8">
      <PageHeader
        title="Campaign Scheduler"
        subtitle="Plan multi-channel drops and keep your marketing queue aligned with production timelines."
        actions={
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/60">
            <FiCalendar /> Next release
          </span>
        }
      />

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]"
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_30px_rgba(99,102,241,0.12)]"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{editingIndex !== null ? 'Edit schedule' : 'New schedule'}</h2>
            <span className="text-xs uppercase tracking-[0.3em] text-white/40">{entries.length} planned</span>
          </div>
          <label className="text-sm text-white/70">
            Title
            <input
              type="text"
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
              placeholder="Product drop teaser"
            />
          </label>
          <label className="text-sm text-white/70">
            Channel
            <select
              value={draft.channel}
              onChange={(event) => setDraft({ ...draft, channel: event.target.value })}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
            >
              {['Instagram', 'TikTok', 'LinkedIn', 'Newsletter', 'In-store'].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-white/70">
            Scheduled time
            <input
              type="datetime-local"
              value={draft.schedule}
              onChange={(event) => setDraft({ ...draft, schedule: event.target.value })}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
            />
          </label>
          <label className="text-sm text-white/70">
            Notes
            <textarea
              value={draft.notes}
              onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
              className="mt-1 h-24 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
              placeholder="Add collaborators, CTAs, or assets"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 px-4 py-2 text-sm text-indigo-200 transition hover:bg-indigo-500/30"
            >
              {editingIndex !== null ? (
                <>
                  <FiSave /> Update
                </>
              ) : (
                <>
                  <FiEdit2 /> Save schedule
                </>
              )}
            </button>
            {editingIndex !== null && (
              <button
                type="button"
                onClick={() => {
                  setDraft({ title: '', channel: 'Instagram', schedule: '', notes: '' });
                  setEditingIndex(null);
                }}
                className="text-sm text-white/60 underline"
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>

        <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_30px_rgba(99,102,241,0.12)]">
          <h2 className="text-lg font-semibold">Upcoming posts</h2>
          {upcoming.length === 0 && (
            <p className="rounded-2xl border border-dashed border-white/20 p-4 text-sm text-white/50">
              No scheduled content yet. Draft your next drop on the left.
            </p>
          )}
          <ul className="space-y-3 text-sm text-white/70">
            {upcoming.map((item, index) => (
              <li
                key={`${item.title}-${item.schedule}`}
                className="rounded-2xl border border-white/10 bg-black/30 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/50">{item.channel}</p>
                  </div>
                  <span className="text-xs text-indigo-200">
                    <FiClock className="mr-1 inline" />
                    {new Date(item.schedule).toLocaleString()}
                  </span>
                </div>
                {item.notes && <p className="mt-3 text-xs text-white/60">{item.notes}</p>}
                <div className="mt-3 flex gap-3 text-xs text-white/60">
                  <button type="button" onClick={() => handleEdit(index)} className="hover:text-white">
                    Edit
                  </button>
                  <button type="button" onClick={() => handleDelete(index)} className="inline-flex items-center gap-1 hover:text-red-300">
                    <FiTrash2 /> Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </motion.section>
    </main>
  );
};

export default Scheduler;
