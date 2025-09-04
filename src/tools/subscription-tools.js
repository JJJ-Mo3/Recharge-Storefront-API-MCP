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
  order_interval_frequency: z.number().min(1).optional().describe('Order interval frequency (e.g., 1, 2, 3)'),
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
  // Enhanced frequency validation with strict business rules
  if (data.order_interval_frequency !== undefined && data.order_interval_unit !== undefined) {
    const { order_interval_frequency: freq, order_interval_unit: unit } = data;
    
    // Validate frequency is a positive integer
    if (!Number.isInteger(freq) || freq < 1) {
      return false;
    }
    
    // Unit-specific frequency validation with business rules
    switch (unit) {
      case 'day':
        // Daily subscriptions: 1-90 days (Recharge business rule)
        if (freq < 1 || freq > 90) {
          return false;
        }
        break;
      case 'week':
        // Weekly subscriptions: 1-52 weeks (1 year max)
        if (freq < 1 || freq > 52) {
          return false;
        }
        break;
      case 'month':
        // Monthly subscriptions: 1-12 months (1 year max)
        if (freq < 1 || freq > 12) {
          return false;
        }
        break;
      default:
        return false;
    }
  }
  return true;
}, {
  message: "Invalid frequency range. Daily: 1-90 days, Weekly: 1-52 weeks, Monthly: 1-12 months. Frequency must be a positive integer."
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
      // Validate variant_id is positive
      if (args.variant_id <= 0) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: Invalid variant_id (${args.variant_id}). Variant ID must be a positive number greater than 0.`,
            },
          ],
          isError: true,
        };
      }
      
      // Validate quantity is reasonable
      if (args.quantity <= 0 || args.quantity > 1000) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: Invalid quantity (${args.quantity}). Quantity must be between 1 and 1000.`,
            },
          ],
          isError: true,
        };
      }
      
      // Validate next charge date is in the future
      const nextChargeDate = new Date(args.next_charge_scheduled_at);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (nextChargeDate < today) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: Next charge date must be in the future. Provided: ${args.next_charge_scheduled_at}`,
            },
          ],
          isError: true,
        };
      }
      
      // Validate frequency combination
      const totalDays = calculateTotalDays(args.order_interval_frequency, args.order_interval_unit);
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
      
      const subscriptionData = { ...args };
      delete subscriptionData.customer_id;
      delete subscriptionData.customer_email;
      delete subscriptionData.session_token;
      delete subscriptionData.admin_token;
      delete subscriptionData.store_url;
      
      // Pre-validate variant existence before attempting subscription creation
      try {
        if (process.env.DEBUG === 'true') {
          console.error(`[DEBUG] Pre-validating variant ${args.variant_id} exists`);
        }
        
        // Get products to validate variant exists
        const products = await client.getProducts({ limit: 250 }, args.customer_id, args.customer_email);
        
        if (!products || !products.products || !Array.isArray(products.products)) {
          throw new Error('Unable to validate variant - product catalog unavailable');
        }
        
        // Check if variant exists in any product
        let variantFound = false;
        let productTitle = '';
        let variantTitle = '';
        let isSubscriptionEnabled = false;
        
        for (const product of products.products) {
          if (product.variants && Array.isArray(product.variants)) {
            for (const variant of product.variants) {
              if (variant.shopify_variant_id === args.variant_id || variant.id === args.variant_id) {
                variantFound = true;
                productTitle = product.title || 'Unknown Product';
                variantTitle = variant.title || 'Default Title';
                
                // Check if product/variant is subscription enabled
                isSubscriptionEnabled = product.subscription_defaults && 
                  product.subscription_defaults.storefront_purchase_options && 
                  (product.subscription_defaults.storefront_purchase_options === 'subscription_only' || 
                   product.subscription_defaults.storefront_purchase_options === 'subscription_and_onetime');
                
                break;
              }
            }
            if (variantFound) break;
          }
        }
        
        if (!variantFound) {
          return {
            content: [
              {
                type: 'text',
                text: `Variant Validation Error: Variant ID ${args.variant_id} does not exist in your product catalog.\n\nTroubleshooting:\n1. Use get_products to see all available variants\n2. Check that the variant ID is correct\n3. Ensure the product hasn't been deleted or archived\n4. Verify you're using the correct variant ID format (Shopify variant ID)\n\nTip: Look for 'shopify_variant_id' or 'id' fields in the product variants list.`,
              },
            ],
            isError: true,
          };
        }
        
        if (!isSubscriptionEnabled) {
          return {
            content: [
              {
                type: 'text',
                text: `Subscription Configuration Error: Product "${productTitle}" (Variant: "${variantTitle}") is not enabled for subscriptions.\n\nProduct Details:\n- Product: ${productTitle}\n- Variant: ${variantTitle}\n- Variant ID: ${args.variant_id}\n\nTo fix this:\n1. Enable subscriptions for this product in your Recharge admin\n2. Set storefront_purchase_options to 'subscription_only' or 'subscription_and_onetime'\n3. Configure subscription defaults for the product\n\nAlternatively, choose a different variant that supports subscriptions.`,
              },
            ],
            isError: true,
          };
        }
        
        if (process.env.DEBUG === 'true') {
          console.error(`[DEBUG] Variant validation passed: ${productTitle} - ${variantTitle} (ID: ${args.variant_id})`);
        }
        
      } catch (validationError) {
        // If validation fails due to API issues, log warning but continue
        // This prevents validation failures from blocking legitimate subscription creation
        if (process.env.DEBUG === 'true') {
          console.error(`[DEBUG] Variant pre-validation failed, continuing with subscription creation:`, validationError.message);
        }
        
        // Only return error if it's a clear validation failure, not an API issue
        if (validationError.message && validationError.message.includes('does not exist')) {
          return {
            content: [
              {
                type: 'text',
                text: validationError.message,
              },
            ],
            isError: true,
          };
        }
      }
      
      try {
        const subscription = await client.createSubscription(subscriptionData, args.customer_id, args.customer_email);
        
        return {
          content: [
            {
              type: 'text',
              text: `Created Subscription:\n${JSON.stringify(subscription, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        // Enhanced error handling for common subscription creation issues
        if (error.message.includes('variant') || error.message.includes('product')) {
          return {
            content: [
              {
                type: 'text',
                text: `Product Variant Error: ${error.message}\n\nThe variant_id (${args.variant_id}) may not exist or may not be available for subscriptions.\n\nTips:\n- Use get_products to find valid variant IDs\n- Ensure the product variant exists in your store\n- Verify the variant is enabled for subscriptions\n- Check that the variant is not archived or deleted`,
              },
            ],
            isError: true,
          };
        }
        
        if (error.message.includes('address')) {
          return {
            content: [
              {
                type: 'text',
                text: `Address Error: ${error.message}\n\nThe address_id (${args.address_id}) may not exist or may not belong to this customer.\n\nTips:\n- Use get_addresses to find valid address IDs\n- Ensure the address belongs to the customer\n- Create a new address if needed using create_address`,
              },
            ],
            isError: true,
          };
        }
        
        if (error.message.includes('frequency') || error.message.includes('interval')) {
          return {
            content: [
              {
                type: 'text',
                text: `Subscription Frequency Error: ${error.message}\n\nValid combinations:\n- Daily: 1-90 days\n- Weekly: 1-52 weeks\n- Monthly: 1-12 months\n\nProvided: ${args.order_interval_frequency} ${args.order_interval_unit}`,
              },
            ],
            isError: true,
          };
        }
        
        if (error.message.includes('customer') || error.message.includes('session')) {
          return {
            content: [
              {
                type: 'text',
                text: `Customer Authentication Error: ${error.message}\n\nTips:\n- Verify the customer exists\n- Check that customer_id or customer_email is correct\n- Ensure proper authentication tokens are provided`,
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
      
      // Enhanced frequency validation with detailed error messages
      if (order_interval_frequency !== undefined || order_interval_unit !== undefined) {
        // Both must be provided together
        if (order_interval_frequency === undefined || order_interval_unit === undefined) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: Both order_interval_frequency and order_interval_unit must be provided together when updating subscription frequency.`,
              },
            ],
            isError: true,
          };
        }
        
        // Validate frequency is a positive integer
        if (!Number.isInteger(order_interval_frequency) || order_interval_frequency < 1) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: order_interval_frequency must be a positive integer, got: ${order_interval_frequency}`,
              },
            ],
            isError: true,
          };
        }
        
        // Enhanced unit-specific validation with business context
        let isValidFrequency = false;
        let validRange = '';
        let businessReason = '';
        
        switch (order_interval_unit) {
          case 'day':
            isValidFrequency = order_interval_frequency >= 1 && order_interval_frequency <= 90;
            validRange = '1-90 days';
            businessReason = 'Daily subscriptions are limited to 90 days maximum to prevent billing complications';
            break;
          case 'week':
            isValidFrequency = order_interval_frequency >= 1 && order_interval_frequency <= 52;
            validRange = '1-52 weeks';
            businessReason = 'Weekly subscriptions are limited to 52 weeks (1 year) maximum';
            break;
          case 'month':
            isValidFrequency = order_interval_frequency >= 1 && order_interval_frequency <= 12;
            validRange = '1-12 months';
            businessReason = 'Monthly subscriptions are limited to 12 months (1 year) maximum';
            break;
          default:
            return {
              content: [
                {
                  type: 'text',
                  text: `Error: Invalid order_interval_unit: ${order_interval_unit}. Must be 'day', 'week', or 'month'.`,
                },
              ],
              isError: true,
            };
        }
        
        if (!isValidFrequency) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: Invalid subscription frequency: ${order_interval_frequency} ${order_interval_unit}\n\nValid range: ${validRange}\nReason: ${businessReason}\n\nProvided: ${order_interval_frequency} ${order_interval_unit}\n\nExamples:\n- Every 2 weeks: frequency=2, unit="week"\n- Every 30 days: frequency=30, unit="day"\n- Every 3 months: frequency=3, unit="month"`,
              },
            ],
            isError: true,
          };
        }
        
        // Calculate total days for additional validation
        const totalDays = calculateTotalDays(order_interval_frequency, order_interval_unit);
        
        // Warn about very short frequencies (less than 7 days)
        if (totalDays < 7) {
          console.warn(`[WARNING] Very short subscription frequency (${totalDays} days) may cause billing and fulfillment issues.`);
        }
        
        // Validate maximum total days (365 day business rule)
        if (totalDays > 365) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: Subscription frequency too long (${totalDays} days total). Maximum allowed is 365 days.\n\nProvided: ${order_interval_frequency} ${order_interval_unit} = ${totalDays} days\n\nPlease reduce the frequency or change the unit.`,
              },
            ],
            isError: true,
          };
        }
      }
      
      // Validate quantity if provided
      if (quantity !== undefined) {
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: Invalid quantity: ${quantity}. Quantity must be an integer between 1 and 1000.`,
              },
            ],
            isError: true,
          };
        }
      }
      
      // Validate variant_id if provided
      if (variant_id !== undefined) {
        if (!Number.isInteger(variant_id) || variant_id < 1) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: Invalid variant_id: ${variant_id}. Variant ID must be a positive integer greater than 0.`,
              },
            ],
            isError: true,
          };
        }
      }
      
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
                text: `Subscription Frequency Error: ${error.message}\n\nValid frequency ranges:\n- Daily: 1-90 days (e.g., every 30 days)\n- Weekly: 1-52 weeks (e.g., every 2 weeks)\n- Monthly: 1-12 months (e.g., every 3 months)\n\nBusiness Rules:\n- Maximum subscription length: 365 days\n- Minimum recommended frequency: 7 days\n- Both frequency and unit must be provided together\n\nExamples:\n- Every 2 weeks: frequency=2, unit="week"\n- Every 30 days: frequency=30, unit="day"\n- Every 3 months: frequency=3, unit="month"`,
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