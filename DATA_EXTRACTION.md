# Document Data Extraction (Invoices + Bank Statements)

## What this does
Hustle Studio’s **Document Scanner** lets users upload invoices, receipts, and bank statements and automatically extracts structured JSON data.

- UI: `/data-extraction` ("Document Scanner" in the sidebar)
- Storage: Original files in Firebase Storage
- Database: Extraction records in Firestore collection `documentExtractions`
- Customer auto-sorting: Extracted customer info can create/update customers under `tenants/{tenantId}/customers`

## Supported files
- Images: `image/*` (JPG/PNG/etc)
- PDFs: `application/pdf`
- Text: `text/*` and `.txt`

Max size is controlled by the uploader (default: 10MB).

## Supported document types
- Invoice
- Receipt
- Bank Statement
- Payslip
- Contract
- Tax Document
- Other

## How extraction works (high level)
1. Upload file to Firebase Storage.
2. Extract raw text:
   - Images: AI OCR (multimodal)
   - PDFs: `pdfjs-dist` text-layer extraction
   - Scanned PDFs (little/no text layer): render pages to images and OCR fallback
3. Normalize the text (whitespace cleanup).
4. Run schema-focused extraction prompts (JSON-only).
5. Repair/parse JSON robustly (`jsonrepair` fallback).
6. Post-process/normalize common fields (numbers, currency, dates).
7. Save extraction record and attach metadata (`extractionMeta`).

## Output schemas (key fields)

### Invoice / Receipt
- `invoiceNumber`, `date`, `dueDate`
- `vendorName`, `vendorEmail`, `vendorPhone`, `vendorAddress`
- `customerName`, `customerAddress`
- `items[]` (description, quantity, unitPrice, total)
- `subtotal`, `tax`, `taxRate`, `total`, `currency`

### Bank Statement
- `accountHolder`, `accountNumber` (last 4 only)
- `bankName`, `statementPeriod` (from/to)
- `openingBalance`, `closingBalance`, `currency`
- `transactions[]` (date, description, amount, type debit/credit, balance, category)
- `summary` (totalDebits, totalCredits, transactionCount)

## Accuracy / reliability features
- JSON robustness: extracts JSON from mixed responses, repairs malformed JSON, then parses.
- Model escalation: retries with a stronger model if the first extraction looks incomplete.
- Bank statement completeness: for long PDFs, runs **page-based** transaction extraction and dedupes transactions.
- Scanned-PDF OCR fallback: if the PDF text layer is too small, renders up to N pages and OCRs.

## Where to look in code
- Extraction pipeline: `src/lib/documentExtractor.js`
- Scanner UI: `src/pages/DataExtraction.jsx`
- Upload widget: `src/components/DocumentUploader.jsx`
- Customer auto-sort: `src/lib/customerManager.js`
- AI routing: `src/lib/aiClient.js` + `src/lib/geminiClient.js` + `src/lib/openaiClient.js`

## Environment variables
Set these locally in `.env.local` (gitignored) or in your deployment environment:

- `VITE_GEMINI_API_KEY` (recommended)
- `VITE_AI_PROVIDER=gemini` (or `openai`)
- `VITE_OPENAI_API_KEY` (optional fallback)
- Firebase vars (`VITE_FIREBASE_*`) required for storage + Firestore

## Notes
- API keys must never be committed.
- If you run `npm run build`, ensure `dist/` is not committed (it may contain inlined env values depending on your build config).
