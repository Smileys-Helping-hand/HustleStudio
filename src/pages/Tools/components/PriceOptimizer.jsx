import React, { useMemo, useState } from 'react';

const PriceOptimizer = () => {
  const [cost, setCost] = useState(120);
  const [desiredMargin, setDesiredMargin] = useState(35);
  const [competitorPrice, setCompetitorPrice] = useState(180);
  const [demandIndex, setDemandIndex] = useState(70);

  const { recommendedPrice, marginAchieved, notes } = useMemo(() => {
    const safeCost = Number(cost) || 0;
    const marginTarget = Number(desiredMargin) / 100;
    const competitor = Number(competitorPrice) || 0;
    const demand = Math.min(Math.max(Number(demandIndex) || 0, 0), 100);

    let price = safeCost / (1 - marginTarget || 1);

    if (competitor) {
      price = (price + competitor) / 2;
    }

    const demandAdjustment = demand > 80 ? 1.1 : demand < 40 ? 0.93 : 1;
    price *= demandAdjustment;

    const achievedMargin = ((price - safeCost) / price) * 100;
    const advisory = [];

    if (price < safeCost) {
      advisory.push('Raise selling price — currently below cost.');
    }
    if (competitor && price > competitor * 1.2) {
      advisory.push('Your price is significantly higher than competitor. Consider bundling value.');
    }
    if (demand > 85) {
      advisory.push('Demand surging — explore limited-time premium pricing.');
    }
    if (demand < 30) {
      advisory.push('Demand low — bundle or discount to stimulate interest.');
    }

    return {
      recommendedPrice: price,
      marginAchieved: achievedMargin,
      notes: advisory,
    };
  }, [cost, desiredMargin, competitorPrice, demandIndex]);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-white">Product price optimizer</h2>
        <p className="text-sm text-white/60">
          Balance margin goals with market demand to land on a competitive price point.
        </p>
      </header>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-white/70">
          Cost per unit (R)
          <input
            type="number"
            value={cost}
            onChange={(event) => setCost(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
          />
        </label>
        <label className="text-sm text-white/70">
          Desired margin %
          <input
            type="number"
            value={desiredMargin}
            onChange={(event) => setDesiredMargin(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
          />
        </label>
        <label className="text-sm text-white/70">
          Competitor price (R)
          <input
            type="number"
            value={competitorPrice}
            onChange={(event) => setCompetitorPrice(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
          />
        </label>
        <label className="text-sm text-white/70">
          Demand index (0-100)
          <input
            type="number"
            value={demandIndex}
            onChange={(event) => setDemandIndex(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
          />
        </label>
      </div>

      <div className="mt-6 rounded-2xl border border-indigo-400/40 bg-indigo-500/10 p-4 text-sm text-white/80">
        <p>
          Recommended selling price:{' '}
          <span className="text-xl font-semibold text-white">R{recommendedPrice.toFixed(2)}</span>
        </p>
        <p className="mt-2">
          Margin achieved:{' '}
          <span className="font-semibold text-indigo-100">{marginAchieved.toFixed(1)}%</span>
        </p>
        {notes.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs text-indigo-100">
            {notes.map((item, index) => (
              <li key={item + index}>• {item}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default PriceOptimizer;
