import { saveAs } from 'file-saver';
import { toast } from 'react-hot-toast';

const resolveEnv = (key) => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.[key]) {
    return import.meta.env[key];
  }
  const nodeEnv =
    typeof globalThis !== 'undefined' &&
    typeof globalThis.process === 'object' &&
    globalThis.process !== null &&
    typeof globalThis.process.env === 'object'
      ? globalThis.process.env
      : undefined;
  if (nodeEnv?.[key]) {
    return nodeEnv[key];
  }
  return '';
};

export const exportToCSV = (rows, filename = 'export.csv') => {
  if (!Array.isArray(rows) || rows.length === 0) {
    toast.error('No data available to export.');
    return;
  }

  const header = Object.keys(rows[0]);
  const csv = [header.join(',')]
    .concat(rows.map((row) => header.map((key) => JSON.stringify(row[key] ?? '')).join(',')))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
  toast.success('CSV exported successfully.');
};

export const exportToPDF = async ({ title = 'Report', head = [], body = [], filename = 'report.pdf' }) => {
  // lazy-load jsPDF only when needed
  const jsPDFModule = await import('jspdf');
  const JsPDF = jsPDFModule.default || jsPDFModule;
  await import('jspdf-autotable');

  const doc = new JsPDF({ orientation: 'landscape' });
  doc.setFontSize(16);
  doc.text(title, 14, 18);
  doc.autoTable({ head, body, startY: 26 });
  doc.save(filename);
  toast.success('PDF exported successfully.');
};

export const exportToGoogleSheets = async (rows, sheetName = 'HustleStudio Export') => {
  if (!Array.isArray(rows) || rows.length === 0) {
    toast.error('No data available to export.');
    return;
  }

  const apiKey = resolveEnv('VITE_GOOGLE_SHEETS_API_KEY');
  if (!apiKey) {
    toast.error('Google Sheets API key missing. Configure VITE_GOOGLE_SHEETS_API_KEY.');
    return;
  }

  try {
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: { title: sheetName },
        sheets: [
          {
            properties: { title: 'Export' },
            data: [
              {
                rowData: rows.map((row) => ({
                  values: Object.values(row).map((value) => ({ userEnteredValue: { stringValue: String(value ?? '') } })),
                })),
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create Google Sheet');
    }

    const data = await response.json();
    const sheetId = data?.spreadsheetId;
    if (sheetId) {
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
      window.open(url, '_blank', 'noopener');
      toast.success('Sheet created in Google Sheets.');
    }
  } catch (error) {
    console.error('[Export] Google Sheets export failed', error);
    toast.error('Unable to export to Google Sheets.');
  }
};
