import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
// Use lightweight CSV export instead of ExcelJS to reduce bundle size
import { motion } from 'framer-motion';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext.jsx';
import { mockInventory } from '../mockData/inventory.js';

const Inventory = () => {
  const { reportOffline } = useAuth();
  const [items, setItems] = useState(mockInventory);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const inventoryQuery = query(collection(db, 'inventory'), orderBy('name'));
        const snapshot = await getDocs(inventoryQuery);
        const data = snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }));
        setItems(data.length ? data : mockInventory);
      } catch (error) {
        console.error('[Firestore] Unable to load inventory', error);
        reportOffline();
        setItems(mockInventory);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, [reportOffline]);

  const lowStockItems = useMemo(() => items.filter((item) => (item.quantity ?? 0) < 10), [items]);

  const exportToExcel = useCallback(async () => {
    try {
      const headers = ['Name', 'Category', 'Quantity', 'Price (ZAR)'];
      const rows = items.map((item) => [
        item.name ?? item.id,
        item.category ?? '',
        item.quantity ?? 0,
        (item.price ?? 0).toFixed(2),
      ]);
      const csvLines = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))];
      const csvContent = csvLines.join('\n');
      const { saveAs } = await import('file-saver');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, 'hustle-studio-inventory.csv');
    } catch (err) {
      console.error('[Export] Unable to create CSV', err);
    }

  }, [items]);

  useEffect(() => {
    const handleExport = () => {
      exportToExcel();
    };
    document.addEventListener('dashboard-export-reports', handleExport);
    return () => document.removeEventListener('dashboard-export-reports', handleExport);
  }, [exportToExcel]);


  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Inventory command</h1>
          <p className="text-white/60">Track the assets that keep Hustle Studio running — exports are offline friendly.</p>
        </div>
        <button
          type="button"
          onClick={exportToExcel}
          className="inline-flex items-center gap-2 rounded-full border border-brand-500/40 bg-brand-500/20 px-6 py-2 text-sm font-semibold text-brand-100 transition hover:bg-brand-500/40"
        >
          Export Excel
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/5 bg-black/40">
        <table className="min-w-full divide-y divide-white/5 text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-widest text-white/60">
            <tr>
              <th className="px-6 py-3 text-left">Item</th>
              <th className="px-6 py-3 text-left">Category</th>
              <th className="px-6 py-3 text-right">Quantity</th>
              <th className="px-6 py-3 text-right">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-white/80">
            {loading && (
              <tr>
                <td colSpan="4" className="px-6 py-6 text-center text-white/60">
                  Loading inventory...
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan="4" className="px-6 py-6 text-center text-white/60">
                  No inventory found. Run <code>npm run seed</code> to generate sample data.
                </td>
              </tr>
            )}
            {items.map((item) => (
              <motion.tr
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="hover:bg-white/5"
              >
                <td className="px-6 py-4 font-semibold text-white">{item.name ?? item.id}</td>
                <td className="px-6 py-4">{item.category ?? '—'}</td>
                <td className="px-6 py-4 text-right font-medium text-white">
                  {item.quantity ?? 0}
                </td>
                <td className="px-6 py-4 text-right">R{(item.price ?? 0).toFixed(2)}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-3xl border border-white/5 bg-black/40 p-6">
        <h2 className="text-lg font-semibold text-white">Attention required</h2>
        <p className="text-sm text-white/60">Items that dropped below 10 units.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lowStockItems.length === 0 ? (
            <p className="text-white/50">No low stock items right now 🎉</p>
          ) : (
            lowStockItems.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-brand-500/30 bg-brand-500/10 px-4 py-3"
              >
                <p className="text-sm font-semibold text-white">{item.name ?? item.id}</p>
                <p className="text-xs uppercase tracking-widest text-white/40">
                  {item.category ?? 'General'}
                </p>
                <p className="mt-2 text-sm text-brand-200">{item.quantity ?? 0} units remaining</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Inventory;
