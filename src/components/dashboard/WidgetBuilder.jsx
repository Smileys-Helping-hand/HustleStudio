import { useState } from 'react';
import { motion, Reorder } from 'framer-motion';
import { FiPlus, FiTrash2 } from 'react-icons/fi';

const widgetTemplates = [
  { id: 'sales-kpi', label: 'Sales KPI', description: 'Display monthly sales with delta.', type: 'kpi' },
  { id: 'credit-usage', label: 'Credit Usage', description: 'Monitor AI credit consumption.', type: 'chart' },
  { id: 'insight-card', label: 'AI Insight', description: 'Show the latest AI recommendation.', type: 'insight' },
  { id: 'custom-chart', label: 'Custom Chart', description: 'Connect to analytics datasets.', type: 'chart' },
];

export default function WidgetBuilder({ value = [], onChange }) {
  const [widgets, setWidgets] = useState(value);

  const update = (next) => {
    setWidgets(next);
    onChange?.(next);
  };

  const addWidget = (template) => {
    const widget = {
      ...template,
      instanceId: `${template.id}-${Date.now()}`,
      title: template.label,
    };
    update([...widgets, widget]);
  };

  const removeWidget = (instanceId) => {
    update(widgets.filter((item) => item.instanceId !== instanceId));
  };

  return (
    <div className="grid gap-6">
      <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 text-white">
        <h3 className="text-base font-semibold">Add Widgets</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {widgetTemplates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => addWidget(template)}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-left text-sm transition hover:border-indigo-400"
            >
              <FiPlus className="mt-1 text-indigo-300" />
              <span>
                <span className="block text-sm font-semibold">{template.label}</span>
                <span className="text-xs text-white/60">{template.description}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white">
        <h3 className="text-base font-semibold">Layout</h3>
        {widgets.length === 0 ? (
          <p className="mt-3 text-sm text-white/60">Add widgets to build your custom dashboard.</p>
        ) : (
          <Reorder.Group axis="y" values={widgets} onReorder={update} className="mt-4 space-y-3">
            {widgets.map((widget) => (
              <Reorder.Item key={widget.instanceId} value={widget}>
                <motion.div
                  layout
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/10 p-4"
                >
                  <div>
                    <p className="text-sm font-semibold">{widget.title}</p>
                    <p className="text-xs text-white/60">{widget.type}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeWidget(widget.instanceId)}
                    className="rounded-full bg-white/10 p-2 text-white/70 transition hover:bg-rose-500/20 hover:text-white"
                    aria-label="Remove widget"
                  >
                    <FiTrash2 />
                  </button>
                </motion.div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}
      </div>
    </div>
  );
}
