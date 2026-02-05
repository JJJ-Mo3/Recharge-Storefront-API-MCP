/**
 * Credit tools for Recharge Storefront API
 * Provides access to customer credit accounts and summaries
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

const getCreditSummarySchema = baseSchema.extend({
    include: z.array(z.enum(['credit_details'])).optional().describe('Additional data to include (e.g., credit_details)'),
});

const setApplyCreditsSchema = baseSchema.extend({
    recurring: z.boolean().describe('Whether to automatically apply credits to the next recurring charge'),
});

const listCreditAccountsSchema = baseSchema.extend({
    limit: z.number().min(1).max(250).default(25).optional().describe('Number of credit accounts to return (1-250, default: 25)'),
    sort_by: z.enum(['id-asc', 'id-desc']).optional().describe('Sort order for results'),
    cursor: z.string().optional().describe('Cursor for pagination'),
});

export const creditTools = [
    {
        name: 'get_credit_summary',
        description: 'Get the credit summary for the current logged in customer. Shows available credit balance and usage history.',
        inputSchema: getCreditSummarySchema,
        execute: async (client, args) => {
            const { include, customer_id, customer_email, session_token } = args;
            const params = { ...(include && { include }) };
            const summary = await client.getCreditSummary(params, customer_id, customer_email, session_token);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Credit Summary:\n${JSON.stringify(summary, null, 2)}`,
                    },
                ],
            };
        },
    },
    {
        name: 'set_apply_credits',
        description: 'Enable or disable the automatic application of credits to the customer\'s next recurring charge.',
        inputSchema: setApplyCreditsSchema,
        execute: async (client, args) => {
            const { recurring, customer_id, customer_email, session_token } = args;
            const result = await client.setApplyCreditsToNextCharge({ recurring }, customer_id, customer_email, session_token);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Credit application ${recurring ? 'enabled' : 'disabled'} for next charge:\n${JSON.stringify(result, null, 2)}`,
                    },
                ],
            };
        },
    },
    {
        name: 'get_credit_accounts',
        description: 'List credit accounts for the current logged in customer. Each account represents a credit source.',
        inputSchema: listCreditAccountsSchema,
        execute: async (client, args) => {
            const { limit, sort_by, cursor, customer_id, customer_email, session_token } = args;
            const params = {
                ...(limit && { limit }),
                ...(sort_by && { sort_by }),
                ...(cursor && { cursor }),
            };
            const accounts = await client.listCreditAccounts(params, customer_id, customer_email, session_token);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Credit Accounts:\n${JSON.stringify(accounts, null, 2)}`,
                    },
                ],
            };
        },
    },
];
