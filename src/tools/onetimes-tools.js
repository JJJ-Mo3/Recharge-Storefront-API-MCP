/**
 * One-time product management tools
 * Last updated: 2024-12-24
 */
import { z } from 'zod';

const baseSchema = z.object({
  customer_id: z.string().optional().describe('Customer ID for automatic session creation (optional, used when no session_token provided)'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup and session creation (optional, used when no session_token or customer_id provided)'),
  session_token: z.string().optional().describe('Recharge session token (optional, takes precedence over environment variable if provided)'),
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
});

const onetimeSchema = z.object({
  customer_id: z.string().optional().describe('Customer ID for automatic session creation (optional, used when no session_token provided)'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup and session creation (optional, used when no session_token or customer_id provided)'),
  session_token: z.string().optional().describe('Recharge session token (optional, takes precedence over environment variable if provided)'),
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
  onetime_id: z.string().describe('The one-time product ID'),
});

const createOnetimeSchema = z.object({
  customer_id: z.string().optional().describe('Customer ID for automatic session creation (optional, used when no session_token provided)'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup and session creation (optional, used when no session_token or customer_id provided)'),
  session_token: z.string().optional().describe('Recharge session token (optional, takes precedence over environment variable if provided)'),
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
  variant_id: z.number().describe('Product variant ID'),
  quantity: z.number().describe('Quantity'),
  next_charge_scheduled_at: z.string().describe('Next charge date (YYYY-MM-DD format)'),
  price: z.number().optional().describe('Price override'),
  properties: z.array(z.object({
    name: z.string(),
    value: z.string(),
  })).optional().describe('Product properties'),
});

const updateOnetimeSchema = z.object({
  customer_id: z.string().optional().describe('Customer ID for automatic session creation (optional, used when no session_token provided)'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup and session creation (optional, used when no session_token or customer_id provided)'),
  session_token: z.string().optional().describe('Recharge session token (optional, takes precedence over environment variable if provided)'),
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
  onetime_id: z.string().describe('The one-time product ID'),
  quantity: z.number().optional().describe('Quantity'),
  price: z.number().optional().describe('Price override'),
  next_charge_scheduled_at: z.string().optional().describe('Next charge date (YYYY-MM-DD format)'),
  properties: z.array(z.object({
    name: z.string(),
    value: z.string(),
  })).optional().describe('Product properties'),
}).refine(data => {
  // At least one field to update must be provided
  const updateFields = ['quantity', 'price', 'next_charge_scheduled_at', 'properties'];
  return updateFields.some(field => data[field] !== undefined);
}, {
  message: "At least one field to update must be provided"
});

export const onetimeTools = [
  {
    name: 'get_onetimes',
    description: 'Get one-time products for a specific customer',
    inputSchema: baseSchema,
    execute: async (client, args) => {
      const onetimes = await client.getOnetimes({}, args.customer_id, args.customer_email, args.session_token);
      return {
        content: [
          {
            type: 'text',
            text: `One-time Products:\n${JSON.stringify(onetimes, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'get_onetime',
    description: 'Get detailed information about a specific one-time product',
    inputSchema: onetimeSchema,
    execute: async (client, args) => {
      const { onetime_id } = args;
      const onetime = await client.getOnetime(onetime_id, args.customer_id, args.customer_email, args.session_token);
      
      return {
        content: [
          {
            type: 'text',
            text: `One-time Product Details:\n${JSON.stringify(onetime, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'create_onetime',
    description: 'Create a one-time product to add to next delivery',
    inputSchema: createOnetimeSchema,
    execute: async (client, args) => {
      const onetimeData = { ...args };
      delete onetimeData.customer_id;
      delete onetimeData.customer_email;
      delete onetimeData.session_token;
      delete onetimeData.admin_token;
      delete onetimeData.store_url;
      const onetime = await client.createOnetime(onetimeData, args.customer_id, args.customer_email, args.session_token);
      
      return {
        content: [
          {
            type: 'text',
            text: `Created One-time Product:\n${JSON.stringify(onetime, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'update_onetime',
    description: 'Update a one-time product',
    inputSchema: updateOnetimeSchema,
    execute: async (client, args) => {
      const { onetime_id } = args;
      const onetimeData = { ...args };
      delete onetimeData.onetime_id;
      delete onetimeData.customer_id;
      delete onetimeData.customer_email;
      delete onetimeData.session_token;
      delete onetimeData.admin_token;
      delete onetimeData.store_url;
      const updatedOnetime = await client.updateOnetime(onetime_id, onetimeData, args.customer_id, args.customer_email, args.session_token);
      
      return {
        content: [
          {
            type: 'text',
            text: `Updated One-time Product:\n${JSON.stringify(updatedOnetime, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'delete_onetime',
    description: 'Delete a one-time product',
    inputSchema: onetimeSchema,
    execute: async (client, args) => {
      const { onetime_id } = args;
      const result = await client.deleteOnetime(onetime_id, args.customer_id, args.customer_email, args.session_token);
      
      return {
        content: [
          {
            type: 'text',
            text: `Deleted One-time Product:\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    },
  },
];