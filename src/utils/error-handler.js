/**
 * Custom error class for Recharge API errors
 * 
 */
export class RechargeAPIError extends Error {
  /**
   * Create a RechargeAPIError
   * 
   * @param {string} message Error message
   * @param {number} statusCode HTTP status code
   * @param {string} [errorCode] Recharge-specific error code
   * @param {Object} [details] Additional error details
   */
  constructor(message, statusCode, errorCode = null, details = null) {
    super(message);
    this.name = 'RechargeAPIError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    
    // Ensure proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RechargeAPIError);
    }
  }
  
  /**
   * Convert error to JSON representation
   * @returns {Object} JSON representation of the error
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      details: this.details,
      stack: this.stack
    };
  }
}

/**
 * Handle API errors from axios responses
 * 
 * @param {Error} error Axios error object
 * @throws {RechargeAPIError} Formatted API error
 */
export function handleAPIError(error) {
  if (error.response) {
    const { status, data } = error.response;
    
    // Handle redirect errors specially
    if (error.isRedirect) {
      const details = {
        location: error.response.headers.location,
        originalUrl: error.originalUrl || error.config?.url,
        baseUrl: error.config?.baseURL,
        redirectLocation: error.redirectLocation,
        requestHeaders: error.config?.headers,
        responseHeaders: error.response?.headers
      };
      
      if (process.env.DEBUG === 'true') {
        console.error(`[DEBUG] Redirect error details:`, JSON.stringify(details, null, 2));
      }
      
      throw new RechargeAPIError(
        `API returned redirect (${status}). This usually indicates incorrect endpoint or authentication issues.`,
        status, 
        'REDIRECT_ERROR', 
        details
      );
    }
    
    // Extract error message with fallback chain
    let message = 'Unknown API error';
    if (data?.message) {
      message = data.message;
    } else if (data?.error) {
      message = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
    } else if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
      const firstError = data.errors[0];
      message = typeof firstError === 'string' ? firstError : firstError?.message || JSON.stringify(firstError);
    } else if (data?.error_description) {
      message = data.error_description;
    } else if (status) {
      message = `HTTP ${status} Error`;
    } else {
      message = error.message || 'Request failed';
    }
    
    const errorCode = data?.error_code || null;
    const details = {
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      requestData: error.config?.data,
      responseData: data,
      headers: error.response?.headers
    };
    
    // Log detailed error information for debugging
    if (process.env.DEBUG === 'true') {
      console.error(`[DEBUG] API Error ${status}:`, {
        message,
        errorCode,
        details
      });
    }
    
    throw new RechargeAPIError(message, status, errorCode, details);
  } else if (error.request) {
    const details = {
      timeout: error.code === 'ECONNABORTED',
      requestConfig: {
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        timeout: error.config?.timeout
      }
    };
    
    if (process.env.DEBUG === 'true') {
      console.error('[DEBUG] Network error - no response received:', {
        message: error.message,
        code: error.code,
        details
      });
    }
    
    const message = error.code === 'ECONNABORTED' 
      ? 'Request timeout - the server took too long to respond'
      : 'Network error: No response received from server';
      
    throw new RechargeAPIError(message, 500, null, details);
  } else {
    const details = {
      originalError: error.message,
      stack: error.stack,
      config: error.config
    };
    
    if (process.env.DEBUG === 'true') {
      console.error('[DEBUG] Request setup error:', {
        message: error.message,
        details
      });
    }
    
    throw new RechargeAPIError(`Request setup error: ${error.message}`, 500, null, details);
  }
}

/**
 * Format error response for MCP protocol
 * 
 * @param {Error} error Error object
 * @returns {Object} Formatted MCP error response
 */
export function formatErrorResponse(error) {
  if (error instanceof RechargeAPIError) {
    let errorText = `API Error (${error.statusCode}): ${error.message}`;
    
    if (error.errorCode) {
      errorText += ` (Code: ${error.errorCode})`;
    }
    
    // Add helpful context for common errors
    if (error.statusCode === 401) {
      errorText += '\n\nTip: Check your API access token and ensure it has the required permissions.';
    } else if (error.statusCode === 404) {
      errorText += '\n\nTip: Verify the resource ID exists and you have access to it.';
    } else if (error.statusCode === 422) {
      errorText += '\n\nTip: Check the request parameters - some required fields may be missing or invalid.';
    } else if (error.statusCode === 429) {
      errorText += '\n\nTip: You have exceeded the API rate limit. Please wait before making more requests.';
    } else if (error.statusCode >= 500) {
      errorText += '\n\nTip: This appears to be a server error. Please try again later.';
    }
    
    return {
      content: [
        {
          type: 'text',
          text: errorText,
        },
      ],
      isError: true,
      _meta: {
        errorType: 'RechargeAPIError',
        statusCode: error.statusCode,
        errorCode: error.errorCode,
        timestamp: new Date().toISOString()
      }
    };
  }
  
  return {
    content: [
      {
        type: 'text',
        text: `Error: ${error.message}`,
      },
    ],
    isError: true,
    _meta: {
      errorType: error.name || 'UnknownError',
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Validate required parameters
 * @param {Object} params Parameters to validate
 * @param {string[]} required Required parameter names
 * @throws {Error} If required parameters are missing
 * @throws {Error} If parameters are invalid format
 */
export function validateRequiredParams(params, required) {
  if (!params || typeof params !== 'object') {
    throw new Error('Parameters must be an object');
  }
  
  if (!Array.isArray(required)) {
    throw new Error('Required parameters must be an array');
  }
  
  const missing = required.filter(param => 
    params[param] === undefined || 
    params[param] === null || 
    (typeof params[param] === 'string' && params[param].trim() === '') ||
    (typeof params[param] === 'number' && (isNaN(params[param]) || !isFinite(params[param]) || params[param] < 0))
  );
  
  if (missing.length > 0) {
    throw new Error(`Missing required parameters: ${missing.join(', ')}`);
  }
  
  // Validate email format if email parameter exists
  const emailFields = ['email', 'customer_email'];
  emailFields.forEach(field => {
    if (params[field] && typeof params[field] === 'string') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(params[field])) {
        throw new Error(`Invalid email format for ${field}`);
      }
    }
  });
  
  // Validate date format if date parameters exist
  const dateFields = ['date', 'next_charge_scheduled_at'];
  dateFields.forEach(field => {
    if (params[field] && typeof params[field] === 'string') {
      // Allow both YYYY-MM-DD and ISO datetime formats
      const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
      if (!dateRegex.test(params[field])) {
        throw new Error(`Invalid date format for ${field}. Expected YYYY-MM-DD or ISO datetime format`);
      }
      
      // Validate that the date is actually valid
      const dateObj = new Date(params[field]);
      if (isNaN(dateObj.getTime())) {
        throw new Error(`Invalid date value for ${field}: ${params[field]}`);
      }
    }
  });
  
  // Validate numeric fields
  const numericFields = ['limit', 'page', 'quantity', 'order_interval_frequency', 'variant_id'];
  numericFields.forEach(field => {
    if (params[field] !== undefined && params[field] !== null) {
      const num = Number(params[field]);
      if (isNaN(num) || !isFinite(num)) {
        throw new Error(`Invalid numeric value for ${field}: ${params[field]}`);
      }
      if (field === 'limit' && (num < 1 || num > 250)) {
        throw new Error(`Limit must be between 1 and 250, got: ${num}`);
      }
      if (field === 'page' && num < 1) {
        throw new Error(`Page must be 1 or greater, got: ${num}`);
      }
      if (['quantity', 'order_interval_frequency'].includes(field) && num < 1) {
        throw new Error(`${field} must be 1 or greater, got: ${num}`);
      }
      if (field === 'variant_id' && num < 1) {
        throw new Error(`${field} must be 1 or greater, got: ${num}`);
      }
    }
  });
  
  // Validate ID fields (should be strings or convertible to strings)
  const idFields = ['customer_id', 'subscription_id', 'address_id', 'order_id', 'charge_id', 'onetime_id', 'bundle_id', 'bundle_selection_id', 'payment_method_id', 'discount_id', 'product_id'];
  idFields.forEach(field => {
    if (params[field] !== undefined && params[field] !== null) {
      if (typeof params[field] !== 'string' && typeof params[field] !== 'number') {
        throw new Error(`${field} must be a string or number, got: ${typeof params[field]}`);
      }
      if (typeof params[field] === 'string' && params[field].trim() === '') {
        throw new Error(`${field} cannot be empty`);
      }
      if (typeof params[field] === 'number' && params[field] < 1) {
        throw new Error(`${field} must be 1 or greater, got: ${params[field]}`);
      }
    }
  });
  
  // Validate order_interval_unit if present
  if (params.order_interval_unit && !['day', 'week', 'month'].includes(params.order_interval_unit)) {
    throw new Error(`Invalid order_interval_unit: ${params.order_interval_unit}. Must be 'day', 'week', or 'month'`);
  }
  
  // Validate status fields if present
  if (params.status) {
    const validStatuses = {
      subscription: ['active', 'cancelled', 'expired'],
      order: ['success', 'error', 'queued', 'skipped', 'refunded', 'partially_refunded'],
      charge: ['success', 'error', 'queued', 'skipped', 'refunded', 'partially_refunded']
    };
    
    // We can't know the context here, so we'll allow any of these valid statuses
    const allValidStatuses = [...new Set(Object.values(validStatuses).flat())];
    if (!allValidStatuses.includes(params.status)) {
      throw new Error(`Invalid status: ${params.status}`);
    }
  }
}

/**
 * Validate authentication parameters
 * @param {Object} params Parameters to validate
 * @throws {Error} If authentication setup is invalid
 */
export function validateAuthParams(params) {
  const { customer_id, customer_email, session_token, admin_token, store_url } = params;
  
  // Validate store URL format if provided
  if (store_url) {
    let domain = store_url;
    if (store_url.startsWith('http://') || store_url.startsWith('https://')) {
      try {
        const urlObj = new URL(store_url);
        domain = urlObj.hostname;
      } catch (error) {
        throw new Error(`Invalid store URL format: ${store_url}`);
      }
    }
    
    if (!domain.includes('.myshopify.com')) {
      throw new Error(
        `Invalid store URL format: ${store_url}\n` +
        'Store URL must be a Shopify domain ending with .myshopify.com\n' +
        'Example: your-shop.myshopify.com'
      );
    }
  }
  
  // Validate customer identification
  if (customer_id && customer_email) {
    // Both provided is fine, customer_id takes precedence
    if (process.env.DEBUG === 'true') {
      console.error('[DEBUG] Both customer_id and customer_email provided, using customer_id');
    }
  }
  
  // Validate email format if provided
  if (customer_email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer_email)) {
      throw new Error(`Invalid email format: ${customer_email}`);
    }
  }
  
  // Validate session token format if provided
  if (session_token && typeof session_token === 'string') {
    if (session_token.trim() === '') {
      throw new Error('Session token cannot be empty');
    }
    // Session tokens typically start with 'st_' but we'll be flexible
    if (session_token.length < 10) {
      throw new Error('Session token appears to be too short');
    }
  }
  
  // Validate admin token format if provided
  if (admin_token && typeof admin_token === 'string') {
    if (admin_token.trim() === '') {
      throw new Error('Admin token cannot be empty');
    }
    if (admin_token.length < 10) {
      throw new Error('Admin token appears to be too short');
    }
    
    // Check if admin token and session token are the same
    if (session_token && admin_token === session_token) {
      throw new Error(
        'Configuration Error: admin_token and session_token cannot be the same value. ' +
        'Admin tokens cannot be used as session tokens.'
      );
    }
  }
  
  // Validate API URL if provided
  if (params.api_url) {
    try {
      const urlObj = new URL(params.api_url);
      if (urlObj.protocol !== 'https:') {
        throw new Error('API URL must use HTTPS protocol for security');
      }
    } catch (urlError) {
      throw new Error(`Invalid API URL format: ${params.api_url}`);
    }
  }
}

/**
 * Sanitize error message for logging
 * @param {string} message - Error message
 * @returns {string} Sanitized message
 */
export function sanitizeErrorMessage(message) {
  if (typeof message !== 'string') {
    return 'Invalid error message format';
  }
  
  // Remove potential sensitive information
  return message
    .replace(/token[s]?[:\s=]+[a-zA-Z0-9_-]+/gi, 'token=***')
    .replace(/key[s]?[:\s=]+[a-zA-Z0-9_-]+/gi, 'key=***')
    .replace(/password[s]?[:\s=]+[^\s]+/gi, 'password=***')
    .replace(/secret[s]?[:\s=]+[^\s]+/gi, 'secret=***')
    .replace(/Bearer\s+[a-zA-Z0-9_-]+/gi, 'Bearer ***')
    .replace(/X-Recharge-Access-Token[:\s=]+[a-zA-Z0-9_-]+/gi, 'X-Recharge-Access-Token: ***');
}

/**
 * Validate that a value is a valid positive integer
 * @param {any} value - Value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @returns {number} Validated integer
 * @throws {Error} If value is not a valid positive integer
 */
export function validatePositiveInteger(value, fieldName) {
  if (value === undefined || value === null) {
    throw new Error(`${fieldName} is required`);
  }
  
  const num = Number(value);
  if (isNaN(num) || !Number.isInteger(num) || num <= 0) {
    throw new Error(`${fieldName} must be a positive integer, got: ${value}`);
  }
  
  return num;
}

/**
 * Validate that a value is a valid non-negative integer
 * @param {any} value - Value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @returns {number} Validated integer
 * @throws {Error} If value is not a valid non-negative integer
 */
export function validateNonNegativeInteger(value, fieldName) {
  if (value === undefined || value === null) {
    throw new Error(`${fieldName} is required`);
  }
  
  const num = Number(value);
  if (isNaN(num) || !Number.isInteger(num) || num < 0) {
    throw new Error(`${fieldName} must be a non-negative integer, got: ${value}`);
  }
  
  return num;
}

/**
 * Validate date format and return normalized date string
 * @param {string} dateValue - Date value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @returns {string} Validated and normalized date string
 * @throws {Error} If date is invalid
 */
export function validateDateFormat(dateValue, fieldName) {
  if (!dateValue || typeof dateValue !== 'string') {
    throw new Error(`${fieldName} must be a valid date string`);
  }
  
  // Allow both YYYY-MM-DD and ISO datetime formats
  const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
  if (!dateRegex.test(dateValue.trim())) {
    throw new Error(`Invalid date format for ${fieldName}. Expected YYYY-MM-DD or ISO datetime format`);
  }
  
  // Validate that the date is actually valid
  const dateObj = new Date(dateValue.trim());
  if (isNaN(dateObj.getTime())) {
    throw new Error(`Invalid date value for ${fieldName}: ${dateValue}`);
  }
  
  return dateValue.trim();
}