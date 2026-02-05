import React, { useEffect, useState } from 'react';
import { addDoc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import PageHeader from '../components/common/PageHeader.jsx';
import { useTenant } from '../context/TenantContext.jsx';
import { tenantCollection } from '../lib/tenant.js';
import { useNotify } from '../context/NotificationContext.jsx';
import { sendEmailAutomation } from '../lib/automationEngine.js';
import { notifyNewLead, notifyLeadStatusChange } from '../lib/businessNotifications.js';

const statuses = ['New', 'Contacted', 'Proposal Sent', 'Won'];

const Leads = () => {
  const { activeTenantId } = useTenant();
  const notify = useNotify();
  const [leads, setLeads] = useState([]);
  const [draft, setDraft] = useState({ name: '', email: '', notes: '' });

  useEffect(() => {
    if (!activeTenantId) {
      setLeads([]);
      return () => {};
    }
    const leadsQuery = query(
      tenantCollection(activeTenantId, 'leads'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(leadsQuery, (snapshot) => {
      setLeads(snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() })));
    });
    return () => unsubscribe();
  }, [activeTenantId]);

  const createLead = async () => {
    if (!activeTenantId) {
      notify({ type: 'warning', title: 'Select a workspace first.' });
      return;
    }
    if (!draft.name.trim()) {
      notify({ type: 'warning', title: 'Lead name required.' });
      return;
    }
    const leadDoc = await addDoc(tenantCollection(activeTenantId, 'leads'), {
      ...draft,
      status: 'New',
      createdAt: serverTimestamp(),
    });
    
    // Send new lead notification
    await notifyNewLead(activeTenantId, notify, {
      id: leadDoc.id,
      name: draft.name,
      email: draft.email,
      status: 'New',
    });
    
    notify({ type: 'success', title: 'Lead added' });
    setDraft({ name: '', email: '', notes: '' });
  };

  const updateStatus = async (leadId, status, lead) => {
    if (!activeTenantId) return;
    const oldStatus = lead?.status || 'Unknown';
    await updateDoc(doc(tenantCollection(activeTenantId, 'leads'), leadId), { status });
    
    // Send lead status change notification
    await notifyLeadStatusChange(activeTenantId, notify, {
      id: leadId,
      name: lead?.name || 'Unknown',
    }, oldStatus, status);
    
    notify({ type: 'info', title: `Lead marked as ${status}` });
    if (status === 'Contacted') {
      await sendEmailAutomation(activeTenantId, {
        to: (lead && lead.email) || '',
        template: 'lead_follow_up',
        data: { name: lead?.name },
      }).catch(() => {});
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#111029] to-[#1a1240] px-4 pb-16 text-white sm:px-8">
      <PageHeader
        title="Lead Manager"
        subtitle="Track new leads, automate follow-ups, and convert interest into revenue."
        actions={
          <button
            type="button"
            onClick={createLead}
            className="rounded-full bg-indigo-500/30 px-4 py-2 text-xs uppercase tracking-[0.3em] text-indigo-100 transition hover:bg-indigo-500/40"
          >
            Add lead
          </button>
        }
      />

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <motion.div
          layout
          className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_35px_rgba(99,102,241,0.16)]"
        >
          {leads.map((lead) => (
            <article key={lead.id} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">{lead.name}</h3>
                  <p className="text-xs text-white/60">{lead.email || 'No email captured'}</p>
                </div>
                <select
                  value={lead.status}
                  onChange={(event) => updateStatus(lead.id, event.target.value, lead)}
                  className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white focus:border-indigo-400 focus:outline-none"
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              {lead.notes && <p className="mt-3 text-sm text-white/70">{lead.notes}</p>}
            </article>
          ))}
          {!leads.length && <p className="text-sm text-white/60">Create your first lead to begin tracking.</p>}
        </motion.div>

        <aside className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_35px_rgba(99,102,241,0.12)]">
          <h3 className="text-lg font-semibold text-white">Capture lead</h3>
          <label className="block text-xs uppercase tracking-[0.3em] text-white/60">
            Name
            <input
              type="text"
              value={draft.name}
              onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
            />
          </label>
          <label className="block text-xs uppercase tracking-[0.3em] text-white/60">
            Email
            <input
              type="email"
              value={draft.email}
              onChange={(event) => setDraft((prev) => ({ ...prev, email: event.target.value }))}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
            />
          </label>
          <label className="block text-xs uppercase tracking-[0.3em] text-white/60">
            Notes
            <textarea
              value={draft.notes}
              onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
              rows={4}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
            />
          </label>
        </aside>
      </section>
    </main>
  );
};

export default Leads;
