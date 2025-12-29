import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import AddItemModal from '../components/inventory/AddItemModal.jsx';
import InventoryTable from '../components/inventory/InventoryTable.jsx';
import StockCard from '../components/inventory/StockCard.jsx';
import { useTenant } from '../context/TenantContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  addItem,
  updateItem,
  deleteItem,
  watchInventory,
  reorderItems,
} from '../lib/inventoryManager.js';
import { generateInventoryInsight } from '../lib/insightBot.js';

const LOW_STOCK_THRESHOLD = 10;

const Inventory = () => {
  const { activeTenantId, activeTenant } = useTenant();
  const { reportOffline } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [insight, setInsight] = useState('');
  const insightAbort = useRef(null);

  useEffect(() => {
    let unsubscribe;
    setLoading(true);
    if (!activeTenantId) {
      setItems([]);
      setLoading(false);
      return () => {};
    }
    unsubscribe = watchInventory(
      activeTenantId,
      (records) => {
        setItems(records);
        setLoading(false);
      },
      { includeArchived: false }
    );
    return () => {
      unsubscribe?.();
    };
  }, [activeTenantId]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      if (item.archived) return false;
      const matchesSearch = !term || `${item.name} ${item.sku}`.toLowerCase().includes(term);
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [items, search, categoryFilter]);

  const lowStockItems = useMemo(
    () => filteredItems.filter((item) => (item.quantity ?? 0) <= LOW_STOCK_THRESHOLD),
    [filteredItems]
  );

  const categories = useMemo(() => {
    const unique = new Set(['all']);
    items.forEach((item) => {
      if (item.category) unique.add(item.category);
    });
    return Array.from(unique);
  }, [items]);

  const handleCreate = useCallback(
    async (payload) => {
      if (!activeTenantId) {
        toast.error('Select a workspace before adding inventory.');
        return;
      }
      await addItem(activeTenantId, payload);
      toast.success('Inventory item saved.');
    },
    [activeTenantId]
  );

  const handleInlineEdit = useCallback(
    async (id, changes) => {
      if (!activeTenantId) return;
      try {
        await updateItem(activeTenantId, id, changes);
      } catch (error) {
        console.error('[Inventory] Failed to update item', error);
        reportOffline();
      }
    },
    [activeTenantId, reportOffline]
  );

  const handleRestock = useCallback(
    async (item) => {
      if (!activeTenantId) return;
      await updateItem(activeTenantId, item.id, {
        quantity: Number(item.quantity ?? 0) + 10,
      });
      toast.success(`${item.name} restocked.`);
    },
    [activeTenantId]
  );

  const handleAdjust = useCallback(
    async (record) => {
      if (!activeTenantId) return;
      const nextQuantity = window.prompt('Adjust quantity', record.quantity ?? 0);
      const nextPrice = window.prompt('Adjust price', record.price ?? 0);
      const updates = {};
      if (nextQuantity !== null && nextQuantity !== '') {
        updates.quantity = Number(nextQuantity);
      }
      if (nextPrice !== null && nextPrice !== '') {
        updates.price = Number(nextPrice);
      }
      if (Object.keys(updates).length === 0) return;
      await updateItem(activeTenantId, record.id, updates);
      toast.success('Item updated.');
    },
    [activeTenantId]
  );

  const handleDelete = useCallback(
    async (item) => {
      if (!activeTenantId) return;
      await deleteItem(activeTenantId, item.id);
      toast.success(`${item.name} archived.`);
    },
    [activeTenantId]
  );

  const handleReorder = useCallback(
    async (orderedIds) => {
      if (!activeTenantId) return;
      await reorderItems(activeTenantId, orderedIds);
    },
    [activeTenantId]
  );

  const handleGenerateInsight = useCallback(async () => {
    if (insightAbort.current) {
      insightAbort.current.abort();
    }
    const controller = new AbortController();
    insightAbort.current = controller;
    try {
      setInsight('Generating insight…');
      const response = await generateInventoryInsight(filteredItems, { signal: controller.signal });
      setInsight(response);
    } catch (error) {
      console.error('[Inventory] Insight generation failed', error);
      toast.error('Unable to generate insight right now.');
      setInsight('');
    }
  }, [filteredItems]);

  useEffect(
    () => () => {
      insightAbort.current?.abort();
    },
    []
  );

  return (
    <main className="space-y-8 bg-gradient-to-br from-[#0e0e18] via-[#141226] to-[#1b1a2f] px-4 pb-16 pt-6 text-white sm:px-10">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-bold">Inventory & Stockroom</h1>
          <p className="text-sm text-white/60">
            Keep shelves aligned with demand. Drag to prioritise, update inline, and watch low-stock alerts pulse.
          </p>
        </motion.div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-xs text-white/70">
            <span className="hidden sm:block">Workspace</span>
            <span className="font-semibold text-white">{activeTenant?.name ?? 'Sandbox'}</span>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-5 py-2 text-sm font-semibold shadow-[0_0_30px_rgba(147,51,234,0.35)] transition hover:scale-[1.02]"
          >
            Add item
          </button>
          <button
            type="button"
            onClick={handleGenerateInsight}
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
          >
            AI insight
          </button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 flex flex-col gap-3 md:flex-row">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search SKU or name"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-indigo-400 focus:outline-none"
          />
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-indigo-400 focus:outline-none"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === 'all' ? 'All categories' : category}
              </option>
            ))}
          </select>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-3xl border border-white/10 bg-gradient-to-br from-teal-500/20 to-cyan-500/10 p-4 text-sm text-white/70"
        >
          <p className="text-xs uppercase tracking-[0.35em] text-white/60">Insight</p>
          <p className="mt-2 text-sm text-white/80">
            {insight || 'Use the AI insight button to receive replenishment guidance.'}
          </p>
        </motion.div>
      </section>

      <InventoryTable
        items={filteredItems}
        onReorder={handleReorder}
        onInlineEdit={handleInlineEdit}
        lowStockThreshold={LOW_STOCK_THRESHOLD}
      />

      <section className="grid gap-4 md:grid-cols-3">
        {loading ? (
          <p className="col-span-3 text-center text-sm text-white/60">Loading inventory…</p>
        ) : (
          lowStockItems.map((item) => (
            <StockCard
              key={item.id}
              item={item}
              onEdit={handleAdjust}
              onRestock={handleRestock}
            />
          ))
        )}
        {!loading && lowStockItems.length === 0 && (
          <p className="col-span-3 text-center text-sm text-white/60">All items are comfortably stocked. 🎉</p>
        )}
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-xs text-white/60">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-white/70">
          <span>
            Need to archive an item?
            <button
              type="button"
              onClick={() => {
                const target = filteredItems[0];
                if (target) {
                  handleDelete(target);
                }
              }}
              className="ml-2 rounded-full border border-white/15 px-3 py-1 text-xs text-white/70 hover:bg-white/10"
            >
              Archive first item
            </button>
          </span>
          <span>Low stock threshold: {LOW_STOCK_THRESHOLD} units</span>
        </div>
      </section>

      <AddItemModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={handleCreate} />
    </main>
  );
};

export default Inventory;
