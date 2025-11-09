import React, { useMemo, useState } from 'react';

const MarginCalculator = () => {
  const [cost, setCost] = useState(120);
  const [price, setPrice] = useState(180);

  const margin = useMemo(() => {
    if (!price) return 0;
    return ((price - cost) / price) * 100;
  }, [cost, price]);

  const markup = useMemo(() => {
    if (!cost) return 0;
    return ((price - cost) / cost) * 100;
  }, [cost, price]);

  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-6">
      <header>
        <h3 className="text-lg font-semibold text-white">Margin & Markup</h3>
        <p className="text-xs text-white/60">Quickly verify pricing strategies against cost.</p>
      </header>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs uppercase tracking-wide text-white/60">
          Cost price (R)
          <input
            type="number"
            min="0"
            value={cost}
            onChange={(event) => setCost(Number(event.target.value))}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/70 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
          />
        </label>
        <label className="text-xs uppercase tracking-wide text-white/60">
          Selling price (R)
          <input
            type="number"
            min="0"
            value={price}
            onChange={(event) => setPrice(Number(event.target.value))}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/70 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
          />
        </label>
      </div>
      <dl className="space-y-1 text-sm text-white">
        <div className="flex justify-between">
          <dt>Gross Margin</dt>
          <dd className="font-semibold text-emerald-400">{margin.toFixed(1)}%</dd>
        </div>
        <div className="flex justify-between">
          <dt>Markup</dt>
          <dd className="font-semibold text-indigo-300">{markup.toFixed(1)}%</dd>
        </div>
      </dl>
    </section>
  );
};

export default MarginCalculator;
