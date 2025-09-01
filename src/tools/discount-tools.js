import { z } from 'zod';

const baseSchema = z.object({
  customer_id: z.string().optional().describe('Customer ID for automatic session creation (optional, used when no session_token provided)'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup and session creation (optional, used when no session_token or customer_id provided)'),
  session_token: z.string().optional().describe('Recharge session token (optional, takes precedence over environment variable if provided)'),
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
});

const discountListSchema = z.object({
  customer_id: z.string().optional().describe('Customer ID for automatic session creation (optional, used when no session_token provided)'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup and session creation (optional, used when no session_token or customer_id provided)'),
  session_token: z.string().optional().describe('Recharge session token (optional, takes precedence over environment variable if provided)'),
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
  limit: z.number().max(250).default(50).describe('Number of discounts to return'),
  page: z.number().default(1).describe('Page number for pagination'),
});

const discountSchema = z.object({
  customer_id: z.string().optional().describe('Customer ID for automatic session creation (optional, used when no session_token provided)'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup and session creation (optional, used when no session_token or customer_id provided)'),
  session_token: z.string().optional().describe('Recharge session token (optional, takes precedence over environment variable if provided)'),
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
  discount_id: z.string().describe('The discount ID'),
});

const applyDiscountSchema = z.object({
  customer_id: z.string().optional().describe('Customer ID for automatic session creation (optional, used when no session_token provided)'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup and session creation (optional, used when no session_token or customer_id provided)'),
  session_token: z.string().optional().describe('Recharge session token (optional, takes precedence over environment variable if provided)'),
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
  discount_code: z.string().describe('The discount code to apply'),
});

export const discountTools = [
  {
    name: 'get_discounts',
    description: 'Get discounts for a specific customer',
    inputSchema: discountListSchema,
    execute: async (client, args, context) => {
      const params = { ...args };
      delete params.customer_id;
      delete params.customer_email;
      delete params.session_token;
      delete params.admin_token;
      delete params.store_url;
      
      let discounts;
      if (context?.customerId || context?.customerEmail) {
        discounts = await client.makeCustomerRequest('GET', '/discounts', null, params, context.customerId, context.customerEmail);
      } else {
        discounts = await client.getDiscounts(params);
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `Discounts:\n${JSON.stringify(discounts, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'get_discount',
    description: 'Get detailed information about a specific discount',
    inputSchema: discountSchema,
    execute: async (client, args, context) => {
      const { discount_id } = args;
      
      let discount;
      if (context?.customerId || context?.customerEmail) {
        discount = await client.makeCustomerRequest('GET', `/discounts/${discount_id}`, null, null, context.customerId, context.customerEmail);
      } else {
        discount = await client.getDiscount(discount_id);
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `Discount Details:\n${JSON.stringify(discount, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'apply_discount',
    description: 'Apply a discount code',
    inputSchema: applyDiscountSchema,
    execute: async (client, args, context) => {
      const { discount_code } = args;
      
      let discount;
      if (context?.customerId || context?.customerEmail) {
        discount = await client.makeCustomerRequest('POST', '/discounts', { discount_code }, null, context.customerId, context.customerEmail);
      } else {
        discount = await client.applyDiscount(discount_code);
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `Applied Discount:\n${JSON.stringify(discount, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'remove_discount',
    description: 'Remove a discount',
    inputSchema: discountSchema,
    execute: async (client, args, context) => {
      const { discount_id } = args;
      
      let result;
      if (context?.customerId || context?.customerEmail) {
        result = await client.makeCustomerRequest('DELETE', `/discounts/${discount_id}`, null, null, context.customerId, context.customerEmail);
      } else {
        result = await client.removeDiscount(discount_id);
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `Removed Discount:\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    },
  },
];