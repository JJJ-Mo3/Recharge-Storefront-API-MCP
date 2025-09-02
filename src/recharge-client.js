# Recharge Storefront API MCP Server

A comprehensive Model Context Protocol (MCP) server that provides complete access to the Recharge Storefront API. This server enables AI assistants and other MCP clients to interact with Recharge subscription management functionality through a standardized interface.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Authentication](#authentication)
- [Configuration](#configuration)
- [Usage](#usage)
- [Available Tools](#available-tools)
- [Usage Examples](#usage-examples)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

## Overview

The Recharge Storefront API MCP Server bridges the gap between AI assistants and Recharge's subscription management platform. It provides a complete, production-ready interface to all Recharge Storefront API endpoints through the standardized Model Context Protocol.

### What is Recharge?

Recharge is a leading subscription commerce platform that powers recurring billing for Shopify stores. It handles subscription management, billing cycles, customer portals, and recurring order processing for thousands of merchants.

### What is MCP?

Model Context Protocol (MCP) is a standardized way for AI assistants to interact with external services and APIs. This server implements MCP to make Recharge's functionality accessible to AI systems.

### Key Benefits

- **Complete API Coverage**: All 37 Recharge Storefront API endpoints
- **Intelligent Authentication**: Automatic session management with multi-customer support
- **Production Ready**: Error handling, logging, and monitoring
- **Developer Friendly**: Comprehensive documentation, examples, and debugging tools
- **Secure**: Built-in security protections and customer data isolation

## Features

### Complete Storefront API Coverage

| Category | Tools | Description |
|----------|-------|-------------|
| **Customer Management** | 4 tools | Profile management, lookup, and session creation |
| **Subscription Lifecycle** | 10 tools | Create, update, cancel, skip, swap, and activate subscriptions |
| **Address Management** | 5 tools | Full CRUD operations for shipping and billing addresses |
| **Payment Methods** | 3 tools | View and update payment information |
| **Product Catalog** | 2 tools | Browse subscription products and variants |
| **Order Management** | 2 tools | View order history and tracking |
| **Charge Management** | 2 tools | Billing and payment tracking |
| **One-time Products** | 5 tools | Add products to upcoming deliveries |
| **Bundle Management** | 7 tools | Product bundle and selection management |
| **Discount System** | 4 tools | Apply and manage discount codes |

### Advanced Features

- **Automatic Session Management**: Intelligent session creation and caching
- **Multi-Customer Support**: Handle multiple customers in a single MCP connection
- **Flexible Authentication**: Environment variables, per-tool parameters, or explicit tokens
- **Comprehensive Error Handling**: Detailed error messages with actionable guidance
- **Debug Mode**: Extensive logging for development and troubleshooting
- **Input Validation**: Zod schema validation for all tool parameters
- **Security Protection**: Prevents accidental customer data exposure

## Installation

### Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **Shopify Store**: Must have a Shopify store with Recharge installed
- **Recharge Account**: Active Recharge merchant account
- **API Access**: Recharge Admin API token for session creation

### Quick Start

```bash
# Clone or download the project
# cd recharge-storefront-api-mcp

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Start the server
npm start
```

### Automated Setup

```bash
# Make setup script executable (Linux/macOS)
chmod +x scripts/setup.sh

# Run the setup script
npm run setup
```

The setup script will:
- Validate Node.js version
- Install dependencies
- Create environment file
- Validate configuration
- Display project statistics

### Verification

```bash
# Validate installation
npm run validate

# Check API coverage
npm run coverage
```

## Authentication

### Understanding Recharge Authentication

Recharge uses a two-step authentication process:

1. **Admin API Token**: Authenticates your application with Recharge
2. **Customer Session Token**: Scopes operations to a specific customer

```
Admin API Token + Customer ID → Customer Session Token → API Operations
```

### Getting Your API Token

1. **Log into Recharge**: Access your merchant portal
2. **Navigate to API Tokens**: Go to Apps & integrations > API tokens
3. **Create Admin Token**: Create a new **Admin API** token (not Storefront API token)
4. **Copy Token**: Save the token (starts with your store prefix)

**Critical**: You must use **Admin API** tokens. Storefront API tokens will not work for session creation.

### Authentication Methods

The server supports three flexible authentication approaches:

#### Method 1: Customer Email (Recommended)

The simplest approach - provide the customer's email address:

```json
{
  "name": "get_subscriptions",
  "arguments": {
    "customer_email": "customer@example.com"
  }
}
```

**What happens automatically:**
1. Email lookup → Customer ID
2. Customer ID → Session token
3. Session token → Customer data
4. Session cached for future calls

#### Method 2: Customer ID

If you already have the customer ID:

```json
{
  "name": "get_subscriptions",
  "arguments": {
    "customer_id": "123456"
  }
}
```

#### Method 3: Explicit Session Token

For advanced use cases with existing session tokens:

```json
{
  "name": "get_subscriptions",
  "arguments": {
    "session_token": "existing_session_token"
  }
}
```

### Automatic Session Management

The server intelligently manages customer sessions:

#### Session Creation Flow

```
Customer Email/ID → Lookup → Session Creation → API Call → Cached Session Token
```

#### Session Persistence

Customer session tokens are cached within your MCP connection with automatic renewal:

```json
// First call - creates and caches session
{
  "name": "get_customer",
  "arguments": {"customer_email": "alice@example.com"}
}

// Subsequent calls - reuses cached session (fast!)
{
  "name": "get_subscriptions", 
  "arguments": {"customer_email": "alice@example.com"}
}

// Different customer - creates new cached session
{
  "name": "get_orders",
  "arguments": {"customer_email": "bob@example.com"}
```

#### Automatic Session Renewal

- **Reactive Renewal**: Expired session tokens automatically renewed when API calls fail due to expiration
- **Retry Logic**: Failed calls due to expired tokens automatically retried with fresh session

#### Performance Benefits

- **Fast**: No repeated session creation
- **Smart**: Email lookups cached too
- **Isolated**: Each customer gets separate session token
- **Automatic**: Works transparently

### Multi-Customer Support

Handle multiple customers seamlessly:

```json
// Customer A operations
{"name": "get_customer", "arguments": {"customer_email": "alice@example.com"}}
{"name": "get_subscriptions", "arguments": {"customer_email": "alice@example.com"}}

// Customer B operations  
{"name": "get_customer", "arguments": {"customer_email": "bob@example.com"}}
{"name": "get_orders", "arguments": {"customer_email": "bob@example.com"}}

// Back to Customer A - reuses cached session
{"name": "get_addresses", "arguments": {"customer_email": "alice@example.com"}}
```


The server includes built-in security protections:

#### Preventing Wrong Customer Data

```json
// Safe: Default session when no customer sessions exist
{"name": "get_subscriptions", "arguments": {}}  // Uses default session token

// Dangerous: Could expose wrong customer data
{"name": "get_customer", "arguments": {"customer_email": "alice@example.com"}}
{"name": "get_subscriptions", "arguments": {}}  // BLOCKED! Security error

// Safe: Always specify customer identification
{"name": "get_subscriptions", "arguments": {"customer_email": "alice@example.com"}}  // Safe
```

**Security Error Message:**
```
Security Error: Cannot use default session token when customer-specific sessions exist. 
Please specify 'customer_id', 'customer_email', or 'session_token' to ensure correct customer data access.
```

## Usage Examples

### Customer Service Workflow

Start with customer lookup and basic information:

```json
// Find customer by email
{
  "name": "get_customer_by_email",
  "arguments": {
    "email": "customer@example.com"
  }
}

// Get customer details with automatic session creation
{
  "name": "get_customer",
  "arguments": {
    "customer_email": "customer@example.com"
  }
}

// Check their subscriptions
{
  "name": "get_subscriptions",
  "arguments": {
    "customer_email": "customer@example.com"
  }
}




// View recent orders
{
  "name": "get_orders",
  "arguments": {
    "customer_email": "customer@example.com"
  }
}
```

### Subscription Management Workflow

Handle subscription changes and modifications:

```json
// Get subscription details
{
  "name": "get_subscription",
  "arguments": {
    "customer_email": "customer@example.com",
    "subscription_id": "sub_123"
  }
}

// Skip next delivery
{
  "name": "skip_subscription",
  "arguments": {
    "customer_email": "customer@example.com",
    "subscription_id": "sub_123",
    "date": "2024-02-15"
  }
}

// Add one-time product to next delivery
{
  "name": "create_onetime",
  "arguments": {
    "customer_email": "customer@example.com",
    "variant_id": 789012,
    "quantity": 1,
    "next_charge_scheduled_at": "2024-02-15"
  }
}
```

### Multi-Customer Operations

      if (process.env.DEBUG === 'true') {
        console.error(`[DEBUG] Customer lookup failed for email ${email}:`, error.message);
      }
      throw error;
    }
  }

  /**
   * Enhanced session token management with better error handling
   */
  async getOrCreateSessionToken(customerId = null, customerEmail = null) {
    // If explicit session token provided, validate and use it
    if (this.sessionToken) {
      if (typeof this.sessionToken !== 'string' || this.sessionToken.trim() === '') {
        throw new Error('Invalid session token format');
      }
      if (process.env.DEBUG === 'true') {
        console.error('[DEBUG] Using explicit session token');
      }
      return this.sessionToken;
    }

    // If customer identification provided, get/create customer session
    if (customerId || customerEmail) {
      let finalCustomerId = customerId;
      
      // Validate customer ID format if provided
      if (finalCustomerId) {
        if (typeof finalCustomerId !== 'string' && typeof finalCustomerId !== 'number') {
          throw new Error('Customer ID must be a string or number');
        }
        finalCustomerId = finalCustomerId.toString();
        if (finalCustomerId.trim() === '') {
          throw new Error('Customer ID cannot be empty');
        }
      }
      
      // If only email provided, look up customer ID
      if (!finalCustomerId && customerEmail) {
        // Validate email format
        if (typeof customerEmail !== 'string' || customerEmail.trim() === '') {
          throw new Error('Customer email must be a non-empty string');
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(customerEmail.trim())) {
          throw new Error(`Invalid email format: ${customerEmail}`);
        }
        
        finalCustomerId = this.sessionCache.getCustomerIdByEmail(customerEmail);
        
        if (!finalCustomerId) {
          if (process.env.DEBUG === 'true') {
            console.error(`[DEBUG] Looking up customer ID for email: ${customerEmail}`);
          }
          try {
            const customer = await this.getCustomerByEmail(customerEmail);
            finalCustomerId = customer.id.toString();
            this.sessionCache.setCustomerIdByEmail(customerEmail, finalCustomerId);
          } catch (error) {
            if (process.env.DEBUG === 'true') {
              console.error(`[DEBUG] Customer lookup failed for email ${customerEmail}:`, error.message);
            }
            throw error;
          }
        }
      }
      
      // Validate we have a customer ID at this point
      if (!finalCustomerId) {
        throw new Error('Unable to determine customer ID from provided information');
      }
      
      // Check for cached session
      const cachedToken = this.sessionCache.getSessionToken(finalCustomerId);
      if (cachedToken) {
        if (process.env.DEBUG === 'true') {
          console.error(`[DEBUG] Using cached session for customer ${finalCustomerId}`);
        }
        return cachedToken;
      }
      
      // Create new session
      if (process.env.DEBUG === 'true') {
        console.error(`[DEBUG] Creating new session for customer ${finalCustomerId}`);
      }
      try {
        const session = await this.createCustomerSessionById(finalCustomerId);
        const newToken = session.token;
        
        if (!newToken || typeof newToken !== 'string' || newToken.trim() === '') {
          throw new Error('Session creation returned invalid token');
        }
        
        // Cache the new session
        this.sessionCache.setSessionToken(finalCustomerId, newToken, customerEmail);
        
        return newToken;
      } catch (error) {
        if (process.env.DEBUG === 'true') {
          console.error(`[DEBUG] Session creation failed for customer ${finalCustomerId}:`, error.message);
        }
        throw error;
      }
    }

    // Security check: prevent using default session when customer sessions exist
    if (this.sessionCache.hasCustomerSessions()) {
      throw new Error(
        'Security Error: Cannot use default session token when customer-specific sessions exist. ' +
        'Please specify \'customer_id\', \'customer_email\', or \'session_token\' to ensure correct customer data access.'
      );
    }

    // No customer identification and no default session
    throw new Error(
      'No session token available. Please provide customer_id, customer_email, or session_token parameter, ' +
      'or set RECHARGE_SESSION_TOKEN environment variable.'
    );
  }

  /**
   * Enhanced request method with better error handling and validation
   */
  async makeRequest(method, endpoint, data = null, params = null, customerId = null, customerEmail = null) {
    // Validate method
    if (!method || typeof method !== 'string') {
      throw new Error('HTTP method is required');
    }
    
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    if (!validMethods.includes(method.toUpperCase())) {
      throw new Error(`Invalid HTTP method: ${method}`);
    }
    
    // Validate endpoint
    if (!endpoint || typeof endpoint !== 'string') {
      throw new Error('API endpoint is required');
    }
    
    if (!endpoint.startsWith('/')) {
      throw new Error('API endpoint must start with /');
    }
    
    const sessionToken = await this.getOrCreateSessionToken(customerId, customerEmail);
    
    const config = {
      method: method.toUpperCase(),
      url: endpoint,
      headers: {
        'X-Recharge-Access-Token': sessionToken,
        'X-Recharge-Version': '2021-11',
      },
    };
    
    if (data) {
      config.data = data;
    }
    
    if (params) {
      config.params = params;
    }
    
    try {
      const response = await this.storefrontApi.request(config);
      
      if (!response || !response.data) {
        throw new Error('Invalid response from API');
      }
      
      return response.data;
    } catch (error) {
      // Handle session expiry - clear cache and retry once
      if (error.response?.status === 401 && (customerId || customerEmail)) {
        if (process.env.DEBUG === 'true') {
          console.error(`[DEBUG] Session expired for customer, clearing cache and retrying`);
        }
        
        // Clear the expired session
        const finalCustomerId = customerId || this.sessionCache.getCustomerIdByEmail(customerEmail);
        if (finalCustomerId) {
          this.sessionCache.clearSession(finalCustomerId);
        }
        if (customerEmail) {
          this.sessionCache.clearSessionByEmail(customerEmail);
        }
        
        // Retry with new session
        try {
          const newSessionToken = await this.getOrCreateSessionToken(customerId, customerEmail);
          config.headers['X-Recharge-Access-Token'] = newSessionToken;
          
          const retryResponse = await this.storefrontApi.request(config);
          
          if (!retryResponse || !retryResponse.data) {
            throw new Error('Invalid response from API on retry');
          }
          
          return retryResponse.data;
        } catch (retryError) {
          if (process.env.DEBUG === 'true') {
            console.error(`[DEBUG] Session retry failed:`, retryError.message);
          }
          handleAPIError(retryError);
        }
      }
      
      handleAPIError(error);
    }
  }

  /**
   * Enhanced admin request method with validation
   */
  async makeAdminRequest(method, endpoint, data = null, params = null) {
    if (!this.adminToken) {
      throw new Error(
        'Admin token required for this operation. Please provide admin_token parameter or set RECHARGE_ADMIN_TOKEN environment variable.'
      );
    }

    // Validate method
    if (!method || typeof method !== 'string') {
      throw new Error('HTTP method is required');
    }
    
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    if (!validMethods.includes(method.toUpperCase())) {
      throw new Error(`Invalid HTTP method: ${method}`);
    }
    
    // Validate endpoint
    if (!endpoint || typeof endpoint !== 'string') {
      throw new Error('API endpoint is required');
    }
    
    if (!endpoint.startsWith('/')) {
      throw new Error('API endpoint must start with /');
    }

    const config = {
      method: method.toUpperCase(),
      url: endpoint,
      headers: {
        'X-Recharge-Access-Token': this.adminToken,
        'X-Recharge-Version': '2021-11',
      },
    };
    
    if (data) {
      config.data = data;
    }
    
    if (params) {
      config.params = params;
    }
    
    try {
      const response = await this.adminApi.request(config);
      
      if (!response || !response.data) {
        throw new Error('Invalid response from Admin API');
      }
      
      return response.data;
    } catch (error) {
      handleAPIError(error);
    }
  }

  /**
   * Get customer by email (requires admin token)
   */
  async getCustomerByEmail(email) {
    if (!email || typeof email !== 'string' || email.trim() === '') {
      throw new Error('Valid email address is required for customer lookup');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new Error(`Invalid email format: ${email}`);
    }

    try {
      const response = await this.makeAdminRequest('GET', '/customers', null, { email: email.trim() });
      
      if (!response || !response.customers || !Array.isArray(response.customers)) {
        throw new Error('Invalid response format from customer lookup API');
      }
      
      if (response.customers.length === 0) {
        throw new Error(`Customer not found with email: ${email}`);
      }
      
      const customer = response.customers[0];
      if (!customer || !customer.id) {
        throw new Error('Customer data is incomplete - missing ID');
      }
      
      return customer;
    } catch (error) {
      if (process.env.DEBUG === 'true') {
        console.error(`[DEBUG] Customer lookup failed for email ${email}:`, error.message);
      }
      throw error;
    }

```json
// Customer A operations
{"name": "get_subscriptions", "arguments": {"customer_email": "alice@example.com"}}

// Customer B operations  
{"name": "get_orders", "arguments": {"customer_email": "bob@example.com"}}

// Back to Customer A (reuses cached session)
{"name": "get_addresses", "arguments": {"customer_email": "alice@example.com"}}
```

### 5. Error Handling and Troubleshooting

```json
// This will fail with helpful error message
{
  "name": "get_subscription", 
  "arguments": {
    "subscription_id": "invalid_id"
  }
}

// Error response:
{
  "content": [
    {
      "type": "text",
      "text": "API Error (404): Subscription not found\n\nTip: Verify the resource ID exists and you have access to it."
    }
  ],
  "isError": true
}
```

## Configuration

### MCP Client Configuration

To use this server with an MCP client, you'll need to configure your client to connect to this server. Here are configuration examples for popular clients:

#### Claude Desktop

Edit your Claude Desktop configuration file:

**Location**: 
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "recharge-storefront-api": {
      "command": "node",
      "args": ["path/to/recharge-storefront-api-mcp/src/server.js"],
      "env": {
        "RECHARGE_STOREFRONT_DOMAIN": "your-shop.myshopify.com",
        "RECHARGE_ADMIN_TOKEN": "your_admin_token_here"
      }
    }
  }
}
```

#### Cursor IDE

1. **Install the MCP extension** (if available) or configure manually
2. **Add to Cursor settings** (`Ctrl/Cmd + ,`):

```json
{
  "mcp.servers": {
    "recharge-storefront-api": {
      "command": "node",
      "args": ["path/to/recharge-storefront-api-mcp/src/server.js"],
      "cwd": "path/to/recharge-storefront-api-mcp",
      "env": {
        "RECHARGE_STOREFRONT_DOMAIN": "your-shop.myshopify.com",
        "RECHARGE_ADMIN_TOKEN": "your_admin_token_here"
      }
    }
  }
}
```

3. **Alternative: Use .env file** and simpler config:

```json
{
  "mcp.servers": {
    "recharge-storefront-api": {
      "command": "node",
      "args": ["src/server.js"],
      "cwd": "path/to/recharge-storefront-api-mcp"
    }
  }
}
```

#### VSCode with GitHub Copilot

1. **Install MCP extension** for VSCode (if available)
2. **Add to VSCode settings.json** (`Ctrl/Cmd + Shift + P\` → "Preferences: Open Settings (JSON)"):

```json
{
  "mcp.servers": [
    {
      "name": "recharge-storefront-api",
      "command": "node",
      "args": ["src/server.js"],
      "cwd": "path/to/recharge-storefront-api-mcp",
      "env": {
        "RECHARGE_STOREFRONT_DOMAIN": "your-shop.myshopify.com",
        "RECHARGE_ADMIN_TOKEN": "your_admin_token_here"
      }
    }
  ]
}
```

3. **Alternative: Workspace configuration** (`.vscode/settings.json` in your project):

```json
{
  "mcp.servers": [
    {
      "name": "recharge-storefront-api",
      "command": "node",
      "args": ["../recharge-storefront-api-mcp/src/server.js"],
      "cwd": "../recharge-storefront-api-mcp"
    }
  ]
}
```

#### Claude Code (Anthropic's IDE)

1. **Open Claude Code settings**
2. **Navigate to MCP Servers section**
3. **Add new server configuration**:

```json
{
  "name": "Recharge Storefront API",
  "command": "node",
  "args": ["src/server.js"],
  "cwd": "path/to/recharge-storefront-api-mcp",
  "env": {
    "RECHARGE_STOREFRONT_DOMAIN": "your-shop.myshopify.com",
    "RECHARGE_ADMIN_TOKEN": "your_admin_token_here"
  }
}
```

#### Generic MCP Client Configuration

For any MCP-compatible client:
- **Command**: `node src/server.js`
- **Working Directory**: Path to this project
- **Environment Variables**: Set in client config or .env file
- **Protocol**: stdio (standard input/output)

#### Configuration Tips

1. **Use absolute paths** for reliability across different environments
2. **Environment variables** can be set in client config or .env file
3. **Test connection** after setup using client's MCP testing features
4. **Enable debug mode** by adding `"DEBUG": "true"\` to env variables for troubleshooting

### Environment Variables

Create a `.env\` file in the project root:

```bash
# Required: Your Shopify domain
RECHARGE_STOREFRONT_DOMAIN=your-shop.myshopify.com

# Required: Admin API token for session creation
RECHARGE_ADMIN_TOKEN=your_admin_token_here

# Optional: Default customer session token (if you have one)
RECHARGE_SESSION_TOKEN=existing_customer_session_token

# Optional: Server configuration
MCP_SERVER_NAME=recharge-storefront-api-mcp
MCP_SERVER_VERSION=1.0.0

# Optional: Enable debug logging
DEBUG=true
```

### Configuration Options

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `RECHARGE_STOREFRONT_DOMAIN` | Yes* | Your Shopify domain | `shop.myshopify.com` |
| `RECHARGE_ADMIN_TOKEN` | Yes* | Admin API token for session creation | `your_admin_token_here` |
| `RECHARGE_SESSION_TOKEN` | No | Default customer session token | `st_abc123` |
| `MCP_SERVER_NAME` | No | Server identification | `recharge-mcp` |
| `MCP_SERVER_VERSION` | No | Server version | `1.0.0` |
| `DEBUG` | No | Enable debug logging | `true` |

*Required unless provided in each tool call

### Per-Tool Configuration

Override environment variables in individual tool calls:

```json
{
  "name": "get_subscriptions",
  "arguments": {
    "store_url": "different-shop.myshopify.com",
    "admin_token": "different_admin_token",
    "customer_email": "customer@example.com"
  }
}
```

### Configuration Validation

```bash
# Validate configuration
npm run validate

# Test environment setup
npm run test:api-keys

# Check project health
npm run health
```

## Usage

### Starting the Server

```bash
# Production mode
npm start

# Development mode with file watching
npm run dev

# Development with debug logging
npm run dev:debug

# Debug mode (production)
DEBUG=true npm start
```

## Available Tools

### Customer Management (4 tools)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `get_customer` | Get current customer information | `customer_email\` or `customer_id` |
| `update_customer` | Update customer profile | `email`, `first_name`, `last_name`, `phone` |
| `get_customer_by_email` | Find customer by email (returns ID) | `email` |
| `create_customer_session_by_id` | Create session manually | `customer_id`, `return_url` |

### Subscription Management (10 tools)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `get_subscriptions` | List customer subscriptions | `status`, `limit`, `page` |
| `get_subscription` | Get subscription details | `subscription_id` |
| `create_subscription` | Create new subscription | `address_id`, `variant_id`, `quantity`, `frequency` |
| `update_subscription` | Modify subscription | `subscription_id`, `quantity`, `frequency` |
| `skip_subscription` | Skip delivery date | `subscription_id`, `date` |
| `unskip_subscription` | Restore skipped delivery | `subscription_id`, `date` |
| `swap_subscription` | Change product variant | `subscription_id`, `variant_id` |
| `cancel_subscription` | Cancel subscription | `subscription_id`, `reason` |
| `activate_subscription` | Reactivate subscription | `subscription_id` |
| `set_subscription_next_charge_date` | Set next charge date | `subscription_id`, `date` |

### Address Management (5 tools)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `get_addresses` | List customer addresses | - |
| `get_address` | Get address details | `address_id` |
| `create_address` | Add new address | `address1`, `city`, `province`, `zip`, `country` |
| `update_address` | Modify address | `address_id`, address fields |
| `delete_address` | Remove address | `address_id` |

### Payment Methods (3 tools)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `get_payment_methods` | List payment methods | - |
| `get_payment_method` | Get payment details | `payment_method_id` |
| `update_payment_method` | Update billing info | `payment_method_id`, billing fields |

### Product Catalog (2 tools)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `get_products` | Browse available products | `limit`, `handle` |
| `get_product` | Get product details | `product_id` |

### Order & Charge History (4 tools)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `get_orders` | List customer orders | `status`, `limit`, `page` |
| `get_order` | Get order details | `order_id` |
| `get_charges` | List charges | `status`, `limit`, `page` |
| `get_charge` | Get charge details | `charge_id` |

### One-time Products (5 tools)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `get_onetimes` | List one-time products | - |
| `get_onetime` | Get one-time details | `onetime_id` |
| `create_onetime` | Add to next delivery | `variant_id`, `quantity`, `next_charge_scheduled_at` |
| `update_onetime` | Modify one-time product | `onetime_id`, update fields |
| `delete_onetime` | Remove one-time product | `onetime_id` |

### Bundle Management (7 tools)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `get_bundles` | List customer bundles | `subscription_id` |
| `get_bundle` | Get bundle details | `bundle_id` |
| `get_bundle_selections` | List bundle selections | `bundle_id` |
| `get_bundle_selection` | Get selection details | `bundle_selection_id` |
| `create_bundle_selection` | Create selection | `bundle_id`, `variant_id`, `quantity` |
| `update_bundle_selection` | Update selection | `bundle_selection_id`, update fields |
| `delete_bundle_selection` | Remove selection | `bundle_selection_id` |

### Discount Management (4 tools)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `get_discounts` | List applied discounts | - |
| `get_discount` | Get discount details | `discount_id` |
| `apply_discount` | Apply discount code | `discount_code` |
| `remove_discount` | Remove discount | `discount_id` |

## Development

### Development Setup

```bash
# Install dependencies
npm install

# Setup environment
npm run setup

# Start development server
npm run dev
```

### Development Commands

```bash
# Development with file watching
npm run dev

# Development with debug logging
npm run dev:debug

# Validate code and configuration
npm run validate

# Check API coverage
npm run coverage

# View project statistics
npm run health
```

### Code Quality

```bash
# Lint code
npm run lint

# Validate syntax
npm run validate

# Test API key logic
npm run test:api-keys

# Health check
npm run health
```

### Adding New Tools

1. **Create tool file**: `src/tools/new-feature-tools.js`
2. **Follow patterns**: Use existing tools as templates
3. **Add to index**: Export from `src/tools/index.js`
4. **Add client methods**: Implement in `src/recharge-client.js`
5. **Test thoroughly**: Use `npm run validate`

### Debugging

Enable debug mode for detailed logging:

```bash
DEBUG=true npm start
```

Debug output includes:
- API request/response details
- Authentication flow tracing
- Session creation and caching
- Error stack traces
- Performance metrics

## Troubleshooting

### Common Issues

#### Authentication Errors

**Problem**: `Customer not found`
```bash
# Solution: Check customer ID and merchant token
# Ensure customer exists in Recharge system
# Verify merchant token has Storefront API permissions
```

**Problem**: `Invalid merchant token`
```bash
# Solution: Verify token type and permissions
# Use Admin API token (not Storefront API)
# Check token hasn't expired or been revoked
```

#### Configuration Issues

**Problem**: `No store URL available`
```bash
# Solution: Set environment variable or provide in tool calls
export RECHARGE_STOREFRONT_DOMAIN=your-shop.myshopify.com
```

**Problem**: `Domain must end with .myshopify.com`
```bash
# Solution: Use correct Shopify domain format
# Correct: shop.myshopify.com
# Incorrect: shop.com
```

#### Redirect Issues

**Problem**: `Too many redirects\` or `API returned redirect`
```bash
# Common causes and solutions:

# 1. Incorrect store URL format
# Use: your-shop.myshopify.com
# Not: your-shop.com or https://your-shop.myshopify.com

# 2. Invalid authentication tokens
# Verify your tokens are correct and have proper permissions

# 3. API endpoint issues
# Enable debug mode to see redirect details:
DEBUG=true npm start

# 4. Check if store has Recharge installed
# Verify Recharge is properly installed on the Shopify store

# 5. Token type mismatch  
# Ensure you're using Admin API tokens, not Storefront API tokens
# Storefront API tokens may cause OAuth redirects

# 6. Domain validation issues
# Ensure domain follows exact format: shop-name.myshopify.com
# No trailing slashes, no protocol prefix, lowercase
```

#### Session Issues

**Problem**: `Customer session token expired`
```bash
# Solution: Customer session tokens are automatically recreated
# Provide customer_id or customer_email in next call
```

**Problem**: `Security Error: Cannot use default customer session token`
```bash
# Solution: Always specify customer identification
# Add customer_email or customer_id to tool calls
```

### Debug Mode

Enable comprehensive debugging:

```bash
DEBUG=true npm start
```

Debug information includes:
- Authentication flow details
- API request/response logging
- Customer session token creation and caching
- Error stack traces
- Performance metrics

### Getting Help

1. **Check Documentation**: Review this README
2. **Enable Debug Mode**: Use `DEBUG=true\` for detailed logging
3. **Validate Setup**: Run `npm run validate`
4. **Test API Keys**: Run `npm run test:api-keys`
5. **Check Coverage**: Run `npm run coverage`

## Security

### Security Best Practices

#### API Token Security
- **Never commit tokens** to version control
- **Use environment variables** for sensitive data
- **Rotate tokens regularly** (recommended: every 90 days)
- **Use minimum required permissions**

#### Customer Data Protection
- **Always specify customer identification** in tool calls
- **Verify customer access** before operations
- **Use session tokens** for customer-scoped operations
- **Monitor for unusual access patterns**

#### Network Security
- **Use HTTPS** for all API communications (handled automatically by axios)
- **Implement proper firewall rules**
- **Monitor API usage** for anomalies
- **Be aware of Recharge API rate limits**

### Security Features

#### Built-in Protections
- **Customer data isolation**: Each customer gets separate session token
- **Wrong customer prevention**: Blocks ambiguous tool calls
- **Input validation**: Zod schema validation for all inputs
- **Error sanitization**: Sensitive data removed from logs and error messages
- **Session token caching**: Secure in-memory session management
- **Automatic session renewal**: Expired sessions recreated transparently
- **Parameter cleanup**: Sensitive parameters removed from API requests

### Reporting Security Issues

For security issues, please follow responsible disclosure practices and contact the project maintainers directly.

## Contributing

Contributions are welcome! When contributing:

- **Follow existing patterns**: Use the established code structure and naming conventions
- **Add proper validation**: Use Zod schemas for all new tool parameters
- **Test thoroughly**: Run `npm run validate\` before submitting changes
- **Update documentation**: Keep the README current with any changes
- **Handle errors properly**: Use the existing error handling patterns

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

## Support

### Resources
- **Documentation**: This README and comprehensive inline code documentation
- **Examples**: Complete usage examples throughout this README
- **Debug Mode**: Detailed logging for troubleshooting

### Getting Help
- **Debug Mode**: Enable with `DEBUG=true\` for troubleshooting
- **Validation**: Run `npm run validate\` to check setup
- **Coverage**: Run `npm run coverage\` to see API coverage

### Project Statistics
- **37 Tools**: Complete Recharge Storefront API coverage
- **10 Categories**: Comprehensive subscription management
- **Production Ready**: Error handling, logging, and monitoring
- **Secure**: Built-in customer data protection with session token isolation
- **Well Documented**: Comprehensive guides and examples

---

*Built with care for the Recharge and MCP communities*