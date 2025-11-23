import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';

const ReceiptPreview = ({ items, totals, discount, paymentType, onRemove }) => {
  return (
    <motion.section
      layout
      className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-6 text-sm text-white/80 backdrop-blur"
    >
      <header>
        <h2 className="text-lg font-semibold text-white">Receipt Preview</h2>
        <p className="text-xs text-white/50">Print-ready summary before confirming the sale.</p>
      </header>

      <ul className="space-y-2 divide-y divide-white/5 rounded-lg border border-white/5 bg-black/30">
        {items.length === 0 && (
          <li className="px-4 py-3 text-center text-xs text-white/50">Add items to build a receipt.</li>
        )}
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <p>{item.name}</p>
              <p className="text-xs text-white/40">×{item.quantity}</p>
            </div>
            <div className="flex items-center gap-3">
              <span>R{(item.price * item.quantity).toFixed(2)}</span>
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  className="rounded-md bg-white/10 px-2 py-1 text-[10px] uppercase tracking-wide text-white/60 transition hover:bg-red-500/30 hover:text-red-200"
                >
                  Remove
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <dl className="space-y-1 text-xs text-white/60">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd>R{totals.subtotal.toFixed(2)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>VAT</dt>
          <dd>R{totals.vat.toFixed(2)}</dd>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-emerald-400">
            <dt>Discount</dt>
            <dd>-R{discount.toFixed(2)}</dd>
          </div>
        )}
        <div className="flex justify-between text-white">
          <dt>Total due</dt>
          <dd>R{totals.total.toFixed(2)}</dd>
        </div>
      </dl>

      <footer className="text-xs text-white/50">
        Payment via <span className="uppercase tracking-wide text-white/70">{paymentType}</span>
      </footer>
    </motion.section>
  );
};

ReceiptPreview.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
      price: PropTypes.number,
      quantity: PropTypes.number,
    })
  ).isRequired,
  totals: PropTypes.shape({
    subtotal: PropTypes.number,
    vat: PropTypes.number,
    total: PropTypes.number,
  }).isRequired,
  discount: PropTypes.number.isRequired,
  paymentType: PropTypes.string.isRequired,
  onRemove: PropTypes.func,
};

ReceiptPreview.defaultProps = {
  onRemove: undefined,
};

export default ReceiptPreview;
