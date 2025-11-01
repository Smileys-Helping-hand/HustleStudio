import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext.jsx';
import MetricCard from '../components/MetricCard.jsx';

const Dashboard = () => {
  const { role } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const inventorySnapshot = await getDocs(collection(db, 'inventory'));
        const inventoryItems = inventorySnapshot.docs.map((docSnapshot) => ({
          id: docSnapshot.id,
          ...docSnapshot.data(),
        }));

        const reportQuery = query(collection(db, 'reports'), orderBy('total', 'desc'), limit(7));
        const reportSnapshot = await getDocs(reportQuery);
        const reportItems = reportSnapshot.docs.map((docSnapshot) => ({
          id: docSnapshot.id,
          ...docSnapshot.data(),
        }));

        setInventory(inventoryItems);
        setReports(reportItems);
      } catch (error) {
        console.error('Unable to load dashboard data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const chartData = useMemo(() => {
    if (reports.length === 0) {
      return [
        { day: 'Mon', revenue: 800 },
        { day: 'Tue', revenue: 950 },
        { day: 'Wed', revenue: 720 },
        { day: 'Thu', revenue: 1180 },
        { day: 'Fri', revenue: 1380 },
        { day: 'Sat', revenue: 1620 },
        { day: 'Sun', revenue: 910 },
      ];
    }

    return reports.map((item) => ({ day: item.id, revenue: item.total ?? 0 })).reverse();
  }, [reports]);

  const totalInventory = inventory.reduce((acc, item) => acc + (item.quantity ?? 0), 0);
  const totalValue = inventory.reduce(
    (acc, item) => acc + (item.quantity ?? 0) * (item.price ?? 0),
    0
  );

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold text-white">
          Welcome back, {role === 'admin' ? 'Captain' : 'Teammate'} 👋
        </h1>
        <p className="text-white/60">
          Monitor revenue trends, inventory health, and performance insights for your Side Hustle
          Studio.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Inventory Items" value={totalInventory} trend="Stable" />
        <MetricCard title="Inventory Value" value={`$${totalValue.toFixed(2)}`} trend="+12%" />
        <MetricCard title="Weekly Revenue" value="$8,420" trend="+5%" />
        <MetricCard title="Active Staff" value="12" trend="On schedule" />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-3 rounded-3xl border border-white/5 bg-black/40 p-6 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Revenue overview</h2>
              <p className="text-sm text-white/50">Last {chartData.length} days</p>
            </div>
          </div>
          <div className="mt-8 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <defs>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fb923c" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#fb923c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#888" />
                <YAxis stroke="#888" tickFormatter={(value) => `$${value}`} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(17, 17, 24, 0.9)',
                    borderRadius: '1rem',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white',
                  }}
                  formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#fb923c"
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 space-y-4 rounded-3xl border border-white/5 bg-black/40 p-6 shadow-lg"
        >
          <div>
            <h2 className="text-lg font-semibold text-white">Low stock alerts</h2>
            <p className="text-sm text-white/50">
              Automatically generated from your Firestore inventory
            </p>
          </div>
          <div className="space-y-3">
            {loading && <p className="text-white/50">Scanning inventory...</p>}
            {!loading && inventory.length === 0 && (
              <p className="text-white/50">
                No inventory data yet. Run the seeder to generate sample records.
              </p>
            )}
            {inventory
              .filter((item) => (item.quantity ?? 0) < 15)
              .map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-white">{item.name ?? item.id}</p>
                    <p className="text-xs uppercase tracking-widest text-white/40">
                      {item.category ?? 'General'}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-brand-500">
                    {item.quantity ?? 0} units
                  </span>
                </div>
              ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
