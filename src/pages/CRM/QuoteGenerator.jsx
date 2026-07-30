import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FiEye, FiDownload, FiPlus, FiTrash2, FiArrowLeft } from 'react-icons/fi';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader.jsx';
import { useNotify } from '../../context/NotificationContext.jsx';
import { useTenant } from '../../context/TenantContext.jsx';
import { db } from '../../lib/firebase.js';
import { generateDocumentPdf } from '../../lib/pdfGenerator.js';

const defaultLineItem = { description: '', quantity: 1, price: 0 };

const QuoteGenerator = () => {
  const navigate = useNavigate();
  const notify = useNotify();
  const { activeTenantId } = useTenant();

  const [client, setClient] = useState({
    name: '',
    contact: '',
    address: '',
  });
  const [lineItems, setLineItems] = useState([defaultLineItem]);
  const [notes, setNotes] = useState('Valid for 30 days from the date of issue.');
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  const [customization, setCustomization] = useState({
    primaryColor: '#8b5cf6',
    companyName: 'Your Company',
    companyAddress: '',
    companyEmail: '',
    companyPhone: '',
    logoPreview: null,
    quoteNumber: `QT-${Date.now().toString().slice(-6)}`,
    currency: 'R',
    validityDays: 30,
  });

  const totals = useMemo(() => {
    const subtotal = lineItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0), 0);
    return { subtotal, total: subtotal };
  }, [lineItems]);

  const updateLine = (index, field, value) => {
    setLineItems((current) => current.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)));
  };

  const addLine = () => setLineItems((current) => [...current, { description: '', quantity: 1, price: 0 }]);
  const removeLine = (index) => setLineItems((current) => current.filter((_, idx) => idx !== index));


  const saveQuoteToDatabase = async (quoteData) => {
    if (!activeTenantId || !db) {
      notify({ type: 'error', title: 'Error', description: 'Workspace not selected' });
      return false;
    }

    try {
      const newQuote = {
        ...quoteData,
        status: 'draft',
        type: 'quote',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        tenantId: activeTenantId,
      };

      await addDoc(
        collection(db, 'tenants', activeTenantId, 'quotes'),
        newQuote
      );

      notify({
        type: 'success',
        title: 'Quote Saved',
        description: `Quote ${quoteData.quoteNumber} has been saved to your records`,
      });
      return true;
    } catch (error) {
      console.error('[Quote] Save error:', error);
      notify({ type: 'error', title: 'Save Failed', description: error.message });
      return false;
    }
  };

  const generatePdf = async () => {
    if (!client.name.trim()) {
      notify({ type: 'error', title: 'Required', description: 'Please enter client name' });
      return;
    }

    setGenerating(true);
    try {
      const validUntilDate = new Date();
      validUntilDate.setDate(validUntilDate.getDate() + Number(customization.validityDays || 30));

      const quoteData = {
        type: 'quote',
        quoteNumber: customization.quoteNumber,
        clientName: client.name,
        clientEmail: client.contact,
        clientAddress: client.address,
        companyName: customization.companyName,
        companyAddress: customization.companyAddress,
        companyEmail: customization.companyEmail,
        companyPhone: customization.companyPhone,
        lineItems: lineItems,
        subtotal: totals.subtotal,
        total: totals.total,
        currency: customization.currency || 'R',
        notes: notes,
        validUntil: validUntilDate,
        primaryColor: customization.primaryColor || '#8b5cf6',
      };

      await generateDocumentPdf(quoteData, customization.logoPreview);

      await saveQuoteToDatabase(quoteData);

      notify({
        title: 'Quote created successfully',
        description: `${client.name} — ${customization.quoteNumber}`,
        type: 'success',
      });
    } catch (error) {
      console.error('[Quote] Generation failed:', error);
      notify({ type: 'error', title: 'Failed to generate quote', description: error.message || 'Error creating PDF' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0e0e18] to-[#1b1830] px-4 pb-24 text-white sm:px-8">
      <motion.button
        onClick={() => navigate('/crm/business-documents')}
        className="mb-4 flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:border-white/40 hover:bg-white/10"
      >
        <FiArrowLeft /> Back to Business Documents
      </motion.button>

      <PageHeader
        title="Quote Generator"
        subtitle="Create professional quotes for your clients with custom branding."
      />

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Editor */}
        <motion.section
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          {/* Branding */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="mb-4 text-lg font-semibold">Branding</h3>
            <div className="space-y-3">
              <label className="text-sm text-white/70">
                Company Name
                <input
                  type="text"
                  value={customization.companyName}
                  onChange={(e) => setCustomization((prev) => ({ ...prev, companyName: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white"
                />
              </label>
              <label className="text-sm text-white/70">
                Email
                <input
                  type="email"
                  value={customization.companyEmail}
                  onChange={(e) => setCustomization((prev) => ({ ...prev, companyEmail: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white"
                />
              </label>
              <label className="text-sm text-white/70">
                Phone
                <input
                  type="tel"
                  value={customization.companyPhone}
                  onChange={(e) => setCustomization((prev) => ({ ...prev, companyPhone: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white"
                />
              </label>
              <label className="text-sm text-white/70">
                Validity (days)
                <input
                  type="number"
                  value={customization.validityDays}
                  onChange={(e) => setCustomization((prev) => ({ ...prev, validityDays: Number(e.target.value) }))}
                  min="1"
                  max="365"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white"
                />
              </label>
            </div>
          </div>

          {/* Client Info */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="mb-4 text-lg font-semibold">Client Information</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Client Name *"
                value={client.name}
                onChange={(e) => setClient({ ...client, name: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white placeholder-white/40"
              />
              <input
                type="email"
                placeholder="Email"
                value={client.contact}
                onChange={(e) => setClient({ ...client, contact: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white placeholder-white/40"
              />
              <input
                type="text"
                placeholder="Address"
                value={client.address}
                onChange={(e) => setClient({ ...client, address: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white placeholder-white/40"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="mb-4 text-lg font-semibold">Items</h3>
            <div className="space-y-3">
              {lineItems.map((item, idx) => (
                <div key={idx} className="space-y-2 rounded-lg border border-white/10 bg-black/30 p-3">
                  <input
                    type="text"
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateLine(idx, 'description', e.target.value)}
                    className="w-full rounded border border-white/10 bg-black/60 px-2 py-1.5 text-sm text-white placeholder-white/40"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                      className="rounded border border-white/10 bg-black/60 px-2 py-1.5 text-sm text-white"
                    />
                    <input
                      type="number"
                      placeholder="Price"
                      value={item.price}
                      onChange={(e) => updateLine(idx, 'price', e.target.value)}
                      className="rounded border border-white/10 bg-black/60 px-2 py-1.5 text-sm text-white"
                    />
                    <div className="flex items-center justify-between rounded border border-white/10 bg-black/60 px-2 py-1.5 text-sm text-white/70">
                      R{(Number(item.quantity) * Number(item.price || 0)).toFixed(2)}
                      <button onClick={() => removeLine(idx)} className="text-red-400 hover:text-red-300">
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={addLine}
                className="w-full rounded-lg border border-dashed border-white/20 bg-white/5 py-2.5 text-sm text-white/70 transition hover:border-white/40"
              >
                <FiPlus className="mr-2 inline" /> Add Item
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <label className="text-sm text-white/70">
              Notes
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white"
              />
            </label>
          </div>
        </motion.section>

        {/* Preview */}
        {showPreview && (
          <motion.section
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="sticky top-20 h-fit"
          >
            <div className="rounded-2xl border border-white/10 bg-white p-6 text-black shadow-2xl">
              <div className="text-right text-3xl font-bold" style={{ color: customization.primaryColor }}>
                QUOTE
              </div>
              <p className="text-right text-sm text-gray-600">{customization.quoteNumber}</p>

              <div className="mt-6 border-t pt-6">
                <div className="font-bold text-lg" style={{ color: customization.primaryColor }}>
                  {customization.companyName}
                </div>
                <p className="text-sm text-gray-600">{customization.companyEmail}</p>
                <p className="text-sm text-gray-600">{customization.companyPhone}</p>
              </div>

              <div className="mt-6 border-t pt-6">
                <p className="text-xs font-semibold text-gray-500 uppercase">Bill To</p>
                <p className="font-semibold text-gray-900">{client.name || 'Client Name'}</p>
                <p className="text-sm text-gray-600">{client.contact}</p>
              </div>

              <table className="mt-6 w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: customization.primaryColor }} className="text-white">
                    <th className="px-3 py-2 text-left">Description</th>
                    <th className="px-3 py-2 text-center w-12">Qty</th>
                    <th className="px-3 py-2 text-right w-20">Price</th>
                    <th className="px-3 py-2 text-right w-20">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="px-3 py-2">{item.description || '-'}</td>
                      <td className="px-3 py-2 text-center">{item.quantity}</td>
                      <td className="px-3 py-2 text-right">R{Number(item.price || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-semibold">
                        R{(Number(item.quantity) * Number(item.price || 0)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-6 border-t pt-4 text-right">
                <div className="text-lg font-bold text-gray-900">
                  Total: R{totals.total.toFixed(2)}
                </div>
              </div>

              {notes.trim() && (
                <div className="mt-6 border-t pt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Notes</p>
                  <p className="text-sm text-gray-600">{notes}</p>
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setShowPreview(false)}
                className="flex-1 rounded-lg border border-white/20 bg-white/10 py-2.5 text-sm text-white"
              >
                <FiEye className="mr-2 inline" /> Hide Preview
              </button>
              <button
                onClick={generatePdf}
                disabled={generating}
                className="flex-1 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                <FiDownload className="mr-2 inline" /> {generating ? 'Generating...' : 'Download PDF'}
              </button>
            </div>
          </motion.section>
        )}
      </div>
    </main>
  );
};

export default QuoteGenerator;
