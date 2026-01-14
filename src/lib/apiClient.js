// API client to replace Firestore calls with PostgreSQL backend

const API_BASE = import.meta.env.VITE_API_BASE || '';

export class ApiClient {
  constructor(auth) {
    this.auth = auth;
  }

  async getIdToken() {
    if (!this.auth?.currentUser) return null;
    return await this.auth.currentUser.getIdToken();
  }

  async request(endpoint, options = {}) {
    const token = await this.getIdToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Tenant operations
  async getTenants(uid) {
    return this.request(`/api/v1/tenants?uid=${uid}`);
  }

  async createTenant(uid, data) {
    return this.request('/api/v1/tenants', {
      method: 'POST',
      body: JSON.stringify({ ...data, uid }),
    });
  }

  async updateTenant(tenantId, updates) {
    return this.request('/api/v1/tenants', {
      method: 'PATCH',
      body: JSON.stringify({ tenantId, ...updates }),
    });
  }
}

// Stub functions for gradual migration
export const firestoreStub = {
  collection: () => ({ id: 'stub' }),
  doc: () => ({ id: 'stub' }),
  getDoc: async () => ({ exists: () => false, data: () => ({}) }),
  setDoc: async () => {},
  updateDoc: async () => {},
  deleteDoc: async () => {},
  getDocs: async () => ({ docs: [], empty: true }),
  addDoc: async () => ({ id: 'stub' }),
  onSnapshot: () => () => {},
  query: () => ({}),
  where: () => ({}),
  orderBy: () => ({}),
  limit: () => ({}),
  serverTimestamp: () => new Date(),
  Timestamp: class {
    static now() { return new Date(); }
    static fromDate(date) { return date; }
    toDate() { return new Date(); }
  },
};
