import { useState } from 'react';
import PropTypes from 'prop-types';

const initialState = {
  name: '',
  category: 'General',
  price: 0,
  quantity: 0,
  sku: '',
  barcode: '',
};

const categories = ['General', 'Consumables', 'Equipment', 'Merchandise', 'Services'];

const AddItemModal = ({ open, onClose, onCreate }) => {
  const [form, setForm] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: name === 'price' || name === 'quantity' ? Number(value) : value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onCreate({ ...form, price: Number(form.price), quantity: Number(form.quantity) });
      setForm(initialState);
      onClose();
    } catch (error) {
      console.error('[Inventory] Failed to create item', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-10">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg space-y-4 rounded-3xl border border-white/10 bg-[#13131f] p-8 text-white shadow-2xl"
      >
        <header className="space-y-1">
          <h2 className="text-2xl font-semibold">Add inventory item</h2>
          <p className="text-sm text-white/60">Provide baseline details. You can adjust quantities inline later.</p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-white/70">Item name</span>
            <input
              required
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-white/70">Category</span>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
            >
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-white/70">Quantity</span>
            <input
              name="quantity"
              type="number"
              min="0"
              value={form.quantity}
              onChange={handleChange}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-white/70">Unit price (ZAR)</span>
            <input
              name="price"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={handleChange}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-white/70">SKU</span>
            <input
              name="sku"
              value={form.sku}
              onChange={handleChange}
              placeholder="HS-001"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-white/70">Barcode</span>
            <input
              name="barcode"
              value={form.barcode}
              onChange={handleChange}
              placeholder="Scan or paste barcode"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
            />
          </label>
        </div>
        <footer className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_0_25px_rgba(147,51,234,0.35)] transition hover:scale-[1.01] disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Add item'}
          </button>
        </footer>
      </form>
    </div>
  );
};

AddItemModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onCreate: PropTypes.func.isRequired,
};

export default AddItemModal;
