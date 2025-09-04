import { z } from 'zod';

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
 * Validate Unicode text for address fields
 * @param {string} text - Text to validate
 * @param {string} fieldName - Name of the field for error messages
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Validated and normalized text
 * @throws {Error} If text contains invalid characters
 */
function validateUnicodeAddressText(text, fieldName, maxLength = 255) {
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  const normalized = normalizeUnicodeText(text);
  
  // Check for empty after normalization
  if (normalized.length === 0) {
    throw new Error(`${fieldName} cannot be empty after normalization`);
  }
  
  // Check length limits
  if (normalized.length > maxLength) {
    throw new Error(`${fieldName} is too long (${normalized.length} characters). Maximum ${maxLength} characters allowed.`);
  }
  
  // Validate character set - allow letters, marks, numbers, punctuation, symbols, and spaces
  // This covers international addresses while excluding problematic characters
  if (!/^[\p{L}\p{M}\p{N}\p{P}\p{S}\p{Zs}]+$/u.test(normalized)) {
    throw new Error(`${fieldName} contains invalid characters. Only letters, numbers, punctuation, and spaces are allowed.`);
  }
  
  return normalized;
}

/**
 * Validate postal/ZIP code with international support
 * @param {string} zip - Postal code to validate
 * @param {string} country - Country code for context
 * @returns {string} Normalized postal code
 * @throws {Error} If postal code is invalid
 */
function validatePostalCode(zip, country = '') {
  if (!zip || typeof zip !== 'string') {
    return zip;
  }
  
  const normalized = normalizeUnicodeText(zip);
  
  // Basic international postal code validation
  // Allows letters, numbers, spaces, hyphens
  if (!/^[\p{L}\p{N}\s\-]{2,12}$/u.test(normalized)) {
    throw new Error(`Invalid postal code format: ${zip}. Use alphanumeric characters, spaces, and hyphens only (2-12 characters).`);
  }
  
  // Country-specific validation hints
  const countryLower = country.toLowerCase();
  if (countryLower === 'us' || countryLower === 'usa' || countryLower === 'united states') {
    if (!/^\d{5}(-\d{4})?$/.test(normalized)) {
      throw new Error(`US ZIP code format should be 12345 or 12345-6789, got: ${zip}`);
    }
  } else if (countryLower === 'ca' || countryLower === 'canada') {
    if (!/^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/.test(normalized)) {
      throw new Error(`Canadian postal code format should be A1A 1A1 or A1A1A1, got: ${zip}`);
    }
  } else if (countryLower === 'uk' || countryLower === 'gb' || countryLower === 'united kingdom') {
    if (!/^[A-Za-z]{1,2}\d[A-Za-z\d]?\s?\d[A-Za-z]{2}$/.test(normalized)) {
      throw new Error(`UK postal code format should be like SW1A 1AA or M1 1AA, got: ${zip}`);
    }
  }
  
  return normalized;
}

/**
 * Normalize and validate phone number for international use
 * @param {string} phone - Phone number to validate
 * @returns {string} Normalized phone number
 * @throws {Error} If phone number is invalid
 */
function validateInternationalPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return phone;
  }
  
  // Normalize whitespace
  let normalized = phone.trim().replace(/\s+/g, ' ');
  
  // International phone number validation
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

const baseSchema = z.object({
  customer_id: z.string().optional().describe('Customer ID for automatic session creation (optional, used when no session_token provided)'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup and session creation (optional, used when no session_token or customer_id provided)'),
  session_token: z.string().optional().describe('Recharge session token (optional, takes precedence over environment variable if provided)'),
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
});

const addressSchema = z.object({
  customer_id: z.string().optional().describe('Customer ID for automatic session creation (optional, used when no session_token provided)'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup and session creation (optional, used when no session_token or customer_id provided)'),
  session_token: z.string().optional().describe('Recharge session token (optional, takes precedence over environment variable if provided)'),
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
  address_id: z.string().describe('The address ID'),
});

const createAddressSchema = z.object({
  customer_id: z.string().optional().describe('Customer ID for automatic session creation (optional, used when no session_token provided)'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup and session creation (optional, used when no session_token or customer_id provided)'),
  session_token: z.string().optional().describe('Recharge session token (optional, takes precedence over environment variable if provided)'),
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
  address1: z.string().min(1).max(255).describe('Street address (supports international characters)')
    .refine(val => /^[\p{L}\p{M}\p{N}\p{P}\p{S}\p{Zs}]+$/u.test(val.trim()), {
      message: "Street address contains invalid characters"
    }),
  address2: z.string().max(255).optional().describe('Apartment, suite, etc. (supports international characters)')
    .refine(val => val === undefined || val === '' || /^[\p{L}\p{M}\p{N}\p{P}\p{S}\p{Zs}]+$/u.test(val.trim()), {
      message: "Address line 2 contains invalid characters"
    }),
  city: z.string().min(1).max(100).describe('City (supports international characters)')
    .refine(val => /^[\p{L}\p{M}\p{N}\p{P}\p{S}\p{Zs}]+$/u.test(val.trim()), {
      message: "City contains invalid characters"
    }),
  province: z.string().min(1).max(100).describe('State/Province (supports international characters)')
    .refine(val => /^[\p{L}\p{M}\p{N}\p{P}\p{S}\p{Zs}]+$/u.test(val.trim()), {
      message: "Province/State contains invalid characters"
    }),
  zip: z.string().min(2).max(12).describe('ZIP/Postal code (international formats supported)')
    .refine(val => /^[\p{L}\p{N}\s\-]{2,12}$/u.test(val.trim()), {
      message: "Postal code format is invalid"
    }),
  country: z.string().min(2).max(100).describe('Country (full name or ISO code)')
    .refine(val => /^[\p{L}\p{M}\p{N}\p{P}\p{S}\p{Zs}]+$/u.test(val.trim()), {
      message: "Country contains invalid characters"
    }),
  first_name: z.string().min(1).max(255).describe('First name (supports international characters)')
    .refine(val => /^[\p{L}\p{M}\p{N}\p{P}\p{S}\p{Zs}]+$/u.test(val.trim()), {
      message: "First name contains invalid characters"
    }),
  last_name: z.string().min(1).max(255).describe('Last name (supports international characters)')
    .refine(val => /^[\p{L}\p{M}\p{N}\p{P}\p{S}\p{Zs}]+$/u.test(val.trim()), {
      message: "Last name contains invalid characters"
    }),
  company: z.string().max(255).optional().describe('Company name (supports international characters)')
    .refine(val => val === undefined || val === '' || /^[\p{L}\p{M}\p{N}\p{P}\p{S}\p{Zs}]+$/u.test(val.trim()), {
      message: "Company name contains invalid characters"
    }),
  phone: z.string().optional().describe('Phone number (international formats supported)')
    .refine(val => val === undefined || val === '' || /^[\+]?[\d\s\-\(\)\.]{7,20}$/.test(val.trim()), {
      message: "Phone number format is invalid"
    }),
});

const updateAddressSchema = z.object({
  customer_id: z.string().optional().describe('Customer ID for automatic session creation (optional, used when no session_token provided)'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup and session creation (optional, used when no session_token or customer_id provided)'),
  session_token: z.string().optional().describe('Recharge session token (optional, takes precedence over environment variable if provided)'),
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
  address_id: z.string().describe('The address ID'),
  address1: z.string().min(1).max(255).optional().describe('Street address (supports international characters)')
    .refine(val => val === undefined || /^[\p{L}\p{M}\p{N}\p{P}\p{S}\p{Zs}]+$/u.test(val.trim()), {
      message: "Street address contains invalid characters"
    }),
  address2: z.string().max(255).optional().describe('Apartment, suite, etc. (supports international characters)')
    .refine(val => val === undefined || val === '' || /^[\p{L}\p{M}\p{N}\p{P}\p{S}\p{Zs}]+$/u.test(val.trim()), {
      message: "Address line 2 contains invalid characters"
    }),
  city: z.string().min(1).max(100).optional().describe('City (supports international characters)')
    .refine(val => val === undefined || /^[\p{L}\p{M}\p{N}\p{P}\p{S}\p{Zs}]+$/u.test(val.trim()), {
      message: "City contains invalid characters"
    }),
  province: z.string().min(1).max(100).optional().describe('State/Province (supports international characters)')
    .refine(val => val === undefined || /^[\p{L}\p{M}\p{N}\p{P}\p{S}\p{Zs}]+$/u.test(val.trim()), {
      message: "Province/State contains invalid characters"
    }),
  zip: z.string().min(2).max(12).optional().describe('ZIP/Postal code (international formats supported)')
    .refine(val => val === undefined || /^[\p{L}\p{N}\s\-]{2,12}$/u.test(val.trim()), {
      message: "Postal code format is invalid"
    }),
  country: z.string().min(2).max(100).optional().describe('Country (full name or ISO code)')
    .refine(val => val === undefined || /^[\p{L}\p{M}\p{N}\p{P}\p{S}\p{Zs}]+$/u.test(val.trim()), {
      message: "Country contains invalid characters"
    }),
  first_name: z.string().min(1).max(255).optional().describe('First name (supports international characters)')
    .refine(val => val === undefined || /^[\p{L}\p{M}\p{N}\p{P}\p{S}\p{Zs}]+$/u.test(val.trim()), {
      message: "First name contains invalid characters"
    }),
  last_name: z.string().min(1).max(255).optional().describe('Last name (supports international characters)')
    .refine(val => val === undefined || /^[\p{L}\p{M}\p{N}\p{P}\p{S}\p{Zs}]+$/u.test(val.trim()), {
      message: "Last name contains invalid characters"
    }),
  company: z.string().max(255).optional().describe('Company name (supports international characters)')
    .refine(val => val === undefined || val === '' || /^[\p{L}\p{M}\p{N}\p{P}\p{S}\p{Zs}]+$/u.test(val.trim()), {
      message: "Company name contains invalid characters"
    }),
  phone: z.string().optional().describe('Phone number (international formats supported)')
    .refine(val => val === undefined || val === '' || /^[\+]?[\d\s\-\(\)\.]{7,20}$/.test(val.trim()), {
      message: "Phone number format is invalid"
    }),
}).refine(data => {
  // At least one field to update must be provided
  const updateFields = ['address1', 'address2', 'city', 'province', 'zip', 'country', 'first_name', 'last_name', 'company', 'phone'];
  return updateFields.some(field => data[field] !== undefined);
}, {
  message: "At least one field to update must be provided"
});

export const addressTools = [
  {
    name: 'get_addresses',
    description: 'Get addresses for a specific customer',
    inputSchema: baseSchema,
    execute: async (client, args) => {
      const addresses = await client.getAddresses({}, args.customer_id, args.customer_email);
      return {
        content: [
          {
            type: 'text',
            text: `Addresses:\n${JSON.stringify(addresses, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'get_address',
    description: 'Get detailed information about a specific address',
    inputSchema: addressSchema,
    execute: async (client, args) => {
      const { address_id } = args;
      const address = await client.getAddress(address_id, args.customer_id, args.customer_email);
      
      return {
        content: [
          {
            type: 'text',
            text: `Address Details:\n${JSON.stringify(address, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'create_address',
    description: 'Create a new address',
    inputSchema: createAddressSchema,
    execute: async (client, args) => {
      const addressData = { ...args };
      delete addressData.customer_id;
      delete addressData.customer_email;
      delete addressData.session_token;
      delete addressData.admin_token;
      delete addressData.store_url;
      
      // Normalize and validate Unicode text fields
      try {
        if (addressData.address1 !== undefined) {
          addressData.address1 = validateUnicodeAddressText(addressData.address1, 'Street address', 255);
        }
        
        if (addressData.address2 !== undefined && addressData.address2 !== '') {
          addressData.address2 = validateUnicodeAddressText(addressData.address2, 'Address line 2', 255);
        }
        
        if (addressData.city !== undefined) {
          addressData.city = validateUnicodeAddressText(addressData.city, 'City', 100);
        }
        
        if (addressData.province !== undefined) {
          addressData.province = validateUnicodeAddressText(addressData.province, 'Province/State', 100);
        }
        
        if (addressData.zip !== undefined) {
          addressData.zip = validatePostalCode(addressData.zip, addressData.country);
        }
        
        if (addressData.country !== undefined) {
          addressData.country = validateUnicodeAddressText(addressData.country, 'Country', 100);
        }
        
        if (addressData.first_name !== undefined) {
          addressData.first_name = validateUnicodeAddressText(addressData.first_name, 'First name', 255);
        }
        
        if (addressData.last_name !== undefined) {
          addressData.last_name = validateUnicodeAddressText(addressData.last_name, 'Last name', 255);
        }
        
        if (addressData.company !== undefined && addressData.company !== '') {
          addressData.company = validateUnicodeAddressText(addressData.company, 'Company name', 255);
        }
        
        if (addressData.phone !== undefined && addressData.phone !== '') {
          addressData.phone = validateInternationalPhone(addressData.phone);
        }
        
      } catch (validationError) {
        return {
          content: [
            {
              type: 'text',
              text: `Address Validation Error: ${validationError.message}\n\nTips for international addresses:\n- Use proper Unicode characters (letters, numbers, spaces)\n- Avoid control characters or special symbols\n- Maximum lengths: Address (255), City/Province (100), Names (255)\n- Postal codes: 2-12 characters, alphanumeric with spaces/hyphens\n- Phone numbers: International format (+1-555-123-4567)\n\nCountry-specific postal code formats:\n- US: 12345 or 12345-6789\n- Canada: A1A 1A1 or A1A1A1\n- UK: SW1A 1AA or M1 1AA`,
            },
          ],
          isError: true,
        };
      }
      
      const address = await client.createAddress(addressData, args.customer_id, args.customer_email);
      
      return {
        content: [
          {
            type: 'text',
            text: `Created Address:\n${JSON.stringify(address, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'update_address',
    description: 'Update an existing address',
    inputSchema: updateAddressSchema,
    execute: async (client, args) => {
      const { address_id } = args;
      const addressData = { ...args };
      delete addressData.address_id;
      delete addressData.customer_id;
      delete addressData.customer_email;
      delete addressData.session_token;
      delete addressData.admin_token;
      delete addressData.store_url;
      
      // Normalize and validate Unicode text fields
      try {
        if (addressData.address1 !== undefined) {
          addressData.address1 = validateUnicodeAddressText(addressData.address1, 'Street address', 255);
        }
        
        if (addressData.address2 !== undefined && addressData.address2 !== '') {
          addressData.address2 = validateUnicodeAddressText(addressData.address2, 'Address line 2', 255);
        }
        
        if (addressData.city !== undefined) {
          addressData.city = validateUnicodeAddressText(addressData.city, 'City', 100);
        }
        
        if (addressData.province !== undefined) {
          addressData.province = validateUnicodeAddressText(addressData.province, 'Province/State', 100);
        }
        
        if (addressData.zip !== undefined) {
          addressData.zip = validatePostalCode(addressData.zip, addressData.country);
        }
        
        if (addressData.country !== undefined) {
          addressData.country = validateUnicodeAddressText(addressData.country, 'Country', 100);
        }
        
        if (addressData.first_name !== undefined) {
          addressData.first_name = validateUnicodeAddressText(addressData.first_name, 'First name', 255);
        }
        
        if (addressData.last_name !== undefined) {
          addressData.last_name = validateUnicodeAddressText(addressData.last_name, 'Last name', 255);
        }
        
        if (addressData.company !== undefined && addressData.company !== '') {
          addressData.company = validateUnicodeAddressText(addressData.company, 'Company name', 255);
        }
        
        if (addressData.phone !== undefined && addressData.phone !== '') {
          addressData.phone = validateInternationalPhone(addressData.phone);
        }
        
      } catch (validationError) {
        return {
          content: [
            {
              type: 'text',
              text: `Address Validation Error: ${validationError.message}\n\nTips for international addresses:\n- Use proper Unicode characters (letters, numbers, spaces)\n- Avoid control characters or special symbols\n- Maximum lengths: Address (255), City/Province (100), Names (255)\n- Postal codes: 2-12 characters, alphanumeric with spaces/hyphens\n- Phone numbers: International format (+1-555-123-4567)\n\nCountry-specific postal code formats:\n- US: 12345 or 12345-6789\n- Canada: A1A 1A1 or A1A1A1\n- UK: SW1A 1AA or M1 1AA`,
            },
          ],
          isError: true,
        };
      }
      
      const updatedAddress = await client.updateAddress(address_id, addressData, args.customer_id, args.customer_email);
      
      return {
        content: [
          {
            type: 'text',
            text: `Updated Address:\n${JSON.stringify(updatedAddress, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'delete_address',
    description: 'Delete an address',
    inputSchema: addressSchema,
    execute: async (client, args) => {
      const { address_id } = args;
      const result = await client.deleteAddress(address_id, args.customer_id, args.customer_email);
      
      return {
        content: [
          {
            type: 'text',
            text: `Deleted Address:\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    },
  },
];