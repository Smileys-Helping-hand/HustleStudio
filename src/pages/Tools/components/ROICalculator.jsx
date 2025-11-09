import React, { useMemo, useState } from 'react';

const ROICalculator = () => {
  const [investment, setInvestment] = useState(5000);
  const [returnValue, setReturnValue] = useState(6500);

  const roi = useMemo(() => {
    if (!investment) return 0;
    return ((returnValue - investment) / investment) * 100;
  }, [investment, returnValue]);

  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-6">
      <header>
        <h3 className="text-lg font-semibold text-white">ROI Calculator</h3>
        <p className="text-xs text-white/60">Track the percentage return of current campaigns.</p>
      </header>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs uppercase tracking-wide text-white/60">
          Investment (R)
          <input
            type="number"
            min="0"
            value={investment}
            onChange={(event) => setInvestment(Number(event.target.value))}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/70 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
          />
        </label>
        <label className="text-xs uppercase tracking-wide text-white/60">
          Return (R)
          <input
            type="number"
            min="0"
            value={returnValue}
            onChange={(event) => setReturnValue(Number(event.target.value))}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/70 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
          />
        </label>
      </div>
      <p className="text-sm text-white">
        ROI: <span className="font-semibold text-emerald-400">{roi.toFixed(1)}%</span>
      </p>
    </section>
  );
};

export default ROICalculator;
