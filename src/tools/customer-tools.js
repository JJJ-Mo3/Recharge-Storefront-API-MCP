import { z } from 'zod';

const baseSchema = z.object({
  session_token: z.string().optional().describe('Recharge session token (optional, takes precedence over environment variable if provided)'),
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
  customer_id: z.string().optional().describe('Customer ID for automatic session creation (optional, used when no session_token provided)'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup and session creation (optional, used when no session_token or customer_id provided)'),
});

const createSessionByIdSchema = z.object({
  admin_token: z.string().optional().describe('Recharge admin token (required for session creation unless set in environment)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
  customer_id: z.string().describe('Customer ID'),
  return_url: z.string().optional().describe('URL to redirect to after session creation'),
});

const customerSchema = z.object({
  session_token: z.string().optional().describe('Recharge session token (optional, takes precedence over environment variable if provided)'),
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
  customer_id: z.string().optional().describe('Customer ID for automatic session creation (optional, used when no session_token provided)'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup and session creation (optional, used when no session_token or customer_id provided)'),
});

const updateCustomerSchema = z.object({
  session_token: z.string().optional().describe('Recharge session token (optional, takes precedence over environment variable if provided)'),
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
  customer_id: z.string().optional().describe('Customer ID for automatic session creation (optional, used when no session_token provided)'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup and session creation (optional, used when no session_token or customer_id provided)'),
  email: z.string().email().optional().describe('Customer email'),
  first_name: z.string().min(1).max(255).optional().describe('Customer first name (supports Unicode characters)')
    .refine(val => val === undefined || /^[\p{L}\p{M}\p{N}\p{P}\p{S}\p{Zs}]+$/u.test(val.trim()), {
      message: "First name contains invalid characters"
    }),
  last_name: z.string().min(1).max(255).optional().describe('Customer last name (supports Unicode characters)')
    .refine(val => val === undefined || /^[\p{L}\p{M}\p{N}\p{P}\p{S}\p{Zs}]+$/u.test(val.trim()), {
      message: "Last name contains invalid characters"
    }),
  phone: z.string().optional().describe('Customer phone number (international formats supported)')
    .refine(val => val === undefined || /^[\+]?[\d\s\-\(\)\.]{7,20}$/.test(val.trim()), {
      message: "Phone number format is invalid"
    }),
}).refine(data => {
  // At least one field to update must be provided
  const updateFields = ['email', 'first_name', 'last_name', 'phone'];
  return updateFields.some(field => data[field] !== undefined);
}, {
  message: "At least one field to update must be provided"
});

/**
 * Normalize Unicode text for consistent storage and display
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 */
function normalizeUnicodeText(text) {
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  // Normalize to NFC (Canonical Decomposition, followed by Canonical Composition)
  // This ensures consistent Unicode representation
  let normalized = text.normalize('NFC');
  
  // Trim whitespace
  normalized = normalized.trim();
  
  // Remove control characters except common whitespace
  normalized = normalized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
  
  // Collapse multiple consecutive whitespace into single space
  normalized = normalized.replace(/\s+/g, ' ');
  
  return normalized;
}

/**
 * Validate Unicode text for customer names
 * @param {string} text - Text to validate
 * @param {string} fieldName - Name of the field for error messages
 * @returns {string} Validated and normalized text
 * @throws {Error} If text contains invalid characters
 */
function validateUnicodeText(text, fieldName) {
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  const normalized = normalizeUnicodeText(text);
  
  // Check for empty after normalization
  if (normalized.length === 0) {
    throw new Error(`${fieldName} cannot be empty after normalization`);
  }
  
  // Check length limits
  if (normalized.length > 255) {
    throw new Error(`${fieldName} is too long (${normalized.length} characters). Maximum 255 characters allowed.`);
  }
  
  // Validate character set - allow letters, marks, numbers, punctuation, symbols, and spaces
  // This covers most international names while excluding problematic characters
  if (!/^[\p{L}\p{M}\p{N}\p{P}\p{S}\p{Zs}]+$/u.test(normalized)) {
    throw new Error(`${fieldName} contains invalid characters. Only letters, numbers, punctuation, and spaces are allowed.`);
  }
  
  // Additional validation for names - should start and end with letter or number
  if (fieldName.includes('name') && !/^[\p{L}\p{N}].*[\p{L}\p{N}]$/u.test(normalized)) {
    // Allow single character names
    if (normalized.length === 1 && /^[\p{L}\p{N}]$/u.test(normalized)) {
      return normalized;
    }
    throw new Error(`${fieldName} should start and end with a letter or number`);
  }
  
  return normalized;
}

/**
 * Normalize and validate phone number
 * @param {string} phone - Phone number to validate
 * @returns {string} Normalized phone number
 * @throws {Error} If phone number is invalid
 */
function validatePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') {
    return phone;
  }
  
  // Normalize whitespace
  let normalized = phone.trim().replace(/\s+/g, ' ');
  
  // Basic international phone number validation
  // Allows: +, digits, spaces, hyphens, parentheses, dots
  if (!/^[\+]?[\d\s\-\(\)\.]{7,20}$/.test(normalized)) {
    throw new Error('Phone number format is invalid. Use international format (e.g., +1-555-123-4567)');
  }
  
  // Check for reasonable digit count (7-15 digits as per E.164)
  const digitCount = (normalized.match(/\d/g) || []).length;
  if (digitCount < 7 || digitCount > 15) {
    throw new Error(`Phone number should have 7-15 digits, found ${digitCount}`);
  }
  
  return normalized;
}
const customerByEmailSchema = z.object({
  admin_token: z.string().optional().describe('Recharge admin token (required for customer lookup unless set in environment)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
  email: z.string().email().describe('Customer email address'),
});

export const customerTools = [
  {
    name: 'get_customer',
    description: 'Retrieve current customer information',
    inputSchema: customerSchema,
    execute: async (client, args) => {
      const customer = await client.getCustomer(args.customer_id, args.customer_email);
      return {
        content: [
          {
            type: 'text',
            text: `Customer Information:\n${JSON.stringify(customer, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'update_customer',
    description: 'Update customer information',
    inputSchema: updateCustomerSchema,
    execute: async (client, args) => {
      const updateData = { ...args };
      delete updateData.session_token;
      delete updateData.admin_token;
      delete updateData.store_url;
      delete updateData.customer_id;
      delete updateData.customer_email;
      
      // Normalize and validate Unicode text fields
      try {
        if (updateData.first_name !== undefined) {
          updateData.first_name = validateUnicodeText(updateData.first_name, 'First name');
        }
        
        if (updateData.last_name !== undefined) {
          updateData.last_name = validateUnicodeText(updateData.last_name, 'Last name');
        }
        
        if (updateData.phone !== undefined) {
          updateData.phone = validatePhoneNumber(updateData.phone);
        }
        
        if (updateData.email !== undefined) {
          // Email normalization - convert to lowercase and trim
          updateData.email = updateData.email.trim().toLowerCase();
          
          // Additional email validation for Unicode domains
          try {
            // This will throw if email contains invalid Unicode
            new URL(`mailto:${updateData.email}`);
          } catch (error) {
            throw new Error('Email contains invalid Unicode characters');
          }
        }
        
      } catch (validationError) {
        return {
          content: [
            {
              type: 'text',
              text: `Validation Error: ${validationError.message}\n\nTips for international names:\n- Use proper Unicode characters (letters, numbers, spaces)\n- Avoid control characters or special symbols\n- Names should start and end with letters or numbers\n- Maximum length: 255 characters\n\nFor phone numbers:\n- Use international format: +1-555-123-4567\n- Include 7-15 digits total\n- Allowed characters: +, digits, spaces, hyphens, parentheses, dots`,
            },
          ],
          isError: true,
        };
      }
      
      const updatedCustomer = await client.updateCustomer(updateData, args.customer_id, args.customer_email);
      
      return {
        content: [
          {
            type: 'text',
            text: `Updated Customer:\n${JSON.stringify(updatedCustomer, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'get_customer_by_email',
    description: 'Find customer by email address to get customer ID (requires admin token)',
    inputSchema: customerByEmailSchema,
    execute: async (client, args) => {
      const { email } = args;
      const customer = await client.getCustomerByEmail(email);
      return {
        content: [
          {
            type: 'text',
            text: `Customer by Email:\n${JSON.stringify(customer, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'create_customer_session_by_id',
    description: 'Create a customer session using customer ID (requires admin token)',
    inputSchema: createSessionByIdSchema,
    execute: async (client, args) => {
      const { customer_id, return_url } = args;
      const session = await client.createCustomerSessionById(customer_id, { return_url });
      return {
        content: [
          {
            type: 'text',
            text: `Created Customer Session:\n${JSON.stringify(session, null, 2)}`,
          },
        ],
      };
    },
  },
];