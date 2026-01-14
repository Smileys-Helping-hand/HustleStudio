// Stub implementation for Firestore functions to prevent errors during migration
// These will be gradually replaced with API calls

// Core Firestore functions
export const getFirestore = () => null;
export const initializeFirestore = () => null;
export const connectFirestoreEmulator = () => {};
export const collection = () => ({ id: 'stub', path: 'stub' });
export const doc = (...args) => ({ id: args[args.length - 1] || 'stub', path: 'stub' });
export const getDoc = async () => ({ 
  exists: () => false, 
  data: () => ({}),
  id: 'stub',
  ref: { id: 'stub', path: 'stub', parent: null }
});
export const setDoc = async () => console.warn('[Firestore Stub] setDoc called - use API instead');
export const updateDoc = async () => console.warn('[Firestore Stub] updateDoc called - use API instead');
export const deleteDoc = async () => console.warn('[Firestore Stub] deleteDoc called - use API instead');
export const getDocs = async () => ({ 
  docs: [], 
  empty: true,
  size: 0,
  forEach: () => {}
});
export const addDoc = async () => ({ id: 'stub' });
export const onSnapshot = () => {
  console.warn('[Firestore Stub] onSnapshot called - use API instead');
  return () => {}; // unsubscribe function
};
export const query = (...args) => args[0] || {};
export const where = () => {};
export const orderBy = () => {};
export const limit = () => {};
export const collectionGroup = () => ({ id: 'stub' });
export const getCountFromServer = async () => ({ data: () => ({ count: 0 }) });
export const runTransaction = async (_, callback) => callback({
  get: async () => ({ exists: () => false, data: () => ({}) }),
  set: async () => {},
  update: async () => {},
  delete: async () => {},
});
export const serverTimestamp = () => new Date().toISOString();
export const increment = (value) => value;
export const arrayUnion = (...values) => values;
export const arrayRemove = (...values) => values;
export const writeBatch = () => ({
  set: async () => {},
  update: async () => {},
  delete: async () => {},
  commit: async () => {},
});
export const enableIndexedDbPersistence = async () => {};
export const disableNetwork = async () => {};
export const enableNetwork = async () => {};

export class Timestamp {
  constructor(seconds, nanoseconds) {
    this.seconds = seconds;
    this.nanoseconds = nanoseconds;
  }
  
  static now() {
    return new Timestamp(Math.floor(Date.now() / 1000), 0);
  }
  
  static fromDate(date) {
    return new Timestamp(Math.floor(date.getTime() / 1000), 0);
  }
  
  toDate() {
    return new Date(this.seconds * 1000);
  }
}
