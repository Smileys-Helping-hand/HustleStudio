// Neon PostgreSQL Database Client
// Handles all database operations through API endpoints
// Uses Neon connection pooler for optimal performance

export class NeonClient {
  constructor(apiBaseUrl = '') {
    this.apiBaseUrl = apiBaseUrl || import.meta.env.VITE_API_BASE || '';
  }

  async request(endpoint, options = {}) {
    const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Invoices
  async createInvoice(tenantId, invoiceData) {
    return this.request('/api/v1/invoices', {
      method: 'POST',
      body: JSON.stringify({ tenantId, ...invoiceData }),
    });
  }

  async getInvoices(tenantId, filters = {}) {
    const params = new URLSearchParams({ tenantId, ...filters });
    return this.request(`/api/v1/invoices?${params}`);
  }

  async getInvoice(tenantId, invoiceId) {
    return this.request(`/api/v1/invoices/${invoiceId}?tenantId=${tenantId}`);
  }

  async updateInvoice(tenantId, invoiceId, updates) {
    return this.request(`/api/v1/invoices/${invoiceId}`, {
      method: 'PATCH',
      body: JSON.stringify({ tenantId, ...updates }),
    });
  }

  async deleteInvoice(tenantId, invoiceId) {
    return this.request(`/api/v1/invoices/${invoiceId}`, {
      method: 'DELETE',
      body: JSON.stringify({ tenantId }),
    });
  }

  // Quotes
  async createQuote(tenantId, quoteData) {
    return this.request('/api/v1/quotes', {
      method: 'POST',
      body: JSON.stringify({ tenantId, ...quoteData }),
    });
  }

  async getQuotes(tenantId, filters = {}) {
    const params = new URLSearchParams({ tenantId, ...filters });
    return this.request(`/api/v1/quotes?${params}`);
  }

  async getQuote(tenantId, quoteId) {
    return this.request(`/api/v1/quotes/${quoteId}?tenantId=${tenantId}`);
  }

  async updateQuote(tenantId, quoteId, updates) {
    return this.request(`/api/v1/quotes/${quoteId}`, {
      method: 'PATCH',
      body: JSON.stringify({ tenantId, ...updates }),
    });
  }

  async deleteQuote(tenantId, quoteId) {
    return this.request(`/api/v1/quotes/${quoteId}`, {
      method: 'DELETE',
      body: JSON.stringify({ tenantId }),
    });
  }

  // Contacts
  async createContact(tenantId, contactData) {
    return this.request('/api/v1/contacts', {
      method: 'POST',
      body: JSON.stringify({ tenantId, ...contactData }),
    });
  }

  async getContacts(tenantId, filters = {}) {
    const params = new URLSearchParams({ tenantId, ...filters });
    return this.request(`/api/v1/contacts?${params}`);
  }

  async updateContact(tenantId, contactId, updates) {
    return this.request(`/api/v1/contacts/${contactId}`, {
      method: 'PATCH',
      body: JSON.stringify({ tenantId, ...updates }),
    });
  }

  async deleteContact(tenantId, contactId) {
    return this.request(`/api/v1/contacts/${contactId}`, {
      method: 'DELETE',
      body: JSON.stringify({ tenantId }),
    });
  }

  // Health check
  async health() {
    return this.request('/api/v1/health');
  }
}

// Singleton instance
let neonClient = null;

export function getNeonClient() {
  if (!neonClient) {
    neonClient = new NeonClient();
  }
  return neonClient;
}

export default getNeonClient;
