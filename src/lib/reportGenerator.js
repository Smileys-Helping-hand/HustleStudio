import { getDocs, limit, orderBy, query } from 'firebase/firestore';
import { tenantCollection } from './tenant.js';

export async function generateDailySummary(tenantId = null) {
  const salesCollection = tenantCollection(tenantId, 'sales');
  const inventoryCollection = tenantCollection(tenantId, 'inventory');

  const [salesSnapshot, inventorySnapshot] = await Promise.all([
    getDocs(query(salesCollection, orderBy('createdAt', 'desc'), limit(25))),
    getDocs(inventoryCollection),
  ]);

  const totalSales = salesSnapshot.docs.reduce((sum, docSnap) => sum + (docSnap.data().totals?.total ?? 0), 0);
  const recentSale = salesSnapshot.docs[0]?.data();
  const lowStock = inventorySnapshot.docs
    .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() ?? {}) }))
    .filter((item) => Number(item.quantity ?? 0) <= 5)
    .slice(0, 5);

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      revenue: totalSales,
      transactionCount: salesSnapshot.size,
      lowStockCount: lowStock.length,
    },
    highlights: {
      recentSale,
      lowStock,
    },
  };
}

export async function generateReportPDF({ tenantId, metrics = {}, forecast = {}, aiSummary = '' }) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${tenantId}-report-${stamp}.pdf`;

  if (typeof window === 'undefined') {
    const { promises: fs } = await import('node:fs');
    const pathModule = await import('node:path');
    const { resolve, join } = pathModule;
    const reportsDir = resolve(process.cwd(), 'reports');
    await fs.mkdir(reportsDir, { recursive: true });
    const filePath = join(reportsDir, fileName);
    const content = [
      'Hustle Studio Performance Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      'Metrics:',
      JSON.stringify(metrics, null, 2),
      '',
      'Forecast:',
      JSON.stringify(forecast, null, 2),
      '',
      'AI Summary:',
      aiSummary,
    ].join('\n');
    await fs.writeFile(filePath, content, 'utf8');
    return filePath;
  }

  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text('Hustle Studio Performance Report', 14, 20);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
  doc.text('Metrics', 14, 40);
  doc.text(JSON.stringify(metrics, null, 2), 14, 48, { maxWidth: 180 });
  doc.text('Forecast', 14, 88);
  doc.text(JSON.stringify(forecast, null, 2), 14, 96, { maxWidth: 180 });
  doc.text('AI Summary', 14, 136);
  doc.text(aiSummary ?? '', 14, 144, { maxWidth: 180 });
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  return url;
}

export default generateDailySummary;
