import { z } from 'zod';

const baseSchema = z.object({
  customer_id: z.string().optional().describe('Customer ID for automatic session creation (optional, used when no session_token provided)'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup and session creation (optional, used when no session_token or customer_id provided)'),
  session_token: z.string().optional().describe('Recharge session token (optional, takes precedence over environment variable if provided)'),
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
});

const subscriptionListSchema = z.object({
  customer_id: z.string().optional().describe('Customer ID for automatic session creation (optional, used when no session_token provided)'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup and session creation (optional, used when no session_token or customer_id provided)'),
  session_token: z.string().optional().describe('Recharge session token (optional, takes precedence over environment variable if provided)'),
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
  status: z.enum(['active', 'cancelled', 'expired']).optional().describe('Filter by subscription status'),
  limit: z.number().max(250).default(50).describe('Number of subscriptions to return'),
  page: z.number().default(1).describe('Page number for pagination'),
});

const subscriptionSchema = z.object({
  customer_id: z.string().optional().describe('Customer ID for automatic session creation (optional, used when no session_token provided)'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup and session creation (optional, used when no session_token or customer_id provided)'),
  session_token: z.string().optional().describe('Recharge session token (optional, takes precedence over environment variable if provided)'),
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
  subscription_id: z.string().describe('The subscription ID'),
});

const updateSubscriptionSchema = z.object({
  customer_id: z.string().optional().describe('Customer ID for automatic session creation (optional, used when no session_token provided)'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup and session creation (optional, used when no session_token or customer_id provided)'),
  session_token: z.string().optional().describe('Recharge session token (optional, takes precedence over environment variable if provided)'),
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
  subscription_id: z.string().describe('The subscription ID'),
  next_charge_scheduled_at: z.string().optional().describe('Next charge date (ISO format)'),
  order_interval_frequency: z.number().min(1).max(365).optional().describe('Order interval frequency (1-365, e.g., 1, 2, 3)'),
  order_interval_unit: z.enum(['day', 'week', 'month']).optional().describe('Order interval unit'),
  quantity: z.number().min(1).max(1000).optional().describe('Subscription quantity (1-1000)'),
  variant_id: z.number().min(1).optional().describe('Product variant ID'),
  properties: z.array(z.object({
    name: z.string(),
    value: z.string(),
  })).optional().describe('Product properties'),
}).refine(data => {
  // At least one field to update must be provided
  const updateFields = ['next_charge_scheduled_at', 'order_interval_frequency', 'order_interval_unit', 'quantity', 'variant_id', 'properties'];
  return updateFields.some(field => data[field] !== undefined);
}, {
  message: "At least one field to update must be provided"
}).refine(data => {
  // If order_interval_frequency is provided, order_interval_unit should also be provided for clarity
  if (data.order_interval_frequency !== undefined && data.order_interval_unit === undefined) {
    return false;
  }
  return true;
}, {
  message: "When updating order_interval_frequency, order_interval_unit should also be specified for clarity"
}).refine(data => {
  // Validate frequency ranges based on unit
  if (data.order_interval_frequency !== undefined && data.order_interval_unit !== undefined) {
    const { order_interval_frequency: freq, order_interval_unit: unit } = data;
    
    if (unit === 'day' && (freq < 1 || freq > 90)) {
      return false; // Daily: 1-90 days max
    }
    if (unit === 'week' && (freq < 1 || freq > 52)) {
      return false; // Weekly: 1-52 weeks max
    }
    if (unit === 'month' && (freq < 1 || freq > 12)) {
      return false; // Monthly: 1-12 months max
    }
  }
  return true;
}, {
  message: "Invalid frequency range: Daily (1-90), Weekly (1-52), Monthly (1-12)"
});

const skipSubscriptionSchema = z.object({
  customer_id: z.string().optional().describe('Customer ID for automatic session creation (optional, used when no session_token provided)'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup and session creation (optional, used when no session_token or customer_id provided)'),
  session_token: z.string().optional().describe('Recharge session token (optional, takes precedence over environment variable if provided)'),
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
  subscription_id: z.string().describe('The subscription ID'),
  date: z.string().describe('Date to skip (YYYY-MM-DD format)'),
});

const unskipSubscriptionSchema = z.object({
  customer_id: z.string().optional().describe('Customer ID for automatic session creation (optional, used when no session_token provided)'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup and session creation (optional, used when no session_token or customer_id provided)'),
  session_token: z.string().optional().describe('Recharge session token (optional, takes precedence over environment variable if provided)'),
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
  subscription_id: z.string().describe('The subscription ID'),
  date: z.string().describe('Date to unskip (YYYY-MM-DD format)'),
});

const swapSubscriptionSchema = z.object({
  customer_id: z.string().optional().describe('Customer ID for automatic session creation (optional, used when no session_token provided)'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup and session creation (optional, used when no session_token or customer_id provided)'),
  session_token: z.string().optional().describe('Recharge session token (optional, takes precedence over environment variable if provided)'),
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
  subscription_id: z.string().describe('The subscription ID'),
  variant_id: z.number().describe('New variant ID to swap to'),
  quantity: z.number().optional().describe('New quantity'),
}).refine(data => data.variant_id > 0, {
  message: "variant_id must be greater than 0"
});

const cancelSubscriptionSchema = z.object({
  customer_id: z.string().optional().describe('Customer ID for automatic session creation (optional, used when no session_token provided)'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup and session creation (optional, used when no session_token or customer_id provided)'),
  session_token: z.string().optional().describe('Recharge session token (optional, takes precedence over environment variable if provided)'),
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
  subscription_id: z.string().describe('The subscription ID'),
  cancellation_reason: z.string().optional().describe('Reason for cancellation'),
  cancellation_reason_comments: z.string().optional().describe('Additional comments for cancellation'),
});

const setNextChargeDateSchema = z.object({
  customer_id: z.string().optional().describe('Customer ID for automatic session creation (optional, used when no session_token provided)'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup and session creation (optional, used when no session_token or customer_id provided)'),
  session_token: z.string().optional().describe('Recharge session token (optional, takes precedence over environment variable if provided)'),
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
  subscription_id: z.string().describe('The subscription ID'),
  date: z.string().describe('Next charge date (YYYY-MM-DD format)'),
});

const activateSubscriptionSchema = z.object({
  customer_id: z.string().optional().describe('Customer ID for automatic session creation (optional, used when no session_token provided)'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup and session creation (optional, used when no session_token or customer_id provided)'),
  session_token: z.string().optional().describe('Recharge session token (optional, takes precedence over environment variable if provided)'),
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
  subscription_id: z.string().describe('The subscription ID'),
});

const createSubscriptionSchema = z.object({
  customer_id: z.string().optional().describe('Customer ID for automatic session creation (optional, used when no session_token provided)'),
  customer_email: z.string().email().optional().describe('Customer email for automatic lookup and session creation (optional, used when no session_token or customer_id provided)'),
  session_token: z.string().optional().describe('Recharge session token (optional, takes precedence over environment variable if provided)'),
  admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
  store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
  address_id: z.string().describe('The address ID for the subscription'),
  next_charge_scheduled_at: z.string().describe('Next charge date (YYYY-MM-DD format)'),
  order_interval_frequency: z.number().describe('Order interval frequency (e.g., 1, 2, 3)'),
  order_interval_unit: z.enum(['day', 'week', 'month']).describe('Order interval unit'),
  quantity: z.number().describe('Subscription quantity'),
  variant_id: z.number().describe('Product variant ID'),
  properties: z.array(z.object({
    name: z.string(),
    value: z.string(),
  })).optional().describe('Product properties'),
});

export const subscriptionTools = [
  {
    name: 'get_subscriptions',
    description: 'Get subscriptions for a specific customer',
    inputSchema: subscriptionListSchema,
    execute: async (client, args) => {
      const params = { ...args };
      delete params.customer_id;
      delete params.customer_email;
      delete params.session_token;
      delete params.admin_token;
      delete params.store_url;
      
      const subscriptions = await client.getSubscriptions(params, args.customer_id, args.customer_email);
      
      return {
        content: [
          {
            type: 'text',
            text: `Subscriptions:\n${JSON.stringify(subscriptions, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'create_subscription',
    description: 'Create a new subscription',
    inputSchema: createSubscriptionSchema,
    execute: async (client, args) => {
      const subscriptionData = { ...args };
      delete subscriptionData.customer_id;
      delete subscriptionData.customer_email;
      delete subscriptionData.session_token;
      delete subscriptionData.admin_token;
      delete subscriptionData.store_url;
      const subscription = await client.createSubscription(subscriptionData, args.customer_id, args.customer_email);
      
      return {
        content: [
          {
            type: 'text',
            text: `Created Subscription:\n${JSON.stringify(subscription, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'get_subscription',
    description: 'Get detailed information about a specific subscription',
    inputSchema: subscriptionSchema,
    execute: async (client, args) => {
      const { subscription_id } = args;
      const subscription = await client.getSubscription(subscription_id, args.customer_id, args.customer_email);
      
      return {
        content: [
          {
            type: 'text',
            text: `Subscription Details:\n${JSON.stringify(subscription, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'update_subscription',
    description: 'Update subscription details like frequency, quantity, or next charge date',
    inputSchema: updateSubscriptionSchema,
    execute: async (client, args) => {
      // Additional business logic validation
      const { subscription_id, order_interval_frequency, order_interval_unit, quantity, variant_id, next_charge_scheduled_at } = args;
      
      // Validate next charge date is in the future
      if (next_charge_scheduled_at) {
        const nextChargeDate = new Date(next_charge_scheduled_at);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day
        
        if (nextChargeDate < today) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: Next charge date must be in the future. Provided: ${next_charge_scheduled_at}`,
              },
            ],
            isError: true,
          };
        }
      }
      
      // Validate frequency combination makes sense
      if (order_interval_frequency && order_interval_unit) {
        const totalDays = calculateTotalDays(order_interval_frequency, order_interval_unit);
        if (totalDays > 365) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: Subscription frequency too long (${totalDays} days). Maximum allowed is 365 days.`,
              },
            ],
            isError: true,
          };
        }
        
        // Warn about very short frequencies
        if (totalDays < 7) {
          console.warn(`Warning: Very short subscription frequency (${totalDays} days) may cause billing issues.`);
        }
      }
      
      const updateData = { ...args };
      delete updateData.subscription_id;
      delete updateData.customer_id;
      delete updateData.customer_email;
      delete updateData.session_token;
      delete updateData.admin_token;
      delete updateData.store_url;
      
      try {
        const updatedSubscription = await client.updateSubscription(subscription_id, updateData, args.customer_id, args.customer_email);
        
        return {
          content: [
            {
              type: 'text',
              text: `Updated Subscription:\n${JSON.stringify(updatedSubscription, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        // Enhanced error handling for common subscription update issues
        if (error.message.includes('frequency') || error.message.includes('interval')) {
          return {
            content: [
              {
                type: 'text',
                text: `Subscription Frequency Error: ${error.message}\n\nValid combinations:\n- Daily: 1-90 days\n- Weekly: 1-52 weeks\n- Monthly: 1-12 months\n\nExample: order_interval_frequency=2, order_interval_unit="week" for every 2 weeks`,
              },
            ],
            isError: true,
          };
        }
        
        if (error.message.includes('variant') || error.message.includes('product')) {
          return {
            content: [
              {
                type: 'text',
                text: `Product Variant Error: ${error.message}\n\nTip: Ensure the variant_id exists and is available for subscriptions. Use get_products to find valid variant IDs.`,
              },
            ],
            isError: true,
          };
        }
        
        if (error.message.includes('quantity')) {
          return {
            content: [
              {
                type: 'text',
                text: `Quantity Error: ${error.message}\n\nTip: Quantity must be between 1 and 1000. Check inventory limits for this product.`,
              },
            ],
            isError: true,
          };
        }
        
        // Re-throw for general error handling
        throw error;
      }
    },
  },
  {
    name: 'skip_subscription',
    description: 'Skip a subscription delivery for a specific date',
    inputSchema: skipSubscriptionSchema,
    execute: async (client, args) => {
      const { subscription_id, date } = args;
      const result = await client.skipSubscription(subscription_id, date, args.customer_id, args.customer_email);
      
      return {
        content: [
          {
            type: 'text',
            text: `Skipped Subscription:\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'unskip_subscription',
    description: 'Unskip a previously skipped subscription delivery',
    inputSchema: unskipSubscriptionSchema,
    execute: async (client, args) => {
      const { subscription_id, date } = args;
      const result = await client.unskipSubscription(subscription_id, date, args.customer_id, args.customer_email);
      
      return {
        content: [
          {
            type: 'text',
            text: `Unskipped Subscription:\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'swap_subscription',
    description: 'Swap the variant of a subscription',
    inputSchema: swapSubscriptionSchema,
    execute: async (client, args) => {
      const { subscription_id } = args;
      const swapData = { ...args };
      delete swapData.subscription_id;
      delete swapData.customer_id;
      delete swapData.customer_email;
      delete swapData.session_token;
      delete swapData.admin_token;
      delete swapData.store_url;
      const swappedSubscription = await client.swapSubscription(subscription_id, swapData, args.customer_id, args.customer_email);
      
      return {
        content: [
          {
            type: 'text',
            text: `Swapped Subscription Product:\n${JSON.stringify(swappedSubscription, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'cancel_subscription',
    description: 'Cancel a subscription',
    inputSchema: cancelSubscriptionSchema,
    execute: async (client, args) => {
      const { subscription_id } = args;
      const cancelData = { ...args };
      delete cancelData.subscription_id;
      delete cancelData.customer_id;
      delete cancelData.customer_email;
      delete cancelData.session_token;
      delete cancelData.admin_token;
      delete cancelData.store_url;
      const cancelledSubscription = await client.cancelSubscription(subscription_id, cancelData, args.customer_id, args.customer_email);
      
      return {
        content: [
          {
            type: 'text',
            text: `Cancelled Subscription:\n${JSON.stringify(cancelledSubscription, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'activate_subscription',
    description: 'Activate a cancelled subscription',
    inputSchema: activateSubscriptionSchema,
    execute: async (client, args) => {
      const { subscription_id } = args;
      const activatedSubscription = await client.activateSubscription(subscription_id, args.customer_id, args.customer_email);
      
      return {
        content: [
          {
            type: 'text',
            text: `Activated Subscription:\n${JSON.stringify(activatedSubscription, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'set_subscription_next_charge_date',
    description: 'Set the next charge date for a subscription',
    inputSchema: setNextChargeDateSchema,
    execute: async (client, args) => {
      const { subscription_id, date } = args;
      const updatedSubscription = await client.setNextChargeDate(subscription_id, date, args.customer_id, args.customer_email);
      
      return {
        content: [
          {
            type: 'text',
            text: `Updated Subscription Next Charge Date:\n${JSON.stringify(updatedSubscription, null, 2)}`,
          },
        ],
      };
    },
  },
];

/**
 * Helper function to calculate total days from frequency and unit
 * @param {number} frequency - The frequency number
 * @param {string} unit - The unit (day, week, month)
 * @returns {number} Total days
 */
function calculateTotalDays(frequency, unit) {
  switch (unit) {
    case 'day':
      return frequency;
    case 'week':
      return frequency * 7;
    case 'month':
      return frequency * 30; // Approximate for validation
    default:
      return 0;
  }
}