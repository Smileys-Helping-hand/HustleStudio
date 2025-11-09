import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import PropTypes from 'prop-types';
import { useFirebase } from '../../providers/FirebaseProvider.jsx';

const STATUS_COPY = {
  ok: { label: 'Operational', tone: 'text-green-400' },
  degraded: { label: 'Degraded', tone: 'text-yellow-300' },
  error: { label: 'Offline', tone: 'text-red-400' },
};

const resolveStatusStyles = (status) => {
  const key = status?.toLowerCase();
  return STATUS_COPY[key] ?? { label: status ?? 'Unknown', tone: 'text-gray-300' };
};

const formatTimestamp = (lastPing) => {
  if (!lastPing) return '—';
  if (typeof lastPing?.toDate === 'function') {
    return lastPing.toDate().toLocaleString();
  }
  if (lastPing?.seconds) {
    return new Date(lastPing.seconds * 1000).toLocaleString();
  }
  if (typeof lastPing === 'number') {
    return new Date(lastPing).toLocaleString();
  }
  return '—';
};

const Metric = ({ label, value }) => (
  <div className="flex flex-col">
    <span className="text-xs uppercase tracking-widest text-white/40">{label}</span>
    <span className="text-sm font-medium text-white">{value ?? '—'}</span>
  </div>
);

Metric.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

const HeartbeatWidget = () => {
  const { db } = useFirebase();
  const [heartbeat, setHeartbeat] = useState(null);

  useEffect(() => {
    if (!db) return undefined;

    const unsub = onSnapshot(doc(db, 'system', 'heartbeat'), (snapshot) => {
      if (!snapshot.exists()) {
        setHeartbeat(null);
        return;
      }
      setHeartbeat(snapshot.data());
    });

    return () => unsub();
  }, [db]);

  const statusMeta = useMemo(() => resolveStatusStyles(heartbeat?.status), [heartbeat?.status]);

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/80 shadow-lg backdrop-blur">
      <div className="flex items-center justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-white/50">Heartbeat</p>
          <p className={`text-lg font-semibold ${statusMeta.tone}`}>{statusMeta.label}</p>
        </div>
        <div className="text-right text-xs text-white/60">
          <p>Last ping</p>
          <p className="text-white/80">{formatTimestamp(heartbeat?.lastPing)}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <Metric label="Target" value={heartbeat?.target ?? heartbeat?.siteTarget ?? '—'} />
        <Metric label="Response" value={heartbeat?.siteResponse ?? '—'} />
        <Metric label="Latency" value={heartbeat?.responseTimeMs ? `${heartbeat.responseTimeMs} ms` : '—'} />
        <Metric label="Updated" value={formatTimestamp(heartbeat?.updatedAt ?? heartbeat?.lastPing)} />
      </div>
    </div>
  );
};

export default HeartbeatWidget;
