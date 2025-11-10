import PropTypes from 'prop-types';

const QuickSellPanel = ({ items, onSelect }) => (
  <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
    <h3 className="text-lg font-semibold text-white">Quick sell</h3>
    <p className="text-xs text-white/50">One-tap popular items for busy shifts.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <button
          type="button"
          key={item.id}
          onClick={() => onSelect(item)}
          className="rounded-2xl bg-gradient-to-br from-purple-600/30 to-indigo-500/30 px-4 py-3 text-left text-sm text-white shadow-[0_0_25px_rgba(99,102,241,0.2)] transition hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(99,102,241,0.35)]"
        >
          <p className="font-semibold">{item.name}</p>
          <p className="text-xs text-white/60">R{(item.price ?? 0).toFixed(2)}</p>
        </button>
      ))}
      {items.length === 0 && <p className="text-sm text-white/60">Popular items will appear here after a few sales.</p>}
    </div>
  </div>
);

QuickSellPanel.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      price: PropTypes.number,
    })
  ),
  onSelect: PropTypes.func.isRequired,
};

QuickSellPanel.defaultProps = {
  items: [],
};

export default QuickSellPanel;
