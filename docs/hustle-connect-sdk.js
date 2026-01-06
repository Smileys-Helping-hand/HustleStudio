/**
 * Hustle Connect SDK for WorkspaceOS
 * 
 * Simple integration library for connecting WorkspaceOS to Hustle Studio
 * 
 * Usage:
 * ```javascript
 * import HustleConnect from './hustle-connect-sdk.js';
 * 
 * const hustle = new HustleConnect('hs_live_your_api_key_here');
 * const health = await hustle.getBusinessHealth();
 * console.log(`Revenue: $${health.revenue}`);
 * ```
 */

class HustleConnect {
  constructor(apiKey, baseUrl = 'https://hustlestudio.vercel.app/api') {
    if (!apiKey) {
      throw new Error('Hustle Connect: API key is required');
    }
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  /**
   * Make authenticated API request
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('[Hustle Connect]', error);
      throw error;
    }
  }

  /**
   * GET /api/v1/business-health
   * Get overview of business metrics
   */
  async getBusinessHealth() {
    const response = await this.request('/v1/business-health');
    return response.data;
  }

  /**
   * GET /api/v1/clients
   * List clients
   */
  async getClients(options = {}) {
    const params = new URLSearchParams();
    if (options.status) params.set('status', options.status);
    if (options.limit) params.set('limit', options.limit);
    
    const query = params.toString() ? `?${params}` : '';
    const response = await this.request(`/v1/clients${query}`);
    return response.data;
  }

  /**
   * POST /api/v1/invoices/draft
   * Create a draft invoice
   */
  async createInvoiceDraft(invoiceData) {
    const response = await this.request('/v1/invoices/draft', {
      method: 'POST',
      body: JSON.stringify(invoiceData),
    });
    return response.data;
  }

  /**
   * Generate a deep link to pre-fill invoice builder
   */
  generateInvoiceLink(params) {
    const baseUrl = this.baseUrl.replace('/api', '');
    const url = new URL('/link/invoice-builder', baseUrl);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.set(key, value);
      }
    });
    
    return url.toString();
  }
}

// Export for ES modules
export default HustleConnect;

// Also support CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HustleConnect;
}

/**
 * Example Usage in WorkspaceOS Dashboard
 * 
 * ```javascript
 * // Initialize
 * const hustle = new HustleConnect(process.env.HUSTLE_API_KEY);
 * 
 * // Get business health
 * async function updateDashboard() {
 *   const health = await hustle.getBusinessHealth();
 *   document.getElementById('revenue').textContent = `$${health.revenue.toLocaleString()}`;
 *   document.getElementById('clients').textContent = health.activeClients;
 *   document.getElementById('pending').textContent = health.pendingInvoices;
 * }
 * 
 * // Create invoice from WorkspaceOS project
 * async function createInvoiceFromProject(project) {
 *   const invoice = await hustle.createInvoiceDraft({
 *     clientName: project.clientName,
 *     clientEmail: project.clientEmail,
 *     projectRef: project.name,
 *     lineItems: project.tasks.map(task => ({
 *       description: task.name,
 *       quantity: task.hours,
 *       rate: task.hourlyRate || 75
 *     })),
 *     notes: `Invoice for ${project.name}`
 *   });
 *   
 *   console.log(`Created invoice ${invoice.invoiceNumber}`);
 *   alert(`Invoice ${invoice.invoiceNumber} created in Hustle Studio!`);
 * }
 * 
 * // Generate deep link
 * function createInvoiceLinkButton(projectData) {
 *   const link = hustle.generateInvoiceLink({
 *     project: projectData.name,
 *     client: projectData.clientName,
 *     hours: projectData.totalHours,
 *     rate: projectData.hourlyRate || 75,
 *     description: `Services for ${projectData.name}`
 *   });
 *   
 *   return `<a href="${link}" target="_blank">Create Invoice in Hustle Studio</a>`;
 * }
 * 
 * // Get active clients
 * async function loadClients() {
 *   const clients = await hustle.getClients({ status: 'active', limit: 50 });
 *   return clients;
 * }
 * ```
 */
