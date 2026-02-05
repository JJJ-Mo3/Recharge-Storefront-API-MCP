/**
 * Customer management tools
 * Last updated: 2024-12-24
 */
import { z } from 'zod';
import { normalizeUnicodeText, validateUnicodeText, validatePhoneNumber } from '../utils/unicode-helpers.js';

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
      const customer = await client.getCustomer(args.customer_id, args.customer_email, args.session_token);
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

      const updatedCustomer = await client.updateCustomer(updateData, args.customer_id, args.customer_email, args.session_token);

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
  {
    name: 'get_delivery_schedule',
    description: 'Get upcoming delivery schedule for a customer. Shows future charges, delivery dates, and subscription details.',
    inputSchema: baseSchema.extend({
      limit: z.number().max(100).default(10).optional().describe('Number of upcoming deliveries to return'),
    }),
    execute: async (client, args) => {
      const params = args.limit ? { limit: args.limit } : {};
      const schedule = await client.getDeliverySchedule(params, args.customer_id, args.customer_email, args.session_token);
      return {
        content: [
          {
            type: 'text',
            text: `Delivery Schedule:\n${JSON.stringify(schedule, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'get_customer_portal_access',
    description: 'Get customer portal access details including URL. Optionally specify a page destination like overview, subscriptions, or orders.',
    inputSchema: baseSchema.extend({
      page_destination: z.enum(['overview', 'subscriptions', 'orders', 'account', 'payment_methods']).optional().describe('Page to redirect customer to in portal'),
    }),
    execute: async (client, args) => {
      const { page_destination, customer_id, customer_email, session_token } = args;
      const params = page_destination ? { page_destination } : {};
      const access = await client.getCustomerPortalAccess(params, customer_id, customer_email, session_token);
      return {
        content: [
          {
            type: 'text',
            text: `Customer Portal Access:\n${JSON.stringify(access, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'get_churn_landing_page_url',
    description: 'Get the landing page URL for canceling a subscription (Active Churn flow). Provides a guided cancellation experience.',
    inputSchema: baseSchema.extend({
      subscription_id: z.string().describe('ID of the subscription to cancel'),
      redirect_url: z.string().url().describe('URL to redirect customer after completion'),
    }),
    execute: async (client, args) => {
      const { subscription_id, redirect_url, customer_id, customer_email, session_token } = args;
      const url = await client.getActiveChurnLandingPageURL(subscription_id, redirect_url, customer_id, customer_email, session_token);
      return {
        content: [
          {
            type: 'text',
            text: `Churn Landing Page URL:\n${JSON.stringify(url, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'get_payment_recovery_url',
    description: 'Get the landing page URL for recovering a failed payment method. Shows issues like expired cards or insufficient funds.',
    inputSchema: baseSchema,
    execute: async (client, args) => {
      const { customer_id, customer_email, session_token } = args;
      const url = await client.getFailedPaymentMethodRecoveryLandingPageURL(customer_id, customer_email, session_token);
      return {
        content: [
          {
            type: 'text',
            text: `Payment Recovery URL:\n${JSON.stringify(url, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'get_gift_redemption_url',
    description: 'Get the landing page URL for gift redemption. Allows recipient to redeem a gift subscription.',
    inputSchema: baseSchema.extend({
      gift_id: z.string().describe('ID of the gift to redeem'),
      redirect_url: z.string().url().describe('URL to redirect customer after completion'),
    }),
    execute: async (client, args) => {
      const { gift_id, redirect_url, customer_id, customer_email, session_token } = args;
      const url = await client.getGiftRedemptionLandingPageURL(gift_id, redirect_url, customer_id, customer_email, session_token);
      return {
        content: [
          {
            type: 'text',
            text: `Gift Redemption URL:\n${JSON.stringify(url, null, 2)}`,
          },
        ],
      };
    },
  },
  {
    name: 'send_customer_notification',
    description: 'Send a notification to the customer. Supports various notification types like payment update reminders.',
    inputSchema: baseSchema.extend({
      notification_type: z.enum(['SHOPIFY_UPDATE_PAYMENT_INFO', 'PAYMENT_REMINDER', 'SUBSCRIPTION_RENEWAL']).describe('Type of notification to send'),
      address_id: z.number().optional().describe('Address ID for address-specific notifications'),
      payment_method_id: z.string().optional().describe('Payment method ID for payment-related notifications'),
    }),
    execute: async (client, args) => {
      const { notification_type, address_id, payment_method_id, customer_id, customer_email, session_token } = args;
      const options = {
        ...(address_id && { address_id }),
        ...(payment_method_id && { payment_method_id }),
      };
      const result = await client.sendCustomerNotification(notification_type, options, customer_id, customer_email, session_token);
      return {
        content: [
          {
            type: 'text',
            text: `Notification Sent:\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    },
  },
];