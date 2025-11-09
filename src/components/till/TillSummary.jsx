import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';

const paymentTypes = ['Cash', 'Card', 'Account'];

const TillSummary = ({
  items,
  totals,
  paymentType,
  discount,
  changeDue,
  customerCash,
  onDiscountChange,
  onPaymentTypeChange,
  onCashChange,
  onProcessSale,
  disabled,
}) => {
  return (
    <motion.section
      layout
      className="space-y-4 rounded-2xl border border-white/10 bg-black/40 p-6 shadow-xl backdrop-blur"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Summary</h2>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
          {items.length} item{items.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="space-y-2 text-sm text-white/70">
        <p className="flex justify-between">
          <span>Subtotal</span>
          <span>R{totals.subtotal.toFixed(2)}</span>
        </p>
        <p className="flex justify-between">
          <span>VAT (15%)</span>
          <span>R{totals.vat.toFixed(2)}</span>
        </p>
        {discount > 0 && (
          <p className="flex justify-between text-emerald-400">
            <span>Discount</span>
            <span>-R{discount.toFixed(2)}</span>
          </p>
        )}
        <p className="flex justify-between text-white">
          <span>Total</span>
          <span>R{totals.total.toFixed(2)}</span>
        </p>
      </div>

      <label className="block text-sm text-white/70">
        Discount (R)
        <input
          type="number"
          min="0"
          value={discount}
          onChange={(event) => onDiscountChange(Number(event.target.value))}
          className="mt-1 w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
        />
      </label>

      <label className="block text-sm text-white/70">
        Payment method
        <select
          value={paymentType}
          onChange={(event) => onPaymentTypeChange(event.target.value)}
          className="mt-1 w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
        >
          {paymentTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      {paymentType === 'Cash' && (
        <label className="block text-sm text-white/70">
          Cash received (R)
          <input
            type="number"
            min="0"
            value={customerCash}
            onChange={(event) => onCashChange(Number(event.target.value))}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
          />
        </label>
      )}

      {paymentType === 'Cash' && (
        <p className="flex justify-between text-sm text-white/80">
          <span>Change</span>
          <span>R{Math.max(changeDue, 0).toFixed(2)}</span>
        </p>
      )}

      <button
        type="button"
        onClick={onProcessSale}
        disabled={disabled}
        className={`w-full rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-black ${
          disabled ? 'cursor-not-allowed bg-white/10 text-white/40' : 'bg-emerald-500 text-white hover:bg-emerald-600'
        }`}
      >
        Finalise Sale
      </button>
    </motion.section>
  );
};

TillSummary.propTypes = {
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
  paymentType: PropTypes.string.isRequired,
  discount: PropTypes.number.isRequired,
  changeDue: PropTypes.number.isRequired,
  customerCash: PropTypes.number.isRequired,
  onDiscountChange: PropTypes.func.isRequired,
  onPaymentTypeChange: PropTypes.func.isRequired,
  onCashChange: PropTypes.func.isRequired,
  onProcessSale: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};

export default TillSummary;
