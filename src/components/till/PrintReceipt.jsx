import { forwardRef, useImperativeHandle } from 'react';
import PropTypes from 'prop-types';
import jsPDF from 'jspdf';

const PrintReceipt = forwardRef(({ cart, totals, meta }, ref) => {
  useImperativeHandle(ref, () => ({
    download: () => {
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text('Hustle Studio Receipt', 14, 18);
      doc.setFontSize(10);
      doc.text(`Tenant: ${meta?.tenantName ?? 'Workspace'}`, 14, 26);
      doc.text(`Processed by: ${meta?.user ?? 'Team member'}`, 14, 32);
      doc.text(`Payment method: ${meta?.paymentMethod ?? 'Unknown'}`, 14, 38);

      doc.setFontSize(11);
      let cursor = 50;
      doc.text('Items', 14, cursor);
      cursor += 6;
      cart.forEach((item) => {
        doc.text(`${item.name} x${item.quantity}`, 14, cursor);
        doc.text(`R${(item.price * item.quantity).toFixed(2)}`, 150, cursor, { align: 'right' });
        cursor += 6;
      });

      cursor += 4;
      doc.text(`Subtotal: R${totals.subtotal.toFixed(2)}`, 14, cursor);
      cursor += 6;
      doc.text(`VAT (15%): R${totals.vat.toFixed(2)}`, 14, cursor);
      cursor += 6;
      doc.text(`Discounts: R${totals.discounts.toFixed(2)}`, 14, cursor);
      cursor += 6;
      doc.setFontSize(12);
      doc.text(`Total: R${totals.total.toFixed(2)}`, 14, cursor);
      cursor += 6;
      doc.setFontSize(10);
      doc.text(`Tendered: R${totals.tendered.toFixed(2)}`, 14, cursor);
      cursor += 6;
      doc.text(`Change: R${totals.change.toFixed(2)}`, 14, cursor);

      doc.save(`hustle-studio-receipt-${Date.now()}.pdf`);
    },
  }));

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/80">
      <h3 className="text-lg font-semibold text-white">Receipt preview</h3>
      <p className="text-xs text-white/50">A PDF download will be generated at checkout.</p>
      <div className="mt-3 space-y-2">
        {cart.map((item) => (
          <div key={item.id} className="flex justify-between text-xs text-white/70">
            <span>
              {item.name} ×{item.quantity}
            </span>
            <span>R{(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-1 text-xs text-white/60">
        <p>Subtotal: R{totals.subtotal.toFixed(2)}</p>
        <p>VAT: R{totals.vat.toFixed(2)}</p>
        <p>Discounts: R{totals.discounts.toFixed(2)}</p>
        <p className="text-sm font-semibold text-white">Total: R{totals.total.toFixed(2)}</p>
      </div>
    </div>
  );
});

PrintReceipt.displayName = 'PrintReceipt';

PrintReceipt.propTypes = {
  cart: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      price: PropTypes.number.isRequired,
      quantity: PropTypes.number.isRequired,
    })
  ).isRequired,
  totals: PropTypes.shape({
    subtotal: PropTypes.number,
    vat: PropTypes.number,
    discounts: PropTypes.number,
    total: PropTypes.number,
    tendered: PropTypes.number,
    change: PropTypes.number,
  }).isRequired,
  meta: PropTypes.shape({
    tenantName: PropTypes.string,
    user: PropTypes.string,
    paymentMethod: PropTypes.string,
  }),
};

PrintReceipt.defaultProps = {
  meta: {},
};

export default PrintReceipt;
