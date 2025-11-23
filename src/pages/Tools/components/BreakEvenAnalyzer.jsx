import React, { useMemo, useState } from 'react';

const BreakEvenAnalyzer = () => {
  const [fixedCosts, setFixedCosts] = useState(12000);
  const [unitPrice, setUnitPrice] = useState(180);
  const [unitCost, setUnitCost] = useState(90);

  const breakEvenUnits = useMemo(() => {
    const contribution = unitPrice - unitCost;
    if (contribution <= 0) return 0;
    return Math.ceil(fixedCosts / contribution);
  }, [fixedCosts, unitCost, unitPrice]);

  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-6">
      <header>
        <h3 className="text-lg font-semibold text-white">Break-even Analyzer</h3>
        <p className="text-xs text-white/60">Estimate how many units you need to sell to cover costs.</p>
      </header>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-xs uppercase tracking-wide text-white/60">
          Fixed costs (R)
          <input
            type="number"
            min="0"
            value={fixedCosts}
            onChange={(event) => setFixedCosts(Number(event.target.value))}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/70 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
          />
        </label>
        <label className="text-xs uppercase tracking-wide text-white/60">
          Unit price (R)
          <input
            type="number"
            min="0"
            value={unitPrice}
            onChange={(event) => setUnitPrice(Number(event.target.value))}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/70 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
          />
        </label>
        <label className="text-xs uppercase tracking-wide text-white/60">
          Unit cost (R)
          <input
            type="number"
            min="0"
            value={unitCost}
            onChange={(event) => setUnitCost(Number(event.target.value))}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/70 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
          />
        </label>
      </div>
      <p className="text-sm text-white">
        Break-even volume:
        <span className="ml-2 inline-flex items-center rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-semibold text-emerald-300">
          {breakEvenUnits} units
        </span>
      </p>
    </section>
  );
};

export default BreakEvenAnalyzer;
