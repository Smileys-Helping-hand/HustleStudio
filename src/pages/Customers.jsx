import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiUsers, FiSearch, FiFilter, FiDownload, FiPlus, 
  FiMail, FiPhone, FiMapPin, FiBriefcase, FiDollarSign,
  FiFileText, FiTrendingUp, FiEdit, FiTrash2, FiTag
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import PageHeader from '../components/common/PageHeader.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  listCustomers, 
  calculateCustomerMetrics,
  updateCustomerStatus,
  addCustomerTags,
  exportCustomersCSV,
  CUSTOMER_STATUS 
} from '../lib/customerManager.js';

const StatusBadge = ({ status }) => {
  const colors = {
    active: 'bg-green-500/20 text-green-400 border-green-500/30',
    inactive: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    archived: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${colors[status] || colors.active}`}>
      {status}
    </span>
  );
};

const Customers = () => {
  const { user, tenantId } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('lastUpdated');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, [tenantId, sortBy, sortOrder]);

  useEffect(() => {
    filterAndSortCustomers();
  }, [customers, searchQuery, filterStatus]);

  const loadCustomers = async () => {
    if (!tenantId) return;

    setLoading(true);
    try {
      const data = await listCustomers({ 
        tenantId,
        sortBy,
        sortOrder,
        limit: 200
      });
      setCustomers(data);
    } catch (error) {
      console.error('[Customers] Failed to load:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortCustomers = () => {
    let filtered = [...customers];

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(c => c.status === filterStatus);
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.name?.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.company?.toLowerCase().includes(query) ||
        c.phone?.includes(query)
      );
    }

    setFilteredCustomers(filtered);
  };

  const handleViewDetails = async (customer) => {
    setSelectedCustomer(customer);
    setShowDetails(true);

    // Load metrics in background
    try {
      const metrics = await calculateCustomerMetrics(tenantId, customer.id);
      setSelectedCustomer(prev => ({ ...prev, metrics }));
    } catch (error) {
      console.error('[Customers] Failed to load metrics:', error);
    }
  };

  const handleStatusChange = async (customerId, newStatus) => {
    try {
      await updateCustomerStatus(tenantId, customerId, newStatus);
      toast.success('Customer status updated');
      loadCustomers();
    } catch (error) {
      console.error('[Customers] Status update failed:', error);
      toast.error('Failed to update status');
    }
  };

  const handleExport = () => {
    const csv = exportCustomersCSV(filteredCustomers);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredCustomers.length} customers`);
  };

  const stats = {
    total: customers.length,
    active: customers.filter(c => c.status === CUSTOMER_STATUS.ACTIVE).length,
    totalRevenue: customers.reduce((sum, c) => sum + (parseFloat(c.totalRevenue) || 0), 0),
    totalDocuments: customers.reduce((sum, c) => sum + (parseInt(c.documentCount) || 0), 0),
  };

  return (
    <div className="px-4 pb-16">
      <PageHeader
        title="Customers"
        subtitle="Auto-sorted from invoices, bank statements, and documents"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/10 to-blue-600/10 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60">Total Customers</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.total}</p>
            </div>
            <FiUsers className="text-4xl text-blue-400" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-white/10 bg-gradient-to-br from-green-500/10 to-green-600/10 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60">Active</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.active}</p>
            </div>
            <FiTrendingUp className="text-4xl text-green-400" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-purple-600/10 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60">Total Revenue</p>
              <p className="text-3xl font-bold text-white mt-1">
                ${stats.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <FiDollarSign className="text-4xl text-purple-400" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-white/10 bg-gradient-to-br from-orange-500/10 to-orange-600/10 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60">Documents</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.totalDocuments}</p>
            </div>
            <FiFileText className="text-4xl text-orange-400" />
          </div>
        </motion.div>
      </div>

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-6"
      >
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 w-full md:w-auto">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customers..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder-white/40 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-3 w-full md:w-auto">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
              <option value="archived">Archived</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
              }}
              className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
            >
              <option value="lastUpdated">Last Updated</option>
              <option value="createdAt">Created Date</option>
              <option value="totalRevenue">Revenue</option>
              <option value="documentCount">Documents</option>
              <option value="name">Name</option>
            </select>

            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition"
            >
              <FiDownload /> Export
            </button>
          </div>
        </div>
      </motion.div>

      {/* Customer List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden"
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FiUsers className="text-6xl text-white/20 mb-4" />
            <p className="text-white/60">No customers found</p>
            <p className="text-sm text-white/40 mt-2">
              Upload invoices or bank statements to auto-create customers
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-6 py-4 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Documents
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-white/70 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredCustomers.map((customer, index) => (
                  <motion.tr
                    key={customer.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-white/5 transition cursor-pointer"
                    onClick={() => handleViewDetails(customer)}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-white">{customer.name || 'N/A'}</p>
                        {customer.company && (
                          <p className="text-sm text-white/60">{customer.company}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm space-y-1">
                        {customer.email && (
                          <div className="flex items-center gap-2 text-white/70">
                            <FiMail className="text-xs" />
                            {customer.email}
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center gap-2 text-white/70">
                            <FiPhone className="text-xs" />
                            {customer.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={customer.status} />
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-white">
                        ${(parseFloat(customer.totalRevenue) || 0).toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-white">{customer.documentCount || 0}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-white/10 text-white/70">
                        {customer.source || 'manual'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(customer);
                          }}
                          className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition"
                        >
                          <FiEdit size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Customer Details Modal */}
      <AnimatePresence>
        {showDetails && selectedCustomer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
            onClick={() => setShowDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1a] rounded-2xl border border-white/10 p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedCustomer.name}</h2>
                  {selectedCustomer.company && (
                    <p className="text-white/60 mt-1">{selectedCustomer.company}</p>
                  )}
                </div>
                <StatusBadge status={selectedCustomer.status} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {selectedCustomer.email && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                    <FiMail className="text-xl text-white/60" />
                    <div>
                      <p className="text-xs text-white/50">Email</p>
                      <p className="text-white">{selectedCustomer.email}</p>
                    </div>
                  </div>
                )}

                {selectedCustomer.phone && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                    <FiPhone className="text-xl text-white/60" />
                    <div>
                      <p className="text-xs text-white/50">Phone</p>
                      <p className="text-white">{selectedCustomer.phone}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                  <FiDollarSign className="text-xl text-white/60" />
                  <div>
                    <p className="text-xs text-white/50">Total Revenue</p>
                    <p className="text-white font-bold">
                      ${(parseFloat(selectedCustomer.totalRevenue) || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                  <FiFileText className="text-xl text-white/60" />
                  <div>
                    <p className="text-xs text-white/50">Documents</p>
                    <p className="text-white font-bold">{selectedCustomer.documentCount || 0}</p>
                  </div>
                </div>
              </div>

              {selectedCustomer.address && (
                <div className="mb-6">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                    <FiMapPin className="text-xl text-white/60 mt-1" />
                    <div>
                      <p className="text-xs text-white/50">Address</p>
                      <p className="text-white">{selectedCustomer.address}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <select
                  value={selectedCustomer.status}
                  onChange={(e) => handleStatusChange(selectedCustomer.id, e.target.value)}
                  className="flex-1 px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white focus:border-indigo-400 focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                  <option value="archived">Archived</option>
                </select>

                <button
                  onClick={() => setShowDetails(false)}
                  className="px-6 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Customers;
