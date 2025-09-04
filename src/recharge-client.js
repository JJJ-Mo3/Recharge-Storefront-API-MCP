import axios from 'axios';
import { handleAPIError } from './utils/error-handler.js';
import { SessionCache } from './utils/session-cache.js';

/**
 * Recharge Storefront API Client
 * Provides complete access to all Recharge Storefront API endpoints
 */
export class RechargeClient {
  constructor({ storeUrl, sessionToken = null, adminToken = null }) {
    if (!storeUrl) {
      throw new Error('Store URL is required');
    }

    // Validate and normalize store URL
    let domain = storeUrl;
    if (storeUrl.startsWith('http://') || storeUrl.startsWith('https://')) {
      try {
        const urlObj = new URL(storeUrl);
        domain = urlObj.hostname;
      } catch (error) {
        throw new Error(`Invalid store URL format: ${storeUrl}`);
      }
    }

    if (!domain.includes('.myshopify.com')) {
      throw new Error(`Store URL must be a Shopify domain ending with .myshopify.com: ${domain}`);
    }

    this.storeUrl = domain;
    this.sessionToken = sessionToken;
    this.adminToken = adminToken;
    this.sessionCache = new SessionCache();

    // Get API URL from environment variable or use production default
    let apiUrl = 'https://api.rechargeapps.com'; // Default to production
    
    if (process.env.RECHARGE_API_URL) {
      const validatedUrl = this.validateApiUrl(process.env.RECHARGE_API_URL);
      if (validatedUrl) {
        apiUrl = validatedUrl;
      } else {
        throw new Error(
          `Invalid RECHARGE_API_URL specified: ${process.env.RECHARGE_API_URL}\n` +
          'API URL must use HTTPS protocol and be a valid URL format.\n' +
          'Remove RECHARGE_API_URL from .env to use production API, or fix the URL format.'
        );
      }
    }

    // Create axios instances
    this.storefrontApi = axios.create({
      baseURL: apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.adminApi = axios.create({
      baseURL: apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Add request interceptors for debugging
    if (process.env.DEBUG === 'true') {
      this.storefrontApi.interceptors.request.use(request => {
        console.error(`[DEBUG] Storefront API Request: ${request.method?.toUpperCase()} ${request.url}`);
        return request;
      });

      this.adminApi.interceptors.request.use(request => {
        console.error(`[DEBUG] Admin API Request: ${request.method?.toUpperCase()} ${request.url}`);
        return request;
      });
    }
  }

  /**
   * Validate API URL to prevent security issues
   * @param {string} url - URL to validate
   * @returns {string|null} Validated URL or null if invalid
   */
  validateApiUrl(url) {
    if (!url || typeof url !== 'string') {
      return null; // This is fine - means no URL was provided
    }

    try {
      const urlObj = new URL(url);
      
      // Only allow HTTPS for security
      if (urlObj.protocol !== 'https:') {
        if (process.env.DEBUG === 'true') {
          console.error('[DEBUG] API URL must use HTTPS protocol:', url);
        }
        return null;
      }
      
      // Ensure no path manipulation
      if (urlObj.pathname !== '/' && urlObj.pathname !== '') {
        if (process.env.DEBUG === 'true') {
          console.error('[DEBUG] API URL should not contain path components:', url);
        }
        return null;
      }
      
      // Remove any query parameters or fragments for security
      return `${urlObj.protocol}//${urlObj.hostname}${urlObj.port ? ':' + urlObj.port : ''}`;
      
    } catch (error) {
      if (process.env.DEBUG === 'true') {
        console.error(`[DEBUG] Invalid API URL format: ${url}`);
      }
      return null;
    }
  }

  /**
   * Get or create session token for customer operations
   */
  async getOrCreateSessionToken(customerId = null, customerEmail = null) {
    // If explicit session token provided, validate and use it
    if (this.sessionToken) {
      if (typeof this.sessionToken !== 'string' || this.sessionToken.trim() === '') {
        throw new Error('Invalid session token format');
      }
      if (process.env.DEBUG === 'true') {
        console.error('[DEBUG] Using explicit session token');
      }
      return this.sessionToken;
    }

    // If customer identification provided, get/create customer session
    if (customerId || customerEmail) {
      let finalCustomerId = customerId;
      
      // Validate customer ID format if provided
      if (finalCustomerId) {
        if (typeof finalCustomerId !== 'string' && typeof finalCustomerId !== 'number') {
          throw new Error('Customer ID must be a string or number');
        }
        finalCustomerId = finalCustomerId.toString();
        if (finalCustomerId.trim() === '') {
          throw new Error('Customer ID cannot be empty');
        }
      }
      
      // Validate customer ID format if provided
      if (finalCustomerId) {
        if (typeof finalCustomerId !== 'string' && typeof finalCustomerId !== 'number') {
          throw new Error('Customer ID must be a string or number');
        }
        finalCustomerId = finalCustomerId.toString();
        if (finalCustomerId.trim() === '') {
          throw new Error('Customer ID cannot be empty');
        }
      }
      
      // If only email provided, look up customer ID
      if (!finalCustomerId && customerEmail) {
        // Validate email format
        if (typeof customerEmail !== 'string' || customerEmail.trim() === '') {
          throw new Error('Customer email must be a non-empty string');
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(customerEmail.trim())) {
          throw new Error(`Invalid email format: ${customerEmail}`);
        }
        
        finalCustomerId = this.sessionCache.getCustomerIdByEmail(customerEmail);
        
        if (!finalCustomerId) {
          if (process.env.DEBUG === 'true') {
            console.error(`[DEBUG] Looking up customer ID for email: ${customerEmail}`);
          }
          try {
            const customer = await this.getCustomerByEmail(customerEmail);
            finalCustomerId = customer.id.toString();
            this.sessionCache.setCustomerIdByEmail(customerEmail, finalCustomerId);
          } catch (error) {
            if (process.env.DEBUG === 'true') {
              console.error(`[DEBUG] Customer lookup failed for email ${customerEmail}:`, error.message);
            }
            throw error;
          }
        }
      }
      
      // Validate we have a customer ID at this point
      if (!finalCustomerId) {
        throw new Error('Unable to determine customer ID from provided information');
      }
      
      // Validate we have a customer ID at this point
      if (!finalCustomerId) {
        throw new Error('Unable to determine customer ID from provided information');
      }
      
      // Check for cached session
      const cachedToken = this.sessionCache.getSessionToken(finalCustomerId);
      if (cachedToken) {
        if (process.env.DEBUG === 'true') {
          console.error(`[DEBUG] Using cached session for customer ${finalCustomerId}`);
        }
        return cachedToken;
      }
      
      // Create new session
      if (process.env.DEBUG === 'true') {
        console.error(`[DEBUG] Creating new session for customer ${finalCustomerId}`);
      }
      try {
        const session = await this.createCustomerSessionById(finalCustomerId);
        const newToken = session.apiToken;
        
        if (!newToken || typeof newToken !== 'string' || newToken.trim() === '') {
          throw new Error('Session creation returned invalid token');
        }
        
        if (!newToken || typeof newToken !== 'string' || newToken.trim() === '') {
          throw new Error('Session creation returned invalid token');
        }
        
        // Cache the new session
        this.sessionCache.setSessionToken(finalCustomerId, newToken, customerEmail);
        
        return newToken;
      } catch (error) {
        if (process.env.DEBUG === 'true') {
          console.error(`[DEBUG] Session creation failed for customer ${finalCustomerId}:`, error.message);
        }
        throw error;
      }
    }

    // Security check: prevent using default session when customer sessions exist
    if (this.sessionCache.hasCustomerSessions()) {
      throw new Error(
        'Security Error: Cannot use default session token when customer-specific sessions exist. ' +
        'Please specify \'customer_id\', \'customer_email\', or \'session_token\' to ensure correct customer data access.'
      );
    }

    // No customer identification and no default session
    throw new Error(
      'No session token available. Please provide customer_id, customer_email, or session_token parameter, ' +
      'or set RECHARGE_SESSION_TOKEN environment variable.'
    );
  }

  /**
   * Make authenticated request to Storefront API
   */
  async makeRequest(method, endpoint, data = null, params = null, customerId = null, customerEmail = null) {
    // Validate method
    if (!method || typeof method !== 'string') {
      throw new Error('HTTP method is required');
    }
    
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    if (!validMethods.includes(method.toUpperCase())) {
      throw new Error(`Invalid HTTP method: ${method}`);
    }
    
    // Validate endpoint
    if (!endpoint || typeof endpoint !== 'string') {
      throw new Error('API endpoint is required');
    }
    
    if (!endpoint.startsWith('/')) {
      throw new Error('API endpoint must start with /');
    }
    
    const sessionToken = await this.getOrCreateSessionToken(customerId, customerEmail);
    
    const config = {
      method: method.toUpperCase(),
      url: endpoint,
      headers: {
        'X-Recharge-Access-Token': sessionToken,
        'X-Recharge-Version': '2021-11',
      },
    };
    
    if (data) {
      config.data = data;
    }
    
    if (params) {
      config.params = params;
    }
    
    try {
      const response = await this.storefrontApi.request(config);
      
      if (!response || !response.data) {
        throw new Error('Invalid response from API');
      }
      
      return response.data;
    } catch (error) {
      // Handle session expiry - clear cache and retry once
      if (error.response?.status === 401 && (customerId || customerEmail)) {
        if (process.env.DEBUG === 'true') {
          console.error(`[DEBUG] Session expired for customer, clearing cache and retrying`);
        }
        
        // Clear the expired session
        const finalCustomerId = customerId || this.sessionCache.getCustomerIdByEmail(customerEmail);
        if (finalCustomerId) {
          this.sessionCache.clearSession(finalCustomerId);
        }
        if (customerEmail) {
          this.sessionCache.clearSessionByEmail(customerEmail);
        }
        
        // Retry with new session
        try {
          const newSessionToken = await this.getOrCreateSessionToken(customerId, customerEmail);
          config.headers['X-Recharge-Access-Token'] = newSessionToken;
          
          const retryResponse = await this.storefrontApi.request(config);
          
          if (!retryResponse || !retryResponse.data) {
            throw new Error('Invalid response from API on retry');
          }
          
          return retryResponse.data;
        } catch (retryError) {
          if (process.env.DEBUG === 'true') {
            console.error(`[DEBUG] Session retry failed:`, retryError.message);
          }
          handleAPIError(retryError);
        }
      }
      
      handleAPIError(error);
    }
  }

  /**
   * Make authenticated request to Admin API
   */
  async makeAdminRequest(method, endpoint, data = null, params = null) {
    if (!this.adminToken) {
      throw new Error(
        'Admin token required for this operation. Please provide admin_token parameter or set RECHARGE_ADMIN_TOKEN environment variable.'
      );
    }

    // Validate method
    if (!method || typeof method !== 'string') {
      throw new Error('HTTP method is required');
    }
    
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    if (!validMethods.includes(method.toUpperCase())) {
      throw new Error(`Invalid HTTP method: ${method}`);
    }
    
    // Validate endpoint
    if (!endpoint || typeof endpoint !== 'string') {
      throw new Error('API endpoint is required');
    }
    
    if (!endpoint.startsWith('/')) {
      throw new Error('API endpoint must start with /');
    }

    const config = {
      method: method.toUpperCase(),
      url: endpoint,
      headers: {
        'X-Recharge-Access-Token': this.adminToken,
        'X-Recharge-Version': '2021-11',
      },
    };
    
    if (data) {
      config.data = data;
    }
    
    if (params) {
      config.params = params;
    }
    
    try {
      const response = await this.adminApi.request(config);
      
      if (!response || !response.data) {
        throw new Error('Invalid response from Admin API');
      }
      
      return response.data;
    } catch (error) {
      handleAPIError(error);
    }
  }

  // Customer Management Methods
  async getCustomer(customerId = null, customerEmail = null) {
    return await this.makeRequest('GET', '/customer', null, null, customerId, customerEmail);
  }

  async updateCustomer(updateData, customerId = null, customerEmail = null) {
    if (!updateData || typeof updateData !== 'object') {
      throw new Error('Update data is required');
    }
    return await this.makeRequest('PUT', '/customer', updateData, null, customerId, customerEmail);
  }

  async getCustomerByEmail(email) {
    if (!email || typeof email !== 'string' || email.trim() === '') {
      throw new Error('Valid email address is required for customer lookup');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new Error(`Invalid email format: ${email}`);
    }

    try {
      const response = await this.makeAdminRequest('GET', '/customers', null, { email: email.trim() });
      
      if (!response || !response.customers || !Array.isArray(response.customers)) {
        throw new Error('Invalid response format from customer lookup API');
      }
      
      if (response.customers.length === 0) {
        throw new Error(`Customer not found with email: ${email}`);
      }
      
      const customer = response.customers[0];
      if (!customer || !customer.id) {
        throw new Error('Customer data is incomplete - missing ID');
      }
      
      return customer;
    } catch (error) {
      if (process.env.DEBUG === 'true') {
        console.error(`[DEBUG] Customer lookup failed for email ${email}:`, error.message);
      }
      throw error;
    }
  }

  async createCustomerSessionById(customerId, options = {}) {
    if (!customerId) {
      throw new Error('Customer ID is required for session creation');
    }

    if (!this.adminToken) {
      throw new Error('Admin token required for session creation');
    }

    const sessionData = {
      ...options
    };

    try {
      const response = await this.makeAdminRequest('POST', `/customers/${customerId}/sessions`, sessionData);
      
      if (!response || !response.customer_session) {
        throw new Error('Invalid response from session creation API');
      }
      
      return response.customer_session;
    } catch (error) {
      if (process.env.DEBUG === 'true') {
        console.error(`[DEBUG] Session creation failed for customer ${customerId}:`, error.message);
      }
      throw error;
    }
  }

  // Subscription Management Methods
  async getSubscriptions(params = {}, customerId = null, customerEmail = null) {
    return await this.makeRequest('GET', '/subscriptions', null, params, customerId, customerEmail);
  }

  async getSubscription(subscriptionId, customerId = null, customerEmail = null) {
    if (!subscriptionId) {
      throw new Error('Subscription ID is required');
    }
    return await this.makeRequest('GET', `/subscriptions/${subscriptionId}`, null, null, customerId, customerEmail);
  }

  async createSubscription(subscriptionData, customerId = null, customerEmail = null) {
    if (!subscriptionData || typeof subscriptionData !== 'object') {
      throw new Error('Subscription data is required');
    }
    return await this.makeRequest('POST', '/subscriptions', subscriptionData, null, customerId, customerEmail);
  }

  async updateSubscription(subscriptionId, updateData, customerId = null, customerEmail = null) {
    if (!subscriptionId) {
      throw new Error('Subscription ID is required');
    }
    if (!updateData || typeof updateData !== 'object') {
      throw new Error('Update data is required');
    }
    return await this.makeRequest('PUT', `/subscriptions/${subscriptionId}`, updateData, null, customerId, customerEmail);
  }

  async skipSubscription(subscriptionId, date, customerId = null, customerEmail = null) {
    if (!subscriptionId) {
      throw new Error('Subscription ID is required');
    }
    if (!date) {
      throw new Error('Date is required for skipping subscription');
    }
    return await this.makeRequest('POST', `/subscriptions/${subscriptionId}/skip`, { date }, null, customerId, customerEmail);
  }

  async unskipSubscription(subscriptionId, date, customerId = null, customerEmail = null) {
    if (!subscriptionId) {
      throw new Error('Subscription ID is required');
    }
    if (!date) {
      throw new Error('Date is required for unskipping subscription');
    }
    return await this.makeRequest('POST', `/subscriptions/${subscriptionId}/unskip`, { date }, null, customerId, customerEmail);
  }

  async swapSubscription(subscriptionId, swapData, customerId = null, customerEmail = null) {
    if (!subscriptionId) {
      throw new Error('Subscription ID is required');
    }
    if (!swapData || typeof swapData !== 'object') {
      throw new Error('Swap data is required');
    }
    return await this.makeRequest('POST', `/subscriptions/${subscriptionId}/swap`, swapData, null, customerId, customerEmail);
  }

  async cancelSubscription(subscriptionId, cancelData = {}, customerId = null, customerEmail = null) {
    if (!subscriptionId) {
      throw new Error('Subscription ID is required');
    }
    return await this.makeRequest('POST', `/subscriptions/${subscriptionId}/cancel`, cancelData, null, customerId, customerEmail);
  }

  async activateSubscription(subscriptionId, customerId = null, customerEmail = null) {
    if (!subscriptionId) {
      throw new Error('Subscription ID is required');
    }
    return await this.makeRequest('POST', `/subscriptions/${subscriptionId}/activate`, null, null, customerId, customerEmail);
  }

  async setNextChargeDate(subscriptionId, date, customerId = null, customerEmail = null) {
    if (!subscriptionId) {
      throw new Error('Subscription ID is required');
    }
    if (!date) {
      throw new Error('Date is required');
    }
    return await this.makeRequest('POST', `/subscriptions/${subscriptionId}/set_next_charge_date`, { date }, null, customerId, customerEmail);
  }

  // Address Management Methods
  async getAddresses(params = {}, customerId = null, customerEmail = null) {
    return await this.makeRequest('GET', '/addresses', null, params, customerId, customerEmail);
  }

  async getAddress(addressId, customerId = null, customerEmail = null) {
    if (!addressId) {
      throw new Error('Address ID is required');
    }
    return await this.makeRequest('GET', `/addresses/${addressId}`, null, null, customerId, customerEmail);
  }

  async createAddress(addressData, customerId = null, customerEmail = null) {
    if (!addressData || typeof addressData !== 'object') {
      throw new Error('Address data is required');
    }
    return await this.makeRequest('POST', '/addresses', addressData, null, customerId, customerEmail);
  }

  async updateAddress(addressId, updateData, customerId = null, customerEmail = null) {
    if (!addressId) {
      throw new Error('Address ID is required');
    }
    if (!updateData || typeof updateData !== 'object') {
      throw new Error('Update data is required');
    }
    return await this.makeRequest('PUT', `/addresses/${addressId}`, updateData, null, customerId, customerEmail);
  }

  async deleteAddress(addressId, customerId = null, customerEmail = null) {
    if (!addressId) {
      throw new Error('Address ID is required');
    }
    return await this.makeRequest('DELETE', `/addresses/${addressId}`, null, null, customerId, customerEmail);
  }

  // Payment Method Management
  async getPaymentMethods(params = {}, customerId = null, customerEmail = null) {
    return await this.makeRequest('GET', '/payment_methods', null, params, customerId, customerEmail);
  }

  async getPaymentMethod(paymentMethodId, customerId = null, customerEmail = null) {
    if (!paymentMethodId) {
      throw new Error('Payment method ID is required');
    }
    return await this.makeRequest('GET', `/payment_methods/${paymentMethodId}`, null, null, customerId, customerEmail);
  }

  async updatePaymentMethod(paymentMethodId, updateData, customerId = null, customerEmail = null) {
    if (!paymentMethodId) {
      throw new Error('Payment method ID is required');
    }
    if (!updateData || typeof updateData !== 'object') {
      throw new Error('Update data is required');
    }
    return await this.makeRequest('PUT', `/payment_methods/${paymentMethodId}`, updateData, null, customerId, customerEmail);
  }

  // Product Catalog Methods
  async getProducts(params = {}, customerId = null, customerEmail = null) {
    return await this.makeRequest('GET', '/products', null, params, customerId, customerEmail);
  }

  async getProduct(productId, customerId = null, customerEmail = null) {
    if (!productId) {
      throw new Error('Product ID is required');
    }
    return await this.makeRequest('GET', `/products/${productId}`, null, null, customerId, customerEmail);
  }

  // Order Management Methods
  async getOrders(params = {}, customerId = null, customerEmail = null) {
    return await this.makeRequest('GET', '/orders', null, params, customerId, customerEmail);
  }

  async getOrder(orderId, customerId = null, customerEmail = null) {
    if (!orderId) {
      throw new Error('Order ID is required');
    }
    return await this.makeRequest('GET', `/orders/${orderId}`, null, null, customerId, customerEmail);
  }

  // Charge Management Methods
  async getCharges(params = {}, customerId = null, customerEmail = null) {
    return await this.makeRequest('GET', '/charges', null, params, customerId, customerEmail);
  }

  async getCharge(chargeId, customerId = null, customerEmail = null) {
    if (!chargeId) {
      throw new Error('Charge ID is required');
    }
    return await this.makeRequest('GET', `/charges/${chargeId}`, null, null, customerId, customerEmail);
  }

  // One-time Product Methods
  async getOnetimes(params = {}, customerId = null, customerEmail = null) {
    return await this.makeRequest('GET', '/onetimes', null, params, customerId, customerEmail);
  }

  async getOnetime(onetimeId, customerId = null, customerEmail = null) {
    if (!onetimeId) {
      throw new Error('One-time ID is required');
    }
    return await this.makeRequest('GET', `/onetimes/${onetimeId}`, null, null, customerId, customerEmail);
  }

  async createOnetime(onetimeData, customerId = null, customerEmail = null) {
    if (!onetimeData || typeof onetimeData !== 'object') {
      throw new Error('One-time data is required');
    }
    return await this.makeRequest('POST', '/onetimes', onetimeData, null, customerId, customerEmail);
  }

  async updateOnetime(onetimeId, updateData, customerId = null, customerEmail = null) {
    if (!onetimeId) {
      throw new Error('One-time ID is required');
    }
    if (!updateData || typeof updateData !== 'object') {
      throw new Error('Update data is required');
    }
    return await this.makeRequest('PUT', `/onetimes/${onetimeId}`, updateData, null, customerId, customerEmail);
  }

  async deleteOnetime(onetimeId, customerId = null, customerEmail = null) {
    if (!onetimeId) {
      throw new Error('One-time ID is required');
    }
    return await this.makeRequest('DELETE', `/onetimes/${onetimeId}`, null, null, customerId, customerEmail);
  }

  // Bundle Management Methods
  async getBundles(params = {}, customerId = null, customerEmail = null) {
    return await this.makeRequest('GET', '/bundles', null, params, customerId, customerEmail);
  }

  async getBundle(bundleId, customerId = null, customerEmail = null) {
    if (!bundleId) {
      throw new Error('Bundle ID is required');
    }
    return await this.makeRequest('GET', `/bundles/${bundleId}`, null, null, customerId, customerEmail);
  }

  async getBundleSelections(bundleId, params = {}, customerId = null, customerEmail = null) {
    if (!bundleId) {
      throw new Error('Bundle ID is required');
    }
    return await this.makeRequest('GET', `/bundles/${bundleId}/bundle_selections`, null, params, customerId, customerEmail);
  }

  async getBundleSelection(bundleSelectionId, customerId = null, customerEmail = null) {
    if (!bundleSelectionId) {
      throw new Error('Bundle selection ID is required');
    }
    return await this.makeRequest('GET', `/bundle_selections/${bundleSelectionId}`, null, null, customerId, customerEmail);
  }

  async createBundleSelection(selectionData, customerId = null, customerEmail = null) {
    if (!selectionData || typeof selectionData !== 'object') {
      throw new Error('Bundle selection data is required');
    }
    return await this.makeRequest('POST', '/bundle_selections', selectionData, null, customerId, customerEmail);
  }

  async updateBundleSelection(bundleSelectionId, updateData, customerId = null, customerEmail = null) {
    if (!bundleSelectionId) {
      throw new Error('Bundle selection ID is required');
    }
    if (!updateData || typeof updateData !== 'object') {
      throw new Error('Update data is required');
    }
    return await this.makeRequest('PUT', `/bundle_selections/${bundleSelectionId}`, updateData, null, customerId, customerEmail);
  }

  async deleteBundleSelection(bundleSelectionId, customerId = null, customerEmail = null) {
    if (!bundleSelectionId) {
      throw new Error('Bundle selection ID is required');
    }
    return await this.makeRequest('DELETE', `/bundle_selections/${bundleSelectionId}`, null, null, customerId, customerEmail);
  }

  // Discount Management Methods
  async getDiscounts(params = {}, customerId = null, customerEmail = null) {
    return await this.makeRequest('GET', '/discounts', null, params, customerId, customerEmail);
  }

  async getDiscount(discountId, customerId = null, customerEmail = null) {
    if (!discountId) {
      throw new Error('Discount ID is required');
    }
    return await this.makeRequest('GET', `/discounts/${discountId}`, null, null, customerId, customerEmail);
  }

  async applyDiscount(discountCode, customerId = null, customerEmail = null) {
    if (!discountCode || typeof discountCode !== 'string' || discountCode.trim() === '') {
      throw new Error('Discount code is required');
    }
    return await this.makeRequest('POST', '/discounts', { discount_code: discountCode.trim() }, null, customerId, customerEmail);
  }

  async removeDiscount(discountId, customerId = null, customerEmail = null) {
    if (!discountId) {
      throw new Error('Discount ID is required');
    }
    return await this.makeRequest('DELETE', `/discounts/${discountId}`, null, null, customerId, customerEmail);
  }
}