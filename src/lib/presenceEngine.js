import { collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase.js';

const HEARTBEAT_INTERVAL = 25000;

export const startPresence = (tenantId, user) => {
  if (!tenantId || !user) return () => {};
  const presenceRef = doc(db, 'tenants', tenantId, 'presence', user.uid);

  const writePresence = async () => {
    try {
      await setDoc(
        presenceRef,
        {
          uid: user.uid,
          email: user.email ?? '',
          displayName: user.displayName ?? user.email ?? 'Anonymous',
          status: 'online',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.warn('[Presence] Failed to update presence heartbeat.', error);
    }
  };

  const cleanup = async () => {
    try {
      await setDoc(
        presenceRef,
        {
          status: 'offline',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.warn('[Presence] Unable to set offline status.', error);
    }
  };

  writePresence().catch(() => {});
  const interval = setInterval(() => {
    writePresence().catch(() => {});
  }, HEARTBEAT_INTERVAL);

  const unloadListener = () => {
    cleanup().catch(() => {});
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', unloadListener);
  }

  return () => {
    clearInterval(interval);
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', unloadListener);
    }
    cleanup().catch(() => {});
  };
};

export const subscribePresence = (tenantId, callback) => {
  if (!tenantId) return () => {};
  const presenceCollection = collection(db, 'tenants', tenantId, 'presence');
  return onSnapshot(presenceCollection, (snapshot) => {
    const entries = snapshot.docs
      .map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }))
      .sort((a, b) => (b.updatedAt?.seconds ?? 0) - (a.updatedAt?.seconds ?? 0));
    callback(entries);
  });
};
