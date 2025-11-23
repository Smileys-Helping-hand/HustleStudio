import React from 'react';
import { useTenant } from '../context/TenantContext.jsx';

const LivePresenceBar = () => {
  const { presence } = useTenant();

  if (!presence || presence.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-white/70">
      {presence.map((entry) => {
        const name = entry.displayName || entry.email || entry.uid || 'User';
        const statusClass = entry.status === 'online' ? 'bg-emerald-500' : 'bg-zinc-500';
        return (
          <span
            key={entry.id}
            className="relative flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 shadow-[0_0_15px_rgba(99,102,241,0.25)]"
          >
            <span className={`h-2 w-2 rounded-full ${statusClass}`} />
            <span>{name}</span>
          </span>
        );
      })}
    </div>
  );
};

export default LivePresenceBar;
