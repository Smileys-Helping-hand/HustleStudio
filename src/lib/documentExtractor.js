import { callAI } from './aiClient.js';
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase.js';
import { documentCache, generateCacheKey } from './cache.js';
import { autoSortCustomerFromDocument } from './customerManager.js';
import { jsonrepair } from 'jsonrepair';

/**
 * Document type definitions for extraction
 */
export const DOCUMENT_TYPES = {
  INVOICE: 'invoice',
  BANK_STATEMENT: 'bank_statement',
  RECEIPT: 'receipt',
  CONTRACT: 'contract',
  TAX_DOCUMENT: 'tax_document',
  PAYSLIP: 'payslip',
  OTHER: 'other',
};

/**
 * Extract text from image file using Vision AI
 */
const extractTextFromImage = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64Image = reader.result;
      resolve(base64Image);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Extract text from PDF using pdfjs-dist (client-side).
 */
const extractTextFromPdf = async (file) => {
  const [{ getDocument, GlobalWorkerOptions }, workerUrl] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf'),
    import('pdfjs-dist/legacy/build/pdf.worker?url'),
  ]);

  GlobalWorkerOptions.workerSrc = workerUrl?.default || workerUrl;

  const data = await file.arrayBuffer();
  const pdf = await getDocument({ data }).promise;

  const pagesText = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = (content.items || [])
      .map((item) => item?.str)
      .filter(Boolean)
      .join(' ');
    pagesText.push(pageText || '');
  }

  return {
    text: pagesText.filter(Boolean).join('\n\n'),
    pagesText,
  };
};

const normalizeExtractedText = (text) => {
  const raw = String(text ?? '');
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const extractJsonFromResponse = (content) => {
  const raw = String(content ?? '').trim();
  if (!raw) return '{}';
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    return raw.slice(start, end + 1).trim();
  }
  return raw;
};

const safeParseJson = (content) => {
  const jsonString = extractJsonFromResponse(content);
  try {
    return JSON.parse(jsonString);
  } catch {
    try {
      return JSON.parse(jsonrepair(jsonString));
    } catch (error) {
      const err = new Error('Failed to parse extracted JSON');
      err.originalError = error;
      err.raw = content;
      throw err;
    }
  }
};

const normalizeCurrency = (value) => {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (!normalized) return null;
  if (/^[A-Z]{3}$/.test(normalized)) return normalized;
  if (normalized.includes('RAND') || normalized === 'R' || normalized.includes('ZAR')) return 'ZAR';
  if (normalized.includes('USD') || normalized.includes('$')) return 'USD';
  if (normalized.includes('EUR') || normalized.includes('€')) return 'EUR';
  if (normalized.includes('GBP') || normalized.includes('£')) return 'GBP';
  return null;
};

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const cleaned = String(value)
    .replace(/[^0-9\-.,]/g, '')
    .replace(/,(?=\d{3}(\D|$))/g, '');
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
};

const toIsoDateOrNull = (value) => {
  const s = String(value ?? '').trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
};

const postProcessInvoice = (data) => {
  const next = { ...(data || {}) };
  next.invoiceNumber = next.invoiceNumber ? String(next.invoiceNumber) : null;
  next.date = toIsoDateOrNull(next.date);
  next.dueDate = toIsoDateOrNull(next.dueDate);
  next.vendorName = next.vendorName ? String(next.vendorName) : null;
  next.vendorAddress = next.vendorAddress ? String(next.vendorAddress) : null;
  next.vendorEmail = next.vendorEmail ? String(next.vendorEmail) : null;
  next.vendorPhone = next.vendorPhone ? String(next.vendorPhone) : null;
  next.customerName = next.customerName ? String(next.customerName) : null;
  next.customerAddress = next.customerAddress ? String(next.customerAddress) : null;
  next.currency = normalizeCurrency(next.currency) || 'ZAR';

  const items = Array.isArray(next.items) ? next.items : [];
  next.items = items
    .filter(Boolean)
    .map((item) => ({
      description: item?.description ? String(item.description) : '',
      quantity: toNumberOrNull(item?.quantity) ?? 1,
      unitPrice: toNumberOrNull(item?.unitPrice) ?? 0,
      total: toNumberOrNull(item?.total) ?? null,
    }))
    .filter((item) => item.description || item.total !== null);

  next.subtotal = toNumberOrNull(next.subtotal);
  next.tax = toNumberOrNull(next.tax);
  next.taxRate = toNumberOrNull(next.taxRate);
  next.total = toNumberOrNull(next.total);
  next.notes = next.notes ? String(next.notes) : null;
  next.paymentTerms = next.paymentTerms ? String(next.paymentTerms) : null;

  // Compute totals if missing but items present
  if (next.total === null && next.items.length > 0) {
    const itemSum = next.items.reduce((sum, item) => {
      const lineTotal = item.total ?? (item.quantity ?? 1) * (item.unitPrice ?? 0);
      return sum + (Number.isFinite(lineTotal) ? lineTotal : 0);
    }, 0);
    next.total = Math.round(itemSum * 100) / 100;
  }

  return next;
};

const postProcessBankStatement = (data) => {
  const next = { ...(data || {}) };
  next.accountHolder = next.accountHolder ? String(next.accountHolder) : null;
  next.accountNumber = next.accountNumber ? String(next.accountNumber).slice(-4) : null;
  next.bankName = next.bankName ? String(next.bankName) : null;
  next.currency = normalizeCurrency(next.currency) || 'ZAR';

  next.statementPeriod = next.statementPeriod && typeof next.statementPeriod === 'object' ? next.statementPeriod : {};
  next.statementPeriod.from = toIsoDateOrNull(next.statementPeriod.from);
  next.statementPeriod.to = toIsoDateOrNull(next.statementPeriod.to);

  next.openingBalance = toNumberOrNull(next.openingBalance);
  next.closingBalance = toNumberOrNull(next.closingBalance);

  const transactions = Array.isArray(next.transactions) ? next.transactions : [];
  next.transactions = transactions
    .filter(Boolean)
    .map((tx) => {
      const amount = toNumberOrNull(tx?.amount);
      let type = tx?.type ? String(tx.type).toLowerCase() : null;
      if (type !== 'debit' && type !== 'credit') {
        if (typeof amount === 'number') type = amount < 0 ? 'debit' : 'credit';
        else type = 'debit';
      }
      return {
        date: toIsoDateOrNull(tx?.date),
        description: tx?.description ? String(tx.description) : '',
        amount: typeof amount === 'number' ? Math.abs(amount) : null,
        type,
        balance: toNumberOrNull(tx?.balance),
        category: tx?.category ? String(tx.category) : null,
      };
    })
    .filter((tx) => tx.description || tx.amount !== null);

  const summary = next.summary && typeof next.summary === 'object' ? next.summary : {};
  const totals = next.transactions.reduce(
    (acc, tx) => {
      if (!tx?.amount || !tx?.type) return acc;
      if (tx.type === 'debit') acc.totalDebits += tx.amount;
      if (tx.type === 'credit') acc.totalCredits += tx.amount;
      acc.transactionCount += 1;
      return acc;
    },
    { totalDebits: 0, totalCredits: 0, transactionCount: 0 }
  );
  next.summary = {
    totalDebits: toNumberOrNull(summary.totalDebits) ?? Math.round(totals.totalDebits * 100) / 100,
    totalCredits: toNumberOrNull(summary.totalCredits) ?? Math.round(totals.totalCredits * 100) / 100,
    transactionCount: Number.isFinite(Number(summary.transactionCount))
      ? Number(summary.transactionCount)
      : totals.transactionCount,
  };

  return next;
};

const needsModelEscalation = (documentType, extractedData) => {
  if (!extractedData || typeof extractedData !== 'object') return true;
  if (documentType === DOCUMENT_TYPES.INVOICE || documentType === DOCUMENT_TYPES.RECEIPT) {
    const total = toNumberOrNull(extractedData.total);
    const vendor = extractedData.vendorName ? String(extractedData.vendorName).trim() : '';
    const items = Array.isArray(extractedData.items) ? extractedData.items : [];
    return (!vendor && !items.length) || total === null;
  }
  if (documentType === DOCUMENT_TYPES.BANK_STATEMENT) {
    const txCount = Array.isArray(extractedData.transactions) ? extractedData.transactions.length : 0;
    return txCount === 0;
  }
  return false;
};

const dedupeTransactions = (transactions) => {
  const seen = new Set();
  const out = [];
  for (const tx of transactions || []) {
    const key = `${tx?.date || ''}|${tx?.description || ''}|${tx?.amount ?? ''}|${tx?.type || ''}`
      .toLowerCase()
      .slice(0, 512);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tx);
  }
  return out;
};

const extractTextFromPdfViaOcr = async (file, { tenantId, userId, model }) => {
  const [{ getDocument, GlobalWorkerOptions }, workerUrl] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf'),
    import('pdfjs-dist/legacy/build/pdf.worker?url'),
  ]);

  GlobalWorkerOptions.workerSrc = workerUrl?.default || workerUrl;
  const data = await file.arrayBuffer();
  const pdf = await getDocument({ data }).promise;

  const maxPages = Math.min(pdf.numPages, 12);
  const chunks = [];

  for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.6 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    const dataUrl = canvas.toDataURL('image/png');

    const visionPrompt =
      'Extract all text from this document page image. Return the complete text content exactly as it appears. Keep line breaks where possible.';

    const response = await callAI(visionPrompt, model, {
      temperature: 0,
      tenantId,
      userId,
      assistant: 'ocr-extractor',
      systemPrompt: 'You are an OCR assistant. Extract text accurately from images.',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: visionPrompt },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
    });

    if (response) chunks.push(response);
  }

  return { text: chunks.join('\n\n'), pagesText: chunks };
};

/**
 * Extract structured data from invoice document
 */
const extractInvoiceData = async (textContent, tenantId, userId) => {
  const prompt = `Extract structured data from this invoice/receipt.

Rules:
- Return JSON ONLY (no markdown, no commentary).
- If a field is missing/unclear, set it to null.
- Dates must be YYYY-MM-DD.
- All money fields must be numbers (no currency symbols, no commas).
- Items must include all line items you can identify; use quantity=1 when missing.

Return JSON only with these exact fields:
{
  "invoiceNumber": "string or null",
  "date": "YYYY-MM-DD or null",
  "dueDate": "YYYY-MM-DD or null",
  "vendorName": "string or null",
  "vendorAddress": "string or null",
  "vendorEmail": "string or null",
  "vendorPhone": "string or null",
  "customerName": "string or null",
  "customerAddress": "string or null",
  "items": [
    {
      "description": "string",
      "quantity": number,
      "unitPrice": number,
      "total": number
    }
  ],
  "subtotal": number or null,
  "tax": number or null,
  "taxRate": number or null,
  "total": number or null,
  "currency": "string (e.g., USD, ZAR, EUR)",
  "notes": "string or null",
  "paymentTerms": "string or null"
}

Document text:
${textContent}`;

  const response = await callAI(prompt, 'gemini-1.5-flash', {
    temperature: 0.05,
    tenantId,
    userId,
    assistant: 'documentExtractor',
    systemPrompt:
      'You are a precise document data extraction assistant. Return only valid JSON (no markdown). Do not invent values; use null when unsure.',
  });

  return postProcessInvoice(safeParseJson(response));
};

/**
 * Extract structured data from bank statement
 */
const extractBankStatementData = async (textContent, tenantId, userId) => {
  const prompt = `Extract structured data from this bank statement.

Rules:
- Return JSON ONLY (no markdown, no commentary).
- Do not hallucinate transactions; only include transactions that appear in the text.
- Dates must be YYYY-MM-DD.
- Amounts must be numbers (no currency symbols, no commas). Use positive amount and set type to debit/credit.
- Account number must be LAST 4 digits only.

Return JSON only with these exact fields:
{
  "accountHolder": "string or null",
  "accountNumber": "string (last 4 digits only) or null",
  "bankName": "string or null",
  "statementPeriod": {
    "from": "YYYY-MM-DD or null",
    "to": "YYYY-MM-DD or null"
  },
  "openingBalance": number or null,
  "closingBalance": number or null,
  "currency": "string (e.g., USD, ZAR, EUR)",
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "string",
      "amount": number,
      "type": "debit or credit",
      "balance": number or null,
      "category": "string or null"
    }
  ],
  "summary": {
    "totalDebits": number or null,
    "totalCredits": number or null,
    "transactionCount": number
  }
}

Document text:
${textContent}`;

  const response = await callAI(prompt, 'gemini-1.5-flash', {
    temperature: 0,
    tenantId,
    userId,
    assistant: 'documentExtractor',
    systemPrompt:
      'You are a precise document data extraction assistant. Return only valid JSON (no markdown). For bank statements, extract all transactions present in the text.',
  });

  return postProcessBankStatement(safeParseJson(response));
};

/**
 * Extract structured data from payslip
 */
const extractPayslipData = async (textContent, tenantId, userId) => {
  const prompt = `Extract structured data from this payslip. Return JSON only with these exact fields:
{
  "employeeName": "string or null",
  "employeeNumber": "string or null",
  "employerName": "string or null",
  "payPeriod": {
    "from": "YYYY-MM-DD or null",
    "to": "YYYY-MM-DD or null"
  },
  "payDate": "YYYY-MM-DD or null",
  "basicSalary": number or null,
  "allowances": [
    {
      "name": "string",
      "amount": number
    }
  ],
  "deductions": [
    {
      "name": "string",
      "amount": number
    }
  ],
  "grossPay": number or null,
  "netPay": number or null,
  "currency": "string (e.g., USD, ZAR, EUR)",
  "taxDeducted": number or null,
  "ytdGross": number or null,
  "ytdTax": number or null
}

Document text:
${textContent}`;

  const response = await callAI(prompt, 'gemini-1.5-flash', {
    temperature: 0,
    tenantId,
    userId,
    assistant: 'documentExtractor',
    systemPrompt: 'You are a precise document data extraction assistant. Return only valid JSON (no markdown).',
  });

  return safeParseJson(response);
};

/**
 * Extract generic document data
 */
const extractGenericData = async (textContent, tenantId, userId, documentType) => {
  const prompt = `Extract key information from this document (${documentType}). Return JSON with these fields:
{
  "title": "string - document title or main heading",
  "date": "YYYY-MM-DD or null - any date found",
  "parties": ["array of names/organizations mentioned"],
  "amounts": [
    {
      "description": "string",
      "value": number,
      "currency": "string"
    }
  ],
  "keyTerms": ["array of important terms or clauses"],
  "summary": "string - brief summary of the document content"
}

Document text:
${textContent}`;

  const response = await callAI(prompt, 'gemini-1.5-flash', {
    temperature: 0.1,
    tenantId,
    userId,
    assistant: 'documentExtractor',
    systemPrompt: 'You are a precise document data extraction assistant. Return only valid JSON (no markdown).',
  });

  return safeParseJson(response);
};

/**
 * Upload file to Firebase Storage
 */
const uploadDocumentFile = async (file, tenantId, userId) => {
  const timestamp = Date.now();
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `tenants/${tenantId}/documents/${userId}/${timestamp}_${sanitizedFileName}`;
  
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  
  return { storagePath, downloadURL };
};

/**
 * Main function to extract data from uploaded document
 */
export const extractDocumentData = async ({
  file,
  documentType,
  tenantId,
  userId,
}) => {
  if (!file) {
    throw new Error('No file provided');
  }

  if (!tenantId || !userId) {
    throw new Error('tenantId and userId are required');
  }

  // Generate cache key based on file properties
  const cacheKey = generateCacheKey({
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    lastModified: file.lastModified,
    documentType
  });

  // Check cache first
  const cachedResult = documentCache.get(cacheKey);
  if (cachedResult) {
    console.log('[DocumentExtractor] Returning cached extraction for:', file.name);
    return cachedResult;
  }

  try {
    // Upload file to storage first
    const { storagePath, downloadURL } = await uploadDocumentFile(file, tenantId, userId);

    // Extract text content from document
    let textContent = '';
    let pagesText = null;
    const models = {
      fast: 'gemini-1.5-flash',
      powerful: 'gemini-1.5-pro',
    };
    
    if (file.type.startsWith('image/')) {
      // For images, use OCR via GPT-4 Vision
      const base64Image = await extractTextFromImage(file);
      
      const visionPrompt = 'Extract all text from this document image. Return the complete text content exactly as it appears, maintaining structure and formatting.';
      
      const response = await callAI(visionPrompt, models.fast, {
        temperature: 0,
        tenantId,
        userId,
        assistant: 'ocr-extractor',
        systemPrompt: 'You are an OCR assistant. Extract text accurately from images.',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: visionPrompt },
              { type: 'image_url', image_url: { url: base64Image } },
            ],
          },
        ],
      });
      
      textContent = response || '';
    } else if (file.type === 'application/pdf') {
      const pdfText = await extractTextFromPdf(file);
      textContent = pdfText?.text || '';
      pagesText = Array.isArray(pdfText?.pagesText) ? pdfText.pagesText : null;

      // If the PDF is scanned (no text layer), fall back to OCR rendering.
      if ((textContent || '').trim().length < 200) {
        const ocrText = await extractTextFromPdfViaOcr(file, {
          tenantId,
          userId,
          model: models.powerful,
        });
        textContent = ocrText?.text || '';
        pagesText = Array.isArray(ocrText?.pagesText) ? ocrText.pagesText : pagesText;
      }
    } else if (file.type.startsWith('text/')) {
      // For text files, read directly
      textContent = await file.text();
    } else {
      throw new Error('Unsupported file type. Please upload an image (PNG, JPG), PDF, or text file.');
    }

    textContent = normalizeExtractedText(textContent);

    if (!textContent || textContent.trim().length === 0) {
      throw new Error('No text content could be extracted from the document. Please ensure the image is clear and readable.');
    }

    // Extract structured data based on document type
    let extractedData = {};
    let modelUsed = models.fast;
    const extractionWarnings = [];
    
    switch (documentType) {
      case DOCUMENT_TYPES.INVOICE:
      case DOCUMENT_TYPES.RECEIPT:
        extractedData = await extractInvoiceData(textContent, tenantId, userId);
        if (needsModelEscalation(documentType, extractedData)) {
          modelUsed = models.powerful;
          const response = await callAI(
            `Re-extract with maximum accuracy.\n\n${textContent}`,
            modelUsed,
            {
              temperature: 0,
              tenantId,
              userId,
              assistant: 'documentExtractor',
              systemPrompt:
                'You are a precise invoice extraction engine. Return ONLY valid JSON matching the invoice schema. Use null when unsure; do not invent values.',
            }
          );
          extractedData = postProcessInvoice(safeParseJson(response));
          extractionWarnings.push('Used higher-accuracy model for invoice extraction.');
        }
        break;
      case DOCUMENT_TYPES.BANK_STATEMENT:
        // For long statements, prefer page-based extraction so we don’t drop transactions.
        if (Array.isArray(pagesText) && pagesText.length > 0 && textContent.length > 12000) {
          modelUsed = models.powerful;

          const headerText = normalizeExtractedText(pagesText[0] || textContent).slice(0, 8000);
          const headerResponse = await callAI(
            `Extract ONLY bank statement header details (no transactions). Return JSON with:\n{\n  "accountHolder": string|null,\n  "accountNumber": "last4"|null,\n  "bankName": string|null,\n  "statementPeriod": {"from": "YYYY-MM-DD"|null, "to": "YYYY-MM-DD"|null},\n  "openingBalance": number|null,\n  "closingBalance": number|null,\n  "currency": "USD|ZAR|EUR|..."\n}\n\nText:\n${headerText}`,
            modelUsed,
            {
              temperature: 0,
              tenantId,
              userId,
              assistant: 'documentExtractor',
              systemPrompt: 'Return only valid JSON. Use null when unsure.',
            }
          );

          const header = safeParseJson(headerResponse);
          const transactionsAll = [];

          for (let i = 0; i < pagesText.length; i += 1) {
            const pageChunk = normalizeExtractedText(pagesText[i]).slice(0, 12000);
            if (!pageChunk) continue;
            const txResponse = await callAI(
              `Extract ONLY the transactions from this bank statement text. Return JSON ONLY with:\n{ "transactions": [ {"date":"YYYY-MM-DD"|null,"description":string,"amount":number|null,"type":"debit|credit"|null,"balance":number|null,"category":string|null} ] }\n\nText:\n${pageChunk}`,
              models.fast,
              {
                temperature: 0,
                tenantId,
                userId,
                assistant: 'documentExtractor',
                systemPrompt: 'Return only valid JSON. Do not invent transactions.',
              }
            );
            const parsed = safeParseJson(txResponse);
            if (Array.isArray(parsed?.transactions)) {
              transactionsAll.push(...parsed.transactions);
            }
          }

          extractedData = postProcessBankStatement({
            ...header,
            transactions: dedupeTransactions(transactionsAll),
          });

          extractionWarnings.push('Used page-based extraction for bank statement completeness.');
        } else {
          extractedData = await extractBankStatementData(textContent, tenantId, userId);
          if (needsModelEscalation(documentType, extractedData)) {
            modelUsed = models.powerful;
            const response = await callAI(prompt, modelUsed, {
              temperature: 0,
              tenantId,
              userId,
              assistant: 'documentExtractor',
              systemPrompt:
                'You are a precise bank statement extraction engine. Return ONLY valid JSON matching the schema. Use null when unsure; do not invent transactions.',
            });
            extractedData = postProcessBankStatement(safeParseJson(response));
            extractionWarnings.push('Used higher-accuracy model for bank statement extraction.');
          }
        }
        break;
      case DOCUMENT_TYPES.PAYSLIP:
        extractedData = await extractPayslipData(textContent, tenantId, userId);
        break;
      default:
        extractedData = await extractGenericData(textContent, tenantId, userId, documentType);
    }

    // Save extracted data to Firestore
    const extractionRecord = {
      tenantId,
      userId,
    documentType,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    storagePath,
    downloadURL,
    extractedData,
    rawText: textContent.substring(0, documentType === DOCUMENT_TYPES.BANK_STATEMENT ? 20000 : 8000),
    extractedAt: serverTimestamp(),
    status: 'completed',
    extractionMeta: {
      modelUsed,
      warnings: extractionWarnings,
      source: file.type === 'application/pdf' ? 'pdf' : file.type.startsWith('image/') ? 'image' : 'text',
      textLength: textContent.length,
    },
  };

  const docRef = await addDoc(collection(db, 'documentExtractions'), extractionRecord);

  const result = {
    id: docRef.id,
    ...extractionRecord,
  };

  // Auto-sort customer from extracted data
  try {
    const customerResult = await autoSortCustomerFromDocument({
      tenantId,
      userId,
      documentData: extractedData,
      documentType,
      documentId: docRef.id,
    });

    if (customerResult) {
      console.log('[DocumentExtractor] Customer auto-sorted:', customerResult.id, customerResult.created ? 'created' : 'updated');
      result.customerId = customerResult.id;
      result.customerCreated = customerResult.created;
    }
  } catch (error) {
    console.warn('[DocumentExtractor] Customer auto-sort failed (non-critical):', error);
  }

  // Cache the successful result
  documentCache.set(cacheKey, result);

  return result;
  } catch (error) {
    console.error('[DocumentExtractor] Extraction failed:', error);
    
    // Enhance error message for user
    let userMessage = 'Failed to extract document data';
    if (error.message.includes('API key')) {
      userMessage = 'AI service is not configured. Please contact support.';
    } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
      userMessage = 'Service temporarily unavailable due to high demand. Please try again in a moment.';
    } else if (error.message.includes('No text content')) {
      userMessage = error.message;
    } else if (error.message.includes('parse')) {
      userMessage = 'Could not extract data from document. The document format may not be supported.';
    }
    
    const enhancedError = new Error(userMessage);
    enhancedError.originalError = error;
    throw enhancedError;
  }
};

/**
 * List all document extractions for a tenant
 */
export const listDocumentExtractions = async ({ tenantId, userId = null, documentType = null, limit = 50 }) => {
  let q = query(
    collection(db, 'documentExtractions'),
    where('tenantId', '==', tenantId),
    orderBy('extractedAt', 'desc')
  );

  if (userId) {
    q = query(q, where('userId', '==', userId));
  }

  if (documentType) {
    q = query(q, where('documentType', '==', documentType));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    extractedAt: doc.data().extractedAt?.toDate?.() || null,
  }));
};

/**
 * Export extracted data to various formats
 */
export const exportExtractedData = (extractions, format = 'csv') => {
  if (format === 'json') {
    return JSON.stringify(extractions, null, 2);
  }

  if (format === 'csv') {
    // Flatten the data for CSV export
    const rows = [];
    
    extractions.forEach(extraction => {
      const base = {
        id: extraction.id,
        fileName: extraction.fileName,
        documentType: extraction.documentType,
        extractedAt: extraction.extractedAt?.toISOString?.() || '',
      };

      if (extraction.documentType === DOCUMENT_TYPES.INVOICE) {
        const data = extraction.extractedData;
        rows.push({
          ...base,
          invoiceNumber: data.invoiceNumber,
          date: data.date,
          vendor: data.vendorName,
          customer: data.customerName,
          subtotal: data.subtotal,
          tax: data.tax,
          total: data.total,
          currency: data.currency,
        });
      } else if (extraction.documentType === DOCUMENT_TYPES.BANK_STATEMENT) {
        const data = extraction.extractedData;
        rows.push({
          ...base,
          accountHolder: data.accountHolder,
          bankName: data.bankName,
          periodFrom: data.statementPeriod?.from,
          periodTo: data.statementPeriod?.to,
          openingBalance: data.openingBalance,
          closingBalance: data.closingBalance,
          transactionCount: data.summary?.transactionCount,
        });
      } else {
        rows.push(base);
      }
    });

    // Convert to CSV
    if (rows.length === 0) return '';
    
    const headers = Object.keys(rows[0]).join(',');
    const csvRows = rows.map(row => 
      Object.values(row).map(val => 
        typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
      ).join(',')
    );
    
    return [headers, ...csvRows].join('\n');
  }

  return '';
};
