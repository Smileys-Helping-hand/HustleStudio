import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { getDocs, orderBy, query, where, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { storage } from '../lib/firebase.js';
import { tenantCollection } from '../lib/tenant.js';
import { useTenant } from '../context/TenantContext.jsx';
import { logEvent } from '../lib/auditLogger.js';
import { mockReports } from '../mockData/reports.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../theme/ThemeContext.jsx';
import { exportToCSV, exportToGoogleSheets } from '../lib/exportUtils.js';
import { toast } from 'react-hot-toast';

const periods = [
  { label: 'Daily', value: 'daily', days: 1 },
  { label: 'Weekly', value: 'weekly', days: 7 },
  { label: 'Monthly', value: 'monthly', days: 30 },
];

const Reports = () => {
  const { reportOffline, user } = useAuth();
  const { theme } = useTheme();
  const [period, setPeriod] = useState('weekly');
  const [reports, setReports] = useState(mockReports);
  const [sales, setSales] = useState([]);
  const [teamActivity, setTeamActivity] = useState([]);
  const [loading, setLoading] = useState(false);
  const { activeTenantId } = useTenant();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (!activeTenantId) {
        setReports(mockReports);
        setSales([]);
        setTeamActivity([]);
        setLoading(false);
        return;
      }
      const now = Timestamp.now();
      const selectedPeriod = periods.find((item) => item.value === period) ?? periods[1];
      const fromDate = Timestamp.fromMillis(now.toMillis() - selectedPeriod.days * 24 * 60 * 60 * 1000);

      const reportsSnapshot = await getDocs(tenantCollection(activeTenantId, 'reports'));
      const reportData = reportsSnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      reportData.sort((a, b) => new Date(a.id) - new Date(b.id));

      const salesQuery = query(
        tenantCollection(activeTenantId, 'sales'),
        where('createdAt', '>=', fromDate),
        orderBy('createdAt', 'desc')
      );
      const salesSnapshot = await getDocs(salesQuery);
      const saleData = salesSnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

      const teamSnapshot = await getDocs(tenantCollection(activeTenantId, 'users'));
      const teamData = teamSnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

      setReports(reportData.length ? reportData : mockReports);
      setSales(saleData);
      setTeamActivity(teamData);
    } catch (error) {
      console.error('[Reports] load failed', error);
      reportOffline();
      setReports(mockReports);
    } finally {
      setLoading(false);
    }
  }, [activeTenantId, period, reportOffline]);

  useEffect(() => {
    loadData().catch(() => {});
  }, [loadData]);

  const summary = useMemo(() => {
    const revenue = sales.reduce((total, sale) => total + (sale.totals?.total ?? 0), 0);
    const transactions = sales.length;
    const averageSale = transactions ? revenue / transactions : 0;
    const lowStock = reports.filter((entry) => entry.lowStock).length;

    return {
      revenue,
      transactions,
      averageSale,
      lowStock,
    };
  }, [sales, reports]);

  const exportPdf = useCallback(async () => {
    if (!activeTenantId) {
      toast.error('Select a workspace to export reports.');
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Hustle Studio • ${period.toUpperCase()} Report`, 14, 18);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);

    doc.autoTable({
      startY: 34,
      head: [['Date', 'Total revenue', 'Transactions']],
      body: sales.map((sale) => [
        sale.createdAt?.toDate ? sale.createdAt.toDate().toLocaleString() : 'N/A',
        `R${(sale.totals?.total ?? 0).toFixed(2)}`,
        sale.items?.length ?? 0,
      ]),
    });

    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Metric', 'Value']],
      body: [
        ['Total revenue', `R${summary.revenue.toFixed(2)}`],
        ['Transactions', summary.transactions],
        ['Average sale', `R${summary.averageSale.toFixed(2)}`],
        ['Team members', teamActivity.length],
      ],
    });

    const arrayBuffer = doc.output('arraybuffer');
    const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
    saveAs(blob, `hustle-report-${period}.pdf`);

    try {
      const storageRef = ref(
        storage,
        `tenants/${activeTenantId}/reports/hustle-report-${period}-${Date.now()}.pdf`
      );
      await uploadBytes(storageRef, blob);
    } catch (error) {
      console.warn('[Reports] upload skipped', error);
    }
    await logEvent(activeTenantId, user?.uid, 'Exported Report', { format: 'pdf', period });
  }, [activeTenantId, period, sales, summary, teamActivity.length, user]);

  const exportExcel = useCallback(async () => {
    if (!activeTenantId) {
      toast.error('Select a workspace to export reports.');
      return;
    }
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Sales');
    sheet.columns = [
      { header: 'Sale ID', key: 'id', width: 26 },
      { header: 'Created', key: 'created', width: 28 },
      { header: 'Items', key: 'items', width: 12 },
      { header: 'Total (R)', key: 'total', width: 14 },
      { header: 'Payment', key: 'paymentType', width: 14 },
    ];
    sheet.addRows(
      sales.map((sale) => ({
        id: sale.id,
        created: sale.createdAt?.toDate ? sale.createdAt.toDate().toLocaleString() : 'N/A',
        items: sale.items?.length ?? 0,
        total: sale.totals?.total ?? 0,
        paymentType: sale.paymentType ?? 'Cash',
      }))
    );

    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.addRows([
      ['Total revenue', summary.revenue],
      ['Transactions', summary.transactions],
      ['Average sale', summary.averageSale],
      ['Team members', teamActivity.length],
    ]);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, `hustle-report-${period}.xlsx`);

    try {
      const storageRef = ref(
        storage,
        `tenants/${activeTenantId}/reports/hustle-report-${period}-${Date.now()}.xlsx`
      );
      await uploadBytes(storageRef, blob);
    } catch (error) {
      console.warn('[Reports] excel upload skipped', error);
    }
    await logEvent(activeTenantId, user?.uid, 'Exported Report', { format: 'xlsx', period });
  }, [activeTenantId, period, sales, summary, teamActivity.length, user]);

  const exportCsv = useCallback(() => {
    if (!activeTenantId) {
      toast.error('Select a workspace to export reports.');
      return;
    }
    const rows = sales.map((sale) => ({
      id: sale.id,
      created: sale.createdAt?.toDate ? sale.createdAt.toDate().toISOString() : 'N/A',
      total: Number(sale.totals?.total ?? 0).toFixed(2),
      paymentType: sale.paymentType ?? 'Cash',
      items: sale.items?.length ?? 0,
    }));
    exportToCSV(rows, `hustle-report-${period}.csv`);
    logEvent(activeTenantId, user?.uid, 'Exported Report', { format: 'csv', period }).catch(() => {});
  }, [activeTenantId, period, sales, user]);

  const exportSheets = useCallback(() => {
    if (!activeTenantId) {
      toast.error('Select a workspace to export reports.');
      return;
    }
    const rows = sales.map((sale) => ({
      id: sale.id,
      created: sale.createdAt?.toDate ? sale.createdAt.toDate().toISOString() : 'N/A',
      total: Number(sale.totals?.total ?? 0).toFixed(2),
      paymentType: sale.paymentType ?? 'Cash',
      items: sale.items?.length ?? 0,
    }));
    exportToGoogleSheets(rows, `Hustle Report ${period.toUpperCase()}`);
    logEvent(activeTenantId, user?.uid, 'Exported Report', { format: 'sheets', period }).catch(() => {});
  }, [activeTenantId, period, sales, user]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-16">
      <header className="space-y-3 text-center">
        <h1 className="text-3xl font-bold text-[var(--theme-text)]">Business intelligence</h1>
        <p className="text-sm text-[color-mix(in_srgb,var(--theme-text)_60%,transparent)]">
          Consolidated sales, inventory and team activity exports. Use the selector to pivot by period.
        </p>
        <div className="flex justify-center gap-3">
          {periods.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPeriod(option.value)}
              className={`rounded-full px-4 py-1 text-xs font-semibold transition ${
                option.value === period
                  ? 'bg-indigo-500 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-left">
          <p className="text-xs uppercase tracking-wide text-white/60">Revenue</p>
          <p className="mt-2 text-2xl font-semibold text-white">R{summary.revenue.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-left">
          <p className="text-xs uppercase tracking-wide text-white/60">Transactions</p>
          <p className="mt-2 text-2xl font-semibold text-white">{summary.transactions}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-left">
          <p className="text-xs uppercase tracking-wide text-white/60">Average Sale</p>
          <p className="mt-2 text-2xl font-semibold text-white">R{summary.averageSale.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-left">
          <p className="text-xs uppercase tracking-wide text-white/60">Team Members</p>
          <p className="mt-2 text-2xl font-semibold text-white">{teamActivity.length}</p>
        </div>
      </section>

      <section className="rounded-3xl border border-white/5 bg-black/40 p-6 shadow-[0_25px_60px_rgba(0,0,0,0.35)] backdrop-blur">
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={reports}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="id" stroke="#aaa" />
            <YAxis stroke="#aaa" />
            <Tooltip contentStyle={{ backgroundColor: '#1f1f1f', border: 'none', color: '#fff' }} />
            <Line type="monotone" dataKey="total" stroke={theme.accent} strokeWidth={3} dot />
          </LineChart>
        </ResponsiveContainer>
      </section>

      <div className="mt-6 flex flex-wrap justify-center gap-4">
        <button type="button" onClick={exportCsv} className="btn-success">
          Export CSV
        </button>
        <button type="button" onClick={exportPdf} className="btn-primary">
          Export PDF
        </button>
        <button type="button" onClick={exportExcel} className="btn-success">
          Export Excel
        </button>
        <button type="button" onClick={exportSheets} className="btn-primary">
          Google Sheets
        </button>
      </div>

      {loading && (
        <p className="text-center text-xs text-white/60">Syncing live analytics…</p>
      )}
    </div>
  );
};

export default Reports;
