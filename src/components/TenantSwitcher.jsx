import React from 'react';
import { FiPlus } from 'react-icons/fi';
import { useTenant } from '../context/TenantContext.jsx';
import WorkspaceModal from './WorkspaceModal.jsx';

const TenantSwitcher = () => {
  const { tenants, activeTenantId, switchTenant } = useTenant();
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  if (!tenants || tenants.length === 0) {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.35em] text-white/60 transition hover:border-white/30"
        >
          <FiPlus /> Create Workspace
        </button>
        <WorkspaceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <select
          value={activeTenantId ?? ''}
          onChange={(event) => switchTenant(event.target.value)}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.35em] text-white/80 backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          {tenants.map((tenant) => (
            <option key={tenant.id} value={tenant.id} className="bg-[#141120]">
              {tenant.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.35em] text-white/60 transition hover:border-white/30 sm:flex"
        >
          <FiPlus /> New
        </button>
      </div>
      <WorkspaceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

export default TenantSwitcher;
