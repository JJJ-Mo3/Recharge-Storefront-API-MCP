/**
 * Authentication tools for Recharge Storefront API
 * Provides multiple authentication methods for various use cases
 * Last updated: 2026-02-05
 */
import { z } from 'zod';

const baseSchema = z.object({
    admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
    store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
});

const shopifyStorefrontSchema = baseSchema.extend({
    shopify_storefront_token: z.string().describe('Shopify Storefront API access token'),
    shopify_customer_access_token: z.string().optional().describe('Shopify Customer Access Token (optional, for customer-specific sessions)'),
});

const shopifyCustomerAccountSchema = baseSchema.extend({
    shopify_customer_access_token: z.string().describe('Token from Shopify Customer Account API'),
});

const passwordlessOptions = z.object({
    send_email: z.boolean().default(true).optional().describe('Send code via email (default: true)'),
    send_sms: z.boolean().default(false).optional().describe('Send code via SMS (default: false)'),
});

const sendPasswordlessSchema = baseSchema.extend({
    email: z.string().email().describe('Customer email address to send the code to'),
    ...passwordlessOptions.shape,
});

const validatePasswordlessSchema = baseSchema.extend({
    email: z.string().email().describe('Customer email address'),
    session_token: z.string().describe('Session token returned from send_passwordless_code'),
    code: z.string().min(6).max(6).describe('6-digit verification code sent to customer'),
});

export const authTools = [
    {
        name: 'login_shopify_app_proxy',
        description: 'Retrieve a Recharge session when running within a Shopify App Proxy context. Best for Shopify Theme Storefronts.',
        inputSchema: baseSchema,
        execute: async (client, args) => {
            const session = await client.loginShopifyAppProxy();
            return {
                content: [
                    {
                        type: 'text',
                        text: `Shopify App Proxy Session:\n${JSON.stringify(session, null, 2)}`,
                    },
                ],
            };
        },
    },
    {
        name: 'login_with_shopify_storefront',
        description: 'Retrieve a Recharge session using Shopify Storefront API tokens. Recommended for headless storefronts (Hydrogen) or custom customer portals.',
        inputSchema: shopifyStorefrontSchema,
        execute: async (client, args) => {
            const { shopify_storefront_token, shopify_customer_access_token } = args;
            const session = await client.loginWithShopifyStorefront(shopify_storefront_token, shopify_customer_access_token);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Shopify Storefront Session:\n${JSON.stringify(session, null, 2)}`,
                    },
                ],
            };
        },
    },
    {
        name: 'login_with_shopify_customer_account',
        description: 'Retrieve a Recharge session using the Shopify Customer Account API. For use with modern Shopify Customer Accounts and UI Extensions.',
        inputSchema: shopifyCustomerAccountSchema,
        execute: async (client, args) => {
            const { shopify_customer_access_token } = args;
            const session = await client.loginWithShopifyCustomerAccount(shopify_customer_access_token);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Shopify Customer Account Session:\n${JSON.stringify(session, null, 2)}`,
                    },
                ],
            };
        },
    },
    {
        name: 'send_passwordless_code',
        description: 'Send a passwordless login code to a customer\'s email or phone. Returns a session token needed for validation.',
        inputSchema: sendPasswordlessSchema,
        execute: async (client, args) => {
            const { email, send_email, send_sms } = args;
            const options = {
                ...(send_email !== undefined && { send_email }),
                ...(send_sms !== undefined && { send_sms }),
            };
            const sessionToken = await client.sendPasswordlessCode(email, options);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Passwordless code sent to ${email}\n\nSession Token (needed for validation): ${sessionToken}\n\nUse the validate_passwordless_code tool with this session_token and the 6-digit code sent to the customer.`,
                    },
                ],
            };
        },
    },
    {
        name: 'validate_passwordless_code',
        description: 'Complete the passwordless login flow by validating the 6-digit code. Returns a full Recharge session.',
        inputSchema: validatePasswordlessSchema,
        execute: async (client, args) => {
            const { email, session_token, code } = args;
            const session = await client.validatePasswordlessCode(email, session_token, code);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Passwordless Login Complete:\n${JSON.stringify(session, null, 2)}`,
                    },
                ],
            };
        },
    },
    {
        name: 'send_passwordless_code_app_proxy',
        description: 'Send a passwordless login code via Shopify App Proxy. Same as send_passwordless_code but routed through App Proxy.',
        inputSchema: sendPasswordlessSchema,
        execute: async (client, args) => {
            const { email, send_email, send_sms } = args;
            const options = {
                ...(send_email !== undefined && { send_email }),
                ...(send_sms !== undefined && { send_sms }),
            };
            const sessionToken = await client.sendPasswordlessCodeAppProxy(email, options);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Passwordless code sent via App Proxy to ${email}\n\nSession Token: ${sessionToken}\n\nUse validate_passwordless_code_app_proxy to complete authentication.`,
                    },
                ],
            };
        },
    },
    {
        name: 'validate_passwordless_code_app_proxy',
        description: 'Complete the passwordless login flow via Shopify App Proxy. Same as validate_passwordless_code but routed through App Proxy.',
        inputSchema: validatePasswordlessSchema,
        execute: async (client, args) => {
            const { email, session_token, code } = args;
            const session = await client.validatePasswordlessCodeAppProxy(email, session_token, code);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Passwordless Login via App Proxy Complete:\n${JSON.stringify(session, null, 2)}`,
                    },
                ],
            };
        },
    },
    {
        name: 'login_customer_portal',
        description: 'Retrieve a session when executing within the Recharge Customer Portal environment. Throws error if called outside portal context.',
        inputSchema: baseSchema,
        execute: async (client, args) => {
            const session = await client.loginCustomerPortal();
            return {
                content: [
                    {
                        type: 'text',
                        text: `Customer Portal Session:\n${JSON.stringify(session, null, 2)}`,
                    },
                ],
            };
        },
    },
];
