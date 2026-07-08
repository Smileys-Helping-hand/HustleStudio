import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiDownload, 
  FiTrash2, 
  FiSearch, 
  FiFilter, 
  FiCheckCircle, 
  FiXCircle, 
  FiRefreshCw, 
  FiDollarSign, 
  FiX 
} from 'react-icons/fi';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  updateDoc, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader.jsx';
import { useTenant } from '../../context/TenantContext.jsx';
import { useNotify } from '../../context/NotificationContext.jsx';
import { db } from '../../lib/firebase.js';
import { generateDocumentPdf } from '../../lib/pdfGenerator.js';

const InvoicesList = () => {
  const { activeTenantId } = useTenant();
  const notify = useNotify();
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all'); // all, invoice, quote

  // Modals state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    status: 'paid',
    method: 'Bank Transfer',
    date: '',
    reference: '',
    amount: 0
  });

  const [showConvertModal, setShowConvertModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [convertForm, setConvertForm] = useState({
    invoiceNumber: '',
    dueDate: '',
    markPaid: false,
    paymentMethod: 'Bank Transfer',
    paymentReference: ''
  });

  useEffect(() => {
    if (!activeTenantId || !db) {
      setInvoices([]);
      setLoading(false);
      return () => {};
    }

    try {
      const invoicesQuery = query(
        collection(db, 'tenants', activeTenantId, 'invoices'),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(invoicesQuery, (snapshot) => {
        const invoicesList = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt || Date.now()),
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            validUntil: data.validUntil ? new Date(data.validUntil) : null,
          };
        });
        setInvoices(invoicesList);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('[InvoicesList] Error fetching invoices:', error);
      setLoading(false);
    }
  }, [activeTenantId]);

  useEffect(() => {
    let filtered = invoices;

    if (filterType !== 'all') {
      filtered = filtered.filter((doc) => (doc.type || 'invoice') === filterType);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter((doc) => doc.status === filterStatus);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (doc) =>
          doc.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doc.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doc.clientEmail?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredInvoices(filtered);
  }, [invoices, searchTerm, filterStatus, filterType]);

  const handleDelete = async (invoiceId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      if (!db) throw new Error('Database not available');
      await deleteDoc(doc(db, 'tenants', activeTenantId, 'invoices', invoiceId));
      toast.success('Document deleted successfully');
    } catch (error) {
      console.error('[InvoicesList] Delete error:', error);
      toast.error('Failed to delete document');
    }
  };

  const downloadInvoice = async (invoice) => {
    notify({
      type: 'info',
      title: 'Generating PDF',
      description: `Downloading ${invoice.invoiceNumber}...`,
    });
    try {
      await generateDocumentPdf(invoice, invoice.logoPreview || null);
    } catch (error) {
      console.error('[InvoicesList] Download PDF failed:', error);
      toast.error('Failed to download PDF');
    }
  };

  const handleUpdateQuoteStatus = async (quoteId, status) => {
    try {
      const quoteRef = doc(db, 'tenants', activeTenantId, 'invoices', quoteId);
      await updateDoc(quoteRef, {
        status: status,
        updatedAt: serverTimestamp()
      });
      toast.success(`Quote status updated to ${status}`);
    } catch (error) {
      console.error('[InvoicesList] Update status failed:', error);
      toast.error('Failed to update quote status');
    }
  };

  const openPaymentModal = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentForm({
      status: 'paid',
      method: 'Bank Transfer',
      date: new Date().toISOString().split('T')[0],
      reference: '',
      amount: invoice.total || 0
    });
    setShowPaymentModal(true);
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    if (!selectedInvoice || !activeTenantId || !db) return;

    try {
      const invoiceRef = doc(db, 'tenants', activeTenantId, 'invoices', selectedInvoice.id);
      const isFull = paymentForm.amount >= (selectedInvoice.total || 0);
      const newStatus = paymentForm.status === 'paid' && isFull ? 'paid' : 'partially_paid';

      await updateDoc(invoiceRef, {
        status: newStatus,
        paymentStatus: newStatus,
        paymentMethod: paymentForm.method,
        paymentDate: paymentForm.date,
        paymentReference: paymentForm.reference,
        amountPaid: Number(paymentForm.amount),
        updatedAt: serverTimestamp(),
      });

      toast.success('Payment details recorded successfully');
      setShowPaymentModal(false);
    } catch (error) {
      console.error('[InvoicesList] Save payment failed:', error);
      toast.error('Failed to save payment details');
    }
  };

  const openConvertModal = (quote) => {
    setSelectedQuote(quote);
    setConvertForm({
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      dueDate: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d.toISOString().split('T')[0];
      })(),
      markPaid: false,
      paymentMethod: 'Bank Transfer',
      paymentReference: ''
    });
    setShowConvertModal(true);
  };

  const handleConvertQuote = async (e) => {
    e.preventDefault();
    if (!selectedQuote || !activeTenantId || !db) return;

    try {
      const invoiceData = {
        type: 'invoice',
        invoiceNumber: convertForm.invoiceNumber,
        clientName: selectedQuote.clientName || '',
        clientEmail: selectedQuote.clientEmail || '',
        clientAddress: selectedQuote.clientAddress || '',
        companyName: selectedQuote.companyName || '',
        companyAddress: selectedQuote.companyAddress || '',
        companyEmail: selectedQuote.companyEmail || '',
        companyPhone: selectedQuote.companyPhone || '',
        lineItems: selectedQuote.lineItems || [],
        subtotal: selectedQuote.subtotal || 0,
        tax: selectedQuote.tax || 0,
        taxRate: selectedQuote.taxRate || 0,
        total: selectedQuote.total || 0,
        currency: selectedQuote.currency || 'R',
        notes: selectedQuote.notes || '',
        primaryColor: selectedQuote.primaryColor || '#6366f1',
        dueDate: convertForm.dueDate,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        tenantId: activeTenantId,
        convertedFromQuoteId: selectedQuote.id
      };

      if (convertForm.markPaid) {
        invoiceData.status = 'paid';
        invoiceData.paymentStatus = 'paid';
        invoiceData.paymentMethod = convertForm.paymentMethod;
        invoiceData.paymentDate = new Date().toISOString().split('T')[0];
        invoiceData.paymentReference = convertForm.paymentReference;
        invoiceData.amountPaid = selectedQuote.total || 0;
      } else {
        invoiceData.status = 'draft';
        invoiceData.paymentStatus = 'unpaid';
      }

      // Add the new invoice
      await addDoc(collection(db, 'tenants', activeTenantId, 'invoices'), invoiceData);

      // Update the quote to 'converted'
      const quoteRef = doc(db, 'tenants', activeTenantId, 'invoices', selectedQuote.id);
      await updateDoc(quoteRef, {
        status: 'converted',
        updatedAt: serverTimestamp(),
      });

      toast.success('Quote converted into Invoice successfully');
      setShowConvertModal(false);
    } catch (error) {
      console.error('[InvoicesList] Convert quote failed:', error);
      toast.error('Failed to convert quote');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent':
        return 'bg-blue-500/10 border-blue-400/40 text-blue-200';
      case 'paid':
        return 'bg-green-500/10 border-green-400/40 text-green-200';
      case 'accepted':
        return 'bg-emerald-500/10 border-emerald-400/40 text-emerald-200';
      case 'declined':
        return 'bg-rose-500/10 border-rose-400/40 text-rose-200';
      case 'converted':
        return 'bg-indigo-500/10 border-indigo-400/40 text-indigo-200';
      case 'partially_paid':
        return 'bg-yellow-500/10 border-yellow-400/40 text-yellow-200';
      case 'overdue':
        return 'bg-red-500/10 border-red-400/40 text-red-200';
      case 'draft':
        return 'bg-gray-500/10 border-gray-400/40 text-gray-200';
      default:
        return 'bg-indigo-500/10 border-indigo-400/40 text-indigo-200';
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0e0e18] to-[#1b1830] px-4 pb-16 text-white sm:px-8">
      <PageHeader
        title="Quote & Invoice Registry"
        subtitle="Manage client quotations, track invoices, record payments, and audit purchase history."
      />

      {/* Search and Filters */}
      <section className="mb-8 grid gap-4 sm:grid-cols-4">
        <div className="relative sm:col-span-2">
          <FiSearch className="absolute left-4 top-3.5 text-white/40" />
          <input
            type="text"
            placeholder="Search by client name, document number, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 pl-11 pr-4 py-3 text-white placeholder-white/40 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <FiFilter className="text-white/40" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="flex-1 rounded-lg border border-white/10 bg-[#0e0e18] px-4 py-3 text-white focus:border-indigo-400 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="invoice">Invoices Only</option>
            <option value="quote">Quotes Only</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <FiFilter className="text-white/40" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="flex-1 rounded-lg border border-white/10 bg-[#0e0e18] px-4 py-3 text-white focus:border-indigo-400 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="overdue">Overdue</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
            <option value="converted">Converted</option>
          </select>
        </div>
      </section>

      {/* Document History Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-white/10 bg-white/5 shadow-[0_0_30px_rgba(99,102,241,0.12)]"
      >
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-white/60">Loading documents...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center">
            <p className="text-lg text-white/60">No records found</p>
            <p className="text-sm text-white/40">Try adjusting your filters or search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">Type</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">Doc Number</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">Client</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">Total Due</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">Created</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((doc, idx) => {
                  const docType = doc.type || 'invoice';
                  return (
                    <tr
                      key={doc.id}
                      className={`border-b border-white/5 transition ${
                        idx % 2 === 0 ? 'bg-white/2' : 'bg-transparent'
                      } hover:bg-white/5`}
                    >
                      <td className="px-6 py-4">
                        <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                          docType === 'quote' 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                            : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        }`}>
                          {docType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-indigo-200">
                        {doc.invoiceNumber}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-white">{doc.clientName}</p>
                          <p className="text-xs text-white/60">{doc.clientEmail}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-white">
                        {doc.currency || 'R'}
                        {doc.total?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-widest ${getStatusColor(
                            doc.status
                          )}`}
                        >
                          {doc.status}
                        </span>
                        {docType === 'invoice' && doc.status === 'paid' && doc.paymentMethod && (
                          <div className="text-[10px] text-emerald-400 mt-1">
                            via {doc.paymentMethod}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-white/60">
                        {doc.createdAt?.toLocaleDateString?.() || new Date(doc.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => downloadInvoice(doc)}
                            className="rounded-lg bg-indigo-500/20 p-2 text-indigo-200 transition hover:bg-indigo-500/30"
                            title="Download PDF"
                          >
                            <FiDownload size={15} />
                          </button>
                          
                          {/* Quote Actions */}
                          {docType === 'quote' && doc.status !== 'converted' && (
                            <>
                              {doc.status !== 'accepted' && (
                                <button
                                  onClick={() => handleUpdateQuoteStatus(doc.id, 'accepted')}
                                  className="rounded-lg bg-emerald-500/20 p-2 text-emerald-300 transition hover:bg-emerald-500/30"
                                  title="Mark Accepted"
                                >
                                  <FiCheckCircle size={15} />
                                </button>
                              )}
                              {doc.status !== 'declined' && (
                                <button
                                  onClick={() => handleUpdateQuoteStatus(doc.id, 'declined')}
                                  className="rounded-lg bg-rose-500/20 p-2 text-rose-300 transition hover:bg-rose-500/30"
                                  title="Mark Declined"
                                >
                                  <FiXCircle size={15} />
                                </button>
                              )}
                              {doc.status === 'accepted' && (
                                <button
                                  onClick={() => openConvertModal(doc)}
                                  className="rounded-lg bg-indigo-500/20 p-2 text-indigo-300 transition hover:bg-indigo-500/30"
                                  title="Convert to Invoice"
                                >
                                  <FiRefreshCw size={15} />
                                </button>
                              )}
                            </>
                          )}

                          {/* Invoice Actions */}
                          {docType === 'invoice' && doc.status !== 'paid' && (
                            <button
                              onClick={() => openPaymentModal(doc)}
                              className="rounded-lg bg-emerald-500/20 p-2 text-emerald-300 transition hover:bg-emerald-500/30"
                              title="Record Payment / Purchase"
                            >
                              <FiDollarSign size={15} />
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="rounded-lg bg-red-500/20 p-2 text-red-200 transition hover:bg-red-500/30"
                            title="Delete"
                          >
                            <FiTrash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Summary Statistics */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-8 grid gap-4 sm:grid-cols-4"
      >
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-white/60">Total Documents</p>
          <p className="mt-2 text-2xl font-bold text-white">{invoices.length}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-white/60">Total Sales Value</p>
          <p className="mt-2 text-2xl font-bold text-emerald-300">
            R{invoices
              .filter((d) => (d.type || 'invoice') === 'invoice')
              .reduce((sum, inv) => sum + (inv.total || 0), 0)
              .toFixed(2)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-white/60">Settled Purchases</p>
          <p className="mt-2 text-2xl font-bold text-blue-300">
            {invoices.filter((d) => d.status === 'paid').length} Invoices
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-white/60">Active Proposals</p>
          <p className="mt-2 text-2xl font-bold text-yellow-300">
            {invoices.filter((d) => d.type === 'quote' && d.status !== 'converted').length} Quotes
          </p>
        </div>
      </motion.section>

      {/* Record Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && selectedInvoice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => setShowPaymentModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0e0e18] p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-xl font-bold text-white">Record Client Purchase</h3>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="rounded-lg p-1.5 hover:bg-white/10 text-white/60 hover:text-white"
                >
                  <FiX size={18} />
                </button>
              </div>

              <form onSubmit={handleSavePayment} className="mt-6 space-y-4 text-white">
                <div className="rounded-2xl bg-white/5 p-4 border border-white/5">
                  <p className="text-xs text-white/50">INVOICE NUMBER</p>
                  <p className="text-base font-semibold font-mono text-indigo-300">{selectedInvoice.invoiceNumber}</p>
                  <p className="text-xs text-white/50 mt-2">TOTAL VALUE</p>
                  <p className="text-xl font-bold text-white">{selectedInvoice.currency || 'R'}{(selectedInvoice.total || 0).toFixed(2)}</p>
                </div>

                <div>
                  <label htmlFor="paymentMethod" className="block text-sm text-white/80 mb-1">Payment Method</label>
                  <select
                    id="paymentMethod"
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-white focus:border-indigo-400 focus:outline-none"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Card">Card</option>
                    <option value="Cash">Cash</option>
                    <option value="Mobile Money">Mobile Money</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="paymentDate" className="block text-sm text-white/80 mb-1">Payment Date</label>
                  <input
                    id="paymentDate"
                    type="date"
                    value={paymentForm.date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-white focus:border-indigo-400 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="paymentReference" className="block text-sm text-white/80 mb-1">Transaction Reference</label>
                  <input
                    id="paymentReference"
                    type="text"
                    value={paymentForm.reference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                    placeholder="e.g. EFT-987654 or Card Receipt"
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-white focus:border-indigo-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="paymentAmount" className="block text-sm text-white/80 mb-1">Amount Paid ({selectedInvoice.currency || 'R'})</label>
                  <input
                    id="paymentAmount"
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-white focus:border-indigo-400 focus:outline-none"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 rounded-lg bg-white/10 px-4 py-2.5 font-medium transition hover:bg-white/20 text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold transition hover:bg-emerald-700 text-white"
                  >
                    Save Payment
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Convert Quote to Invoice Modal */}
      <AnimatePresence>
        {showConvertModal && selectedQuote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => setShowConvertModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0e0e18] p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-xl font-bold text-white">Convert Proposal to Invoice</h3>
                <button
                  onClick={() => setShowConvertModal(false)}
                  className="rounded-lg p-1.5 hover:bg-white/10 text-white/60 hover:text-white"
                >
                  <FiX size={18} />
                </button>
              </div>

              <form onSubmit={handleConvertQuote} className="mt-6 space-y-4 text-white">
                <div className="rounded-2xl bg-white/5 p-4 border border-white/5">
                  <p className="text-xs text-white/50 font-semibold">ACCEPTED QUOTE</p>
                  <p className="text-base font-semibold font-mono text-emerald-300">{selectedQuote.invoiceNumber}</p>
                  <p className="text-xs text-white/50 mt-2">CLIENT</p>
                  <p className="text-sm font-bold text-white">{selectedQuote.clientName}</p>
                  <p className="text-xs text-white/50 mt-2">TOTAL VALUE</p>
                  <p className="text-xl font-bold text-indigo-300">{selectedQuote.currency || 'R'}{(selectedQuote.total || 0).toFixed(2)}</p>
                </div>

                <div>
                  <label htmlFor="convertInvoiceNumber" className="block text-sm text-white/80 mb-1">Invoice Number</label>
                  <input
                    id="convertInvoiceNumber"
                    type="text"
                    value={convertForm.invoiceNumber}
                    onChange={(e) => setConvertForm({ ...convertForm, invoiceNumber: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-white focus:border-indigo-400 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="convertDueDate" className="block text-sm text-white/80 mb-1">Payment Due Date</label>
                  <input
                    id="convertDueDate"
                    type="date"
                    value={convertForm.dueDate}
                    onChange={(e) => setConvertForm({ ...convertForm, dueDate: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-white focus:border-indigo-400 focus:outline-none"
                    required
                  />
                </div>

                <div className="flex items-center gap-2 py-2">
                  <input
                    type="checkbox"
                    id="markPaid"
                    checked={convertForm.markPaid}
                    onChange={(e) => setConvertForm({ ...convertForm, markPaid: e.target.checked })}
                    className="h-4.5 w-4.5 rounded border-white/10 bg-black/40 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="markPaid" className="text-sm font-medium text-white/80 cursor-pointer">
                    Client has paid this immediately
                  </label>
                </div>

                {convertForm.markPaid && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4 border-t border-white/5 pt-3"
                  >
                    <div>
                      <label htmlFor="convertPaymentMethod" className="block text-xs text-white/70 mb-1">Payment Method</label>
                      <select
                        id="convertPaymentMethod"
                        value={convertForm.paymentMethod}
                        onChange={(e) => setConvertForm({ ...convertForm, paymentMethod: e.target.value })}
                        className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none text-xs"
                      >
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Card">Card</option>
                        <option value="Cash">Cash</option>
                        <option value="Mobile Money">Mobile Money</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="convertPaymentReference" className="block text-xs text-white/70 mb-1">Transaction Reference</label>
                      <input
                        id="convertPaymentReference"
                        type="text"
                        value={convertForm.paymentReference}
                        onChange={(e) => setConvertForm({ ...convertForm, paymentReference: e.target.value })}
                        placeholder="e.g. Card Slip ID"
                        className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none text-xs"
                      />
                    </div>
                  </motion.div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowConvertModal(false)}
                    className="flex-1 rounded-lg bg-white/10 px-4 py-2.5 font-medium transition hover:bg-white/20 text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold transition hover:bg-indigo-700 text-white"
                  >
                    Generate Invoice
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

export default InvoicesList;
