import {
  addDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { tenantCollection, tenantDoc } from './tenant.js';

const updateQueues = new Map();

const scheduleUpdate = (key, callback) => {
  if (updateQueues.has(key)) {
    clearTimeout(updateQueues.get(key));
  }
  const timeout = setTimeout(async () => {
    updateQueues.delete(key);
    await callback();
  }, 350);
  updateQueues.set(key, timeout);
};

export const addItem = async (tenantId, data) => {
  const payload = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    tenantId,
    order: Date.now(),
    archived: false,
  };
  return addDoc(tenantCollection(tenantId, 'inventory'), payload);
};

export const updateItem = async (tenantId, id, changes) => {
  const key = `${tenantId || 'global'}:${id}`;
  scheduleUpdate(key, async () => {
    await updateDoc(tenantDoc(tenantId, 'inventory', id), {
      ...changes,
      updatedAt: serverTimestamp(),
    });
  });
};

export const deleteItem = async (tenantId, id) =>
  updateDoc(tenantDoc(tenantId, 'inventory', id), {
    archived: true,
    archivedAt: serverTimestamp(),
  });

export const restoreItem = async (tenantId, id) =>
  updateDoc(tenantDoc(tenantId, 'inventory', id), {
    archived: false,
    archivedAt: null,
    updatedAt: serverTimestamp(),
  });

export const watchInventory = (tenantId, callback, { includeArchived = false } = {}) => {
  const inventoryQuery = query(
    tenantCollection(tenantId, 'inventory'),
    orderBy('archived'),
    orderBy('order', 'desc')
  );
  const unsubscribe = onSnapshot(
    inventoryQuery,
    (snapshot) => {
      const records = snapshot.docs
        .map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }))
        .filter((item) => includeArchived || !item.archived);
      callback(records);
    },
    (error) => {
      console.error('[InventoryManager] watchInventory error', error);
      callback([]);
    }
  );
  return unsubscribe;
};

export const getPopularItems = async (tenantId, limit = 6) => {
  const snapshot = await getDocs(query(tenantCollection(tenantId, 'sales')));
  const aggregate = new Map();
  snapshot.forEach((docSnapshot) => {
    const sale = docSnapshot.data();
    (sale.items ?? []).forEach((item) => {
      const current = aggregate.get(item.id) || { ...item, quantity: 0 };
      current.quantity += item.quantity ?? 0;
      aggregate.set(item.id, current);
    });
  });
  return Array.from(aggregate.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
};

export const reorderItems = async (tenantId, orderedIds) => {
  await Promise.all(
    orderedIds.map((id, index) =>
      updateDoc(tenantDoc(tenantId, 'inventory', id), {
        order: Date.now() + (orderedIds.length - index),
        updatedAt: serverTimestamp(),
      })
    )
  );
};
