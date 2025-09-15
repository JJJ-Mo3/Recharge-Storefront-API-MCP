import { z } from 'zod';

const baseSchema = z.object({
  customer_id: z.string().optional().describe('Customer ID for automatic session creation (optional, used when no session_token provided)'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup and session creation (optional, used when no session_token or customer_id provided)'),
  session_token: z.string().optional().describe('Recharge session token (optional, takes precedence over environment variable if provided)'),
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
});

const bundleListSchema = z.object({
  customer_id: z.string().optional().describe('Customer ID for automatic session creation (optional, used when no session_token provided)'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup and session creation (optional, used when no session_token or customer_id provided)'),
  session_token: z.string().optional().describe('Recharge session token (optional, takes precedence over environment variable if provided)'),
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
  subscription_id: z.string().optional().describe('Filter by subscription ID'),
  limit: z.number().max(250).default(50).describe('Number of bundles to return'),
  page: z.number().default(1).describe('Page number for pagination'),
});

const bundleSchema = z.object({
  customer_id: z.string().optional().describe('Customer ID for automatic session creation (optional, used when no session_token provided)'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup and session creation (optional, used when no session_token or customer_id provided)'),
  session_token: z.string().optional().describe('Recharge session token (optional, takes precedence over environment variable if provided)'),
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
  bundle_id: z.string().describe('The bundle ID'),
});

const bundleSelectionsSchema = z.object({
  customer_id: z.string().optional().describe('Customer ID for automatic session creation (optional, used when no session_token provided)'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup and session creation (optional, used when no session_token or customer_id provided)'),
  session_token: z.string().optional().describe('Recharge session token (optional, takes precedence over environment variable if provided)'),
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
  bundle_id: z.string().describe('The bundle ID'),
  limit: z.number().max(250).default(50).describe('Number of selections to return'),
});

const bundleSelectionSchema = z.object({
  customer_id: z.string().optional().describe('Customer ID for automatic session creation (optional, used when no session_token provided)'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup and session creation (optional, used when no session_token or customer_id provided)'),
  session_token: z.string().optional().describe('Recharge session token (optional, takes precedence over environment variable if provided)'),
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
  bundle_selection_id: z.string().describe('The bundle selection ID'),
});

const createBundleSelectionSchema = z.object({
  customer_id: z.string().optional().describe('Customer ID for automatic session creation (optional, used when no session_token provided)'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup and session creation (optional, used when no session_token or customer_id provided)'),
  session_token: z.string().optional().describe('Recharge session token (optional, takes precedence over environment variable if provided)'),
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
  bundle_id: z.string().describe('The bundle ID'),
  variant_id: z.number().describe('Selected variant ID'),
  quantity: z.number().describe('Quantity selected'),
  external_variant_id: z.number().optional().describe('External variant ID'),
});

const updateBundleSelectionSchema = z.object({
  customer_id: z.string().optional().describe('Customer ID for automatic session creation (optional, used when no session_token provided)'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup and session creation (optional, used when no session_token or customer_id provided)'),
  session_token: z.string().optional().describe('Recharge session token (optional, takes precedence over environment variable if provided)'),
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
  bundle_selection_id: z.string().describe('The bundle selection ID'),
  variant_id: z.number().optional().describe('Selected variant ID'),
  quantity: z.number().optional().describe('Quantity selected'),
  external_variant_id: z.number().optional().describe('External variant ID'),
}).refine(data => {
  // At least one field to update must be provided
  const updateFields = ['variant_id', 'quantity', 'external_variant_id'];
  return updateFields.some(field => data[field] !== undefined);
}, {
  message: "At least one field to update must be provided"
});

export const bundleTools = [
  {
    name: 'get_bundles',
    description: 'Get bundles for a specific customer',
    inputSchema: bundleListSchema,
    execute: async (client, args) => {
      const params = { ...args };
      delete params.customer_id;
      delete params.customer_email;
      delete params.session_token;
      delete params.admin_token;
      delete params.store_url;
      const bundles = await client.getBundles(params, args.customer_id, args.customer_email, args.session_token);
      
      return {
        content: [
          {
            type: 'text',
            text: `Bundles:\n${JSON.stringify(bundles, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'get_bundle',
    description: 'Get detailed information about a specific bundle',
    inputSchema: bundleSchema,
    execute: async (client, args) => {
      const { bundle_id } = args;
      const bundle = await client.getBundle(bundle_id, args.customer_id, args.customer_email, args.session_token);
      
      return {
        content: [
          {
            type: 'text',
            text: `Bundle Details:\n${JSON.stringify(bundle, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'get_bundle_selections',
    description: 'Get bundle selections for a specific bundle',
    inputSchema: bundleSelectionsSchema,
    execute: async (client, args) => {
      const { bundle_id } = args;
      const params = { ...args };
      delete params.bundle_id;
      delete params.customer_id;
      delete params.customer_email;
      delete params.session_token;
      delete params.admin_token;
      delete params.store_url;
      const selections = await client.getBundleSelections(bundle_id, params, args.customer_id, args.customer_email, args.session_token);
      
      return {
        content: [
          {
            type: 'text',
            text: `Bundle Selections:\n${JSON.stringify(selections, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'get_bundle_selection',
    description: 'Get detailed information about a specific bundle selection',
    inputSchema: bundleSelectionSchema,
    execute: async (client, args) => {
      const { bundle_selection_id } = args;
      const selection = await client.getBundleSelection(bundle_selection_id, args.customer_id, args.customer_email, args.session_token);
      
      return {
        content: [
          {
            type: 'text',
            text: `Bundle Selection Details:\n${JSON.stringify(selection, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'create_bundle_selection',
    description: 'Create a bundle selection',
    inputSchema: createBundleSelectionSchema,
    execute: async (client, args) => {
      const selectionData = { ...args };
      delete selectionData.customer_id;
      delete selectionData.customer_email;
      delete selectionData.session_token;
      delete selectionData.admin_token;
      delete selectionData.store_url;
      const selection = await client.createBundleSelection(selectionData, args.customer_id, args.customer_email, args.session_token);
      
      return {
        content: [
          {
            type: 'text',
            text: `Created Bundle Selection:\n${JSON.stringify(selection, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'update_bundle_selection',
    description: 'Update a bundle selection',
    inputSchema: updateBundleSelectionSchema,
    execute: async (client, args) => {
      const { bundle_selection_id } = args;
      const selectionData = { ...args };
      delete selectionData.bundle_selection_id;
      delete selectionData.customer_id;
      delete selectionData.customer_email;
      delete selectionData.session_token;
      delete selectionData.admin_token;
      delete selectionData.store_url;
      const updatedSelection = await client.updateBundleSelection(bundle_selection_id, selectionData, args.customer_id, args.customer_email, args.session_token);
      
      return {
        content: [
          {
            type: 'text',
            text: `Updated Bundle Selection:\n${JSON.stringify(updatedSelection, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'delete_bundle_selection',
    description: 'Delete a bundle selection',
    inputSchema: bundleSelectionSchema,
    execute: async (client, args) => {
      const { bundle_selection_id } = args;
      const result = await client.deleteBundleSelection(bundle_selection_id, args.customer_id, args.customer_email, args.session_token);
      
      return {
        content: [
          {
            type: 'text',
            text: `Deleted Bundle Selection:\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    },
  },
];