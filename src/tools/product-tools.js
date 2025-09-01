import { z } from 'zod';

const baseSchema = z.object({
  customer_id: z.string().optional().describe('Customer ID for automatic session creation (optional, used when no session_token provided)'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup and session creation (optional, used when no session_token or customer_id provided)'),
  session_token: z.string().optional().describe('Recharge session token (optional, takes precedence over environment variable if provided)'),
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
});

const productListSchema = z.object({
  customer_id: z.string().optional().describe('Customer ID for automatic session creation (optional, used when no session_token provided)'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup and session creation (optional, used when no session_token or customer_id provided)'),
  session_token: z.string().optional().describe('Recharge session token (optional, takes precedence over environment variable if provided)'),
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
  limit: z.number().max(250).default(50).describe('Number of products to return'),
  handle: z.string().optional().describe('Filter by product handle'),
  subscription_defaults: z.boolean().optional().describe('Include subscription defaults'),
});

const productSchema = z.object({
  customer_id: z.string().optional().describe('Customer ID for automatic session creation (optional, used when no session_token provided)'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup and session creation (optional, used when no session_token or customer_id provided)'),
  session_token: z.string().optional().describe('Recharge session token (optional, takes precedence over environment variable if provided)'),
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
  product_id: z.string().describe('The product ID'),
});

export const productTools = [
  {
    name: 'get_products',
    description: 'Get available products with optional filtering',
    inputSchema: productListSchema,
    execute: async (client, args, context) => {
      const params = { ...args };
      delete params.customer_id;
      delete params.customer_email;
      delete params.session_token;
      delete params.admin_token;
      delete params.store_url;
      
      let products;
      if (context?.customerId || context?.customerEmail) {
        products = await client.makeCustomerRequest('GET', '/products', null, params, context.customerId, context.customerEmail);
      } else {
        products = await client.getProducts(params, null, null);
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `Products:\n${JSON.stringify(products, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'get_product',
    description: 'Get detailed information about a specific product',
    inputSchema: productSchema,
    execute: async (client, args, context) => {
      const { product_id } = args;
      
      let product;
      if (context?.customerId || context?.customerEmail) {
        product = await client.makeCustomerRequest('GET', `/products/${product_id}`, null, null, context.customerId, context.customerEmail);
      } else {
        product = await client.getProduct(product_id, null, null);
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `Product Details:\n${JSON.stringify(product, null, 2)}`,
          },
        ],
      };
    },
  },
];