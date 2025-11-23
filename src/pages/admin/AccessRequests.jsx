import React, { useCallback, useEffect, useState } from 'react';
import { addDoc, deleteDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { useTenant } from '../../context/TenantContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { logEvent } from '../../lib/auditLogger.js';
import { tenantCollection, tenantDoc } from '../../lib/tenant.js';

const ROLES = [
  { label: 'Admin', value: 'Admin' },
  { label: 'Member', value: 'Member' },
  { label: 'Viewer', value: 'Viewer' },
];

const AccessRequests = () => {
  const { activeTenantId, activeTenant } = useTenant();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Member');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadRequests = useCallback(async () => {
    if (!activeTenantId) {
      setRequests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const snapshot = await getDocs(tenantCollection(activeTenantId, 'accessRequests'));
      setRequests(snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() })));
    } catch (error) {
      console.error('[AccessRequests] Failed to load access requests', error);
      toast.error('Unable to load access requests.');
    } finally {
      setLoading(false);
    }
  }, [activeTenantId]);

  useEffect(() => {
    loadRequests().catch(() => {});
  }, [loadRequests]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!activeTenantId) {
      toast.error('Select a workspace before sharing access.');
      return;
    }
    if (!email) {
      toast.error('Enter an email address.');
      return;
    }
    try {
      await addDoc(tenantCollection(activeTenantId, 'accessRequests'), {
        email: email.toLowerCase(),
        role,
        createdAt: serverTimestamp(),
        requestedBy: user?.email ?? user?.uid ?? 'system',
      });
      toast.success('Access request captured.');
      setEmail('');
      setRole('Member');
      await loadRequests();
      await logEvent(activeTenantId, user?.uid, 'Recorded Access Request', { email, role });
    } catch (error) {
      console.error('[AccessRequests] Failed to create access request', error);
      toast.error('Unable to create access request right now.');
    }
  };

  const revokeRequest = async (requestId) => {
    if (!activeTenantId) return;
    await deleteDoc(tenantDoc(activeTenantId, 'accessRequests', requestId));
    await loadRequests();
    await logEvent(activeTenantId, user?.uid, 'Removed Access Request', { requestId });
  };

  return (
    <main className="space-y-8 p-6 text-white">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Share workspace access</h1>
        <p className="text-sm text-white/60">
          Queue access approvals for collaborators joining {activeTenant?.name ?? 'your workspace'}.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 md:grid-cols-[2fr_1fr_auto]">
        <label className="text-xs uppercase tracking-wide text-white/60">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
            required
          />
        </label>
        <label className="text-xs uppercase tracking-wide text-white/60">
          Role
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
          >
            {ROLES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="self-end rounded-full bg-indigo-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-indigo-600"
        >
          Request access
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Pending access approvals</h2>
        {loading ? (
          <p className="text-sm text-white/50">Loading requests…</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-white/50">No access requests right now.</p>
        ) : (
          <ul className="space-y-2">
            {requests.map((request) => (
              <li
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-semibold">{request.email}</p>
                  <p className="text-xs uppercase tracking-wide text-white/50">{request.role}</p>
                </div>
                <button
                  type="button"
                  onClick={() => revokeRequest(request.id)}
                  className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-widest text-white/70 transition hover:border-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
};

export default AccessRequests;
