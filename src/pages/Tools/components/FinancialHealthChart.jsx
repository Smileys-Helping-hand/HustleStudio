import React, { useMemo } from 'react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

const FinancialHealthChart = ({ data }) => {
  const chartData = useMemo(() => data ?? [], [data]);

  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-6">
      <header>
        <h3 className="text-lg font-semibold text-white">Financial Health</h3>
        <p className="text-xs text-white/60">Rolling 6-month trend of revenue vs. expenses.</p>
      </header>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f87171" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="month" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            />
            <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#revenueGradient)" strokeWidth={2} />
            <Area type="monotone" dataKey="expenses" stroke="#f87171" fill="url(#expenseGradient)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};

FinancialHealthChart.defaultProps = {
  data: [
    { month: 'Apr', revenue: 42000, expenses: 28000 },
    { month: 'May', revenue: 46000, expenses: 30000 },
    { month: 'Jun', revenue: 48500, expenses: 31500 },
    { month: 'Jul', revenue: 52000, expenses: 33000 },
    { month: 'Aug', revenue: 54750, expenses: 34000 },
    { month: 'Sep', revenue: 56500, expenses: 35500 },
  ],
};

export default FinancialHealthChart;
