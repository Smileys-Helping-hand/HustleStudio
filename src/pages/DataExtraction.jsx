import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiFileText, FiDollarSign, FiCreditCard, FiFile, 
  FiDownload, FiEye, FiTrash2, FiFilter, FiSearch 
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import DocumentUploader from '../components/DocumentUploader.jsx';
import { 
  extractDocumentData, 
  listDocumentExtractions, 
  exportExtractedData,
  DOCUMENT_TYPES 
} from '../lib/documentExtractor.js';
import { useAuth } from '../context/AuthContext.jsx';
import PageHeader from '../components/common/PageHeader.jsx';

const DOCUMENT_TYPE_OPTIONS = [
  { value: DOCUMENT_TYPES.INVOICE, label: 'Invoice', icon: FiFileText },
  { value: DOCUMENT_TYPES.RECEIPT, label: 'Receipt', icon: FiFileText },
  { value: DOCUMENT_TYPES.BANK_STATEMENT, label: 'Bank Statement', icon: FiDollarSign },
  { value: DOCUMENT_TYPES.PAYSLIP, label: 'Payslip', icon: FiCreditCard },
  { value: DOCUMENT_TYPES.CONTRACT, label: 'Contract', icon: FiFile },
  { value: DOCUMENT_TYPES.TAX_DOCUMENT, label: 'Tax Document', icon: FiFile },
  { value: DOCUMENT_TYPES.OTHER, label: 'Other', icon: FiFile },
];

const DataExtraction = () => {
  const { user, tenantId } = useAuth();
  const [selectedDocType, setSelectedDocType] = useState(DOCUMENT_TYPES.INVOICE);
  const [extractions, setExtractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExtraction, setSelectedExtraction] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadExtractions();
  }, [tenantId]);

  const loadExtractions = async () => {
    if (!tenantId) return;
    
    setLoading(true);
    try {
      const data = await listDocumentExtractions({ tenantId });
      setExtractions(data);
    } catch (error) {
      console.error('[DataExtraction] Failed to load extractions:', error);
      toast.error('Failed to load document history');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = async (file) => {
    const toastId = 'extract-' + Date.now();
    
    try {
      // Show detailed progress
      toast.loading(
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          <span>Uploading document...</span>
        </div>, 
        { id: toastId }
      );
      
      // Add artificial delay to show progress (simulate upload)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast.loading(
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          <span>Extracting text with AI...</span>
        </div>, 
        { id: toastId }
      );
      
      const result = await extractDocumentData({
        file,
        documentType: selectedDocType,
        tenantId,
        userId: user?.uid,
      });

      toast.success(
        <div>
          <p className="font-medium">Data extracted successfully!</p>
          <p className="text-xs text-white/70 mt-1">
            {Object.keys(result.extractedData).length} fields extracted
          </p>
        </div>,
        { id: toastId, duration: 4000 }
      );
      
      // Reload extractions
      await loadExtractions();
      
      // Show the extracted data with animation
      setSelectedExtraction(result);
    } catch (error) {
      console.error('[DataExtraction] Upload failed:', error);
      toast.error(
        <div>
          <p className="font-medium">Extraction failed</p>
          <p className="text-xs text-white/70 mt-1">{error.message || 'Unknown error occurred'}</p>
        </div>,
        { id: toastId, duration: 5000 }
      );
    }
  };

  const handleExport = (format) => {
    const filteredExtractions = getFilteredExtractions();
    const exportData = exportExtractedData(filteredExtractions, format);
    
    const blob = new Blob([exportData], { 
      type: format === 'json' ? 'application/json' : 'text/csv' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `document-extractions-${Date.now()}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success(`Exported ${filteredExtractions.length} records as ${format.toUpperCase()}`);
  };

  const getFilteredExtractions = () => {
    let filtered = extractions;

    if (filterType !== 'all') {
      filtered = filtered.filter(ex => ex.documentType === filterType);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ex => 
        ex.fileName?.toLowerCase().includes(query) ||
        JSON.stringify(ex.extractedData).toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const filteredExtractions = getFilteredExtractions();

  const renderExtractedData = (extraction) => {
    const data = extraction.extractedData;
    const type = extraction.documentType;

    if (type === DOCUMENT_TYPES.INVOICE || type === DOCUMENT_TYPES.RECEIPT) {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-white/50 mb-1">Invoice Number</p>
              <p className="text-white font-medium">{data.invoiceNumber || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-white/50 mb-1">Date</p>
              <p className="text-white font-medium">{data.date || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-white/50 mb-1">Vendor</p>
              <p className="text-white font-medium">{data.vendorName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-white/50 mb-1">Customer</p>
              <p className="text-white font-medium">{data.customerName || 'N/A'}</p>
            </div>
          </div>

          {data.items && data.items.length > 0 && (
            <div>
              <p className="text-xs text-white/50 mb-2">Line Items</p>
              <div className="space-y-2">
                {data.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-white/5">
                    <div>
                      <p className="text-sm text-white">{item.description}</p>
                      <p className="text-xs text-white/50">Qty: {item.quantity} × {data.currency}{item.unitPrice}</p>
                    </div>
                    <p className="text-white font-medium">{data.currency}{item.total}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
            <div>
              <p className="text-xs text-white/50 mb-1">Subtotal</p>
              <p className="text-white font-medium">{data.currency}{data.subtotal || 0}</p>
            </div>
            <div>
              <p className="text-xs text-white/50 mb-1">Tax</p>
              <p className="text-white font-medium">{data.currency}{data.tax || 0}</p>
            </div>
            <div>
              <p className="text-xs text-white/50 mb-1">Total</p>
              <p className="text-gold text-lg font-bold">{data.currency}{data.total || 0}</p>
            </div>
          </div>
        </div>
      );
    }

    if (type === DOCUMENT_TYPES.BANK_STATEMENT) {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-white/50 mb-1">Account Holder</p>
              <p className="text-white font-medium">{data.accountHolder || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-white/50 mb-1">Bank</p>
              <p className="text-white font-medium">{data.bankName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-white/50 mb-1">Period</p>
              <p className="text-white font-medium">
                {data.statementPeriod?.from || 'N/A'} to {data.statementPeriod?.to || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/50 mb-1">Transactions</p>
              <p className="text-white font-medium">{data.summary?.transactionCount || 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
            <div>
              <p className="text-xs text-white/50 mb-1">Opening Balance</p>
              <p className="text-white font-medium">{data.currency}{data.openingBalance || 0}</p>
            </div>
            <div>
              <p className="text-xs text-white/50 mb-1">Closing Balance</p>
              <p className="text-gold text-lg font-bold">{data.currency}{data.closingBalance || 0}</p>
            </div>
          </div>

          {data.transactions && data.transactions.length > 0 && (
            <div>
              <p className="text-xs text-white/50 mb-2">Recent Transactions (showing first 5)</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {data.transactions.slice(0, 5).map((tx, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-white/5">
                    <div>
                      <p className="text-sm text-white">{tx.description}</p>
                      <p className="text-xs text-white/50">{tx.date}</p>
                    </div>
                    <p className={`font-medium ${tx.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.type === 'credit' ? '+' : '-'}{data.currency}{Math.abs(tx.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (type === DOCUMENT_TYPES.PAYSLIP) {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-white/50 mb-1">Employee</p>
              <p className="text-white font-medium">{data.employeeName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-white/50 mb-1">Employer</p>
              <p className="text-white font-medium">{data.employerName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-white/50 mb-1">Pay Period</p>
              <p className="text-white font-medium">
                {data.payPeriod?.from || 'N/A'} to {data.payPeriod?.to || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/50 mb-1">Pay Date</p>
              <p className="text-white font-medium">{data.payDate || 'N/A'}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
            <div>
              <p className="text-xs text-white/50 mb-1">Gross Pay</p>
              <p className="text-white font-medium">{data.currency}{data.grossPay || 0}</p>
            </div>
            <div>
              <p className="text-xs text-white/50 mb-1">Tax Deducted</p>
              <p className="text-red-400 font-medium">-{data.currency}{data.taxDeducted || 0}</p>
            </div>
            <div>
              <p className="text-xs text-white/50 mb-1">Net Pay</p>
              <p className="text-gold text-lg font-bold">{data.currency}{data.netPay || 0}</p>
            </div>
          </div>
        </div>
      );
    }

    // Generic data display
    return (
      <div className="space-y-3">
        <pre className="text-xs text-white/70 bg-black/40 rounded-lg p-4 overflow-auto max-h-96">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document Data Extraction"
        description="Upload bank statements, invoices, and other documents to automatically extract and organize data"
      />

      {/* Upload Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-white/10 bg-black/40 p-6"
      >
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-2">Upload Document</h2>
          <p className="text-sm text-white/60">Select document type and upload your file</p>
        </div>

        {/* Document Type Selector */}
        <div className="mb-6">
          <label className="text-xs uppercase tracking-widest text-white/40 mb-3 block">
            Document Type
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {DOCUMENT_TYPE_OPTIONS.map(option => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => setSelectedDocType(option.value)}
                  className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                    selectedDocType === option.value
                      ? 'border-gold bg-gold/10 text-gold'
                      : 'border-white/10 bg-black/20 text-white/70 hover:border-white/20 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Uploader */}
        <DocumentUploader
          onUploadComplete={handleUploadComplete}
          acceptedTypes="image/*,.pdf,.txt"
          maxSizeMB={10}
          multiple={false}
        />
      </motion.div>

      {/* Filters and Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-white/10 bg-black/40 p-4"
      >
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-white/10 bg-black/30 text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <FiFilter className="text-white/40" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 rounded-xl border border-white/10 bg-black/30 text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
            >
              <option value="all">All Types</option>
              {DOCUMENT_TYPE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleExport('csv')}
              className="px-4 py-2 rounded-xl border border-white/10 bg-black/30 text-white text-sm hover:bg-black/40 transition-colors flex items-center gap-2"
            >
              <FiDownload className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              className="px-4 py-2 rounded-xl border border-white/10 bg-black/30 text-white text-sm hover:bg-black/40 transition-colors flex items-center gap-2"
            >
              <FiDownload className="w-4 h-4" />
              Export JSON
            </button>
          </div>
        </div>
      </motion.div>

      {/* Extractions List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            Extracted Documents ({filteredExtractions.length})
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 rounded-2xl border border-white/10 bg-black/40">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white/50">Loading extractions...</p>
            </div>
          </div>
        ) : filteredExtractions.length === 0 ? (
          <div className="flex items-center justify-center py-12 rounded-2xl border border-white/10 bg-black/40">
            <div className="text-center">
              <FiFileText className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/50">No documents extracted yet</p>
              <p className="text-sm text-white/30 mt-1">Upload a document to get started</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredExtractions.map(extraction => (
              <motion.div
                key={extraction.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-white/10 bg-black/40 p-4 hover:border-white/20 transition-colors cursor-pointer"
                onClick={() => setSelectedExtraction(extraction)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gold/10">
                        <FiFileText className="w-5 h-5 text-gold" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{extraction.fileName}</p>
                        <p className="text-xs text-white/50">
                          {extraction.documentType} • {extraction.extractedAt?.toLocaleDateString?.() || 'Recently'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedExtraction(extraction);
                    }}
                    className="px-4 py-2 rounded-lg border border-white/10 bg-black/30 text-white text-sm hover:bg-black/40 transition-colors flex items-center gap-2"
                  >
                    <FiEye className="w-4 h-4" />
                    View
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Extraction Detail Modal */}
      <AnimatePresence>
        {selectedExtraction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setSelectedExtraction(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0a0a14] rounded-2xl border border-white/10 max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div>
                  <h3 className="text-xl font-semibold text-white">{selectedExtraction.fileName}</h3>
                  <p className="text-sm text-white/50 mt-1">
                    {selectedExtraction.documentType} • Extracted {selectedExtraction.extractedAt?.toLocaleDateString?.() || 'Recently'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedExtraction(null)}
                  className="text-white/50 hover:text-white transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {renderExtractedData(selectedExtraction)}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
                <a
                  href={selectedExtraction.downloadURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg border border-white/10 bg-black/30 text-white text-sm hover:bg-black/40 transition-colors flex items-center gap-2"
                >
                  <FiDownload className="w-4 h-4" />
                  Download Original
                </a>
                <button
                  onClick={() => setSelectedExtraction(null)}
                  className="px-6 py-2 rounded-lg bg-gold text-black font-medium hover:bg-gold/90 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DataExtraction;
