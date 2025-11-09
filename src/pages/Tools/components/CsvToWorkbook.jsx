import React, { useState } from 'react';
import ExcelJS from 'exceljs';

const CsvToWorkbook = () => {
  const [status, setStatus] = useState('Awaiting upload');

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setStatus(`Processing ${file.name}…`);
      const text = await file.text();
      const rows = text
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => line.split(','));

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Imported CSV');
      sheet.addRows(rows);

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.name.replace(/\.csv$/i, '') + '-converted.xlsx';
      anchor.click();
      window.URL.revokeObjectURL(url);
      setStatus('Converted successfully. Check your downloads.');
    } catch (error) {
      console.error('Conversion failed', error);
      setStatus('Conversion failed — check file format.');
    }
  };

  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-6">
      <header>
        <h3 className="text-lg font-semibold text-white">CSV → ExcelJS</h3>
        <p className="text-xs text-white/60">Convert CSV exports into styled Excel workbooks in-browser.</p>
      </header>
      <input
        type="file"
        accept=".csv"
        onChange={handleFile}
        className="block w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white file:mr-4 file:rounded-md file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-indigo-700"
      />
      <p className="text-xs text-white/50">{status}</p>
    </section>
  );
};

export default CsvToWorkbook;
