import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiCheck, FiExternalLink } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

/**
 * Deep Link: Invoice Builder
 * 
 * Pre-fills the invoice form with query parameters
 * Example: /link/invoice-builder?project=Unity&hours=20&rate=50&client=Northstar
 * 
 * Supported parameters:
 * - project: Project name/reference
 * - client: Client name
 * - clientEmail: Client email
 * - hours: Number of hours (creates a line item)
 * - rate: Hourly rate
 * - amount: Fixed amount (alternative to hours*rate)
 * - description: Service description
 * - dueDate: Due date (ISO format)
 * - notes: Additional notes
 */
export default function InvoiceBuilderLink() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = React.useState(3);

  useEffect(() => {
    // Extract parameters
    const project = searchParams.get('project');
    const client = searchParams.get('client');
    const clientEmail = searchParams.get('clientEmail');
    const hours = searchParams.get('hours');
    const rate = searchParams.get('rate');
    const amount = searchParams.get('amount');
    const description = searchParams.get('description');
    const dueDate = searchParams.get('dueDate');
    const notes = searchParams.get('notes');

    // Build the pre-fill data object
    const preFillData = {
      project,
      client,
      clientEmail,
      hours: hours ? parseFloat(hours) : null,
      rate: rate ? parseFloat(rate) : null,
      amount: amount ? parseFloat(amount) : null,
      description,
      dueDate,
      notes,
    };

    // Store in sessionStorage for the invoice page to pick up
    sessionStorage.setItem('invoicePreFill', JSON.stringify(preFillData));

    // Show success toast
    const summary = [];
    if (client) summary.push(`Client: ${client}`);
    if (project) summary.push(`Project: ${project}`);
    if (hours && rate) summary.push(`${hours}h @ ${rate}/hr`);
    
    if (summary.length > 0) {
      toast.success(`Pre-filling invoice: ${summary.join(' • ')}`);
    }

    // Countdown redirect
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/crm/invoices', { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [searchParams, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0e0e18] to-[#1b1830] px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20"
        >
          <FiCheck className="text-4xl text-green-400" />
        </motion.div>

        <h1 className="text-2xl font-bold text-white">Invoice Data Received</h1>
        <p className="mt-3 text-white/70">
          Redirecting you to the invoice builder with pre-filled data...
        </p>

        <div className="mt-6 space-y-2 text-left text-sm">
          {searchParams.get('project') && (
            <div className="flex items-center gap-2 text-white/60">
              <FiExternalLink className="text-purple-400" />
              <span>Project: <strong className="text-white">{searchParams.get('project')}</strong></span>
            </div>
          )}
          {searchParams.get('client') && (
            <div className="flex items-center gap-2 text-white/60">
              <FiExternalLink className="text-purple-400" />
              <span>Client: <strong className="text-white">{searchParams.get('client')}</strong></span>
            </div>
          )}
          {searchParams.get('hours') && searchParams.get('rate') && (
            <div className="flex items-center gap-2 text-white/60">
              <FiExternalLink className="text-purple-400" />
              <span>
                Service: <strong className="text-white">
                  {searchParams.get('hours')}h @ {searchParams.get('rate')}/hr
                </strong>
              </span>
            </div>
          )}
        </div>

        <motion.div
          className="mt-8 text-center"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full border-4 border-purple-500/30 bg-purple-500/10">
            <span className="text-2xl font-bold text-purple-400">{countdown}</span>
          </div>
        </motion.div>

        <button
          onClick={() => navigate('/crm/invoices', { replace: true })}
          className="mt-6 text-sm text-white/60 transition hover:text-white"
        >
          Continue immediately →
        </button>
      </motion.div>
    </div>
  );
}
