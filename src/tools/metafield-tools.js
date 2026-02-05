/**
 * Metafield tools for Recharge Storefront API
 * Provides CRUD operations for metafields
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

const createMetafieldSchema = baseSchema.extend({
    key: z.string().describe('Metafield key (identifier within namespace)'),
    namespace: z.string().describe('Metafield namespace for grouping'),
    owner_id: z.number().describe('ID of the resource that owns this metafield'),
    owner_resource: z.enum(['customer', 'subscription', 'address', 'order', 'charge']).describe('Type of resource that owns this metafield'),
    value: z.string().describe('Metafield value'),
    value_type: z.enum(['string', 'integer', 'json_string']).describe('Type of the value'),
    description: z.string().optional().describe('Optional description of the metafield'),
});

const updateMetafieldSchema = baseSchema.extend({
    metafield_id: z.number().describe('Metafield ID to update'),
    value: z.string().optional().describe('New value for the metafield'),
    description: z.string().optional().describe('New description for the metafield'),
});

const deleteMetafieldSchema = baseSchema.extend({
    metafield_id: z.number().describe('Metafield ID to delete'),
});

export const metafieldTools = [
    {
        name: 'create_metafield',
        description: 'Create a new metafield on a resource (customer, subscription, address, order, or charge).',
        inputSchema: createMetafieldSchema,
        execute: async (client, args) => {
            const { key, namespace, owner_id, owner_resource, value, value_type, description, customer_id, customer_email, session_token } = args;
            const data = {
                key,
                namespace,
                owner_id,
                owner_resource,
                value,
                value_type,
                ...(description && { description }),
            };
            const metafield = await client.createMetafield(data, customer_id, customer_email, session_token);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Metafield Created:\n${JSON.stringify(metafield, null, 2)}`,
                    },
                ],
            };
        },
    },
    {
        name: 'update_metafield',
        description: 'Update an existing metafield by its ID. Can update value and/or description.',
        inputSchema: updateMetafieldSchema,
        execute: async (client, args) => {
            const { metafield_id, value, description, customer_id, customer_email, session_token } = args;
            const data = {
                ...(value !== undefined && { value }),
                ...(description !== undefined && { description }),
            };
            const metafield = await client.updateMetafield(metafield_id, data, customer_id, customer_email, session_token);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Metafield ${metafield_id} Updated:\n${JSON.stringify(metafield, null, 2)}`,
                    },
                ],
            };
        },
    },
    {
        name: 'delete_metafield',
        description: 'Delete a metafield by its ID. This action cannot be undone.',
        inputSchema: deleteMetafieldSchema,
        execute: async (client, args) => {
            const { metafield_id, customer_id, customer_email, session_token } = args;
            await client.deleteMetafield(metafield_id, customer_id, customer_email, session_token);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Metafield ${metafield_id} deleted successfully.`,
                    },
                ],
            };
        },
    },
];
