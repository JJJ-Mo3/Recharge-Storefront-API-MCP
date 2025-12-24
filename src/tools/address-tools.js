/**
 * Address management tools
 * Last updated: 2024-12-24
 */
import { z } from 'zod';
import { validateUnicodeAddressText, validatePostalCode, validatePhoneNumber } from '../utils/unicode-helpers.js';

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
    .refine(val => /^[\p{L}\p{M}\p{N}\p{Pd}\p{Po}\p{Zs}]+$/u.test(val.trim()), {
      message: "Street address contains unsupported characters. Only letters, numbers, basic punctuation, and spaces are allowed."
    }),
  address2: z.string().max(255).optional().describe('Apartment, suite, etc. (supports international characters)')
    .refine(val => val === undefined || val === '' || /^[\p{L}\p{M}\p{N}\p{Pd}\p{Po}\p{Zs}]+$/u.test(val.trim()), {
      message: "Address line 2 contains unsupported characters. Only letters, numbers, basic punctuation, and spaces are allowed."
    }),
  city: z.string().min(1).max(100).describe('City (supports international characters)')
    .refine(val => /^[\p{L}\p{M}\p{N}\p{Pd}\p{Po}\p{Zs}]+$/u.test(val.trim()), {
      message: "City contains unsupported characters. Only letters, numbers, basic punctuation, and spaces are allowed."
    }),
  province: z.string().min(1).max(100).describe('State/Province (supports international characters)')
    .refine(val => /^[\p{L}\p{M}\p{N}\p{Pd}\p{Po}\p{Zs}]+$/u.test(val.trim()), {
      message: "Province/State contains unsupported characters. Only letters, numbers, basic punctuation, and spaces are allowed."
    }),
  zip: z.string().min(2).max(12).describe('ZIP/Postal code (international formats supported)')
    .refine(val => /^[\p{L}\p{N}\s\-]{2,12}$/u.test(val.trim()), {
      message: "Postal code format is invalid"
    }),
  country: z.string().min(2).max(100).describe('Country (full name or ISO code)')
    .refine(val => /^[\p{L}\p{M}\p{N}\p{Pd}\p{Po}\p{Zs}]+$/u.test(val.trim()), {
      message: "Country contains unsupported characters. Only letters, numbers, basic punctuation, and spaces are allowed."
    }),
  first_name: z.string().min(1).max(255).describe('First name (supports international characters)')
    .refine(val => /^[\p{L}\p{M}\p{N}\p{Pd}\p{Po}\p{Zs}]+$/u.test(val.trim()), {
      message: "First name contains unsupported characters. Only letters, numbers, basic punctuation, and spaces are allowed."
    }),
  last_name: z.string().min(1).max(255).describe('Last name (supports international characters)')
    .refine(val => /^[\p{L}\p{M}\p{N}\p{Pd}\p{Po}\p{Zs}]+$/u.test(val.trim()), {
      message: "Last name contains unsupported characters. Only letters, numbers, basic punctuation, and spaces are allowed."
    }),
  company: z.string().max(255).optional().describe('Company name (supports international characters)')
    .refine(val => val === undefined || val === '' || /^[\p{L}\p{M}\p{N}\p{Pd}\p{Po}\p{Zs}]+$/u.test(val.trim()), {
      message: "Company name contains unsupported characters. Only letters, numbers, basic punctuation, and spaces are allowed."
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
    .refine(val => val === undefined || /^[\p{L}\p{M}\p{N}\p{Pd}\p{Po}\p{Zs}]+$/u.test(val.trim()), {
      message: "Street address contains unsupported characters. Only letters, numbers, basic punctuation, and spaces are allowed."
    }),
  address2: z.string().max(255).optional().describe('Apartment, suite, etc. (supports international characters)')
    .refine(val => val === undefined || val === '' || /^[\p{L}\p{M}\p{N}\p{Pd}\p{Po}\p{Zs}]+$/u.test(val.trim()), {
      message: "Address line 2 contains unsupported characters. Only letters, numbers, basic punctuation, and spaces are allowed."
    }),
  city: z.string().min(1).max(100).optional().describe('City (supports international characters)')
    .refine(val => val === undefined || /^[\p{L}\p{M}\p{N}\p{Pd}\p{Po}\p{Zs}]+$/u.test(val.trim()), {
      message: "City contains unsupported characters. Only letters, numbers, basic punctuation, and spaces are allowed."
    }),
  province: z.string().min(1).max(100).optional().describe('State/Province (supports international characters)')
    .refine(val => val === undefined || /^[\p{L}\p{M}\p{N}\p{Pd}\p{Po}\p{Zs}]+$/u.test(val.trim()), {
      message: "Province/State contains unsupported characters. Only letters, numbers, basic punctuation, and spaces are allowed."
    }),
  zip: z.string().min(2).max(12).optional().describe('ZIP/Postal code (international formats supported)')
    .refine(val => val === undefined || /^[\p{L}\p{N}\s\-]{2,12}$/u.test(val.trim()), {
      message: "Postal code format is invalid"
    }),
  country: z.string().min(2).max(100).optional().describe('Country (full name or ISO code)')
    .refine(val => val === undefined || /^[\p{L}\p{M}\p{N}\p{Pd}\p{Po}\p{Zs}]+$/u.test(val.trim()), {
      message: "Country contains unsupported characters. Only letters, numbers, basic punctuation, and spaces are allowed."
    }),
  first_name: z.string().min(1).max(255).optional().describe('First name (supports international characters)')
    .refine(val => val === undefined || /^[\p{L}\p{M}\p{N}\p{Pd}\p{Po}\p{Zs}]+$/u.test(val.trim()), {
      message: "First name contains unsupported characters. Only letters, numbers, basic punctuation, and spaces are allowed."
    }),
  last_name: z.string().min(1).max(255).optional().describe('Last name (supports international characters)')
    .refine(val => val === undefined || /^[\p{L}\p{M}\p{N}\p{Pd}\p{Po}\p{Zs}]+$/u.test(val.trim()), {
      message: "Last name contains unsupported characters. Only letters, numbers, basic punctuation, and spaces are allowed."
    }),
  company: z.string().max(255).optional().describe('Company name (supports international characters)')
    .refine(val => val === undefined || val === '' || /^[\p{L}\p{M}\p{N}\p{Pd}\p{Po}\p{Zs}]+$/u.test(val.trim()), {
      message: "Company name contains unsupported characters. Only letters, numbers, basic punctuation, and spaces are allowed."
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
      const addresses = await client.getAddresses({}, args.customer_id, args.customer_email, args.session_token);
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
      const address = await client.getAddress(address_id, args.customer_id, args.customer_email, args.session_token);
      
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
          addressData.phone = validatePhoneNumber(addressData.phone);
        }
        
      } catch (validationError) {
        return {
          content: [
            {
              type: 'text',
              text: `Address Validation Error: ${validationError.message}\n\nTips for international addresses:\n- Use proper Unicode characters (letters, numbers, spaces)\n- Basic punctuation allowed: hyphens (-), periods (.), apostrophes (')\n- Emojis and special symbols are NOT supported by shipping providers\n- Maximum lengths: Address (255), City/Province (100), Names (255)\n- Postal codes: 2-12 characters, alphanumeric with spaces/hyphens\n- Phone numbers: International format (+1-555-123-4567)\n\nCountry-specific postal code formats:\n- US: 12345 or 12345-6789\n- Canada: A1A 1A1 or A1A1A1\n- UK: SW1A 1AA or M1 1AA`,
            },
          ],
          isError: true,
        };
      }
      
      const address = await client.createAddress(addressData, args.customer_id, args.customer_email, args.session_token);
      
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
          addressData.phone = validatePhoneNumber(addressData.phone);
        }
        
      } catch (validationError) {
        return {
          content: [
            {
              type: 'text',
              text: `Address Validation Error: ${validationError.message}\n\nTips for international addresses:\n- Use proper Unicode characters (letters, numbers, spaces)\n- Basic punctuation allowed: hyphens (-), periods (.), apostrophes (')\n- Emojis and special symbols are NOT supported by shipping providers\n- Maximum lengths: Address (255), City/Province (100), Names (255)\n- Postal codes: 2-12 characters, alphanumeric with spaces/hyphens\n- Phone numbers: International format (+1-555-123-4567)\n\nCountry-specific postal code formats:\n- US: 12345 or 12345-6789\n- Canada: A1A 1A1 or A1A1A1\n- UK: SW1A 1AA or M1 1AA`,
            },
          ],
          isError: true,
        };
      }
      
      const updatedAddress = await client.updateAddress(address_id, addressData, args.customer_id, args.customer_email, args.session_token);
      
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
      const result = await client.deleteAddress(address_id, args.customer_id, args.customer_email, args.session_token);
      
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