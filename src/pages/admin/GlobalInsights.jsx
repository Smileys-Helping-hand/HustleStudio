import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import PageHeader from '../../components/common/PageHeader.jsx';
import { db } from '../../lib/firebase.js';

const parsePayload = (payload) => {
  if (!payload) return null;
  try {
    return JSON.parse(payload);
  } catch (error) {
    console.warn('[GlobalInsights] Unable to parse payload.', error);
    return null;
  }
};

const GlobalInsights = () => {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const collectionName =
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GLOBAL_INSIGHTS_COLLECTION) ||
      (typeof process !== 'undefined' &&
        (process.env?.VITE_GLOBAL_INSIGHTS_COLLECTION || process.env?.GLOBAL_INSIGHTS_COLLECTION)) ||
      'global_insights';

    const insightsQuery = query(collection(db, collectionName), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(insightsQuery, (snapshot) => {
      const mapped = snapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          type: data.type,
          payload: parsePayload(data.payload),
          createdAt: data.createdAt,
        };
      });
      setEvents(mapped);
    });

    return () => unsubscribe();
  }, []);

  const topAssistants = useMemo(() => {
    const counts = new Map();
    events.forEach((event) => {
      const assistant = event.payload?.assistant;
      if (!assistant) return;
      counts.set(assistant, (counts.get(assistant) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([assistant, total]) => ({ assistant, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [events]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0e0e18] to-[#1b1830] px-4 pb-16 text-white sm:px-8">
      <PageHeader
        title="Global Intelligence Overview"
        subtitle="Anonymous signals aggregated across all Hustle Studio workspaces."
      />

      <section className="mx-auto grid max-w-6xl gap-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_35px_rgba(99,102,241,0.18)]">
          <h2 className="text-lg font-semibold text-white">Top assistants (last 100 events)</h2>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            {topAssistants.length === 0 && <li>No assistant activity recorded yet.</li>}
            {topAssistants.map((entry) => (
              <li key={entry.assistant} className="flex items-center justify-between rounded-xl bg-black/30 px-3 py-2">
                <span>{entry.assistant}</span>
                <span className="text-white/50">{entry.total} events</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_35px_rgba(99,102,241,0.18)]">
          <h2 className="text-lg font-semibold text-white">Live event stream</h2>
          <p className="text-xs text-white/50">
            Payloads are anonymised before ingestion. Use the aggregate summaries to tailor tenant-level strategy.
          </p>
          <div className="mt-4 flex max-h-[420px] flex-col gap-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-white/70">
            {events.slice(0, 100).map((event) => (
              <div key={event.id} className="space-y-1 rounded-xl bg-black/40 p-3">
                <div className="flex items-center justify-between text-white/80">
                  <span className="font-semibold uppercase tracking-wide text-xs text-indigo-200">{event.type}</span>
                  <span className="text-[10px] text-white/40">
                    {event.createdAt?.toDate?.().toLocaleString?.() || 'recent'}
                  </span>
                </div>
                {event.payload ? (
                  <pre className="whitespace-pre-wrap text-[11px] text-white/60">
                    {JSON.stringify(event.payload, null, 2)}
                  </pre>
                ) : (
                  <p className="text-[11px] text-white/50">No payload data recorded.</p>
                )}
              </div>
            ))}
            {events.length === 0 && <p>No global events yet.</p>}
          </div>
        </div>
      </section>
    </main>
  );
};

export default GlobalInsights;
