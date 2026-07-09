import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMail, FiPhone, FiUserPlus, FiX, FiFileText } from 'react-icons/fi';
import { addDoc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import PageHeader from '../components/common/PageHeader.jsx';
import { useTenant } from '../context/TenantContext.jsx';
import { tenantCollection } from '../lib/tenant.js';
import { toast } from 'react-hot-toast';

const CRM = () => {
  const { activeTenantId } = useTenant();
  const [contacts, setContacts] = useState([]);
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', email: '', phone: '', company: '', stage: 'Discovery' });

  useEffect(() => {
    if (!activeTenantId) {
      setContacts([]);
      return () => {};
    }
    const contactsQuery = query(
      tenantCollection(activeTenantId, 'contacts'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(contactsQuery, (snapshot) => {
      setContacts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [activeTenantId]);

  const handleCreateContact = async (e) => {
    e.preventDefault();
    if (!activeTenantId) {
      toast.error('Select a workspace first');
      return;
    }
    if (!newContact.name.trim()) {
      toast.error('Contact name is required');
      return;
    }

    try {
      await addDoc(tenantCollection(activeTenantId, 'contacts'), {
        ...newContact,
        createdAt: serverTimestamp(),
        status: 'active',
      });
      toast.success('Contact added successfully');
      setNewContact({ name: '', email: '', phone: '', company: '', stage: 'Discovery' });
      setShowNewContactModal(false);
    } catch (error) {
      console.error('[CRM] Failed to create contact', error);
      toast.error('Failed to create contact');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0e0e18] to-[#1b1830] px-4 pb-16 text-white sm:px-8">
      <PageHeader
        title="CRM Pipeline"
        subtitle="Capture leads, track follow-ups, and keep client conversations moving towards the close."
        actions={
          <div className="flex flex-wrap gap-3">
            <button 
              type="button" 
              onClick={() => setShowNewContactModal(true)}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-2 text-sm text-emerald-200 transition hover:bg-emerald-500/30"
            >
              <FiUserPlus /> New Contact
            </button>
            <Link
              to="/crm/business-documents"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-sm font-semibold text-white transition hover:from-indigo-600 hover:to-purple-600"
            >
              💼 Business Documents
            </Link>
          </div>
        }
      />

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="space-y-4"
        >
          {contacts.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center">
              <FiUserPlus className="mx-auto text-4xl text-white/20" />
              <p className="mt-4 text-white/60">No contacts yet</p>
              <button
                type="button"
                onClick={() => setShowNewContactModal(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-2 text-sm text-emerald-200 transition hover:bg-emerald-500/30"
              >
                <FiUserPlus /> Add Your First Contact
              </button>
            </div>
          ) : (
            contacts.map((contact) => (
              <article
                key={contact.id}
                className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_30px_rgba(99,102,241,0.14)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="page-heading text-xl font-semibold">{contact.name}</h2>
                    <p className="text-sm text-white/60">{contact.email || contact.phone}</p>
                    {contact.company && <p className="text-xs text-white/40">{contact.company}</p>}
                  </div>
                  <span className="rounded-full border border-indigo-400/40 bg-indigo-500/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-indigo-200">
                    {contact.stage || 'Discovery'}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-white/60">
                  {contact.email && (
                    <a 
                      href={`mailto:${contact.email}`}
                      className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 hover:border-indigo-400/60 hover:text-white"
                    >
                      <FiMail /> Send Email
                    </a>
                  )}
                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone}`}
                      className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 hover:border-indigo-400/60 hover:text-white"
                    >
                      <FiPhone /> Call
                    </a>
                  )}
                  <Link
                    to="/crm/invoices"
                    onClick={() => {
                      sessionStorage.setItem('invoicePreFill', JSON.stringify({
                        client: contact.name,
                        clientEmail: contact.email || '',
                        clientAddress: contact.company ? `${contact.company}` : '',
                        notes: `Quote for ${contact.name}. Valid for 30 days.`
                      }));
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 hover:border-indigo-400/60 hover:text-white"
                  >
                    <FiFileText /> Create Quote/Invoice
                  </Link>
                </div>
              </article>
            ))
          )}
        </motion.div>

        <aside className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h3 className="page-heading text-lg font-semibold">Pipeline health</h3>
          <p className="mt-3 text-sm text-white/70">
            {contacts.length === 0 
              ? 'Add contacts to see your pipeline health and conversion insights.'
              : `You have ${contacts.length} contact${contacts.length === 1 ? '' : 's'} in your pipeline.`
            }
          </p>
          <div className="mt-6 h-40 rounded-2xl border border-dashed border-white/20 bg-black/30 flex items-center justify-center text-white/40 text-sm">
            {contacts.length > 0 ? 'Pipeline analytics coming soon' : 'Add contacts to unlock insights'}
          </div>
        </aside>
      </section>

      {/* New Contact Modal */}
      <AnimatePresence>
        {showNewContactModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => setShowNewContactModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0e0e18] p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">New Contact</h2>
                <button
                  type="button"
                  onClick={() => setShowNewContactModal(false)}
                  className="rounded-lg p-2 transition hover:bg-white/10"
                >
                  <FiX />
                </button>
              </div>

              <form onSubmit={handleCreateContact} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="contactName" className="mb-2 block text-sm font-medium text-white/80">Name *</label>
                  <input
                    id="contactName"
                    type="text"
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-white/40 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="contactEmail" className="mb-2 block text-sm font-medium text-white/80">Email</label>
                  <input
                    id="contactEmail"
                    type="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-white/40 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                    placeholder="john@company.com"
                  />
                </div>

                <div>
                  <label htmlFor="contactPhone" className="mb-2 block text-sm font-medium text-white/80">Phone</label>
                  <input
                    id="contactPhone"
                    type="tel"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-white/40 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                    placeholder="+27 123 456 789"
                  />
                </div>

                <div>
                  <label htmlFor="contactCompany" className="mb-2 block text-sm font-medium text-white/80">Company</label>
                  <input
                    id="contactCompany"
                    type="text"
                    value={newContact.company}
                    onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-white/40 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                    placeholder="Acme Corp"
                  />
                </div>

                <div>
                  <label htmlFor="contactStage" className="mb-2 block text-sm font-medium text-white/80">Stage</label>
                  <select
                    id="contactStage"
                    value={newContact.stage}
                    onChange={(e) => setNewContact({ ...newContact, stage: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                  >
                    <option value="Discovery">Discovery</option>
                    <option value="Proposal Sent">Proposal Sent</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Closed Won">Closed Won</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowNewContactModal(false)}
                    className="flex-1 rounded-lg bg-white/10 px-4 py-2.5 font-medium transition hover:bg-white/20"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-emerald-500 px-4 py-2.5 font-medium transition hover:bg-emerald-600"
                  >
                    Add Contact
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
};

export default CRM;
