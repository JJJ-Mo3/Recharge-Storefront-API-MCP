/**
 * Collection tools for Recharge Storefront API
 * Provides access to product collections
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

const listCollectionsSchema = baseSchema.extend({
    limit: z.number().min(1).max(250).default(25).optional().describe('Number of collections to return (1-250, default: 25)'),
    sort_by: z.enum(['id-asc', 'id-desc', 'title-asc', 'title-desc']).optional().describe('Sort order for results'),
    cursor: z.string().optional().describe('Cursor for pagination'),
});

const getCollectionSchema = baseSchema.extend({
    collection_id: z.number().describe('Collection ID to retrieve'),
});

const listCollectionProductsSchema = baseSchema.extend({
    collection_id: z.number().describe('Collection ID to get products for'),
    format_version: z.string().default('2022-06').optional().describe('Product format version (default: 2022-06)'),
});

export const collectionTools = [
    {
        name: 'get_collections',
        description: 'Get a paginated list of product collections for the store. Collections help organize products into groups.',
        inputSchema: listCollectionsSchema,
        execute: async (client, args) => {
            const { limit, sort_by, cursor, customer_id, customer_email, session_token } = args;
            const params = {
                ...(limit && { limit }),
                ...(sort_by && { sort_by }),
                ...(cursor && { cursor }),
            };
            const collections = await client.listCollections(params, customer_id, customer_email, session_token);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Collections:\n${JSON.stringify(collections, null, 2)}`,
                    },
                ],
            };
        },
    },
    {
        name: 'get_collection',
        description: 'Get a single collection by its ID. Returns collection details including title and description.',
        inputSchema: getCollectionSchema,
        execute: async (client, args) => {
            const { collection_id, customer_id, customer_email, session_token } = args;
            const collection = await client.getCollection(collection_id, customer_id, customer_email, session_token);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Collection ${collection_id}:\n${JSON.stringify(collection, null, 2)}`,
                    },
                ],
            };
        },
    },
    {
        name: 'get_collection_products',
        description: 'Get all products in a collection, in collection sort order. Returns up to 250 products.',
        inputSchema: listCollectionProductsSchema,
        execute: async (client, args) => {
            const { collection_id, format_version, customer_id, customer_email, session_token } = args;
            const params = { ...(format_version && { format_version }) };
            const products = await client.listCollectionProducts(collection_id, params, customer_id, customer_email, session_token);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Products in Collection ${collection_id}:\n${JSON.stringify(products, null, 2)}`,
                    },
                ],
            };
        },
    },
];
