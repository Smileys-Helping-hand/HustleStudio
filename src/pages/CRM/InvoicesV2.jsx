import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FiUpload, FiEye, FiDownload, FiPlus, FiTrash2 } from 'react-icons/fi';
import PageHeader from '../../components/common/PageHeader.jsx';
import { useNotify } from '../../context/NotificationContext.jsx';
import { useTenant } from '../../context/TenantContext.jsx';

const defaultLineItem = { description: '', quantity: 1, price: 0 };

const InvoicesV2 = () => {
  const notify = useNotify();
  const { activeTenant } = useTenant();
  
  const [client, setClient] = useState({
    name: '',
    contact: '',
    address: '',
  });
  const [lineItems, setLineItems] = useState([defaultLineItem]);
  const [notes, setNotes] = useState('Payment due within 7 days. Thank you for partnering with us.');
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  
  // Customization options
  const [customization, setCustomization] = useState({
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
    logo: null,
    logoPreview: null,
    companyName: activeTenant?.name || '',
    companyAddress: '',
    companyEmail: '',
    companyPhone: '',
    template: 'modern', // modern, classic, minimal
    taxRate: 15,
    currency: 'R',
    invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
  });

  // Check for pre-fill data from deep link
  React.useEffect(() => {
    const preFillData = sessionStorage.getItem('invoicePreFill');
    if (preFillData) {
      try {
        const data = JSON.parse(preFillData);
        
        // Pre-fill client info
        if (data.client || data.clientEmail) {
          setClient(prev => ({
            ...prev,
            name: data.client || prev.name,
            contact: data.clientEmail || prev.contact,
          }));
        }

        // Pre-fill line items from deep link data
        if (data.hours && data.rate) {
          const description = data.description || data.project || 'Service hours';
          setLineItems([{
            description,
            quantity: data.hours,
            price: data.rate,
          }]);
        } else if (data.amount) {
          const description = data.description || data.project || 'Service';
          setLineItems([{
            description,
            quantity: 1,
            price: data.amount,
          }]);
        }

        // Pre-fill notes
        if (data.notes) {
          setNotes(data.notes);
        }

        // Clear the session storage after reading
        sessionStorage.removeItem('invoicePreFill');
        
        notify({ 
          type: 'success', 
          title: 'Invoice Pre-filled', 
          description: 'Form populated from external link' 
        });
      } catch (error) {
        console.error('[Invoice] Failed to parse pre-fill data', error);
      }
    }
  }, [notify]);

  // Auto-populate company details from tenant if available
  React.useEffect(() => {
    if (activeTenant) {
      setCustomization(prev => ({
        ...prev,
        companyName: activeTenant.name || prev.companyName,
        primaryColor: activeTenant.accent || prev.primaryColor,
        logo: activeTenant.logo || prev.logo,
        logoPreview: activeTenant.logo || prev.logoPreview,
      }));
    }
  }, [activeTenant]);

  const totals = useMemo(() => {
    const subtotal = lineItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0), 0);
    const tax = subtotal * (customization.taxRate / 100);
    return { subtotal, tax, total: subtotal + tax };
  }, [lineItems, customization.taxRate]);

  const updateLine = (index, field, value) => {
    setLineItems((current) => current.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)));
  };

  const addLine = () => setLineItems((current) => [...current, { description: '', quantity: 1, price: 0 }]);
  const removeLine = (index) => setLineItems((current) => current.filter((_, idx) => idx !== index));

  const handleLogoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      notify({ type: 'error', title: 'Logo too large', description: 'Please upload an image under 2MB' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setCustomization(prev => ({
        ...prev,
        logo: file,
        logoPreview: e.target.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const generatePdf = async () => {
    setGenerating(true);
    try {
      const jsPDFModule = await import('jspdf');
      const JsPDF = jsPDFModule.default || jsPDFModule;
      await import('jspdf-autotable');

      const doc = new JsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Add logo if available
      if (customization.logoPreview) {
        try {
          doc.addImage(customization.logoPreview, 'PNG', 14, 10, 30, 30);
        } catch (error) {
          console.warn('[Invoice] Failed to add logo', error);
        }
      }

      // Company header
      doc.setFontSize(22);
      doc.setTextColor(customization.primaryColor);
      doc.text(customization.companyName, customization.logoPreview ? 50 : 14, 20);
      
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      const companyLines = customization.companyAddress.split('\n');
      companyLines.forEach((line, i) => {
        doc.text(line, customization.logoPreview ? 50 : 14, 26 + (i * 4));
      });
      doc.text(customization.companyEmail, customization.logoPreview ? 50 : 14, 26 + (companyLines.length * 4));
      doc.text(customization.companyPhone, customization.logoPreview ? 50 : 14, 30 + (companyLines.length * 4));

      // Invoice title and number
      doc.setFontSize(24);
      doc.setTextColor(customization.primaryColor);
      doc.text('INVOICE', pageWidth - 14, 20, { align: 'right' });
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(customization.invoiceNumber, pageWidth - 14, 26, { align: 'right' });
      doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 14, 31, { align: 'right' });

      // Client details
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text('Bill To:', 14, 55);
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(client.name, 14, 61);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(client.contact, 14, 66);
      doc.text(client.address, 14, 71);

      // Table
      doc.autoTable({
        startY: 85,
        head: [['Description', 'Qty', 'Rate', 'Amount']],
        body: lineItems.map((item) => [
          item.description,
          item.quantity,
          `${customization.currency}${Number(item.price).toFixed(2)}`,
          `${customization.currency}${(Number(item.quantity) * Number(item.price)).toFixed(2)}`,
        ]),
        theme: 'striped',
        headStyles: {
          fillColor: customization.primaryColor,
          textColor: 255,
          fontSize: 10,
          fontStyle: 'bold',
        },
        styles: {
          fontSize: 9,
          cellPadding: 5,
        },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 35, halign: 'right' },
          3: { cellWidth: 35, halign: 'right' },
        },
      });

      // Totals
      const finalY = doc.lastAutoTable.finalY + 10;
      const totalsX = pageWidth - 14;
      
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(`Subtotal:`, totalsX - 50, finalY);
      doc.text(`${customization.currency}${totals.subtotal.toFixed(2)}`, totalsX, finalY, { align: 'right' });
      
      doc.text(`Tax (${customization.taxRate}%):`, totalsX - 50, finalY + 6);
      doc.text(`${customization.currency}${totals.tax.toFixed(2)}`, totalsX, finalY + 6, { align: 'right' });
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`Total:`, totalsX - 50, finalY + 14);
      doc.text(`${customization.currency}${totals.total.toFixed(2)}`, totalsX, finalY + 14, { align: 'right' });

      // Notes
      if (notes.trim()) {
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text('Notes:', 14, finalY + 30);
        const splitNotes = doc.splitTextToSize(notes, pageWidth - 28);
        doc.text(splitNotes, 14, finalY + 35);
      }

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Thank you for your business!', pageWidth / 2, doc.internal.pageSize.getHeight() - 15, { align: 'center' });

      doc.save(`invoice-${customization.invoiceNumber}-${client.name.replace(/\s+/g, '-').toLowerCase()}.pdf`);

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      notify({
        title: 'Invoice generated',
        description: `${client.name} — ${customization.invoiceNumber}`,
        type: 'success',
      });
    } catch (error) {
      console.error('[Invoice] Generation failed', error);
      notify({ type: 'error', title: 'Failed to generate invoice', description: error.message });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0e0e18] to-[#1b1830] px-6 pb-24 text-white sm:px-10 lg:px-12">
      <PageHeader
        title="Invoice Generator"
        subtitle="Create professional, branded invoices with live preview and customization."
      />

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
        {/* Left: Invoice Editor */}
        <motion.section
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45 }}
          className="space-y-8"
        >
          {/* Customization Panel */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_0_30px_rgba(99,102,241,0.12)]">
            <h2 className="mb-6 text-xl font-semibold text-white">Branding & Customization</h2>
            
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="text-sm text-white/70">
                Primary Color
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={customization.primaryColor}
                    onChange={(e) => setCustomization(prev => ({ ...prev, primaryColor: e.target.value }))}
                    className="h-10 w-16 cursor-pointer rounded border border-white/10 bg-black/40"
                  />
                  <input
                    type="text"
                    value={customization.primaryColor}
                    onChange={(e) => setCustomization(prev => ({ ...prev, primaryColor: e.target.value }))}
                    className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
                  />
                </div>
              </label>

              <label className="text-sm text-white/70">
                Tax Rate (%)
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={customization.taxRate}
                  onChange={(e) => setCustomization(prev => ({ ...prev, taxRate: Number(e.target.value) }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
                />
              </label>

              <label className="text-sm text-white/70 sm:col-span-2">
                Company Logo
                <div className="mt-2 flex items-center gap-3">
                  {customization.logoPreview && (
                    <img src={customization.logoPreview} alt="Logo preview" className="h-12 w-12 rounded object-contain bg-white/5 border border-white/10 p-1" />
                  )}
                  <label className="cursor-pointer rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-xs uppercase tracking-wider transition hover:border-white/40">
                    <FiUpload className="inline mr-2" />
                    {customization.logoPreview ? 'Change Logo' : 'Upload Logo'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  {customization.logoPreview && (
                    <button
                      type="button"
                      onClick={() => setCustomization(prev => ({ ...prev, logo: null, logoPreview: null }))}
                      className="text-red-400 hover:text-red-300"
                    >
                      <FiTrash2 />
                    </button>
                  )}
                </div>
              </label>

              <label className="text-sm text-white/70">
                Company Name
                <input
                  type="text"
                  value={customization.companyName}
                  onChange={(e) => setCustomization(prev => ({ ...prev, companyName: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
                />
              </label>

              <label className="text-sm text-white/70">
                Invoice Number
                <input
                  type="text"
                  value={customization.invoiceNumber}
                  onChange={(e) => setCustomization(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
                />
              </label>

              <label className="text-sm text-white/70 sm:col-span-2">
                Company Address
                <textarea
                  value={customization.companyAddress}
                  onChange={(e) => setCustomization(prev => ({ ...prev, companyAddress: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
                />
              </label>

              <label className="text-sm text-white/70">
                Company Email
                <input
                  type="email"
                  value={customization.companyEmail}
                  onChange={(e) => setCustomization(prev => ({ ...prev, companyEmail: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
                />
              </label>

              <label className="text-sm text-white/70">
                Company Phone
                <input
                  type="tel"
                  value={customization.companyPhone}
                  onChange={(e) => setCustomization(prev => ({ ...prev, companyPhone: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
                />
              </label>
            </div>
          </div>

          {/* Client Details */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_0_30px_rgba(99,102,241,0.12)]">
            <h2 className="mb-6 text-xl font-semibold text-white">Client Information</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="text-sm text-white/70">
                Client Name
                <input
                  type="text"
                  value={client.name}
                  onChange={(e) => setClient({ ...client, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
                />
              </label>
              <label className="text-sm text-white/70">
                Client Email
                <input
                  type="email"
                  value={client.contact}
                  onChange={(e) => setClient({ ...client, contact: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
                />
              </label>
              <label className="text-sm text-white/70 sm:col-span-2">
                Billing Address
                <input
                  type="text"
                  value={client.address}
                  onChange={(e) => setClient({ ...client, address: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
                />
              </label>
            </div>
          </div>

          {/* Line Items */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_0_30px_rgba(99,102,241,0.12)]">
            <h2 className="mb-6 text-xl font-semibold text-white">Line Items</h2>
            <div className="space-y-4">
              {lineItems.map((item, index) => (
                <div key={`line-${index}`} className="grid gap-2 rounded-2xl border border-white/10 bg-black/30 p-3">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateLine(index, 'description', e.target.value)}
                    placeholder="Description"
                    className="rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                      placeholder="Qty"
                      className="rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
                    />
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => updateLine(index, 'price', e.target.value)}
                      placeholder="Price"
                      className="rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
                    />
                    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/60 px-3 py-2">
                      <span className="text-sm text-white/70">
                        {customization.currency}{(Number(item.quantity) * Number(item.price || 0)).toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="text-red-400 hover:text-red-300 transition"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addLine}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 bg-white/5 px-4 py-3 text-sm text-white/70 transition hover:border-white/40 hover:text-white"
              >
                <FiPlus /> Add Line Item
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_0_30px_rgba(99,102,241,0.12)]">
            <label className="block text-sm text-white/70">
              Notes / Payment Terms
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
              />
            </label>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-6 rounded-2xl border border-indigo-400/40 bg-indigo-500/10 px-8 py-6">
            <div className="text-white">
              <p className="text-sm text-white/70">Subtotal: {customization.currency}{totals.subtotal.toFixed(2)}</p>
              <p className="text-sm text-white/70">Tax ({customization.taxRate}%): {customization.currency}{totals.tax.toFixed(2)}</p>
              <p className="text-lg font-semibold">Total: {customization.currency}{totals.total.toFixed(2)}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm transition hover:border-white/40"
              >
                <FiEye /> {showPreview ? 'Hide' : 'Show'} Preview
              </button>
              <button
                type="button"
                onClick={generatePdf}
                disabled={generating}
                className="flex items-center gap-2 rounded-lg border border-white/20 bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-2 text-sm font-semibold transition hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiDownload /> {generating ? 'Generating...' : 'Download PDF'}
              </button>
            </div>
          </div>
        </motion.section>

        {/* Right: Live Preview */}
        {showPreview && (
          <motion.section
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="sticky top-4 h-fit"
          >
            <div className="rounded-3xl border border-white/10 bg-white p-8 shadow-2xl">
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-gray-200 pb-6">
                  <div className="flex items-start gap-4">
                    {customization.logoPreview && (
                      <img src={customization.logoPreview} alt="Logo" className="h-16 w-16 object-contain" />
                    )}
                    <div>
                      <h1 className="text-2xl font-bold" style={{ color: customization.primaryColor }}>
                        {customization.companyName}
                      </h1>
                      <div className="mt-2 text-xs text-gray-600 whitespace-pre-line">
                        {customization.companyAddress}
                      </div>
                      <div className="mt-1 text-xs text-gray-600">{customization.companyEmail}</div>
                      <div className="text-xs text-gray-600">{customization.companyPhone}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <h2 className="text-3xl font-bold" style={{ color: customization.primaryColor }}>INVOICE</h2>
                    <div className="mt-2 text-sm text-gray-700">{customization.invoiceNumber}</div>
                    <div className="text-xs text-gray-600">Date: {new Date().toLocaleDateString()}</div>
                  </div>
                </div>

                {/* Bill To */}
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase">Bill To</div>
                  <div className="mt-1 text-base font-semibold text-gray-900">{client.name}</div>
                  <div className="text-sm text-gray-600">{client.contact}</div>
                  <div className="text-sm text-gray-600">{client.address}</div>
                </div>

                {/* Items Table */}
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: customization.primaryColor }} className="text-white">
                      <th className="px-3 py-2 text-left">Description</th>
                      <th className="px-3 py-2 text-center w-16">Qty</th>
                      <th className="px-3 py-2 text-right w-24">Rate</th>
                      <th className="px-3 py-2 text-right w-24">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                        <td className="px-3 py-2 text-gray-700">{item.description}</td>
                        <td className="px-3 py-2 text-center text-gray-700">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{customization.currency}{Number(item.price).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{customization.currency}{(Number(item.quantity) * Number(item.price)).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-end border-t border-gray-200 pt-4">
                  <div className="w-64 space-y-2 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal:</span>
                      <span>{customization.currency}{totals.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Tax ({customization.taxRate}%):</span>
                      <span>{customization.currency}{totals.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-300 pt-2 text-base font-bold text-gray-900">
                      <span>Total:</span>
                      <span>{customization.currency}{totals.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {notes.trim() && (
                  <div className="border-t border-gray-200 pt-4">
                    <div className="text-xs font-semibold text-gray-500 uppercase">Notes</div>
                    <div className="mt-1 text-sm text-gray-600 whitespace-pre-line">{notes}</div>
                  </div>
                )}

                {/* Footer */}
                <div className="border-t border-gray-200 pt-4 text-center text-xs text-gray-500">
                  Thank you for your business!
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </div>
    </main>
  );
};

export default InvoicesV2;
