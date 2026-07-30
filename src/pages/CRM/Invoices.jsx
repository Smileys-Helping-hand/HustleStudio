import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import PageHeader from '../../components/common/PageHeader.jsx';
import { useNotify } from '../../context/NotificationContext.jsx';
import { useTenant } from '../../context/TenantContext.jsx';
import { notifyInvoiceCreated } from '../../lib/businessNotifications.js';
import { generateDocumentPdf } from '../../lib/pdfGenerator.js';

const defaultLineItem = { description: '', quantity: 1, price: 0 };

const Invoices = () => {
  const { activeTenantId } = useTenant();
  const [client, setClient] = useState({
    name: '',
    contact: '',
    address: '',
  });
  const [lineItems, setLineItems] = useState([defaultLineItem]);
  const [notes, setNotes] = useState('Payment due within 7 days. Thank you for partnering with us.');
  const notify = useNotify();
  const [generating, setGenerating] = useState(false);

  const totals = useMemo(() => {
    const subtotal = lineItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0), 0);
    const vat = subtotal * 0.15;
    return { subtotal, vat, total: subtotal + vat };
  }, [lineItems]);

  const updateLine = (index, field, value) => {
    setLineItems((current) => current.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)));
  };

  const addLine = () => setLineItems((current) => [...current, { description: '', quantity: 1, price: 0 }]);
  const removeLine = (index) => setLineItems((current) => current.filter((_, idx) => idx !== index));

  const generatePdf = async () => {
    if (!client.name.trim()) {
      notify({ type: 'error', title: 'Required', description: 'Please enter client name' });
      return;
    }

    setGenerating(true);
    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

      const invoiceData = {
        type: 'invoice',
        invoiceNumber,
        clientName: client.name,
        clientEmail: client.contact,
        clientAddress: client.address,
        companyName: 'Hustle Studio',
        lineItems: lineItems,
        subtotal: totals.subtotal,
        vat: totals.vat,
        vatRate: 15,
        includeTax: true,
        total: totals.total,
        currency: 'R',
        notes: notes,
        dueDate: dueDate,
        primaryColor: '#6366f1',
      };

      await generateDocumentPdf(invoiceData, null);

      if (activeTenantId) {
        await notifyInvoiceCreated(activeTenantId, notify, {
          id: invoiceNumber,
          invoiceNumber,
          clientName: client.name,
          total: totals.total,
          dueDate,
        });
      }

      notify({
        title: 'Invoice generated & scheduled',
        description: `${client.name} — follow up by ${dueDate.toLocaleDateString()}.`,
        type: 'success',
      });
    } catch (error) {
      console.error('[Invoice] Generation failed:', error);
      notify({ type: 'error', title: 'Failed to generate invoice', description: error.message || 'Error generating PDF' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0e0e18] to-[#1b1830] px-4 pb-16 text-white sm:px-8">
      <PageHeader
        title="Client invoicing"
        subtitle="Generate branded invoices and send them straight from Hustle Studio CRM."
      />

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_30px_rgba(99,102,241,0.12)]"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-white/70">
            Client name
            <input
              type="text"
              value={client.name}
              onChange={(event) => setClient({ ...client, name: event.target.value })}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
            />
          </label>
          <label className="text-sm text-white/70">
            Client email
            <input
              type="email"
              value={client.contact}
              onChange={(event) => setClient({ ...client, contact: event.target.value })}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
            />
          </label>
          <label className="text-sm text-white/70 sm:col-span-2">
            Billing address
            <input
              type="text"
              value={client.address}
              onChange={(event) => setClient({ ...client, address: event.target.value })}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
            />
          </label>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Line items</h2>
          {lineItems.map((item, index) => (
            <div key={`line-${index}`} className="grid gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 sm:grid-cols-[2fr_repeat(2,minmax(0,1fr))_auto]">
              <input
                type="text"
                value={item.description}
                onChange={(event) => updateLine(index, 'description', event.target.value)}
                placeholder="Description"
                className="rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
              />
              <input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(event) => updateLine(index, 'quantity', event.target.value)}
                className="rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
              />
              <input
                type="number"
                value={item.price}
                onChange={(event) => updateLine(index, 'price', event.target.value)}
                className="rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
              />
              <span className="self-center text-sm text-white/70">
                R{(Number(item.quantity) * Number(item.price || 0)).toFixed(2)}
              </span>
              <button
                type="button"
                onClick={() => removeLine(index)}
                className="self-center text-sm text-red-300 transition hover:text-red-200"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addLine}
            className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/80 transition hover:border-white/40"
          >
            Add line item
          </button>
        </div>

        <label className="block text-sm text-white/70">
          Notes for client
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="mt-1 h-24 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-indigo-400/40 bg-indigo-500/10 px-4 py-3 text-sm text-white/80">
          <div>
            <p>Subtotal: R{totals.subtotal.toFixed(2)}</p>
            <p>VAT (15%): R{totals.vat.toFixed(2)}</p>
            <p className="text-base font-semibold text-white">Total due: R{totals.total.toFixed(2)}</p>
          </div>
          <button
            type="button"
            onClick={generatePdf}
            className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/80 transition hover:border-white/40"
            disabled={generating}
          >
            {generating ? 'Generating…' : 'Download invoice PDF'}
          </button>
        </div>
      </motion.section>
    </main>
  );
};

export default Invoices;
