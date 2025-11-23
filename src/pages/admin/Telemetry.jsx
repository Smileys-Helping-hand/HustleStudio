import React, { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../lib/firebase.js';
import PageHeader from '../../components/common/PageHeader.jsx';
import { useTenant } from '../../context/TenantContext.jsx';

export default function AdminTelemetry() {
  const [logs, setLogs] = useState([]);
  const { activeTenantId } = useTenant();

  useEffect(() => {
    const baseQuery = query(collection(db, 'telemetry'), orderBy('createdAt', 'desc'), limit(100));
    const unsubscribe = onSnapshot(baseQuery, (snapshot) => {
      const items = snapshot.docs
        .map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }))
        .filter((entry) => !activeTenantId || entry.tenantId === activeTenantId || entry.tenantId === 'system');
      setLogs(items);
    });
    return () => unsubscribe();
  }, [activeTenantId]);

  return (
    <main className="space-y-6 p-6 text-white">
      <PageHeader
        title="Telemetry"
        subtitle="Monitor live analytics events, deploy diagnostics, and error reports across this workspace."
      />
      <div className="rounded-2xl border border-white/10 bg-white/5">
        <div className="grid grid-cols-[140px_1fr_1fr] gap-4 border-b border-white/10 px-4 py-2 text-xs uppercase tracking-widest text-white/50">
          <span>Time</span>
          <span>Event</span>
          <span>Details</span>
        </div>
        <ul className="divide-y divide-white/5">
          {logs.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-white/50">No telemetry events captured yet.</li>
          )}
          {logs.map((entry) => (
            <li key={entry.id} className="grid grid-cols-[140px_1fr_1fr] gap-4 px-4 py-3 text-sm">
              <span className="font-mono text-xs text-white/70">
                {entry.createdAt?.toDate?.().toLocaleString?.() ?? '—'}
              </span>
              <div>
                <p className="font-semibold">{entry.type}</p>
                <p className="text-xs text-white/50">Tenant: {entry.tenantId ?? 'none'} • User: {entry.userId ?? 'anon'}</p>
              </div>
              <pre className="max-h-24 overflow-auto rounded bg-black/20 p-3 text-xs text-white/70">
                {JSON.stringify(entry.payload ?? {}, null, 2)}
              </pre>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
