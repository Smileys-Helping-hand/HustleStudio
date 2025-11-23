import React, { useEffect, useState } from 'react';
import { getDocs, orderBy, query } from 'firebase/firestore';
import { useTenant } from '../../context/TenantContext.jsx';
import { tenantCollection } from '../../lib/tenant.js';

const Tenants = () => {
  const { tenants, activeTenantId, switchTenant, presence } = useTenant();
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAudit = async () => {
      if (!activeTenantId) {
        setAuditLogs([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const auditQuery = query(
          tenantCollection(activeTenantId, 'auditLogs'),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(auditQuery);
        setAuditLogs(snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() })));
      } catch (error) {
        console.error('[Tenants] Failed to load audit logs', error);
        setAuditLogs([]);
      } finally {
        setLoading(false);
      }
    };
    loadAudit().catch(() => {});
  }, [activeTenantId]);

  return (
    <main className="space-y-8 p-6 text-white">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Workspace administration</h1>
        <p className="text-sm text-white/60">Switch between organisations and review the latest tenant activity.</p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold">Your workspaces</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {tenants.map((tenant) => (
            <button
              type="button"
              key={tenant.id}
              onClick={() => switchTenant(tenant.id)}
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                tenant.id === activeTenantId
                  ? 'border-indigo-400 bg-indigo-500/20 shadow-[0_0_25px_rgba(99,102,241,0.35)]'
                  : 'border-white/10 bg-black/40 hover:border-indigo-400'
              }`}
            >
              <p className="text-sm uppercase tracking-wide text-white/60">{tenant.plan}</p>
              <p className="text-xl font-semibold text-white">{tenant.name}</p>
              <p className="text-xs text-white/50">Role: {tenant.role}</p>
            </button>
          ))}
        </div>
        {presence.length > 0 && (
          <div className="mt-6 text-sm text-white/60">
            <p className="text-xs uppercase tracking-wide text-white/40">Active collaborators</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {presence.map((entry) => (
                <li key={entry.id} className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs">
                  {entry.displayName || entry.email || entry.uid}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent tenant activity</h2>
          <span className="text-xs text-white/50">{loading ? 'Loading…' : `${auditLogs.length} entries`}</span>
        </div>
        {loading ? (
          <p className="mt-4 text-sm text-white/60">Loading audit log…</p>
        ) : auditLogs.length === 0 ? (
          <p className="mt-4 text-sm text-white/60">No audit events recorded yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {auditLogs.slice(0, 12).map((log) => (
              <li
                key={log.id}
                className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/80"
              >
                <p className="font-semibold">{log.action}</p>
                {log.metadata && (
                  <pre className="mt-1 whitespace-pre-wrap text-xs text-white/50">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                )}
                <p className="mt-1 text-xs text-white/40">
                  {log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString() : 'Pending'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
};

export default Tenants;
