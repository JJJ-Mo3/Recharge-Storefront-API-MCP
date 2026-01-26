/**
 * Charge management tools
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

const chargeListSchema = z.object({
  customer_id: z.string().optional().describe('Customer ID for automatic session creation (optional, used when no session_token provided)'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup and session creation (optional, used when no session_token or customer_id provided)'),
  session_token: z.string().optional().describe('Recharge session token (optional, takes precedence over environment variable if provided)'),
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
  status: z.string().optional().describe('Filter by charge status'),
  limit: z.number().max(250).default(50).describe('Number of charges to return'),
  page: z.number().default(1).describe('Page number for pagination'),
});

const chargeSchema = z.object({
  customer_id: z.string().optional().describe('Customer ID for automatic session creation (optional, used when no session_token provided)'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup and session creation (optional, used when no session_token or customer_id provided)'),
  session_token: z.string().optional().describe('Recharge session token (optional, takes precedence over environment variable if provided)'),
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
  charge_id: z.string().describe('The charge ID'),
});

const chargeDiscountSchema = z.object({
  customer_id: z.string().optional().describe('Customer ID for automatic session creation'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup'),
  session_token: z.string().optional().describe('Recharge session token'),
  admin_token: z.string().optional().describe('Recharge admin token'),
  store_url: z.string().optional().describe('Store URL'),
  charge_id: z.string().describe('The charge ID'),
  discount_code: z.string().describe('The discount code to apply'),
});

const chargeRescheduleSchema = z.object({
  customer_id: z.string().optional().describe('Customer ID for automatic session creation'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup'),
  session_token: z.string().optional().describe('Recharge session token'),
  admin_token: z.string().optional().describe('Recharge admin token'),
  store_url: z.string().optional().describe('Store URL'),
  charge_id: z.string().describe('The charge ID'),
  scheduled_at: z.string().describe('New scheduled date (YYYY-MM-DD format)'),
});

export const chargeTools = [
  {
    name: 'get_charges',
    description: 'Get charges for a specific customer',
    inputSchema: chargeListSchema,
    execute: async (client, args) => {
      const params = { ...args };
      delete params.customer_id;
      delete params.customer_email;
      delete params.session_token;
      delete params.admin_token;
      delete params.store_url;
      const charges = await client.getCharges(params, args.customer_id, args.customer_email, args.session_token);
      
      return {
        content: [
          {
            type: 'text',
            text: `Charges:\n${JSON.stringify(charges, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'get_charge',
    description: 'Get detailed information about a specific charge',
    inputSchema: chargeSchema,
    execute: async (client, args) => {
      const { charge_id } = args;
      const charge = await client.getCharge(charge_id, args.customer_id, args.customer_email, args.session_token);

      return {
        content: [
          {
            type: 'text',
            text: `Charge Details:\n${JSON.stringify(charge, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'apply_discount_to_charge',
    description: 'Apply a discount code to a specific charge',
    inputSchema: chargeDiscountSchema,
    execute: async (client, args) => {
      const { charge_id, discount_code } = args;
      const result = await client.post(`/charges/${charge_id}/apply_discount`, { discount_code }, args.customer_id, args.customer_email, args.session_token);

      return {
        content: [
          {
            type: 'text',
            text: `Discount applied to charge:\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'remove_discount_from_charge',
    description: 'Remove all discounts from a specific charge',
    inputSchema: chargeSchema,
    execute: async (client, args) => {
      const { charge_id } = args;
      const result = await client.post(`/charges/${charge_id}/remove_discount`, {}, args.customer_id, args.customer_email, args.session_token);

      return {
        content: [
          {
            type: 'text',
            text: `Discounts removed from charge:\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'skip_charge',
    description: 'Skip a scheduled charge (it will not be processed)',
    inputSchema: chargeSchema,
    execute: async (client, args) => {
      const { charge_id } = args;
      const result = await client.post(`/charges/${charge_id}/skip`, {}, args.customer_id, args.customer_email, args.session_token);

      return {
        content: [
          {
            type: 'text',
            text: `Charge skipped:\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'unskip_charge',
    description: 'Unskip a previously skipped charge',
    inputSchema: chargeSchema,
    execute: async (client, args) => {
      const { charge_id } = args;
      const result = await client.post(`/charges/${charge_id}/unskip`, {}, args.customer_id, args.customer_email, args.session_token);

      return {
        content: [
          {
            type: 'text',
            text: `Charge unskipped:\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'process_charge',
    description: 'Process a charge immediately (attempt to charge the customer now)',
    inputSchema: chargeSchema,
    execute: async (client, args) => {
      const { charge_id } = args;
      const result = await client.post(`/charges/${charge_id}/process`, {}, args.customer_id, args.customer_email, args.session_token);

      return {
        content: [
          {
            type: 'text',
            text: `Charge processed:\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'reschedule_charge',
    description: 'Reschedule a charge to a different date',
    inputSchema: chargeRescheduleSchema,
    execute: async (client, args) => {
      const { charge_id, scheduled_at } = args;
      const result = await client.post(`/charges/${charge_id}/change_date`, { scheduled_at }, args.customer_id, args.customer_email, args.session_token);

      return {
        content: [
          {
            type: 'text',
            text: `Charge rescheduled:\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    },
  },
];