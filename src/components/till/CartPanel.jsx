import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';

const CartPanel = ({ cart, onUpdateQuantity, onRemove }) => {
  const items = cart ?? [];
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h3 className="text-lg font-semibold text-white">Cart</h3>
      <p className="text-xs text-white/50">Adjust quantities before closing the sale.</p>
      <div className="mt-4 space-y-3">
        <AnimatePresence>
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-center justify-between rounded-2xl bg-black/30 px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-white">{item.name}</p>
                <p className="text-xs text-white/50">R{item.price.toFixed(2)} each</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                  className="h-8 w-8 rounded-full bg-white/5 text-white hover:bg-white/10"
                  aria-label={`Decrease quantity of ${item.name}`}
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(event) => onUpdateQuantity(item.id, Number(event.target.value) || 1)}
                  className="w-16 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-center text-sm text-white focus:border-indigo-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  className="h-8 w-8 rounded-full bg-indigo-500 text-white hover:bg-indigo-600"
                  aria-label={`Increase quantity of ${item.name}`}
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/60 hover:bg-white/10"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {items.length === 0 && <p className="text-sm text-white/60">Start by adding items from inventory.</p>}
      </div>
    </div>
  );
};

CartPanel.propTypes = {
  cart: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      price: PropTypes.number.isRequired,
      quantity: PropTypes.number.isRequired,
    })
  ),
  onUpdateQuantity: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

CartPanel.defaultProps = {
  cart: [],
};

export default CartPanel;
