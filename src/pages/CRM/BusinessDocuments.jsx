import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiFileText, FiDollarSign, FiPlus, FiSearch } from 'react-icons/fi';
import PageHeader from '../../components/common/PageHeader.jsx';
import { useTenant } from '../../context/TenantContext.jsx';
import { getNeonClient } from '../../lib/neonClient.js';

const BusinessDocuments = () => {
  const navigate = useNavigate();
  const { activeTenantId } = useTenant();
  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    if (!activeTenantId) return;

    const fetchDocuments = async () => {
      try {
        const neon = getNeonClient();

        // Fetch both invoices and quotes
        const [invoices, quotes] = await Promise.all([
          neon.getInvoices(activeTenantId).catch(() => []),
          neon.getQuotes(activeTenantId).catch(() => []),
        ]);

        // Combine and normalize data
        let allDocs = [
          ...(Array.isArray(invoices) ? invoices : []).map((inv) => ({
            ...inv,
            type: 'invoice',
            number: inv.invoice_number || inv.invoiceNumber,
            createdAt: new Date(inv.created_at || inv.createdAt || Date.now()),
          })),
          ...(Array.isArray(quotes) ? quotes : []).map((quote) => ({
            ...quote,
            type: 'quote',
            number: quote.quote_number || quote.quoteNumber,
            createdAt: new Date(quote.created_at || quote.createdAt || Date.now()),
          })),
        ];

        // Fallback to local storage recorded documents if API returned empty/failed
        if (allDocs.length === 0) {
          try {
            const localInvoices = JSON.parse(localStorage.getItem(`hustlestudio_${activeTenantId}_invoices`) || '[]');
            const localQuotes = JSON.parse(localStorage.getItem(`hustlestudio_${activeTenantId}_quotes`) || '[]');
            allDocs = [
              ...localInvoices.map((inv) => ({ ...inv, type: 'invoice', number: inv.invoiceNumber, createdAt: new Date(inv.createdAt) })),
              ...localQuotes.map((q) => ({ ...q, type: 'quote', number: q.quoteNumber, createdAt: new Date(q.createdAt) })),
            ];
          } catch (e) {
            // silent
          }
        }

        // Sort by createdAt descending
        allDocs.sort((a, b) => b.createdAt - a.createdAt);
        setDocuments(allDocs);
      } catch (error) {
        console.warn('[BusinessDocuments] Document fetch fallback:', error?.message || error);
      }
    };

    fetchDocuments();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchDocuments, 30000);
    return () => clearInterval(interval);
  }, [activeTenantId]);

  useEffect(() => {
    let filtered = documents;

    if (filterType !== 'all') {
      filtered = filtered.filter((doc) => doc.type === filterType);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter((doc) => doc.status === filterStatus);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (doc) =>
          doc.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doc.invoice_number?.includes(searchTerm) ||
          doc.quote_number?.includes(searchTerm)
      );
    }

    setFilteredDocuments(filtered);
  }, [documents, searchTerm, filterType, filterStatus]);

  const stats = {
    total: documents.length,
    totalValue: documents.reduce((sum, doc) => sum + (doc.total || 0), 0),
    invoices: documents.filter((d) => d.type === 'invoice').length,
    quotes: documents.filter((d) => d.type === 'quote').length,
    paid: documents.filter((d) => d.status === 'paid').length,
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0e0e18] to-[#1b1830] px-4 pb-16 text-white sm:px-8">
      <PageHeader
        title="Business Documents"
        subtitle="Manage all your invoices and quotes in one place"
        actions={
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={() => navigate('/crm/invoices')}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-sm font-semibold text-white transition hover:from-indigo-600 hover:to-purple-600"
            >
              <FiPlus /> Create Invoice
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={() => navigate('/crm/quotes')}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              <FiPlus /> Create Quote
            </motion.button>
          </div>
        }
      />

      {/* Stats Grid */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 grid gap-4 sm:grid-cols-5"
      >
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-white/60">Total Documents</p>
          <p className="mt-2 text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-white/60">Total Value</p>
          <p className="mt-2 text-2xl font-bold text-green-200">R{stats.totalValue.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-white/60">Invoices</p>
          <p className="mt-2 text-2xl font-bold text-blue-200">{stats.invoices}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-white/60">Quotes</p>
          <p className="mt-2 text-2xl font-bold text-yellow-200">{stats.quotes}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-white/60">Paid</p>
          <p className="mt-2 text-2xl font-bold text-emerald-200">{stats.paid}</p>
        </div>
      </motion.section>

      {/* Search & Filter */}
      <section className="mb-8 grid gap-3 sm:grid-cols-4">
        <div className="relative sm:col-span-2">
          <FiSearch className="absolute left-3 top-3 text-white/40" />
          <input
            type="text"
            placeholder="Search by client, invoice #, or quote #..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
        >
          <option value="all">All Types</option>
          <option value="invoice">Invoices</option>
          <option value="quote">Quotes</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
        </select>
      </section>

      {/* Documents List */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-white/10 bg-white/5 shadow-[0_0_30px_rgba(99,102,241,0.12)]"
      >
        {filteredDocuments.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center">
            <FiFileText className="mb-3 text-4xl text-white/30" />
            <p className="text-white/60">No documents found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-6 py-4 text-left font-semibold text-white/80">Type</th>
                  <th className="px-6 py-4 text-left font-semibold text-white/80">Number</th>
                  <th className="px-6 py-4 text-left font-semibold text-white/80">Client</th>
                  <th className="px-6 py-4 text-left font-semibold text-white/80">Amount</th>
                  <th className="px-6 py-4 text-left font-semibold text-white/80">Status</th>
                  <th className="px-6 py-4 text-left font-semibold text-white/80">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((doc, idx) => (
                  <tr
                    key={doc.id}
                    className={`border-b border-white/5 transition ${
                      idx % 2 === 0 ? 'bg-white/2' : 'bg-transparent'
                    } hover:bg-white/10`}
                  >
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-200">
                        {doc.type === 'invoice' ? <FiDollarSign size={14} /> : <FiFileText size={14} />}
                        {doc.type === 'invoice' ? 'Invoice' : 'Quote'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-indigo-200">
                      {doc.invoiceNumber || doc.quoteNumber}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-white">{doc.clientName}</p>
                        <p className="text-xs text-white/60">{doc.clientEmail}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-white">
                      R{(doc.total || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest border ${
                          doc.status === 'paid'
                            ? 'bg-green-500/10 border-green-400/40 text-green-200'
                            : doc.status === 'sent'
                            ? 'bg-blue-500/10 border-blue-400/40 text-blue-200'
                            : 'bg-gray-500/10 border-gray-400/40 text-gray-200'
                        }`}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white/60">
                      {doc.createdAt?.toLocaleDateString?.() ||
                        new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.section>
    </main>
  );
};

export default BusinessDocuments;
