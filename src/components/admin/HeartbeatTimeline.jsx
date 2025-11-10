import { useEffect, useState } from 'react';
import { limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useFirebase } from '../../providers/FirebaseProvider.jsx';
import { useTenant } from '../../context/TenantContext.jsx';
import { tenantCollection } from '../../lib/tenant.js';

const formatTime = (lastPing) => {
  if (!lastPing) return '—';
  if (typeof lastPing?.toDate === 'function') {
    return lastPing.toDate().toLocaleTimeString();
  }
  if (lastPing?.seconds) {
    return new Date(lastPing.seconds * 1000).toLocaleTimeString();
  }
  if (typeof lastPing === 'number') {
    return new Date(lastPing).toLocaleTimeString();
  }
  return '—';
};

const HeartbeatTimeline = () => {
  const { db } = useFirebase();
  const { activeTenantId } = useTenant();
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    if (!db || !activeTenantId) {
      setEntries([]);
      return undefined;
    }
    const heartbeatQuery = query(
      tenantCollection(activeTenantId, 'system', 'heartbeats', 'log'),
      orderBy('lastPing', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(heartbeatQuery, (snapshot) => {
      const rows = snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }));
      setEntries(rows);
    });

    return () => unsubscribe();
  }, [activeTenantId, db]);

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-gray-300 shadow-lg backdrop-blur">
      <h4 className="mb-3 font-semibold text-white">Recent Heartbeats</h4>
      <ul className="space-y-2">
        {entries.map((entry) => {
          const tone =
            entry.status === 'ok'
              ? 'text-green-400'
              : entry.status === 'degraded'
              ? 'text-yellow-300'
              : 'text-red-400';
          return (
            <li key={entry.id} className="flex items-center justify-between rounded-md bg-black/20 px-3 py-2">
              <span>{formatTime(entry.lastPing)}</span>
              <span className={tone}>{entry.status ?? 'unknown'}</span>
            </li>
          );
        })}
        {entries.length === 0 && <li className="text-gray-500">No entries yet.</li>}
      </ul>
    </div>
  );
};

export default HeartbeatTimeline;
