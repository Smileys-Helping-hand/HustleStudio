import React, { useCallback, useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
// dynamic import of recharts to reduce initial bundle size
// load heavy export libraries on demand (dynamic import) to keep initial bundle small
import { mockReports } from '../mockData/reports.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../theme/ThemeContext.jsx';

export default function Reports() {
  const { reportOffline } = useAuth();
  const { theme } = useTheme();
  const [reports, setReports] = useState(mockReports);
  const [Recharts, setRecharts] = useState(null);

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

  useEffect(() => {
    let active = true;
    import('recharts')
      .then((mod) => {
        if (active) setRecharts(mod);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      active = false;
    };
  }, []);

  const exportPDF = useCallback(async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      await import('jspdf-autotable');
      const doc = new jsPDF();
      doc.text('Daily Earnings Report', 14, 15);
      doc.autoTable({
        head: [['Date', 'Total']],
        body: reports.map((r) => [r.id, `R${r.total.toFixed(2)}`]),
      });
      doc.save('hustle-daily-reports.pdf');
    } catch (err) {
      console.error('[Export] Unable to create PDF', err);
    }
  }, [reports]);

  const exportExcel = useCallback(async () => {
    try {
      // Generate CSV as a lightweight alternative to Excel (smaller bundle size)
      const headers = ['Date', 'Total'];
      const rows = reports.map((r) => [r.id, r.total ?? 0]);
      const csvLines = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))];
      const csvContent = csvLines.join('\n');
      const { saveAs } = await import('file-saver');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, 'hustle-daily-reports.csv');
    } catch (err) {
      console.error('[Export] Unable to create CSV export', err);
    }
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
            {Recharts ? (
              <Recharts.ResponsiveContainer width="100%" height={350}>
                <Recharts.LineChart data={reports}>
                  <Recharts.CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <Recharts.XAxis dataKey="id" stroke="#aaa" />
                  <Recharts.YAxis stroke="#aaa" />
                  <Recharts.Tooltip
                    contentStyle={{ backgroundColor: '#1f1f1f', border: 'none', color: '#fff' }}
                  />
                  <Recharts.Line
                    type="monotone"
                    dataKey="total"
                    stroke={theme.palette.highlight}
                    strokeWidth={3}
                    dot
                  />
                </Recharts.LineChart>
              </Recharts.ResponsiveContainer>
            ) : (
              <div className="h-[350px] w-full animate-pulse rounded-lg bg-white/5" />
            )}
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
