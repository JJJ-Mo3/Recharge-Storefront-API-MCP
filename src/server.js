#!/usr/bin/env node

/**
 * Recharge Storefront API MCP Server
 *
 * A comprehensive Model Context Protocol server that provides complete access
 * to the Recharge Storefront API for subscription management.
 * Last updated: 2024-12-24
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import { RechargeClient } from './recharge-client.js';
import { tools } from './tools/index.js';
import { formatErrorResponse, validateAuthParams } from './utils/error-handler.js';

// Load environment variables
dotenv.config();

/**
 * Server statistics tracking
 */
const serverStats = {
  startTime: new Date(),
  toolCalls: 0,
  errors: 0,
  customers: new Set(),
  lastActivity: new Date(),
};

/**
 * MCP Server instance
 */
const server = new Server(
  {
    name: process.env.MCP_SERVER_NAME || 'recharge-storefront-api-mcp',
    version: process.env.MCP_SERVER_VERSION || '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Health check function
 */
function getHealthStatus() {
  const uptime = Date.now() - serverStats.startTime.getTime();
  const uptimeHours = Math.floor(uptime / (1000 * 60 * 60));
  const uptimeMinutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
  
  return {
    status: 'healthy',
    uptime: `${uptimeHours}h ${uptimeMinutes}m`,
    toolCalls: serverStats.toolCalls,
    errors: serverStats.errors,
    uniqueCustomers: serverStats.customers.size,
    lastActivity: serverStats.lastActivity.toISOString(),
    memoryUsage: process.memoryUsage(),
    nodeVersion: process.version,
    serverName: process.env.MCP_SERVER_NAME || 'recharge-storefront-api-mcp',
    serverVersion: process.env.MCP_SERVER_VERSION || '1.0.0',
  };
}

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  if (process.env.DEBUG === 'true') {
    console.error(`[DEBUG] Listing ${tools.length} available tools`);
  }
  
  return {
    tools: tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  };
});

/**
 * Handle tool execution
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  // Update statistics
  serverStats.toolCalls++;
  serverStats.lastActivity = new Date();
  
  if (process.env.DEBUG === 'true') {
    console.error(`[DEBUG] Executing tool: ${name}`);
    // Sanitize arguments for logging (remove sensitive data)
    const sanitizedArgs = { ...args };
    if (sanitizedArgs.session_token) sanitizedArgs.session_token = '***';
    if (sanitizedArgs.admin_token) sanitizedArgs.admin_token = '***';
    console.error(`[DEBUG] Arguments:`, JSON.stringify(sanitizedArgs, null, 2));
  }

  // Find the requested tool
  const tool = tools.find(t => t.name === name);
  if (!tool) {
    serverStats.errors++;
    const error = new Error(`Tool not found: ${name}`);
    if (process.env.DEBUG === 'true') {
      console.error(`[DEBUG] Tool not found: ${name}`);
    }
    return formatErrorResponse(error);
  }

  try {
    // Validate input schema
    const validatedArgs = tool.inputSchema.parse(args || {});
    
    // Validate authentication parameters
    validateAuthParams(validatedArgs);
    
    // Extract authentication and configuration
    const storeUrl = validatedArgs.store_url || process.env.RECHARGE_STOREFRONT_DOMAIN;
    const sessionToken = validatedArgs.session_token || process.env.RECHARGE_SESSION_TOKEN;
    const adminToken = validatedArgs.admin_token || process.env.RECHARGE_ADMIN_TOKEN;
    
    // Validate required configuration
    if (!storeUrl) {
      throw new Error(
        'No store URL available. Please provide store_url parameter in your tool call or set RECHARGE_STOREFRONT_DOMAIN environment variable.\n' +
        'Example: your-shop.myshopify.com'
      );
    }
    
    // Validate store URL is not placeholder
    if (storeUrl === 'your-shop.myshopify.com') {
      throw new Error(
        'Please configure your actual store URL. The placeholder "your-shop.myshopify.com" is not valid.\n' +
        'Update RECHARGE_STOREFRONT_DOMAIN in your .env file or provide store_url parameter.'
      );
    }
    
    // Validate store URL format
    let domain;
    try {
      if (storeUrl.startsWith('http://') || storeUrl.startsWith('https://')) {
        const urlObj = new URL(storeUrl);
        domain = urlObj.hostname;
      } else {
        domain = storeUrl;
      }
      
      if (!domain || !domain.includes('.myshopify.com')) {
        throw new Error('Invalid domain format');
      }
    } catch (urlError) {
      throw new Error(
        `Invalid store URL format: ${storeUrl}\n` +
        'Store URL must be a Shopify domain ending with .myshopify.com\n' +
        'Example: your-shop.myshopify.com'
      );
    }
    
    // Validate domain is not a placeholder
    if (domain === 'your-shop.myshopify.com') {
      throw new Error(
        'Please configure your actual store domain. The placeholder "your-shop.myshopify.com" is not valid.\n' +
        'Update RECHARGE_STOREFRONT_DOMAIN in your .env file or provide store_url parameter.'
      );
    }
    
    // Validate admin token is not placeholder when needed for customer operations
    if ((validatedArgs.customer_id || validatedArgs.customer_email) && !sessionToken) {
      if (!adminToken) {
        throw new Error(
          'Admin token required for customer operations. Please provide admin_token parameter or set RECHARGE_ADMIN_TOKEN environment variable.'
        );
      }
      
      if (adminToken === 'your_admin_token_here' || adminToken === 'your_admin_api_token_here') {
        throw new Error(
          'Please configure your actual admin token. The placeholder "your_admin_token_here" is not valid.\n' +
          'Update RECHARGE_ADMIN_TOKEN in your .env file or provide admin_token parameter.'
        );
      }
    }
    
    // Create client with available tokens
    const client = new RechargeClient({
      storeUrl: domain,
      sessionToken,
      adminToken
    });
    
    // Track customer for statistics
    if (validatedArgs.customer_id) {
      serverStats.customers.add(validatedArgs.customer_id);
    }
    if (validatedArgs.customer_email) {
      serverStats.customers.add(validatedArgs.customer_email);
    }
    
    // Execute the tool
    const result = await tool.execute(client, validatedArgs);
    
    if (process.env.DEBUG === 'true') {
      console.error(`[DEBUG] Tool ${name} executed successfully`);
    }
    
    return result;
  } catch (error) {
    serverStats.errors++;
    
    if (process.env.DEBUG === 'true') {
      console.error(`[DEBUG] Tool ${name} failed:`, error.message);
      if (error.stack) {
        console.error(`[DEBUG] Error stack:`, error.stack);
      }
    }
    
    return formatErrorResponse(error);
  }
});

/**
 * Handle health check requests
 */
// Note: Health check would be handled by MCP client, not as a custom request handler

/**
 * Graceful shutdown handling
 */
process.on('SIGINT', async () => {
  if (process.env.DEBUG === 'true') {
    console.error('[DEBUG] Received SIGINT, shutting down gracefully...');
    console.error('[DEBUG] Final statistics:', serverStats);
  }
  
  try {
    await server.close();
    if (process.env.DEBUG === 'true') {
      console.error('[DEBUG] Server closed successfully');
    }
  } catch (error) {
    console.error('[ERROR] Error during shutdown:', error.message);
  }
  
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (process.env.DEBUG === 'true') {
    console.error('[DEBUG] Received SIGTERM, shutting down gracefully...');
  }
  
  try {
    await server.close();
  } catch (error) {
    console.error('[ERROR] Error during shutdown:', error.message);
  }
  
  process.exit(0);
});

/**
 * Start the server
 */
async function main() {
  try {
    // Validate Node.js version
    const nodeVersion = process.version.slice(1).split('.').map(Number);
    const requiredVersion = [18, 0, 0];
    const isValidVersion = nodeVersion[0] > requiredVersion[0] || 
      (nodeVersion[0] === requiredVersion[0] && nodeVersion[1] > requiredVersion[1]) ||
      (nodeVersion[0] === requiredVersion[0] && nodeVersion[1] === requiredVersion[1] && nodeVersion[2] >= requiredVersion[2]);
    
    if (!isValidVersion) {
      console.error(`[FATAL] Node.js version ${process.version} is not supported.`);
      console.error('[INFO] Please install Node.js 18.0.0 or higher.');
      console.error('[INFO] Visit https://nodejs.org/ to download the latest version.');
      process.exit(1);
    }
    
    // Validate required dependencies
    try {
      const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
      const { z } = await import('zod');
      const axios = await import('axios');
      const dotenv = await import('dotenv');
      
      // Validate that imports are functional
      if (!Server || !z || !axios || !dotenv) {
        throw new Error('Failed to import required modules');
      }
    } catch (error) {
      console.error('[FATAL] Missing required dependencies. Please run: npm install');
      console.error('[DEBUG] Missing dependency:', error.message);
      process.exit(1);
    }
    
    // Validate environment
    const hasStoreDomain = process.env.RECHARGE_STOREFRONT_DOMAIN && 
      process.env.RECHARGE_STOREFRONT_DOMAIN.trim() !== '' && 
      process.env.RECHARGE_STOREFRONT_DOMAIN !== 'your-shop.myshopify.com';
    const hasAdminToken = process.env.RECHARGE_ADMIN_TOKEN && 
      process.env.RECHARGE_ADMIN_TOKEN.trim() !== '' && 
      process.env.RECHARGE_ADMIN_TOKEN !== 'your_admin_token_here';
    
    if (!hasStoreDomain && !hasAdminToken) {
      console.error('[WARNING] No environment variables configured. Tools will require parameters for each call.');
    }
    
    if (process.env.RECHARGE_STOREFRONT_DOMAIN === 'your-shop.myshopify.com') {
      console.error('[WARNING] Please update RECHARGE_STOREFRONT_DOMAIN with your actual domain');
    }
    
    if (process.env.RECHARGE_ADMIN_TOKEN === 'your_admin_token_here') {
      console.error('[WARNING] Please update RECHARGE_ADMIN_TOKEN with your actual admin token');
    }
    
    // Start server
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    if (process.env.DEBUG === 'true') {
      console.error('[DEBUG] Recharge Storefront API MCP Server started');
      console.error('[DEBUG] Server name:', process.env.MCP_SERVER_NAME || 'recharge-storefront-api-mcp');
      console.error('[DEBUG] Server version:', process.env.MCP_SERVER_VERSION || '1.0.0');
      console.error('[DEBUG] Available tools:', tools.length);
      console.error('[DEBUG] Store domain:', hasStoreDomain ? process.env.RECHARGE_STOREFRONT_DOMAIN : 'Not configured');
      console.error('[DEBUG] Admin token:', hasAdminToken ? 'Configured' : 'Not configured');
      console.error('[DEBUG] Session token:', (process.env.RECHARGE_SESSION_TOKEN && process.env.RECHARGE_SESSION_TOKEN.trim() !== '') ? 'Configured' : 'Not configured');
    }
    
    console.error('[INFO] Server ready - listening for MCP requests');
    
  } catch (error) {
    console.error('[FATAL] Failed to start server:', error.message);
    
    // Provide helpful error messages for common issues
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('[INFO] Missing dependencies. Please run: npm install');
    } else if (error.message.includes('Cannot resolve module')) {
      console.error('[INFO] Module resolution error. Please check your Node.js installation.');
    } else if (error.message.includes('Permission denied')) {
      console.error('[INFO] Permission error. Please check file permissions.');
    }
    
    if (process.env.DEBUG === 'true') {
      console.error('[DEBUG] Startup error stack:', error.stack);
    }
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught exception:', error.message);
  if (process.env.DEBUG === 'true') {
    console.error('[DEBUG] Error stack:', error.stack);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled rejection at:', promise, 'reason:', reason);
  if (process.env.DEBUG === 'true') {
    console.error('[DEBUG] Rejection details:', reason);
  }
  process.exit(1);
});

// Start the server
main().catch((error) => {
  console.error('[FATAL] Server startup failed:', error.message);
  if (process.env.DEBUG === 'true') {
    console.error('[DEBUG] Startup error stack:', error.stack);
  }
  process.exit(1);
});