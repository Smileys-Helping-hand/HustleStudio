import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';

/**
 * Universal data export utility
 * Supports CSV, Excel, and PDF formats
 */

/**
 * Export data to CSV format
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the file (without extension)
 * @param {Array} columns - Optional column definitions [{ header: 'Name', key: 'name' }]
 */
export const exportToCSV = (data, filename = 'export', columns = null) => {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  const cols = columns || Object.keys(data[0]).map(key => ({ header: key, key }));
  
  // Create CSV header
  const header = cols.map(col => col.header).join(',');
  
  // Create CSV rows
  const rows = data.map(row => 
    cols.map(col => {
      const value = row[col.key];
      // Escape commas and quotes
      const escaped = String(value ?? '').replace(/"/g, '""');
      return escaped.includes(',') ? `"${escaped}"` : escaped;
    }).join(',')
  );

  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `${filename}.csv`);
};

/**
 * Export data to Excel format
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the file (without extension)
 * @param {Array} columns - Optional column definitions [{ header: 'Name', key: 'name', width: 20 }]
 * @param {Object} options - Additional options { sheetName, title, includeDate }
 */
export const exportToExcel = async (data, filename = 'export', columns = null, options = {}) => {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  const {
    sheetName = 'Data',
    title = filename,
    includeDate = true,
  } = options;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // Set up columns
  const cols = columns || Object.keys(data[0]).map(key => ({ 
    header: key, 
    key, 
    width: 15 
  }));

  worksheet.columns = cols;

  // Add title row if requested
  let startRow = 1;
  if (title) {
    worksheet.mergeCells('A1', `${String.fromCharCode(64 + cols.length)}1`);
    const titleRow = worksheet.getCell('A1');
    titleRow.value = title;
    titleRow.font = { size: 16, bold: true };
    titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
    startRow = 2;
  }

  // Add date row if requested
  if (includeDate) {
    worksheet.mergeCells(`A${startRow}`, `${String.fromCharCode(64 + cols.length)}${startRow}`);
    const dateRow = worksheet.getCell(`A${startRow}`);
    dateRow.value = `Generated: ${new Date().toLocaleString()}`;
    dateRow.font = { size: 10, italic: true };
    dateRow.alignment = { horizontal: 'center' };
    startRow++;
  }

  // Add header row
  const headerRow = worksheet.addRow(cols.map(col => col.header));
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' }, // Indigo color
  };
  headerRow.font = { color: { argb: 'FFFFFFFF' }, bold: true };

  // Add data rows
  data.forEach(row => {
    worksheet.addRow(cols.map(col => row[col.key]));
  });

  // Auto-filter
  worksheet.autoFilter = {
    from: `A${startRow + 1}`,
    to: `${String.fromCharCode(64 + cols.length)}${startRow + 1}`,
  };

  // Generate buffer and save
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  saveAs(blob, `${filename}.xlsx`);
};

/**
 * Export data to PDF format
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the file (without extension)
 * @param {Array} columns - Optional column definitions [{ header: 'Name', key: 'name' }]
 * @param {Object} options - Additional options { title, orientation, pageSize }
 */
export const exportToPDF = (data, filename = 'export', columns = null, options = {}) => {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  const {
    title = filename,
    orientation = 'portrait', // or 'landscape'
    pageSize = 'a4',
  } = options;

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: pageSize,
  });

  // Add title
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text(title, 14, 20);

  // Add date
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

  // Prepare table data
  const cols = columns || Object.keys(data[0]).map(key => ({ header: key, key }));
  const headers = [cols.map(col => col.header)];
  const rows = data.map(row => cols.map(col => String(row[col.key] ?? '')));

  // Add table
  autoTable(doc, {
    startY: 35,
    head: headers,
    body: rows,
    theme: 'striped',
    headStyles: {
      fillColor: [79, 70, 229], // Indigo color
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 250],
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    columnStyles: cols.reduce((acc, col, index) => {
      acc[index] = { cellWidth: 'auto' };
      return acc;
    }, {}),
  });

  doc.save(`${filename}.pdf`);
};

/**
 * Unified export function - auto-detects format from extension
 * @param {Array} data - Data to export
 * @param {string} filename - Filename with extension (e.g., 'report.xlsx')
 * @param {Array} columns - Column definitions
 * @param {Object} options - Additional options
 */
export const exportData = async (data, filename, columns = null, options = {}) => {
  const ext = filename.split('.').pop().toLowerCase();
  const basename = filename.replace(/\.[^/.]+$/, '');

  switch (ext) {
    case 'csv':
      return exportToCSV(data, basename, columns);
    case 'xlsx':
    case 'xls':
      return await exportToExcel(data, basename, columns, options);
    case 'pdf':
      return exportToPDF(data, basename, columns, options);
    default:
      throw new Error(`Unsupported format: ${ext}. Use csv, xlsx, or pdf`);
  }
};

export default {
  exportToCSV,
  exportToExcel,
  exportToPDF,
  exportData,
};
