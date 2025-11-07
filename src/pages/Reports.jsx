import React, { useCallback, useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { mockReports } from '../mockData/reports.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../theme/ThemeContext.jsx';

export default function Reports() {
  const { reportOffline } = useAuth();
  const { theme } = useTheme();
  const [reports, setReports] = useState(mockReports);

  useEffect(() => {
    const loadReports = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'reports'));
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        data.sort((a, b) => new Date(a.id) - new Date(b.id));
        setReports(data.length ? data : mockReports);
      } catch (error) {
        console.error('[Firestore] Unable to load reports', error);
        reportOffline();
        setReports(mockReports);
      }
    };
    loadReports();
  }, [reportOffline]);

  useEffect(() => {
    const handleShortcut = () => {
      exportExcel();
    };
    document.addEventListener('dashboard-export-reports', handleShortcut);
    return () => document.removeEventListener('dashboard-export-reports', handleShortcut);
  }, [reports, exportExcel]);

  const exportPDF = useCallback(() => {
    const doc = new jsPDF();
    doc.text('Daily Earnings Report', 14, 15);
    doc.autoTable({
      head: [['Date', 'Total']],
      body: reports.map((r) => [r.id, `R${r.total.toFixed(2)}`]),
    });
    doc.save('hustle-daily-reports.pdf');
  }, [reports]);

  const exportExcel = useCallback(async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Reports');
    sheet.columns = [
      { header: 'Date', key: 'id', width: 15 },
      { header: 'Total', key: 'total', width: 15 },
    ];
    sheet.addRows(reports);
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), 'hustle-daily-reports.xlsx');
  }, [reports]);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-[var(--theme-text)]">📈 Performance reports</h1>
        <p className="mt-2 text-sm text-[color-mix(in_srgb,var(--theme-text)_60%,transparent)]">
          Export finance packs in one click — Ctrl+E for Excel, PDF for board decks.
        </p>
      </div>
      {reports.length === 0 ? (
        <p className="text-center text-white/60">No reports yet — offline dataset active.</p>
      ) : (
        <>
          <div className="rounded-3xl border border-white/5 bg-black/40 p-6 shadow-[0_25px_60px_rgba(0,0,0,0.35)] backdrop-blur">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={reports}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="id" stroke="#aaa" />
                <YAxis stroke="#aaa" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f1f1f', border: 'none', color: '#fff' }}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke={theme.palette.highlight}
                  strokeWidth={3}
                  dot
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 flex justify-center gap-4">
            <button type="button" onClick={exportPDF} className="btn-primary">
              📄 PDF
            </button>
            <button type="button" onClick={exportExcel} className="btn-success">
              📊 Excel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
