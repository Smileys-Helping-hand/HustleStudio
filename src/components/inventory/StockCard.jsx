import PropTypes from 'prop-types';

const StockCard = ({ item, onEdit, onRestock }) => {
  const quantity = item.quantity ?? 0;
  const price = item.price ?? 0;
  const lowStock = quantity <= (item.restockThreshold ?? 10);

  return (
    <div
      className={`flex flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-br from-purple-600/20 to-indigo-600/10 p-4 shadow-[0_0_25px_rgba(147,51,234,0.15)] transition hover:shadow-[0_0_30px_rgba(147,51,234,0.25)] ${
        lowStock ? 'ring-2 ring-red-400/60' : ''
      }`}
    >
      <div>
        <p className="text-sm font-semibold text-white">{item.name}</p>
        <p className="text-xs uppercase tracking-widest text-white/50">{item.category ?? 'General'}</p>
      </div>
      <div className="mt-4 flex items-end justify-between text-white">
        <div>
          <p className="text-2xl font-semibold">{quantity}</p>
          <p className="text-xs text-white/60">units available</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">R{price.toFixed(2)}</p>
          <p className="text-xs text-white/60">Unit price</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-white/80 transition hover:bg-white/10"
        >
          Adjust
        </button>
        <button
          type="button"
          onClick={() => onRestock(item)}
          className="rounded-full bg-green-500/20 px-3 py-1 text-green-200 transition hover:bg-green-500/30"
        >
          Restock +10
        </button>
      </div>
    </div>
  );
};

StockCard.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    category: PropTypes.string,
    quantity: PropTypes.number,
    price: PropTypes.number,
    restockThreshold: PropTypes.number,
  }).isRequired,
  onEdit: PropTypes.func.isRequired,
  onRestock: PropTypes.func.isRequired,
};

export default StockCard;
