/**
 * Session Cache Manager
 * Handles caching of customer session tokens with automatic renewal on failure
 */

export class SessionCache {
  constructor() {
    this.sessions = new Map(); // customer_id -> { token, email }
    this.emailToCustomerId = new Map(); // email -> customer_id
  }

  /**
   * Get cached session token for customer
   * @param {string} customerId - Customer ID
   * @returns {string|null} Session token if cached, null if not found
   */
  getSessionToken(customerId) {
    const session = this.sessions.get(customerId);
    return session ? session.token : null;
  }

  /**
   * Cache session token for customer
   * @param {string} customerId - Customer ID
   * @param {string} sessionToken - Session token
   * @param {string} [email] - Customer email for reverse lookup
   */
  setSessionToken(customerId, sessionToken, email = null) {
    // Validate inputs
    if (!customerId || typeof customerId !== 'string') {
      throw new Error('Customer ID is required and must be a string');
    }
    if (!sessionToken || typeof sessionToken !== 'string') {
      throw new Error('Session token is required and must be a string');
    }
    if (sessionToken.trim() === '') {
      throw new Error('Session token cannot be empty');
    }
    
    // Validate customer ID format
    if (customerId.trim() === '') {
      throw new Error('Customer ID cannot be empty');
    }
    
    this.sessions.set(customerId, {
      token: sessionToken,
      email
    });

    // Cache email -> customer_id mapping if email provided
    if (email && typeof email === 'string' && email.trim() !== '') {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        throw new Error(`Invalid email format for caching: ${email}`);
      }
      this.emailToCustomerId.set(email, customerId);
    }

    if (process.env.DEBUG === 'true') {
      // Don't log the actual session token for security
      console.error(`[DEBUG] Cached session for customer ${customerId}`);
    }
  }

  /**
   * Get customer ID from cached email lookup
   * @param {string} email - Customer email
   * @returns {string|null} Customer ID if cached, null otherwise
   */
  getCustomerIdByEmail(email) {
    if (!email || typeof email !== 'string') {
      return null;
    }
    return this.emailToCustomerId.get(email) || null;
  }

  /**
   * Cache email -> customer_id mapping
   * @param {string} email - Customer email
   * @param {string} customerId - Customer ID
   */
  setCustomerIdByEmail(email, customerId) {
    if (!email || !customerId || typeof email !== 'string' || typeof customerId !== 'string') {
      throw new Error('Both email and customer ID are required and must be strings');
    }
    
    this.emailToCustomerId.set(email, customerId);
    
    if (process.env.DEBUG === 'true') {
      console.error(`[DEBUG] Cached email lookup: ${email} -> ${customerId}`);
    }
  }

  /**
   * Clear session for customer (called when session fails/expires)
   * @param {string} customerId - Customer ID
   */
  clearSession(customerId) {
    if (!customerId || typeof customerId !== 'string') {
      return; // Silently ignore invalid input
    }
    
    const session = this.sessions.get(customerId);
    if (session && session.email) {
      this.emailToCustomerId.delete(session.email);
    }
    this.sessions.delete(customerId);
    
    if (process.env.DEBUG === 'true') {
      console.error(`[DEBUG] Cleared session for customer ${customerId}`);
    }
  }

  /**
   * Clear session by email (helper method)
   * @param {string} email - Customer email
   */
  clearSessionByEmail(email) {
    if (!email || typeof email !== 'string') {
      return;
    }
    
    const customerId = this.emailToCustomerId.get(email);
    if (customerId) {
      this.clearSession(customerId);
    }
  }

  /**
   * Clear all cached sessions
   */
  clearAll() {
    this.sessions.clear();
    this.emailToCustomerId.clear();
    
    if (process.env.DEBUG === 'true') {
      console.error('[DEBUG] Cleared all cached sessions');
    }
  }

  /**
   * Check if customer has cached session
   * @param {string} customerId - Customer ID
   * @returns {boolean} True if session exists in cache
   */
  hasValidSession(customerId) {
    if (!customerId || typeof customerId !== 'string') {
      return false;
    }
    return this.sessions.has(customerId);
  }

  /**
   * Check if any customer sessions exist (for security validation)
   * @returns {boolean} True if any customer sessions are cached
   */
  hasCustomerSessions() {
    return this.sessions.size > 0;
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    return {
      totalSessions: this.sessions.size,
      emailMappings: this.emailToCustomerId.size
    };
  }
}