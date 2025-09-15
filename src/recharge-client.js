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

    // Validate that session token is not accidentally set to admin token
    if (sessionToken && adminToken && sessionToken === adminToken) {
      throw new Error(
        'Configuration Error: session_token and admin_token cannot be the same value.\n' +
        'You have set RECHARGE_SESSION_TOKEN to the same value as RECHARGE_ADMIN_TOKEN.\n' +
        'Admin tokens cannot be used as session tokens.\n\n' +
        'Fix: Remove RECHARGE_SESSION_TOKEN from your .env file or set it to a valid customer session token.\n' +
        'The system will automatically create customer session tokens using your admin token when needed.'
      );
    }

    // Validate session token format if provided
    if (sessionToken) {
      const sessionValidation = this.validateSessionTokenFormat(sessionToken);
      if (!sessionValidation.isValid) {
        // Check if it looks like an admin token
        if (this.looksLikeAdminToken(sessionToken)) {
          throw new Error(
            'Configuration Error: RECHARGE_SESSION_TOKEN appears to be an admin token.\n' +
            'Admin tokens cannot be used as session tokens.\n\n' +
            'Fix: Remove RECHARGE_SESSION_TOKEN from your .env file.\n' +
            'The system will automatically create customer session tokens using your admin token when needed.\n\n' +
            `Detected pattern: ${this.getTokenPattern(sessionToken)}`
          );
        } else {
          console.warn(`[WARNING] Session token validation failed: ${sessionValidation.reason}`);
          console.warn('[WARNING] This may cause authentication issues. Consider removing RECHARGE_SESSION_TOKEN to use automatic session creation.');
        }
      }
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
      const validationResult = this.validateSessionToken(this.sessionToken);
      if (!validationResult.isValid) {
        throw new Error(`Invalid session token: ${validationResult.reason}`);
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
      
      // Check for cached session
      const cachedToken = this.sessionCache.getSessionToken(finalCustomerId);
      if (cachedToken) {
        // Validate cached token before using
        const validationResult = this.validateSessionToken(cachedToken);
        if (validationResult.isValid) {
          if (process.env.DEBUG === 'true') {
            console.error(`[DEBUG] Using cached session for customer ${finalCustomerId}`);
          }
          return cachedToken;
        } else {
          if (process.env.DEBUG === 'true') {
            console.error(`[DEBUG] Cached session invalid (${validationResult.reason}), creating new session for customer ${finalCustomerId}`);
          }
          // Clear invalid cached session
          this.sessionCache.clearSession(finalCustomerId);
        }
      }
      
      // Create new session with validation
      return await this.createAndValidateSession(finalCustomerId, customerEmail);
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
   * Create and validate a new session token
   */
  async createAndValidateSession(customerId, customerEmail = null) {
    const MAX_SESSION_ATTEMPTS = 3;
    
    for (let attempt = 1; attempt <= MAX_SESSION_ATTEMPTS; attempt++) {
      try {
        if (process.env.DEBUG === 'true') {
          console.error(`[DEBUG] Creating new session for customer ${customerId} (attempt ${attempt}/${MAX_SESSION_ATTEMPTS})`);
        }
        
        const session = await this.createCustomerSessionById(customerId);
        const newToken = session.apiToken;
        
        // Validate the new token
        const validationResult = this.validateSessionToken(newToken);
        if (!validationResult.isValid) {
          throw new Error(`Session creation returned invalid token: ${validationResult.reason}`);
        }
        
        // Additional validation: ensure new token is not an admin token
        if (this.looksLikeAdminToken(newToken)) {
          throw new Error(
            `Session creation returned what appears to be an admin token instead of a session token. ` +
            `This indicates a configuration issue with your Recharge setup. ` +
            `Pattern: ${this.getTokenPattern(newToken)}`
          );
        }
        
        // Verify token is different from any previously cached token
        const previousToken = this.sessionCache.getSessionToken(customerId);
        if (previousToken === newToken) {
          if (process.env.DEBUG === 'true') {
            console.error(`[DEBUG] New session token identical to previous token, attempt ${attempt}`);
          }
          if (attempt < MAX_SESSION_ATTEMPTS) {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue;
          } else {
            throw new Error('Session creation returned same token as expired session');
          }
        }
        
        // Cache the new session
        this.sessionCache.setSessionToken(customerId, newToken, customerEmail);
        
        if (process.env.DEBUG === 'true') {
          console.error(`[DEBUG] Successfully created and cached new session for customer ${customerId}`);
        }
        
        return newToken;
      } catch (error) {
        if (process.env.DEBUG === 'true') {
          console.error(`[DEBUG] Session creation attempt ${attempt} failed for customer ${customerId}:`, error.message);
        }
        
        if (attempt === MAX_SESSION_ATTEMPTS) {
          throw new Error(`Session creation failed after ${MAX_SESSION_ATTEMPTS} attempts: ${error.message}`);
        }
        
        // Wait before retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Validate session token format and basic properties
   */
  validateSessionToken(token) {
    if (!token) {
      return { isValid: false, reason: 'Token is null or undefined' };
    }
    
    if (typeof token !== 'string') {
      return { isValid: false, reason: 'Token must be a string' };
    }
    
    const trimmedToken = token.trim();
    if (trimmedToken === '') {
      return { isValid: false, reason: 'Token cannot be empty' };
    }
    
    if (trimmedToken.length < 10) {
      return { isValid: false, reason: 'Token appears too short (less than 10 characters)' };
    }
    
    // Check for obviously invalid tokens
    const invalidTokens = [
      'undefined',
      'null',
      'your_session_token_here',
      'st_example',
      'test_token'
    ];
    
    if (invalidTokens.includes(trimmedToken.toLowerCase())) {
      return { isValid: false, reason: 'Token appears to be a placeholder or test value' };
    }
    
    // Basic format validation - session tokens typically have specific patterns
    // This is a loose validation to catch obvious issues without being too restrictive
    if (!/^[a-zA-Z0-9_\-\.]+$/.test(trimmedToken)) {
      return { isValid: false, reason: 'Token contains invalid characters' };
    }
    
    return { isValid: true, reason: null };
  }

  /**
   * Make authenticated request to Storefront API
   */
  async makeRequest(method, endpoint, data = null, params = null, customerId = null, customerEmail = null, sessionToken = null) {
    return await this.makeRequestWithRetry(method, endpoint, data, params, customerId, customerEmail, sessionToken, 0);
  }

  /**
   * Make authenticated request with retry logic for session expiry
   */
  async makeRequestWithRetry(method, endpoint, data = null, params = null, customerId = null, customerEmail = null, sessionToken = null, retryCount = 0) {
    const MAX_RETRIES = 2;
    
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
    
    try {
      sessionToken = sessionToken || await this.getOrCreateSessionToken(customerId, customerEmail);
    } catch (error) {
      if (process.env.DEBUG === 'true') {
        console.error(`[DEBUG] Failed to get session token:`, error.message);
      }
      throw error;
    }
    
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
      // Handle session expiry - detect various expiry indicators and retry with backoff
      const isSessionExpired = this.isSessionExpiredError(error);
      const canRetry = (customerId || customerEmail) && retryCount < MAX_RETRIES;
      
      if (isSessionExpired && canRetry) {
        if (process.env.DEBUG === 'true') {
          console.error(`[DEBUG] Session expired (attempt ${retryCount + 1}/${MAX_RETRIES + 1}), clearing cache and retrying`);
        }
        
        // Clear the expired session atomically
        await this.clearExpiredSession(customerId, customerEmail, sessionToken);
        
        // Add exponential backoff delay
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Retry with incremented count
        try {
          return await this.makeRequestWithRetry(method, endpoint, data, params, customerId, customerEmail, null, retryCount + 1);
        } catch (retryError) {
          if (process.env.DEBUG === 'true') {
            console.error(`[DEBUG] Session retry ${retryCount + 1} failed:`, retryError.message);
          }
          
          // If this was the last retry, provide enhanced error context
          if (retryCount >= MAX_RETRIES - 1) {
            const enhancedError = new Error(
              `Session refresh failed after ${MAX_RETRIES} attempts. Original error: ${error.message}. ` +
              `Final retry error: ${retryError.message}. This may indicate admin token expiry or insufficient permissions.`
            );
            enhancedError.originalError = error;
            enhancedError.retryError = retryError;
            enhancedError.retryCount = retryCount + 1;
            throw enhancedError;
          }
          
          throw retryError;
        }
      }
      
      handleAPIError(error);
    }
  }

  /**
   * Detect if an error indicates session expiry
   */
  isSessionExpiredError(error) {
    if (!error.response) {
      return false;
    }
    
    const status = error.response.status;
    const data = error.response.data;
    
    // Check for various session expiry indicators
    if (status === 401) {
      return true; // Unauthorized - classic session expiry
    }
    
    if (status === 403) {
      // Forbidden - could be expired session or insufficient permissions
      // Check error message for session-related keywords
      const message = (data?.message || data?.error || '').toLowerCase();
      const sessionKeywords = ['session', 'token', 'expired', 'invalid', 'unauthorized'];
      return sessionKeywords.some(keyword => message.includes(keyword));
    }
    
    if (status === 422) {
      // Unprocessable Entity - sometimes used for expired tokens
      const message = (data?.message || data?.error || '').toLowerCase();
      return message.includes('token') || message.includes('session') || message.includes('expired');
    }
    
    return false;
  }

  /**
   * Atomically clear expired session from cache
   */
  async clearExpiredSession(customerId, customerEmail, expiredToken) {
    try {
      // Determine the customer ID if not provided
      let finalCustomerId = customerId;
      if (!finalCustomerId && customerEmail) {
        finalCustomerId = this.sessionCache.getCustomerIdByEmail(customerEmail);
      }
      
      if (finalCustomerId) {
        // Verify we're clearing the right session by checking token match
        const cachedToken = this.sessionCache.getSessionToken(finalCustomerId);
        if (cachedToken === expiredToken || !cachedToken) {
          this.sessionCache.clearSession(finalCustomerId);
          if (process.env.DEBUG === 'true') {
            console.error(`[DEBUG] Cleared expired session for customer ${finalCustomerId}`);
          }
        } else {
          if (process.env.DEBUG === 'true') {
            console.error(`[DEBUG] Session token mismatch - not clearing (cached token may have been updated by another request)`);
          }
        }
      }
      
      // Also clear email mapping if provided
      if (customerEmail) {
        const emailCustomerId = this.sessionCache.getCustomerIdByEmail(customerEmail);
        if (emailCustomerId === finalCustomerId) {
          this.sessionCache.clearSessionByEmail(customerEmail);
        }
      }
      
    } catch (error) {
      if (process.env.DEBUG === 'true') {
        console.error(`[DEBUG] Error clearing expired session:`, error.message);
      }
      // Don't throw - session clearing failure shouldn't prevent retry
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
  async getCustomer(customerId = null, customerEmail = null, sessionToken = null) {
    return await this.makeRequest('GET', '/customer', null, null, customerId, customerEmail, sessionToken);
  }

  async updateCustomer(updateData, customerId = null, customerEmail = null, sessionToken = null) {
    if (!updateData || typeof updateData !== 'object') {
      throw new Error('Update data is required');
    }
    return await this.makeRequest('PUT', '/customer', updateData, null, customerId, customerEmail, sessionToken);
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
  async getSubscriptions(params = {}, customerId = null, customerEmail = null, sessionToken = null) {
    return await this.makeRequest('GET', '/subscriptions', null, params, customerId, customerEmail, sessionToken);
  }

  async getSubscription(subscriptionId, customerId = null, customerEmail = null, sessionToken = null) {
    if (!subscriptionId) {
      throw new Error('Subscription ID is required');
    }
    return await this.makeRequest('GET', `/subscriptions/${subscriptionId}`, null, null, customerId, customerEmail, sessionToken);
  }

  async createSubscription(subscriptionData, customerId = null, customerEmail = null, sessionToken = null) {
    if (!subscriptionData || typeof subscriptionData !== 'object') {
      throw new Error('Subscription data is required');
    }
    return await this.makeRequest('POST', '/subscriptions', subscriptionData, null, customerId, customerEmail, sessionToken);
  }

  async updateSubscription(subscriptionId, updateData, customerId = null, customerEmail = null, sessionToken = null) {
    if (!subscriptionId) {
      throw new Error('Subscription ID is required');
    }
    if (!updateData || typeof updateData !== 'object') {
      throw new Error('Update data is required');
    }
    return await this.makeRequest('PUT', `/subscriptions/${subscriptionId}`, updateData, null, customerId, customerEmail, sessionToken);
  }

  async skipSubscription(subscriptionId, date, customerId = null, customerEmail = null, sessionToken = null) {
    if (!subscriptionId) {
      throw new Error('Subscription ID is required');
    }
    if (!date) {
      throw new Error('Date is required for skipping subscription');
    }
    return await this.makeRequest('POST', `/subscriptions/${subscriptionId}/skip`, { date }, null, customerId, customerEmail, sessionToken);
  }

  async unskipSubscription(subscriptionId, date, customerId = null, customerEmail = null, sessionToken = null) {
    if (!subscriptionId) {
      throw new Error('Subscription ID is required');
    }
    if (!date) {
      throw new Error('Date is required for unskipping subscription');
    }
    return await this.makeRequest('POST', `/subscriptions/${subscriptionId}/unskip`, { date }, null, customerId, customerEmail, sessionToken);
  }

  async swapSubscription(subscriptionId, swapData, customerId = null, customerEmail = null, sessionToken = null) {
    if (!subscriptionId) {
      throw new Error('Subscription ID is required');
    }
    if (!swapData || typeof swapData !== 'object') {
      throw new Error('Swap data is required');
    }
    return await this.makeRequest('POST', `/subscriptions/${subscriptionId}/swap`, swapData, null, customerId, customerEmail, sessionToken);
  }

  async cancelSubscription(subscriptionId, cancelData = {}, customerId = null, customerEmail = null, sessionToken = null) {
    if (!subscriptionId) {
      throw new Error('Subscription ID is required');
    }
    return await this.makeRequest('POST', `/subscriptions/${subscriptionId}/cancel`, cancelData, null, customerId, customerEmail, sessionToken);
  }

  async activateSubscription(subscriptionId, customerId = null, customerEmail = null, sessionToken = null) {
    if (!subscriptionId) {
      throw new Error('Subscription ID is required');
    }
    return await this.makeRequest('POST', `/subscriptions/${subscriptionId}/activate`, null, null, customerId, customerEmail, sessionToken);
  }

  async setNextChargeDate(subscriptionId, date, customerId = null, customerEmail = null, sessionToken = null) {
    if (!subscriptionId) {
      throw new Error('Subscription ID is required');
    }
    if (!date) {
      throw new Error('Date is required');
    }
    return await this.makeRequest('POST', `/subscriptions/${subscriptionId}/set_next_charge_date`, { date }, null, customerId, customerEmail, sessionToken);
  }

  // Address Management Methods
  async getAddresses(params = {}, customerId = null, customerEmail = null, sessionToken = null) {
    return await this.makeRequest('GET', '/addresses', null, params, customerId, customerEmail, sessionToken);
  }

  async getAddress(addressId, customerId = null, customerEmail = null, sessionToken = null) {
    if (!addressId) {
      throw new Error('Address ID is required');
    }
    return await this.makeRequest('GET', `/addresses/${addressId}`, null, null, customerId, customerEmail, sessionToken);
  }

  async createAddress(addressData, customerId = null, customerEmail = null, sessionToken = null) {
    if (!addressData || typeof addressData !== 'object') {
      throw new Error('Address data is required');
    }
    return await this.makeRequest('POST', '/addresses', addressData, null, customerId, customerEmail, sessionToken);
  }

  async updateAddress(addressId, updateData, customerId = null, customerEmail = null, sessionToken = null) {
    if (!addressId) {
      throw new Error('Address ID is required');
    }
    if (!updateData || typeof updateData !== 'object') {
      throw new Error('Update data is required');
    }
    return await this.makeRequest('PUT', `/addresses/${addressId}`, updateData, null, customerId, customerEmail, sessionToken);
  }

  async deleteAddress(addressId, customerId = null, customerEmail = null, sessionToken = null) {
    if (!addressId) {
      throw new Error('Address ID is required');
    }
    return await this.makeRequest('DELETE', `/addresses/${addressId}`, null, null, customerId, customerEmail, sessionToken);
  }

  // Payment Method Management
  async getPaymentMethods(params = {}, customerId = null, customerEmail = null, sessionToken = null) {
    return await this.makeRequest('GET', '/payment_methods', null, params, customerId, customerEmail, sessionToken);
  }

  async getPaymentMethod(paymentMethodId, customerId = null, customerEmail = null, sessionToken = null) {
    if (!paymentMethodId) {
      throw new Error('Payment method ID is required');
    }
    return await this.makeRequest('GET', `/payment_methods/${paymentMethodId}`, null, null, customerId, customerEmail, sessionToken);
  }

  async updatePaymentMethod(paymentMethodId, updateData, customerId = null, customerEmail = null, sessionToken = null) {
    if (!paymentMethodId) {
      throw new Error('Payment method ID is required');
    }
    if (!updateData || typeof updateData !== 'object') {
      throw new Error('Update data is required');
    }
    return await this.makeRequest('PUT', `/payment_methods/${paymentMethodId}`, updateData, null, customerId, customerEmail, sessionToken);
  }

  // Product Catalog Methods
  async getProducts(params = {}, customerId = null, customerEmail = null, sessionToken = null) {
    return await this.makeRequest('GET', '/products', null, params, customerId, customerEmail, sessionToken);
  }

  async getProduct(productId, customerId = null, customerEmail = null, sessionToken = null) {
    if (!productId) {
      throw new Error('Product ID is required');
    }
    return await this.makeRequest('GET', `/products/${productId}`, null, null, customerId, customerEmail, sessionToken);
  }

  // Order Management Methods
  async getOrders(params = {}, customerId = null, customerEmail = null, sessionToken = null) {
    return await this.makeRequest('GET', '/orders', null, params, customerId, customerEmail, sessionToken);
  }

  async getOrder(orderId, customerId = null, customerEmail = null, sessionToken = null) {
    if (!orderId) {
      throw new Error('Order ID is required');
    }
    return await this.makeRequest('GET', `/orders/${orderId}`, null, null, customerId, customerEmail, sessionToken);
  }

  // Charge Management Methods
  async getCharges(params = {}, customerId = null, customerEmail = null, sessionToken = null) {
    return await this.makeRequest('GET', '/charges', null, params, customerId, customerEmail, sessionToken);
  }

  async getCharge(chargeId, customerId = null, customerEmail = null, sessionToken = null) {
    if (!chargeId) {
      throw new Error('Charge ID is required');
    }
    return await this.makeRequest('GET', `/charges/${chargeId}`, null, null, customerId, customerEmail, sessionToken);
  }

  // One-time Product Methods
  async getOnetimes(params = {}, customerId = null, customerEmail = null, sessionToken = null) {
    return await this.makeRequest('GET', '/onetimes', null, params, customerId, customerEmail, sessionToken);
  }

  async getOnetime(onetimeId, customerId = null, customerEmail = null, sessionToken = null) {
    if (!onetimeId) {
      throw new Error('One-time ID is required');
    }
    return await this.makeRequest('GET', `/onetimes/${onetimeId}`, null, null, customerId, customerEmail, sessionToken);
  }

  async createOnetime(onetimeData, customerId = null, customerEmail = null, sessionToken = null) {
    if (!onetimeData || typeof onetimeData !== 'object') {
      throw new Error('One-time data is required');
    }
    return await this.makeRequest('POST', '/onetimes', onetimeData, null, customerId, customerEmail, sessionToken);
  }

  async updateOnetime(onetimeId, updateData, customerId = null, customerEmail = null, sessionToken = null) {
    if (!onetimeId) {
      throw new Error('One-time ID is required');
    }
    if (!updateData || typeof updateData !== 'object') {
      throw new Error('Update data is required');
    }
    return await this.makeRequest('PUT', `/onetimes/${onetimeId}`, updateData, null, customerId, customerEmail, sessionToken);
  }

  async deleteOnetime(onetimeId, customerId = null, customerEmail = null, sessionToken = null) {
    if (!onetimeId) {
      throw new Error('One-time ID is required');
    }
    return await this.makeRequest('DELETE', `/onetimes/${onetimeId}`, null, null, customerId, customerEmail, sessionToken);
  }

  // Bundle Management Methods
  async getBundles(params = {}, customerId = null, customerEmail = null, sessionToken = null) {
    return await this.makeRequest('GET', '/bundles', null, params, customerId, customerEmail, sessionToken);
  }

  async getBundle(bundleId, customerId = null, customerEmail = null, sessionToken = null) {
    if (!bundleId) {
      throw new Error('Bundle ID is required');
    }
    return await this.makeRequest('GET', `/bundles/${bundleId}`, null, null, customerId, customerEmail, sessionToken);
  }

  async getBundleSelections(bundleId, params = {}, customerId = null, customerEmail = null, sessionToken = null) {
    if (!bundleId) {
      throw new Error('Bundle ID is required');
    }
    return await this.makeRequest('GET', `/bundles/${bundleId}/bundle_selections`, null, params, customerId, customerEmail, sessionToken);
  }

  async getBundleSelection(bundleSelectionId, customerId = null, customerEmail = null, sessionToken = null) {
    if (!bundleSelectionId) {
      throw new Error('Bundle selection ID is required');
    }
    return await this.makeRequest('GET', `/bundle_selections/${bundleSelectionId}`, null, null, customerId, customerEmail, sessionToken);
  }

  async createBundleSelection(selectionData, customerId = null, customerEmail = null, sessionToken = null) {
    if (!selectionData || typeof selectionData !== 'object') {
      throw new Error('Bundle selection data is required');
    }
    return await this.makeRequest('POST', '/bundle_selections', selectionData, null, customerId, customerEmail, sessionToken);
  }

  async updateBundleSelection(bundleSelectionId, updateData, customerId = null, customerEmail = null, sessionToken = null) {
    if (!bundleSelectionId) {
      throw new Error('Bundle selection ID is required');
    }
    if (!updateData || typeof updateData !== 'object') {
      throw new Error('Update data is required');
    }
    return await this.makeRequest('PUT', `/bundle_selections/${bundleSelectionId}`, updateData, null, customerId, customerEmail, sessionToken);
  }

  async deleteBundleSelection(bundleSelectionId, customerId = null, customerEmail = null, sessionToken = null) {
    if (!bundleSelectionId) {
      throw new Error('Bundle selection ID is required');
    }
    return await this.makeRequest('DELETE', `/bundle_selections/${bundleSelectionId}`, null, null, customerId, customerEmail, sessionToken);
  }

  // Discount Management Methods
  async getDiscounts(params = {}, customerId = null, customerEmail = null, sessionToken = null) {
    return await this.makeRequest('GET', '/discounts', null, params, customerId, customerEmail, sessionToken);
  }

  async getDiscount(discountId, customerId = null, customerEmail = null, sessionToken = null) {
    if (!discountId) {
      throw new Error('Discount ID is required');
    }
    return await this.makeRequest('GET', `/discounts/${discountId}`, null, null, customerId, customerEmail, sessionToken);
  }

  async applyDiscount(discountCode, customerId = null, customerEmail = null, sessionToken = null) {
    if (!discountCode || typeof discountCode !== 'string' || discountCode.trim() === '') {
      throw new Error('Discount code is required');
    }
    return await this.makeRequest('POST', '/discounts', { discount_code: discountCode.trim() }, null, customerId, customerEmail, sessionToken);
  }

  async removeDiscount(discountId, customerId = null, customerEmail = null, sessionToken = null) {
    if (!discountId) {
      throw new Error('Discount ID is required');
    }
    return await this.makeRequest('DELETE', `/discounts/${discountId}`, null, null, customerId, customerEmail, sessionToken);
  }
}