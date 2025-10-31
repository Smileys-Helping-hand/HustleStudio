import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { motion } from "framer-motion";
import { db } from "../lib/firebase";

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const reportQuery = query(collection(db, "reports"), orderBy("total", "desc"));
        const snapshot = await getDocs(reportQuery);
        setReports(snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() })));
      } catch (error) {
        console.error("Failed to fetch reports", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Side Hustle Studio — Revenue Reports", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text("Generated automatically from your Firestore data", 14, 30);

    autoTable(doc, {
      startY: 36,
      head: [["Date", "Total", "Notes"]],
      body: reports.map((report) => [
        report.id,
        `$${Number(report.total ?? 0).toFixed(2)}`,
        report.notes ?? "",
      ]),
      headStyles: { fillColor: [247, 92, 52] },
      styles: { fontSize: 11 },
    });

    doc.save("sidehustlestudio-reports.pdf");
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Reports</h1>
          <p className="text-white/60">Generate PDF reports of your studio performance.</p>
        </div>
        <button
          type="button"
          onClick={exportPDF}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Export PDF
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/5 bg-black/40">
        <table className="min-w-full divide-y divide-white/5 text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-widest text-white/60">
            <tr>
              <th className="px-6 py-3 text-left">Date</th>
              <th className="px-6 py-3 text-right">Total</th>
              <th className="px-6 py-3 text-left">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-white/80">
            {loading && (
              <tr>
                <td colSpan="3" className="px-6 py-6 text-center text-white/60">
                  Loading reports...
                </td>
              </tr>
            )}
            {!loading && reports.length === 0 && (
              <tr>
                <td colSpan="3" className="px-6 py-6 text-center text-white/60">
                  No reports found. Run <code>npm run seed</code> to generate sample data.
                </td>
              </tr>
            )}
            {reports.map((report) => (
              <motion.tr
                key={report.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="hover:bg-white/5"
              >
                <td className="px-6 py-4 font-semibold text-white">{report.id}</td>
                <td className="px-6 py-4 text-right font-medium text-white">
                  ${Number(report.total ?? 0).toFixed(2)}
                </td>
                <td className="px-6 py-4">{report.notes ?? ""}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Reports;
