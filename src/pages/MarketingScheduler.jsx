import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { addDoc, deleteDoc, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { motion } from 'framer-motion';
import PageHeader from '../components/common/PageHeader.jsx';
import { useTenant } from '../context/TenantContext.jsx';
import { useNotify } from '../context/NotificationContext.jsx';
import { tenantCollection } from '../lib/tenant.js';
import SocialConnector from '../components/marketing/SocialConnector.jsx';

const locales = { 'en-ZA': enUS, 'en-US': enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

const MarketingScheduler = () => {
  const { activeTenantId } = useTenant();
  const notify = useNotify();
  const [events, setEvents] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [draft, setDraft] = useState({ title: '', platform: 'instagram', date: new Date(), description: '' });

  useEffect(() => {
    if (!activeTenantId) {
      setEvents([]);
      setTokens([]);
      return () => {};
    }
    const scheduleQuery = query(
      tenantCollection(activeTenantId, 'marketingSchedules'),
      orderBy('start', 'asc')
    );
    const unsubscribeSchedules = onSnapshot(scheduleQuery, (snapshot) => {
      setEvents(
        snapshot.docs.map((docSnapshot) => ({
          id: docSnapshot.id,
          ...docSnapshot.data(),
          start: docSnapshot.data().start.toDate ? docSnapshot.data().start.toDate() : new Date(docSnapshot.data().start),
          end: docSnapshot.data().end.toDate ? docSnapshot.data().end.toDate() : new Date(docSnapshot.data().end),
        }))
      );
    });

    const tokenQuery = tenantCollection(activeTenantId, 'socialTokens');
    const unsubscribeTokens = onSnapshot(tokenQuery, (snapshot) => {
      setTokens(
        snapshot.docs.map((docSnapshot) => {
          const data = docSnapshot.data();
          return {
            id: docSnapshot.id,
            provider: docSnapshot.id,
            lastFour: data.lastFour ?? '',
            updatedAt: data.updatedAt ?? '',
          };
        })
      );
    });

    return () => {
      unsubscribeSchedules();
      unsubscribeTokens();
    };
  }, [activeTenantId]);

  const createEvent = useCallback(
    async (event) => {
      if (!activeTenantId) {
        notify({ type: 'warning', title: 'Select a workspace first' });
        return;
      }
      if (!draft.title.trim()) {
        notify({ type: 'warning', title: 'Add a post title' });
        return;
      }
      const start = event?.start ?? draft.date;
      const end = event?.end ?? new Date(start.getTime() + 60 * 60 * 1000);
      await addDoc(tenantCollection(activeTenantId, 'marketingSchedules'), {
        title: draft.title,
        platform: draft.platform,
        description: draft.description,
        start,
        end,
        status: 'scheduled',
      });
      notify({ type: 'success', title: 'Campaign scheduled' });
    },
    [activeTenantId, draft, notify]
  );

  const removeEvent = async (eventId) => {
    if (!activeTenantId) return;
    await deleteDoc(doc(tenantCollection(activeTenantId, 'marketingSchedules'), eventId));
    notify({ type: 'info', title: 'Schedule removed' });
  };

  const eventStyleGetter = useCallback((event) => {
    const platformColor =
      event.platform === 'tiktok' ? '#0f172a' : event.platform === 'linkedin' ? '#2563eb' : '#ec4899';
    return {
      style: {
        background: `${platformColor}cc`,
        borderRadius: '16px',
        border: 'none',
        color: '#fff',
        boxShadow: '0 0 18px rgba(99,102,241,0.3)',
      },
    };
  }, []);

  const upcomingCampaigns = useMemo(() => events.slice(0, 4), [events]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0f1024] to-[#160f32] px-4 pb-16 text-white sm:px-8">
      <PageHeader
        title="Marketing Scheduler"
        subtitle="Plan and automate campaign publishing across your connected social accounts."
        actions={
          <button
            type="button"
            onClick={() => createEvent()}
            className="rounded-full bg-indigo-500/30 px-4 py-2 text-xs uppercase tracking-[0.3em] text-indigo-100 transition hover:bg-indigo-500/40"
          >
            Quick schedule
          </button>
        }
      />

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <motion.div
          layout
          className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_0_35px_rgba(99,102,241,0.18)]"
        >
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 520 }}
            selectable
            onSelectSlot={(slotInfo) => {
              setDraft((prev) => ({ ...prev, date: slotInfo.start }));
              createEvent({ start: slotInfo.start, end: slotInfo.end });
            }}
            onSelectEvent={(event) => removeEvent(event.id)}
            eventPropGetter={eventStyleGetter}
          />
        </motion.div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_35px_rgba(99,102,241,0.12)]">
            <h3 className="text-lg font-semibold text-white">Draft a campaign</h3>
            <div className="mt-4 space-y-3 text-sm">
              <label className="block text-xs uppercase tracking-[0.3em] text-white/60">
                Title
                <input
                  type="text"
                  value={draft.title}
                  onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
                />
              </label>
              <label className="block text-xs uppercase tracking-[0.3em] text-white/60">
                Platform
                <select
                  value={draft.platform}
                  onChange={(event) => setDraft((prev) => ({ ...prev, platform: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
                >
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                  <option value="linkedin">LinkedIn</option>
                </select>
              </label>
              <label className="block text-xs uppercase tracking-[0.3em] text-white/60">
                Notes
                <textarea
                  value={draft.description}
                  onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
                  rows={4}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={() => createEvent()}
              className="mt-4 w-full rounded-full bg-indigo-500/30 px-4 py-2 text-xs uppercase tracking-[0.3em] text-indigo-100 transition hover:bg-indigo-500/40"
            >
              Schedule post
            </button>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_35px_rgba(99,102,241,0.12)]">
            <h3 className="text-lg font-semibold text-white">Connected accounts</h3>
            <SocialConnector tokens={tokens} />
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_35px_rgba(99,102,241,0.12)]">
            <h3 className="text-lg font-semibold text-white">Upcoming campaigns</h3>
            <ul className="mt-3 space-y-2 text-sm text-white/70">
              {upcomingCampaigns.map((event) => (
                <li key={event.id} className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2">
                  <div className="flex justify-between text-xs uppercase tracking-[0.3em] text-white/50">
                    <span>{event.platform}</span>
                    <span>{format(event.start, 'EEE d MMM • HH:mm')}</span>
                  </div>
                  <p className="mt-1 text-sm text-white/80">{event.title}</p>
                </li>
              ))}
              {!upcomingCampaigns.length && <li className="text-white/50">No campaigns scheduled yet.</li>}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
};

export default MarketingScheduler;
