import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import CartPanel from '../components/till/CartPanel.jsx';
import QuickSellPanel from '../components/till/QuickSellPanel.jsx';
import PrintReceipt from '../components/till/PrintReceipt.jsx';
import { useTenant } from '../context/TenantContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { tenantCollection } from '../lib/tenant.js';
import { watchInventory, updateItem, getPopularItems } from '../lib/inventoryManager.js';
import { generateSalesInsight } from '../lib/insightBot.js';

const VAT_RATE = 0.15;

const paymentMethods = [
  { id: 'cash', label: 'Cash' },
  { id: 'card', label: 'Card' },
  { id: 'account', label: 'Account' },
];

const Till = () => {
  const { activeTenantId, activeTenant } = useTenant();
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [tendered, setTendered] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [search, setSearch] = useState('');
  const [popularItems, setPopularItems] = useState([]);
  const [insight, setInsight] = useState('');
  const receiptRef = useRef(null);
  const insightAbort = useRef(null);

  useEffect(() => {
    if (!activeTenantId) {
      setInventory([]);
      return () => {};
    }
    const unsubscribe = watchInventory(activeTenantId, (records) => {
      setInventory(records);
    });
    return () => unsubscribe?.();
  }, [activeTenantId]);

  useEffect(() => {
    if (!activeTenantId) {
      setPopularItems([]);
      return;
    }
    getPopularItems(activeTenantId, 6)
      .then(setPopularItems)
      .catch(() => setPopularItems([]));
  }, [activeTenantId, cart.length]);

  const filteredInventory = useMemo(() => {
    const term = search.trim().toLowerCase();
    return inventory.filter((item) => {
      if (item.archived) return false;
      if (!term) return true;
      return `${item.name} ${item.sku}`.toLowerCase().includes(term);
    });
  }, [inventory, search]);

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const vat = subtotal * VAT_RATE;
    const discounts = Number(discount) || 0;
    const total = Math.max(subtotal + vat - discounts, 0);
    const tender = Number(tendered) || 0;
    const change = paymentMethod === 'cash' ? Math.max(tender - total, 0) : 0;
    return { subtotal, vat, discounts, total, tendered: tender, change };
  }, [cart, discount, tendered, paymentMethod]);

  const addToCart = useCallback((item) => {
    setCart((prev) => {
      const existing = prev.find((entry) => entry.id === item.id);
      const available = Number(item.quantity ?? 0);
      if (available <= 0) {
        toast.error(`${item.name} is out of stock.`);
        return prev;
      }
      if (existing) {
        if (existing.quantity >= available) {
          toast.error('No additional stock available.');
          return prev;
        }
        return prev.map((entry) => (entry.id === item.id ? { ...entry, quantity: existing.quantity + 1 } : entry));
      }
      return [...prev, { id: item.id, name: item.name, price: item.price ?? 0, quantity: 1 }];
    });
  }, []);

  const updateQuantity = useCallback(
    (id, quantity) => {
      setCart((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          const stock = inventory.find((record) => record.id === id)?.quantity ?? quantity;
          const clamped = Math.min(Math.max(quantity, 1), stock || quantity);
          return { ...item, quantity: clamped };
        })
      );
    },
    [inventory]
  );

  const removeFromCart = useCallback((id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleGenerateInsight = useCallback(async () => {
    if (!cart.length) {
      toast.error('Add items to the cart before requesting insight.');
      return;
    }
    if (insightAbort.current) insightAbort.current.abort();
    const controller = new AbortController();
    insightAbort.current = controller;
    try {
      setInsight('Analysing…');
      const salesInsight = await generateSalesInsight(cart, {
        signal: controller.signal,
        metadata: {
          tenantId: activeTenantId ?? 'system',
          userId: user?.uid ?? 'unknown',
          assistant: 'till-insight',
        },
      });
      setInsight(salesInsight);
    } catch (error) {
      console.error('[Till] Insight generation failed', error);
      toast.error('Unable to request insight right now.');
      setInsight('');
    }
  }, [cart, activeTenantId, user?.uid]);

  useEffect(
    () => () => {
      insightAbort.current?.abort();
    },
    []
  );

  const completeSale = useCallback(async () => {
    if (!activeTenantId) {
      toast.error('Select a workspace before processing sales.');
      return;
    }
    if (!cart.length) {
      toast.error('Add at least one item to the cart.');
      return;
    }
    try {
      const payload = {
        items: cart,
        paymentMethod,
        totals,
        tenantId: activeTenantId,
        processedBy: user?.uid ?? null,
        createdAt: serverTimestamp(),
      };
      await addDoc(tenantCollection(activeTenantId, 'sales'), payload);
      await Promise.all(
        cart.map((item) => {
          const currentStock = inventory.find((record) => record.id === item.id)?.quantity ?? 0;
          const nextStock = Math.max(currentStock - item.quantity, 0);
          return updateItem(activeTenantId, item.id, { quantity: nextStock });
        })
      );
      receiptRef.current?.download?.();
      toast.success('Sale captured. Receipt ready.');
      setCart([]);
      setTendered(0);
      setDiscount(0);
      setInsight('');
    } catch (error) {
      console.error('[Till] Failed to complete sale', error);
      toast.error('Unable to record sale. Try again.');
    }
  }, [activeTenantId, cart, inventory, paymentMethod, totals, user?.uid]);

  return (
    <main className="space-y-8 bg-gradient-to-br from-[#0d0d17] via-[#15162a] to-[#1f1b32] px-4 pb-16 pt-6 text-white sm:px-10">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="text-3xl font-bold">Till & Point-of-Sale</h1>
          <p className="text-sm text-white/60">
            Process transactions with live inventory sync, instant receipts, and AI insight for every shift.
          </p>
        </motion.div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleGenerateInsight}
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
          >
            AI insight
          </button>
          <button
            type="button"
            onClick={() => {
              setCart([]);
              setDiscount(0);
              setTendered(0);
            }}
            className="rounded-full border border-white/15 bg-red-500/20 px-4 py-2 text-sm text-red-100 transition hover:bg-red-500/30"
          >
            Clear cart
          </button>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search inventory"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-indigo-400 focus:outline-none"
              />
              <div className="text-xs text-white/60">
                Workspace: <span className="font-semibold text-white">{activeTenant?.name ?? 'Sandbox'}</span>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredInventory.slice(0, 9).map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className={`rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/20 to-purple-500/10 px-4 py-3 text-left text-sm transition hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(99,102,241,0.3)] ${
                    (item.quantity ?? 0) <= 3 ? 'ring-2 ring-red-400/60' : ''
                  }`}
                >
                  <p className="font-semibold text-white">{item.name}</p>
                  <p className="text-xs text-white/60">R{(item.price ?? 0).toFixed(2)} • Stock {item.quantity ?? 0}</p>
                </button>
              ))}
              {filteredInventory.length === 0 && (
                <p className="text-sm text-white/60">No items match your search.</p>
              )}
            </div>
          </div>

          <QuickSellPanel items={popularItems} onSelect={addToCart} />
          <CartPanel cart={cart} onUpdateQuantity={updateQuantity} onRemove={removeFromCart} />
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-semibold text-white">Payment summary</h3>
            <div className="mt-4 space-y-3 text-sm text-white/70">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span>R{totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>VAT (15%)</span>
                <span>R{totals.vat.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Discounts</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(event) => setDiscount(Number(event.target.value) || 0)}
                  className="w-24 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-right text-sm text-white focus:border-indigo-400 focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-between text-lg font-semibold text-white">
                <span>Total</span>
                <span>R{totals.total.toFixed(2)}</span>
              </div>
            </div>
            <div className="mt-6 space-y-3 text-sm text-white/70">
              <p className="text-xs uppercase tracking-[0.35em] text-white/50">Payment method</p>
              <div className="flex flex-wrap gap-2">
                {paymentMethods.map((method) => (
                  <button
                    type="button"
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.3em] transition ${
                      paymentMethod === method.id
                        ? 'bg-indigo-500 text-white shadow-[0_0_25px_rgba(99,102,241,0.4)]'
                        : 'border border-white/15 bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {method.label}
                  </button>
                ))}
              </div>
              {paymentMethod === 'cash' && (
                <label className="block text-xs text-white/60">
                  Cash received
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={tendered}
                    onChange={(event) => setTendered(Number(event.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
                  />
                  <span className="mt-1 block text-xs text-white/40">Change: R{totals.change.toFixed(2)}</span>
                </label>
              )}
            </div>
            <button
              type="button"
              onClick={completeSale}
              className="mt-6 w-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_25px_rgba(16,185,129,0.35)] transition hover:scale-[1.02]"
            >
              Complete sale
            </button>
            <p className="mt-4 text-xs text-white/50">Receipt downloads automatically when the sale is captured.</p>
          </div>

          <PrintReceipt cart={cart} totals={totals} meta={{ tenantName: activeTenant?.name, user: user?.email, paymentMethod }} ref={receiptRef} />

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-xs text-white/60">
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">Insight</p>
            <p className="mt-2 text-sm text-white/80">{insight || 'AI summaries appear here after each request.'}</p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Till;
