import React, { useEffect, useState } from 'react';
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

export default function Reports() {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const loadReports = async () => {
      const snapshot = await getDocs(collection(db, 'reports'));
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => new Date(a.id) - new Date(b.id));
      setReports(data);
    };
    loadReports();
  }, []);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text('Daily Earnings Report', 14, 15);
    doc.autoTable({
      head: [['Date', 'Total']],
      body: reports.map((r) => [r.id, `R${r.total.toFixed(2)}`]),
    });
    doc.save('DailyReports.pdf');
  };

  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Reports');
    sheet.columns = [
      { header: 'Date', key: 'id', width: 15 },
      { header: 'Total', key: 'total', width: 15 },
    ];
    sheet.addRows(reports);
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), 'DailyReports.xlsx');
  };

  return (
    <div className="max-w-5xl mx-auto py-16 px-6 animate-fadeIn">
      <h1 className="text-3xl font-bold mb-6 text-center">📈 Daily Earnings</h1>
      {reports.length === 0 ? (
        <p className="text-gray-400 text-center">No reports yet</p>
      ) : (
        <>
          <div className="bg-gray-900 rounded-2xl p-6 shadow-xl">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={reports}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="id" stroke="#aaa" />
                <YAxis stroke="#aaa" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f1f1f', border: 'none', color: '#fff' }}
                />
                <Line type="monotone" dataKey="total" stroke="#a855f7" strokeWidth={3} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 flex justify-center gap-4">
            <button onClick={exportPDF} className="btn-primary">
              📄 PDF
            </button>
            <button onClick={exportExcel} className="btn-success">
              📊 Excel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
