import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader.jsx';
import { orchestrateTask } from '../../lib/orchestrator.js';
import { useTenant } from '../../context/TenantContext.jsx';
import { useAnalytics } from '../../hooks/useAnalytics.js';

const cardClass =
  'rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_35px_rgba(99,102,241,0.15)] backdrop-blur';

export default function Orchestrator() {
  const { activeTenantId } = useTenant();
  const { metrics } = useAnalytics();
  const [prompt, setPrompt] = useState('Generate a cross-channel campaign for my top-selling products.');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!activeTenantId) {
      toast.error('Select a workspace to orchestrate automations.');
      return;
    }
    if (!prompt.trim()) {
      toast.error('Enter an instruction first.');
      return;
    }
    setLoading(true);
    try {
      const summary = await orchestrateTask({
        prompt,
        tenantId: activeTenantId,
        context: { metrics },
      });
      setResponse(summary);
      toast.success('Automation plan generated.');
    } catch (error) {
      toast.error(error.message || 'Unable to run orchestration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 pb-20">
      <PageHeader
        title="AI Orchestrator"
        subtitle="Launch multi-module automations that bridge CRM, Finance, Marketing, and Inventory in one command."
      />
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-5">
        <motion.section layout className={`lg:col-span-3 ${cardClass}`}>
          <h2 className="text-xl font-semibold text-white">Compose Instruction</h2>
          <p className="mt-2 text-sm text-white/60">
            The orchestrator analyses your current analytics snapshot, then proposes the actions required across modules.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={6}
              className="w-full rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white shadow-inner outline-none transition focus:border-indigo-400"
              placeholder="Describe the automation you need"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(99,102,241,0.35)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Orchestrating…' : 'Run Orchestration'}
            </button>
          </form>
        </motion.section>
        <motion.section layout className={`lg:col-span-2 ${cardClass}`}>
          <h2 className="text-xl font-semibold text-white">Latest Output</h2>
          <p className="mt-2 text-sm text-white/60">
            Results are logged to telemetry so you can review what the orchestrator recommended for each run.
          </p>
          <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-4 text-sm text-white/80 shadow-inner">
            {response ? response.split('\n').map((line, index) => <p key={index} className="mb-2 last:mb-0">{line}</p>) : 'No orchestration run yet.'}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
