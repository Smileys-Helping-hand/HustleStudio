import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, writeBatch, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import jsPDF from 'jspdf';
import { toast } from 'react-hot-toast';
import TillProductRow from '../components/till/TillProductRow.jsx';
import TillSummary from '../components/till/TillSummary.jsx';
import ReceiptPreview from '../components/till/ReceiptPreview.jsx';
import { db } from '../lib/firebase.js';
import { mockInventory } from '../mockData/inventory.js';

const VAT_RATE = 0.15;

const Till = () => {
  const [inventory, setInventory] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [paymentType, setPaymentType] = useState('Cash');
  const [customerCash, setCustomerCash] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadInventoryFallback = useCallback(() => {
    setInventory(
      mockInventory.map((item, index) => ({
        id: item.id ?? `mock-${index}`,
        name: item.name,
        price: Number(item.price ?? 0),
        stock: Number(item.quantity ?? item.stock ?? 0),
      }))
    );
    setLoading(false);
    toast((t) => (
      <span>
        Offline inventory loaded
        <button type="button" onClick={() => toast.dismiss(t.id)} className="ml-3 text-indigo-300">
          dismiss
        </button>
      </span>
    ));
  }, []);

  useEffect(() => {
    let unsubscribe;
    try {
      const inventoryRef = collection(db, 'inventory');
      unsubscribe = onSnapshot(
        inventoryRef,
        (snapshot) => {
          const items = snapshot.docs.map((docSnapshot) => ({
            id: docSnapshot.id,
            name: docSnapshot.data().name ?? docSnapshot.id,
            price: Number(docSnapshot.data().price ?? 0),
            stock: Number(docSnapshot.data().quantity ?? 0),
          }));
          if (items.length === 0) {
            loadInventoryFallback();
          } else {
            setInventory(items);
            setLoading(false);
          }
        },
        async (error) => {
          console.error('[Firestore] inventory snapshot error.', error);
          setLoading(false);
          loadInventoryFallback();
        }
      );
    } catch (error) {
      console.error('[Firestore] Unable to subscribe inventory.', error);
      loadInventoryFallback();
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [loadInventoryFallback]);

  const totals = useMemo(() => {
    const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const vat = subtotal * VAT_RATE;
    const total = Math.max(subtotal + vat - discount, 0);
    return { subtotal, vat, total };
  }, [orderItems, discount]);

  const changeDue = useMemo(() => {
    if (paymentType !== 'Cash') return 0;
    return customerCash - totals.total;
  }, [customerCash, paymentType, totals.total]);

  const addItem = useCallback(
    (product) => {
      setOrderItems((current) => {
        const existing = current.find((item) => item.id === product.id);
        if (existing) {
          if (existing.quantity >= (product.stock ?? Infinity)) {
            toast.error('Cannot add more — stock limit reached.');
            return current;
          }
          return current.map((item) =>
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          );
        }
        if (product.stock === 0) {
          toast.error('Item is out of stock.');
          return current;
        }
        return [
          ...current,
          { id: product.id, name: product.name, price: product.price, quantity: 1, stock: product.stock ?? 0 },
        ];
      });
    },
    []
  );

  const removeItem = useCallback((id) => {
    setOrderItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const resetSale = () => {
    setOrderItems([]);
    setDiscount(0);
    setCustomerCash(0);
    setPaymentType('Cash');
  };

  const generateReceiptPdf = useCallback(
    (saleId) => {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Hustle Studio • Receipt', 14, 20);
      doc.setFontSize(11);
      doc.text(`Sale ID: ${saleId}`, 14, 30);
      doc.text(`Date: ${new Date().toLocaleString()}`, 14, 36);
      doc.text(`Payment: ${paymentType}`, 14, 42);

      const startY = 52;
      let y = startY;
      doc.setFontSize(10);
      orderItems.forEach((item) => {
        doc.text(`${item.name} ×${item.quantity}`, 14, y);
        doc.text(`R${(item.price * item.quantity).toFixed(2)}`, 160, y, { align: 'right' });
        y += 6;
      });

      doc.text('------------------------------', 14, y);
      y += 6;
      doc.text(`Subtotal: R${totals.subtotal.toFixed(2)}`, 14, y);
      y += 6;
      doc.text(`VAT (15%): R${totals.vat.toFixed(2)}`, 14, y);
      y += 6;
      if (discount > 0) {
        doc.text(`Discount: -R${discount.toFixed(2)}`, 14, y);
        y += 6;
      }
      doc.text(`Total: R${totals.total.toFixed(2)}`, 14, y);
      y += 6;
      if (paymentType === 'Cash') {
        doc.text(`Cash Received: R${customerCash.toFixed(2)}`, 14, y);
        y += 6;
        doc.text(`Change: R${Math.max(changeDue, 0).toFixed(2)}`, 14, y);
      }

      doc.save(`HustleStudio-Receipt-${saleId}.pdf`);
    },
    [changeDue, customerCash, discount, orderItems, paymentType, totals]
  );

  const processSale = useCallback(async () => {
    if (orderItems.length === 0) {
      toast.error('Add items to process a sale.');
      return;
    }

    if (paymentType === 'Cash' && customerCash < totals.total) {
      toast.error('Cash received is less than total due.');
      return;
    }

    try {
      const salesRef = collection(db, 'sales');
      const saleDoc = await addDoc(salesRef, {
        items: orderItems,
        totals,
        discount,
        paymentType,
        changeDue,
        createdAt: serverTimestamp(),
      });

      const batch = writeBatch(db);
      orderItems.forEach((item) => {
        if (!item.id) return;
        const inventoryDoc = doc(db, 'inventory', item.id);
        batch.update(inventoryDoc, {
          quantity: Math.max((item.stock ?? 0) - item.quantity, 0),
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();

      toast.success('Sale completed and inventory updated.');
      generateReceiptPdf(saleDoc.id);
      resetSale();
    } catch (error) {
      console.error('[Firestore] Failed to process sale.', error);
      toast.error('Unable to record sale — check connection.');
    }
  }, [changeDue, customerCash, discount, generateReceiptPdf, orderItems, paymentType, totals]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Till / Point-of-Sale</h1>
        <p className="text-sm text-white/60">
          Build a basket from inventory, capture payment details, and export branded receipts in seconds.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="space-y-4 rounded-3xl border border-white/10 bg-black/40 p-6 backdrop-blur">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Inventory</h2>
            <span className="text-xs text-white/50">{loading ? 'Syncing…' : `${inventory.length} items`}</span>
          </div>
          <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-2">
            {inventory.map((product) => (
              <TillProductRow key={product.id} product={product} onAdd={addItem} />
            ))}
            {!inventory.length && !loading && (
              <p className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">
                Inventory empty. Seed data to get started.
              </p>
            )}
          </div>
        </section>

        <div className="space-y-4">
          <TillSummary
            items={orderItems}
            totals={totals}
            paymentType={paymentType}
            discount={discount}
            changeDue={changeDue}
            customerCash={customerCash}
            onDiscountChange={setDiscount}
            onPaymentTypeChange={setPaymentType}
            onCashChange={setCustomerCash}
            onProcessSale={processSale}
            disabled={orderItems.length === 0}
          />
          <ReceiptPreview
            items={orderItems}
            totals={totals}
            discount={discount}
            paymentType={paymentType}
            onRemove={removeItem}
          />
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/60">
            Tip: use the inventory tools to adjust stock levels live while the till is open.
          </div>
        </div>
      </div>

      <section className="rounded-3xl border border-white/5 bg-white/5 p-6 text-xs text-white/60">
        <h3 className="text-sm font-semibold text-white">Shortcuts</h3>
        <ul className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <li className="rounded-lg bg-black/40 px-4 py-3">Ctrl + E → Export reports</li>
          <li className="rounded-lg bg-black/40 px-4 py-3">Ctrl + R → Refresh inventory</li>
          <li className="rounded-lg bg-black/40 px-4 py-3">Ctrl + N → New sale</li>
          <li className="rounded-lg bg-black/40 px-4 py-3">Ctrl + P → Print receipt</li>
        </ul>
      </section>
    </div>
  );
};

export default Till;
