/**
 * Gift tools for Recharge Storefront API
 * Provides access to gift purchases and redemption
 * Last updated: 2026-02-05
 */
import { z } from 'zod';

const baseSchema = z.object({
    admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
    store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
    customer_id: z.string().optional().describe('Recharge customer ID for authentication'),
    customer_email: z.string().email().optional().describe('Customer email for lookup and authentication'),
    session_token: z.string().optional().describe('Existing session token (optional, skips session creation if provided)'),
});

const getGiftPurchaseSchema = baseSchema.extend({
    gift_id: z.number().describe('Gift purchase ID to retrieve'),
});

export const giftTools = [
    {
        name: 'get_gift_purchases',
        description: 'Get all gift purchases available to the customer. Returns gifts that can be redeemed.',
        inputSchema: baseSchema,
        execute: async (client, args) => {
            const { customer_id, customer_email, session_token } = args;
            const gifts = await client.listGiftPurchases(customer_id, customer_email, session_token);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Gift Purchases:\n${JSON.stringify(gifts, null, 2)}`,
                    },
                ],
            };
        },
    },
    {
        name: 'get_gift_purchase',
        description: 'Get a specific gift purchase by ID. Returns gift details including credit_account_id needed for redemption.',
        inputSchema: getGiftPurchaseSchema,
        execute: async (client, args) => {
            const { gift_id, customer_id, customer_email, session_token } = args;
            const gift = await client.getGiftPurchase(gift_id, customer_id, customer_email, session_token);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Gift Purchase ${gift_id}:\n${JSON.stringify(gift, null, 2)}\n\nTo redeem: Create an address with is_gift: true, then create a subscription with gift_id: {credit_account_id}`,
                    },
                ],
            };
        },
    },
];
