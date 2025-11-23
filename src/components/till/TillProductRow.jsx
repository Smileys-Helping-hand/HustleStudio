import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';

const TillProductRow = ({ product, onAdd }) => {
  const { name, price, stock = 0 } = product;
  const soldOut = stock <= 0;

  return (
    <motion.div
      layout
      className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3 shadow-sm backdrop-blur"
    >
      <div>
        <p className="text-sm font-semibold text-white">{name}</p>
        <p className="text-xs text-white/60">
          {soldOut ? 'Out of stock' : `${stock} in stock`} • R{price.toFixed(2)}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onAdd(product)}
        disabled={soldOut}
        className={`rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-black ${
          soldOut
            ? 'cursor-not-allowed bg-white/10 text-white/40'
            : 'bg-indigo-500 text-white hover:bg-indigo-600'
        }`}
      >
        Add
      </button>
    </motion.div>
  );
};

TillProductRow.propTypes = {
  product: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string.isRequired,
    price: PropTypes.number.isRequired,
    stock: PropTypes.number,
  }).isRequired,
  onAdd: PropTypes.func.isRequired,
};

export default TillProductRow;
