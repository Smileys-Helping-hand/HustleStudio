import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiBarChart2, FiTrendingUp, FiDollarSign, FiUsers,
  FiDownload, FiRefreshCw, FiFileText, FiTarget
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTenant } from '../../context/TenantContext.jsx';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase.js';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';

const StatCard = ({ title, value, change, icon: Icon, trend }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6"
  >
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-sm text-white/60">{title}</p>
        <p className="text-3xl font-bold text-white mt-2">{value}</p>
        {change && (
          <div className={`flex items-center gap-1 mt-2 text-sm ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
            <FiTrendingUp className={trend === 'down' ? 'rotate-180' : ''} />
            <span>{change}</span>
          </div>
        )}
      </div>
      <div className="p-3 rounded-xl bg-indigo-500/20">
        <Icon className="text-2xl text-indigo-400" />
      </div>
    </div>
  </motion.div>
);

export default function BIReports() {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reportPeriod, setReportPeriod] = useState('monthly');
  
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalCustomers: 0,
    totalDocuments: 0,
    averageOrderValue: 0,
    revenueGrowth: 0,
    customerGrowth: 0,
  });

  const [revenueData, setRevenueData] = useState([]);
  const [customerData, setCustomerData] = useState([]);
  const [documentTypeData, setDocumentTypeData] = useState([]);

  useEffect(() => {
    loadBIData();
  }, [activeTenantId, reportPeriod]);

  const loadBIData = async () => {
    if (!activeTenantId) return;

    setLoading(true);
    try {
      const now = new Date();
      const periodDays = reportPeriod === 'weekly' ? 7 : reportPeriod === 'monthly' ? 30 : 365;
      const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
      const previousPeriodStart = new Date(startDate.getTime() - periodDays * 24 * 60 * 60 * 1000);

      const customersQuery = query(
        collection(db, 'tenants', activeTenantId, 'customers')
      );
      const customersSnapshot = await getDocs(customersQuery);
      const customers = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const extractionsQuery = query(
        collection(db, 'documentExtractions'),
        where('tenantId', '==', activeTenantId)
      );
      const extractionsSnapshot = await getDocs(extractionsQuery);
      const extractions = extractionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const periodExtractions = extractions.filter((extraction) => {
        const extractedAt = extraction.extractedAt?.toDate?.() || new Date(extraction.extractedAt);
        return extractedAt >= startDate;
      });

      const previousPeriodExtractions = extractions.filter((extraction) => {
        const extractedAt = extraction.extractedAt?.toDate?.() || new Date(extraction.extractedAt);
        return extractedAt >= previousPeriodStart && extractedAt < startDate;
      });

      const calculateRevenue = (items) =>
        items.reduce((sum, extraction) => {
          const type = extraction.documentType;
          if (type !== 'invoice' && type !== 'receipt') return sum;
          const total = parseFloat(extraction.extractedData?.total);
          return sum + (Number.isFinite(total) ? total : 0);
        }, 0);

      const periodRevenue = calculateRevenue(periodExtractions);
      const previousRevenue = calculateRevenue(previousPeriodExtractions);

      const periodInvoices = periodExtractions.filter((e) => e.documentType === 'invoice').length;
      const averageOrderValue = periodInvoices > 0 ? periodRevenue / periodInvoices : 0;

      const revenueGrowth = previousRevenue > 0
        ? ((periodRevenue - previousRevenue) / previousRevenue) * 100
        : periodRevenue > 0
          ? 100
          : 0;
      const recentCustomers = customers.filter(c => {
        const createdAt = c.createdAt?.toDate?.() || new Date(c.createdAt);
        return createdAt >= startDate;
      });
      const previousCustomers = customers.filter(c => {
        const createdAt = c.createdAt?.toDate?.() || new Date(c.createdAt);
        return createdAt >= previousPeriodStart && createdAt < startDate;
      });

      const customerGrowth = previousCustomers.length > 0
        ? ((recentCustomers.length - previousCustomers.length) / previousCustomers.length) * 100
        : recentCustomers.length > 0
          ? 100
          : 0;

      setMetrics({
        totalRevenue: periodRevenue,
        totalCustomers: customers.length,
        totalDocuments: periodExtractions.length,
        averageOrderValue,
        revenueGrowth: revenueGrowth.toFixed(1),
        customerGrowth: customerGrowth.toFixed(1),
      });

      generateChartData(periodExtractions, customers, startDate);
    } catch (error) {
      console.error('[BIReports] Failed to load data:', error);
      toast.error('Failed to load BI data');
    } finally {
      setLoading(false);
    }
  };

  const generateChartData = (extractions, customers, startDate) => {
    const toDayKey = (date) => {
      const d = new Date(date);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const formatShort = (dayKey) => {
      const [yyyy, mm, dd] = dayKey.split('-').map((part) => Number(part));
      const d = new Date(yyyy, mm - 1, dd);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const revenueByDay = {};
    extractions.forEach((extraction) => {
      if (extraction.documentType === 'invoice' || extraction.documentType === 'receipt') {
        const date = extraction.extractedAt?.toDate?.() || new Date(extraction.extractedAt);
        const dateKey = toDayKey(date);
        const amount = parseFloat(extraction.extractedData?.total);
        revenueByDay[dateKey] = (revenueByDay[dateKey] || 0) + (Number.isFinite(amount) ? amount : 0);
      }
    });

    const revenueTrend = Object.entries(revenueByDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dateKey, revenue]) => ({
        date: formatShort(dateKey),
        revenue: Math.round(revenue),
      }));

    setRevenueData(revenueTrend);

    const customersByDay = {};
    customers.forEach((customer) => {
      const createdAt = customer.createdAt?.toDate?.() || new Date(customer.createdAt);
      if (createdAt < startDate) return;
      const dateKey = toDayKey(createdAt);
      customersByDay[dateKey] = (customersByDay[dateKey] || 0) + 1;
    });

    let cumulativeCustomers = 0;
    const customerTrend = Object.entries(customersByDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dateKey, count]) => {
        cumulativeCustomers += count;
        return {
          date: formatShort(dateKey),
          customers: cumulativeCustomers,
        };
      });

    setCustomerData(customerTrend);

    const docTypeCounts = {};
    extractions.forEach(extraction => {
      const type = extraction.documentType || 'other';
      docTypeCounts[type] = (docTypeCounts[type] || 0) + 1;
    });

    const docTypeData = Object.entries(docTypeCounts).map(([type, count]) => ({
      type: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      count,
    }));

    setDocumentTypeData(docTypeData);
  };

  const generateReport = async () => {
    setGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast.success('BI Report generated successfully!', { duration: 4000 });
      
      const reportData = {
        generated: new Date().toISOString(),
        period: reportPeriod,
        metrics,
        summary: `Business Intelligence Report for ${reportPeriod} period`,
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bi-report-${reportPeriod}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[BIReports] Generation failed:', error);
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="px-4 pb-16">
      <PageHeader
        title="Business Intelligence Reports"
        subtitle="Comprehensive analytics and insights from your business data"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <select
            value={reportPeriod}
            onChange={(e) => setReportPeriod(e.target.value)}
            className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white focus:border-indigo-400 focus:outline-none"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>

          <button
            onClick={loadBIData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10 transition"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <button
          onClick={generateReport}
          disabled={generating}
          className="flex items-center gap-2 px-6 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold hover:from-indigo-600 hover:to-purple-600 transition"
        >
          {generating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Generating...
            </>
          ) : (
            <>
              <FiDownload />
              Generate Report
            </>
          )}
        </button>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Revenue"
          value={`$${metrics.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          change={`+${metrics.revenueGrowth}%`}
          trend="up"
          icon={FiDollarSign}
        />
        <StatCard
          title="Total Customers"
          value={metrics.totalCustomers}
          change={`+${metrics.customerGrowth}%`}
          trend="up"
          icon={FiUsers}
        />
        <StatCard
          title="Documents Processed"
          value={metrics.totalDocuments}
          icon={FiFileText}
        />
        <StatCard
          title="Avg Order Value"
          value={`$${metrics.averageOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          icon={FiTarget}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <FiTrendingUp className="text-2xl text-green-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">Revenue Trend</h3>
              <p className="text-sm text-white/60">Last 30 days</p>
            </div>
          </div>
          
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.5)' }} />
                <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.5)' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-white/40">
              No revenue data available
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <FiUsers className="text-2xl text-blue-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">Customer Growth</h3>
              <p className="text-sm text-white/60">Cumulative total</p>
            </div>
          </div>
          
          {customerData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={customerData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.5)' }} />
                <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.5)' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="customers" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-white/40">
              No customer data available
            </div>
          )}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <FiBarChart2 className="text-2xl text-purple-400" />
          <div>
            <h3 className="text-lg font-semibold text-white">Document Distribution</h3>
            <p className="text-sm text-white/60">By document type</p>
          </div>
        </div>
        
        {documentTypeData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={documentTypeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="type" stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.5)' }} />
              <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.5)' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar dataKey="count" fill="#a855f7" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-white/40">
            No document data available
          </div>
        )}
      </motion.div>
    </div>
  );
}
