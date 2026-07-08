import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FiUpload, FiEye, FiDownload, FiPlus, FiTrash2 } from 'react-icons/fi';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import PageHeader from '../../components/common/PageHeader.jsx';
import { useNotify } from '../../context/NotificationContext.jsx';
import { useTenant } from '../../context/TenantContext.jsx';
import { db } from '../../lib/firebase.js';
import { generateDocumentPdf } from '../../lib/pdfGenerator.js';

const defaultLineItem = { description: '', quantity: 1, price: 0 };

const InvoicesV2 = () => {
  const notify = useNotify();
  const { activeTenant, activeTenantId } = useTenant();
  
  const [docType, setDocType] = useState('invoice');
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

  // Date controls
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });

  // Invoice Payment Details (Purchase data tracking)
  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentReference, setPaymentReference] = useState('');
  const [amountPaid, setAmountPaid] = useState(0);

  // Document Type Change Handler
  const handleDocTypeChange = (newType) => {
    setDocType(newType);
    setCustomization(prev => {
      let num = prev.invoiceNumber;
      if (newType === 'quote' && num.startsWith('INV-')) {
        num = num.replace('INV-', 'QT-');
      } else if (newType === 'invoice' && num.startsWith('QT-')) {
        num = num.replace('QT-', 'INV-');
      } else {
        num = newType === 'quote' 
          ? `QT-${Date.now().toString().slice(-6)}` 
          : `INV-${Date.now().toString().slice(-6)}`;
      }
      return { ...prev, invoiceNumber: num };
    });
    
    // Set matching default notes
    if (newType === 'quote') {
      setNotes('This quotation is valid for 30 days. Feel free to contact us for any adjustments.');
    } else {
      setNotes('Payment is due within 7 days. Thank you for partnering with us.');
    }
  };

  // Check for pre-fill data from deep link or CRM page
  React.useEffect(() => {
    const preFillData = sessionStorage.getItem('invoicePreFill');
    if (preFillData) {
      try {
        const data = JSON.parse(preFillData);
        
        // Pre-fill client info
        if (data.client || data.clientName || data.clientEmail) {
          setClient(prev => ({
            ...prev,
            name: data.client || data.clientName || prev.name,
            contact: data.clientEmail || data.clientContact || prev.contact,
            address: data.clientAddress || prev.address,
          }));
        }

        // Set document type
        if (data.type) {
          setDocType(data.type);
        }

        // Pre-fill line items
        if (data.lineItems) {
          setLineItems(data.lineItems);
        } else if (data.hours && data.rate) {
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

        // Adjust document number based on type
        setCustomization(prev => {
          let num = data.invoiceNumber || prev.invoiceNumber;
          const targetType = data.type || 'invoice';
          if (targetType === 'quote' && !num.startsWith('QT-')) {
            num = `QT-${Date.now().toString().slice(-6)}`;
          } else if (targetType === 'invoice' && !num.startsWith('INV-')) {
            num = `INV-${Date.now().toString().slice(-6)}`;
          }
          return {
            ...prev,
            invoiceNumber: num,
            companyName: data.companyName || prev.companyName,
            companyAddress: data.companyAddress || prev.companyAddress,
            companyEmail: data.companyEmail || prev.companyEmail,
            companyPhone: data.companyPhone || prev.companyPhone,
          };
        });

        // If it was converted, notify
        notify({ 
          type: 'success', 
          title: data.convertFromQuoteId ? 'Quote Loaded for Invoice' : 'Form Prefilled', 
          description: data.convertFromQuoteId 
            ? 'Quote details loaded. Ready to customize and issue invoice.' 
            : 'Pre-filled data loaded successfully.' 
        });

        // Clear prefill so it doesn't fire again on reload
        sessionStorage.removeItem('invoicePreFill');
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

  // Update amountPaid on totals change if paid
  React.useEffect(() => {
    if (paymentStatus === 'paid') {
      setAmountPaid(totals.total);
    }
  }, [totals.total, paymentStatus]);

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

  const saveInvoiceToDatabase = async (invoiceData) => {
    if (!activeTenantId || !db) {
      notify({ type: 'error', title: 'Error', description: 'Workspace not selected' });
      return false;
    }

    try {
      let finalStatus = 'draft';
      if (docType === 'invoice') {
        finalStatus = paymentStatus === 'paid' ? 'paid' : (paymentStatus === 'partially_paid' ? 'partially_paid' : 'draft');
      } else {
        // quotes start as draft
        finalStatus = 'draft';
      }

      const newDoc = {
        ...invoiceData,
        status: finalStatus,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        tenantId: activeTenantId,
      };

      await addDoc(
        collection(db, 'tenants', activeTenantId, 'invoices'),
        newDoc
      );

      notify({
        type: 'success',
        title: docType === 'quote' ? 'Quote Saved' : 'Invoice Saved',
        description: `${docType === 'quote' ? 'Quote' : 'Invoice'} ${invoiceData.invoiceNumber} saved successfully.`,
      });
      return true;
    } catch (error) {
      console.error('[Invoice] Save to database error:', error);
      notify({ type: 'error', title: 'Save Failed', description: error.message });
      return false;
    }
  };

  const generatePdf = async () => {
    setGenerating(true);
    try {
      const docData = {
        type: docType,
        invoiceNumber: customization.invoiceNumber,
        quoteNumber: customization.invoiceNumber,
        clientName: client.name,
        clientEmail: client.contact,
        clientAddress: client.address,
        companyName: customization.companyName,
        companyAddress: customization.companyAddress,
        companyEmail: customization.companyEmail,
        companyPhone: customization.companyPhone,
        lineItems: lineItems,
        subtotal: totals.subtotal,
        tax: totals.tax,
        taxRate: customization.taxRate,
        total: totals.total,
        currency: customization.currency,
        notes: notes,
        primaryColor: customization.primaryColor,
        // Invoice specific
        dueDate: docType === 'invoice' ? dueDate : null,
        paymentStatus: docType === 'invoice' ? paymentStatus : null,
        paymentMethod: docType === 'invoice' && paymentStatus !== 'unpaid' ? paymentMethod : null,
        paymentDate: docType === 'invoice' && paymentStatus !== 'unpaid' ? paymentDate : null,
        paymentReference: docType === 'invoice' && paymentStatus !== 'unpaid' ? paymentReference : null,
        amountPaid: docType === 'invoice' && paymentStatus !== 'unpaid' ? amountPaid : 0,
        // Quote specific
        validUntil: docType === 'quote' ? validUntil : null,
      };

      // Call the helper PDF engine
      await generateDocumentPdf(docData, customization.logoPreview);

      // Save record to the workspace
      await saveInvoiceToDatabase(docData);
    } catch (error) {
      console.error('[Invoice] Generation failed', error);
      notify({ type: 'error', title: 'Failed to generate PDF', description: error.message });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0e0e18] to-[#1b1830] px-6 pb-24 text-white sm:px-10 lg:px-12">
      <PageHeader
        title={docType === 'quote' ? 'CRM Quotation Builder' : 'CRM Invoice & Purchase Builder'}
        subtitle="Produce professional, fully-branded client proposals and billing invoices with real-time PDF generation."
      />

      {/* Document Mode Toggle */}
      <div className="mb-8 flex justify-center">
        <div className="inline-flex rounded-full bg-white/5 p-1 border border-white/10">
          <button
            type="button"
            onClick={() => handleDocTypeChange('invoice')}
            className={`rounded-full px-6 py-2 text-sm font-semibold transition duration-200 ${
              docType === 'invoice' 
                ? 'bg-indigo-600 text-white shadow-lg' 
                : 'text-white/60 hover:text-white'
            }`}
          >
            Invoice Mode
          </button>
          <button
            type="button"
            onClick={() => handleDocTypeChange('quote')}
            className={`rounded-full px-6 py-2 text-sm font-semibold transition duration-200 ${
              docType === 'quote' 
                ? 'bg-indigo-600 text-white shadow-lg' 
                : 'text-white/60 hover:text-white'
            }`}
          >
            Quote Mode
          </button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
        {/* Left: Document Editor */}
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
                Primary Brand Color
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
                {docType === 'quote' ? 'Quote Number' : 'Invoice Number'}
                <input
                  type="text"
                  value={customization.invoiceNumber}
                  onChange={(e) => setCustomization(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
                />
              </label>

              {docType === 'quote' ? (
                <label className="text-sm text-white/70">
                  Valid Until
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
                  />
                </label>
              ) : (
                <label className="text-sm text-white/70">
                  Due Date
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
                  />
                </label>
              )}

              <label className="text-sm text-white/70">
                Currency Symbol
                <input
                  type="text"
                  value={customization.currency}
                  onChange={(e) => setCustomization(prev => ({ ...prev, currency: e.target.value }))}
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
                  placeholder="e.g. John Doe"
                />
              </label>
              <label className="text-sm text-white/70">
                Client Email
                <input
                  type="email"
                  value={client.contact}
                  onChange={(e) => setClient({ ...client, contact: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
                  placeholder="john@example.com"
                />
              </label>
              <label className="text-sm text-white/70 sm:col-span-2">
                Billing Address
                <input
                  type="text"
                  value={client.address}
                  onChange={(e) => setClient({ ...client, address: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
                  placeholder="e.g. 12 Main Rd, Cape Town"
                />
              </label>
            </div>
          </div>

          {/* Invoice Purchase & Payment Details (Only for Invoices) */}
          {docType === 'invoice' && (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_0_30px_rgba(99,102,241,0.12)]">
              <h2 className="mb-6 text-xl font-semibold text-white">Purchase & Payment Details</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="text-sm text-white/70">
                  Payment Status
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="partially_paid">Partially Paid</option>
                    <option value="paid">Paid</option>
                  </select>
                </label>

                {paymentStatus !== 'unpaid' && (
                  <>
                    <label className="text-sm text-white/70">
                      Payment Method
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
                      >
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Card">Card</option>
                        <option value="Cash">Cash</option>
                        <option value="Mobile Money">Mobile Money</option>
                        <option value="Other">Other</option>
                      </select>
                    </label>

                    <label className="text-sm text-white/70">
                      Payment Date
                      <input
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
                      />
                    </label>

                    <label className="text-sm text-white/70">
                      Transaction Reference / Receipt ID
                      <input
                        type="text"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        placeholder="e.g. EFT-987654"
                        className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
                      />
                    </label>

                    <label className="text-sm text-white/70">
                      Amount Paid ({customization.currency})
                      <input
                        type="number"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(Number(e.target.value))}
                        className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
                      />
                    </label>
                  </>
                )}
              </div>
            </div>
          )}

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
                      <span className="text-sm text-white/70 font-medium">
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
            <label className="block text-sm text-white/70 font-medium">
              {docType === 'quote' ? 'Quotation Validity / Terms' : 'Notes & Payment Terms'}
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
              />
            </label>
          </div>

          {/* Totals Summary & Submit */}
          <div className="flex flex-wrap items-center justify-between gap-6 rounded-2xl border border-indigo-400/40 bg-indigo-500/10 px-8 py-6">
            <div className="text-white">
              <p className="text-sm text-white/70">Subtotal: {customization.currency}{totals.subtotal.toFixed(2)}</p>
              <p className="text-sm text-white/70">Tax ({customization.taxRate}%): {customization.currency}{totals.tax.toFixed(2)}</p>
              <p className="text-xl font-bold">Total Due: {customization.currency}{totals.total.toFixed(2)}</p>
              {docType === 'invoice' && paymentStatus !== 'unpaid' && (
                <p className="text-xs text-emerald-400 font-semibold mt-1">Paid: {customization.currency}{amountPaid.toFixed(2)}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm transition hover:border-white/40"
              >
                <FiEye /> {showPreview ? 'Hide' : 'Show'} Preview
              </button>
              <button
                type="button"
                onClick={generatePdf}
                disabled={generating}
                className="flex items-center gap-2 rounded-lg border border-white/20 bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-2.5 text-sm font-semibold transition hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiDownload /> {generating ? 'Generating...' : 'Save & Download PDF'}
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
            <div className="rounded-3xl border border-white/10 bg-white p-8 shadow-2xl text-black">
              <div className="space-y-6">
                {/* Logo and Headings */}
                <div className="flex items-start justify-between border-b border-gray-200 pb-6">
                  <div className="flex items-start gap-4">
                    {customization.logoPreview && (
                      <img src={customization.logoPreview} alt="Logo" className="h-16 w-16 object-contain bg-gray-50 border border-gray-200 p-1 rounded" />
                    )}
                    <div>
                      <h1 className="text-2xl font-bold" style={{ color: customization.primaryColor }}>
                        {customization.companyName || 'Hustle Studio Workspace'}
                      </h1>
                      <div className="mt-2 text-xs text-gray-600 whitespace-pre-line">
                        {customization.companyAddress}
                      </div>
                      {customization.companyEmail && (
                        <div className="mt-1 text-xs text-gray-500">{customization.companyEmail}</div>
                      )}
                      {customization.companyPhone && (
                        <div className="text-xs text-gray-500">{customization.companyPhone}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <h2 className="text-3xl font-bold uppercase tracking-wider" style={{ color: customization.primaryColor }}>
                      {docType}
                    </h2>
                    <div className="mt-2 text-sm font-semibold text-gray-700">{customization.invoiceNumber}</div>
                    <div className="text-xs text-gray-500">Date: {new Date().toLocaleDateString()}</div>
                    {docType === 'quote' && validUntil && (
                      <div className="text-xs text-red-600 font-semibold mt-1 bg-red-50 px-2 py-0.5 rounded inline-block">
                        Valid Until: {new Date(validUntil).toLocaleDateString()}
                      </div>
                    )}
                    {docType === 'invoice' && dueDate && (
                      <div className="text-xs text-gray-600 mt-1">
                        Due Date: {new Date(dueDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Client Box */}
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{docType === 'quote' ? 'PREPARED FOR' : 'BILL TO'}</div>
                  <div className="mt-1 text-base font-bold text-gray-900">{client.name || 'Valued Client'}</div>
                  {client.contact && <div className="text-sm text-gray-600">{client.contact}</div>}
                  {client.address && <div className="text-sm text-gray-500">{client.address}</div>}
                </div>

                {/* Items Preview Table */}
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: customization.primaryColor }} className="text-white text-xs uppercase tracking-wider">
                      <th className="px-3 py-2 text-left rounded-l">Description</th>
                      <th className="px-3 py-2 text-center w-16">Qty</th>
                      <th className="px-3 py-2 text-right w-24">Rate</th>
                      <th className="px-3 py-2 text-right w-24 rounded-r">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-gray-50 border-b border-gray-100' : 'border-b border-gray-100'}>
                        <td className="px-3 py-3 text-gray-800">{item.description || 'Line Item description'}</td>
                        <td className="px-3 py-3 text-center text-gray-700">{item.quantity}</td>
                        <td className="px-3 py-3 text-right text-gray-700">{customization.currency}{Number(item.price || 0).toFixed(2)}</td>
                        <td className="px-3 py-3 text-right text-gray-900 font-semibold">{customization.currency}{(Number(item.quantity) * Number(item.price || 0)).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-end border-t border-gray-200 pt-4">
                  <div className="w-64 space-y-2 text-sm">
                    <div className="flex justify-between text-gray-500">
                      <span>Subtotal:</span>
                      <span>{customization.currency}{totals.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Tax ({customization.taxRate}%):</span>
                      <span>{customization.currency}{totals.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-300 pt-2 text-base font-bold text-gray-900">
                      <span>Total:</span>
                      <span>{customization.currency}{totals.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Paid stamp on live preview */}
                {docType === 'invoice' && paymentStatus === 'paid' && (
                  <div className="my-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 text-emerald-900">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-lg font-bold">
                      ✓
                    </div>
                    <div>
                      <div className="font-bold text-sm tracking-wide">PAID RECEIPT</div>
                      <div className="text-xs text-emerald-700">
                        Paid via {paymentMethod} {paymentDate ? `on ${new Date(paymentDate).toLocaleDateString()}` : ''}
                        {paymentReference ? ` (Ref: ${paymentReference})` : ''}
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {notes.trim() && (
                  <div className="border-t border-gray-200 pt-4">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                      {docType === 'quote' ? 'Terms & Validity' : 'Notes'}
                    </div>
                    <div className="mt-1 text-sm text-gray-600 whitespace-pre-line">{notes}</div>
                  </div>
                )}

                {/* Footer */}
                <div className="border-t border-gray-200 pt-4 text-center text-xs text-gray-400 italic">
                  {docType === 'quote' ? 'Thank you for considering our proposal!' : 'Thank you for your business!'}
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
