/**
 * Plan management tools
 * Last updated: 2026-02-05
 */
import { z } from 'zod';

const baseSchema = z.object({
    customer_id: z.string().optional().describe('Customer ID for automatic session creation (optional, used when no session_token provided)'),
    customer_email: z.string().email().optional().describe('Customer email for automatic lookup and session creation (optional, used when no session_token or customer_id provided)'),
    session_token: z.string().optional().describe('Recharge session token (optional, takes precedence over environment variable if provided)'),
    admin_token: z.string().optional().describe('Recharge admin token (optional, takes precedence over environment variable if provided)'),
    store_url: z.string().optional().describe('Store URL (optional, takes precedence over environment variable if provided)'),
});

const planListSchema = baseSchema.extend({
    limit: z.number().max(250).default(50).optional().describe('Number of plans to return (max 250, default 50)'),
    page: z.number().default(1).optional().describe('Page number for pagination'),
    external_product_id: z.string().optional().describe('Filter by external product ID'),
    sort_by: z.enum(['id-asc', 'id-desc', 'created_at-asc', 'created_at-desc']).optional().describe('Sort order'),
});

const planSchema = baseSchema.extend({
    plan_id: z.string().describe('The plan ID to retrieve'),
});

export const planTools = [
    {
        name: 'get_plans',
        description: 'Get a list of subscription plans. Plans define the subscription options available for products, including frequency intervals and discounts.',
        inputSchema: planListSchema,
        execute: async (client, args) => {
            const params = {
                limit: args.limit,
                page: args.page,
                external_product_id: args.external_product_id,
                sort_by: args.sort_by
            };
            // Remove undefined params
            Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);

            const plans = await client.listPlans(params, args.customer_id, args.customer_email, args.session_token);

            return {
                content: [
                    {
                        type: 'text',
                        text: `Subscription Plans:\n${JSON.stringify(plans, null, 2)}`,
                    },
                ],
            };
        },
    },
    {
        name: 'get_plan',
        description: 'Get detailed information about a specific subscription plan, including frequency options, discounts, and product associations.',
        inputSchema: planSchema,
        execute: async (client, args) => {
            const { plan_id } = args;
            const plan = await client.getPlan(plan_id, args.customer_id, args.customer_email, args.session_token);

            return {
                content: [
                    {
                        type: 'text',
                        text: `Plan Details:\n${JSON.stringify(plan, null, 2)}`,
                    },
                ],
            };
        },
    },
];
