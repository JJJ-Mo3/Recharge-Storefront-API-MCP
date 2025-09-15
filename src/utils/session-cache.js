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
    if (!session) {
      return null;
    }
    
    // Update last used timestamp
    session.lastUsed = new Date();
    
    return session.token;
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
    
    // Store with timestamp for expiry tracking
    const sessionData = {
      token: sessionToken,
      email,
      createdAt: new Date(),
      lastUsed: new Date()
    };
    
    this.sessions.set(customerId, sessionData);

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
   * Clear sessions for a specific environment/domain
   * Useful when switching between dev/test/production environments
   * @param {string} domain - Domain to clear sessions for (e.g., 'test-shop.myshopify.com')
   */
  clearSessionsForDomain(domain) {
    if (!domain || typeof domain !== 'string') {
      return;
    }
    
    // Since we don't store domain info with sessions, we clear all sessions
    // This is safer when switching environments to prevent cross-environment token usage
    this.clearAll();
    
    if (process.env.DEBUG === 'true') {
      console.error(`[DEBUG] Cleared all sessions due to domain change: ${domain}`);
    }
  }

  /**
   * Clear expired sessions based on age
   * @param {number} maxAgeMinutes - Maximum age in minutes (default: 60 minutes)
   * @returns {number} Number of sessions cleared
   */
  clearExpiredSessions(maxAgeMinutes = 60) {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - (maxAgeMinutes * 60 * 1000));
    
    let clearedCount = 0;
    
    for (const [customerId, sessionData] of this.sessions) {
      if (sessionData.createdAt < cutoffTime) {
        this.clearSession(customerId);
        clearedCount++;
      }
    }
    
    if (process.env.DEBUG === 'true' && clearedCount > 0) {
      console.error(`[DEBUG] Cleared ${clearedCount} expired sessions (older than ${maxAgeMinutes} minutes)`);
    }
    
    return clearedCount;
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
    const now = new Date();
    let oldestSession = null;
    let newestSession = null;
    
    for (const [customerId, sessionData] of this.sessions) {
      if (!oldestSession || sessionData.createdAt < oldestSession) {
        oldestSession = sessionData.createdAt;
      }
      if (!newestSession || sessionData.createdAt > newestSession) {
        newestSession = sessionData.createdAt;
      }
    }
    
    return {
      totalSessions: this.sessions.size,
      emailMappings: this.emailToCustomerId.size,
      oldestSessionAge: oldestSession ? Math.floor((now - oldestSession) / 1000) : null,
      newestSessionAge: newestSession ? Math.floor((now - newestSession) / 1000) : null
    };
  }

  /**
   * Clean up old sessions (optional maintenance method)
   * @param {number} maxAgeSeconds - Maximum age in seconds (default: 1 hour)
   */
  cleanupOldSessions(maxAgeSeconds = 3600) {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - (maxAgeSeconds * 1000));
    
    let cleanedCount = 0;
    
    for (const [customerId, sessionData] of this.sessions) {
      if (sessionData.createdAt < cutoffTime) {
        this.clearSession(customerId);
        cleanedCount++;
      }
    }
    
    if (process.env.DEBUG === 'true' && cleanedCount > 0) {
      console.error(`[DEBUG] Cleaned up ${cleanedCount} old sessions`);
    }
    
    return cleanedCount;
  }
}