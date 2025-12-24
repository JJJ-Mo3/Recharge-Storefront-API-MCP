# Recharge Storefront API MCP Server

A comprehensive Model Context Protocol (MCP) server that provides complete access to the Recharge Storefront API endpoints. This server enables AI assistants and other MCP clients to interact with Recharge subscription management functionality through a standardized interface

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Authentication](#authentication)
- [Configuration](#configuration)
- [Usage](#usage)
- [Available Tools](#available-tools)
- [Usage Examples](#usage-examples)
- [Unicode and International Support](#unicode-and-international-support)
- [Development](#development)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Security](#security)
- [Performance](#performance)
- [Contributing](#contributing)
- [Development](#development)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Security](#security)
- [Performance](#performance)
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
- **International Support**: Full Unicode support for global customers

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
| **Utilities** | 2 tools | Session cache management and diagnostics |

### Advanced Features

- **Automatic Session Management**: Intelligent session creation and caching
- **Multi-Customer Support**: Handle multiple customers in a single MCP connection
- **Flexible Authentication**: Environment variables, per-tool parameters, or explicit tokens
- **Comprehensive Error Handling**: Detailed error messages with actionable guidance
- **Debug Mode**: Extensive logging for development and troubleshooting
- **Input Validation**: Zod schema validation for all tool parameters
- **Security Protection**: Prevents accidental customer data exposure
- **Unicode Support**: Full international character support for names and addresses
- **Business Rule Validation**: Prevents invalid subscription configurations

### Session Cache Management

- **Automatic Session Caching**: Customer session tokens cached for performance
- **Environment Switching Support**: Tools to purge cache when switching between dev/test/production
- **Automatic Cleanup**: Old sessions (4+ hours) automatically purged to prevent stale tokens
- **Cache Statistics**: Monitor cached sessions and performance
- **Manual Purging**: Clear specific or all cached sessions on demand

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

# Run comprehensive tests
npm run test
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
4. **Set Permissions**: **IMPORTANT**: Recharge tokens have NO permissions by default. You must explicitly check ALL required permission boxes (see below)
5. **Copy Token**: Save the token (starts with your store prefix)

**Critical**: You must use **Admin API** tokens. Storefront API tokens will not work for session creation. Admin tokens typically start with your store prefix (e.g., `mystore_`) or `sk_`.

### Required Token Permissions

Your Admin API token must have **both read AND write permissions** for full functionality. **Recharge does NOT grant these by default** - you must explicitly select each permission when creating the token:

#### Required Permissions:
- ✅ **read_customers** - View customer information
- ✅ **write_customers** - Update customer profiles, create sessions
- ✅ **read_subscriptions** - View subscription details
- ✅ **write_subscriptions** - Skip, update, cancel, activate subscriptions
- ✅ **read_orders** - View order history
- ✅ **write_orders** - Modify orders and charges
- ✅ **read_products** - Browse product catalog
- ✅ **read_addresses** - View customer addresses
- ✅ **write_addresses** - Create, update, delete addresses
- ✅ **read_payment_methods** - View payment information
- ✅ **write_payment_methods** - Update billing information
- ✅ **read_discounts** - View applied discounts
- ✅ **write_discounts** - Apply and remove discount codes

**⚠️ Common Mistake**: Many users only select read permissions initially, thinking write permissions aren't needed. However, operations like "skip subscription" or "update customer" require write permissions even though they might seem like simple operations.

#### Common Permission Issues:

**Problem**: 403 errors on write operations (skip, update, cancel subscriptions)
**Cause**: Token has read permissions but missing write permissions
**Solution**: Update token permissions or create new token with full write access

**Problem**: Read operations work but write operations fail
**Cause**: Token created with "read-only" or limited permissions
**Solution**: Ensure token has ALL permissions listed above

#### How to Check Token Permissions:
1. Go to Recharge admin → Apps & integrations → API tokens
2. Find your Admin API token
3. Check the "Permissions" or "Scopes" section
4. Ensure ALL required permissions are enabled
5. If missing permissions, either update existing token or create new one

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

**If you experience JSON-RPC or timeout issues with Claude Desktop**, try this alternative configuration:

```json
{
  "mcpServers": {
    "recharge-storefront-api": {
      "command": "node",
      "args": ["index.js"],
      "cwd": "path/to/recharge-storefront-api-mcp",
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
      "args": ["src/server.js"],
      "cwd": "path/to/recharge-storefront-api-mcp",
      "env": {
        "RECHARGE_STOREFRONT_DOMAIN": "your-shop.myshopify.com",
        "RECHARGE_ADMIN_TOKEN": "your_admin_token_here"
      }
    }
  }
}
```

3. **If you experience MCP protocol issues in Cursor**, you have two options:

**Option A: Create a wrapper script** in your project root (`run-server.js`):
```javascript
#!/usr/bin/env node
import('./src/server.js').catch(console.error);
```

Then use this configuration:
```json
{
  "mcp.servers": {
    "recharge-storefront-api": {
      "command": "node",
      "args": ["run-server.js"],
      "cwd": "path/to/recharge-storefront-api-mcp",
      "env": {
        "RECHARGE_STOREFRONT_DOMAIN": "your-shop.myshopify.com",
        "RECHARGE_ADMIN_TOKEN": "your_admin_token_here"
      }
    }
  }
}
```

**Option B: Use .env file** with simpler config (if wrapper script doesn't work):

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

*Note: This relies on your `.env` file in the project directory containing the required environment variables.*
#### GPT-5 and OpenAI Clients

For GPT-5 and other OpenAI-based MCP clients:

```json
{
  "mcpServers": [
    {
      "name": "recharge-storefront-api",
      "command": "node",
      "args": ["index.js"],
      "cwd": "path/to/recharge-storefront-api-mcp",
      "env": {
        "RECHARGE_STOREFRONT_DOMAIN": "your-shop.myshopify.com",
        "RECHARGE_ADMIN_TOKEN": "your_admin_token_here"
      }
    }
  ]
}
```

**If experiencing protocol issues**, try using the main entry point:
```json
{
  "mcpServers": [
    {
      "name": "recharge-storefront-api",
      "command": "node",
      "args": ["src/server.js"],
      "cwd": "path/to/recharge-storefront-api-mcp"
    }
  ]
}
```

#### VSCode with GitHub Copilot

1. **Install MCP extension** for VSCode (if available)
2. **Add to VSCode settings.json** (`Ctrl/Cmd + Shift + P` → "Preferences: Open Settings (JSON)"):

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

#### Troubleshooting MCP Client Issues

**Common Issue**: JSON-RPC or timeout errors across different MCP clients (Claude Desktop, Cursor, GPT-5, etc.)

**Root Cause**: Different MCP clients implement the protocol with slight variations, causing compatibility issues with the JSON-RPC transport layer.

**Solutions** (try in order):

1. **Use the main entry point** (`index.js` instead of `src/server.js`):
   ```json
   "args": ["index.js"]
   ```

2. **Create a wrapper script** (`run-server.js`):
   ```javascript
   #!/usr/bin/env node
   import('./src/server.js').catch(console.error);
   ```
   Then use: `"args": ["run-server.js"]`

3. **Use direct stdio execution**:
   ```bash
   # Test the server directly
   echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node src/server.js
   ```

4. **Enable debug mode** to see detailed protocol communication:
   ```json
   "env": {
     "DEBUG": "true",
     "RECHARGE_STOREFRONT_DOMAIN": "your-shop.myshopify.com",
     "RECHARGE_ADMIN_TOKEN": "your_admin_token_here"
   }
   ```

5. **Verify server startup** independently:
   ```bash
   cd path/to/recharge-storefront-api-mcp
   npm start
   # Should show: [INFO] Server ready - listening for MCP requests
   ```

**Why This Happens**: The MCP specification is still evolving, and different AI platforms implement it with slight variations in their JSON-RPC handling, timeout mechanisms, and transport layers.

**Best Practice**: Start with the simplest configuration (`node src/server.js`) and add complexity only if needed.

#### General Configuration Tips

1. **Use absolute paths** for reliability across different environments
2. **Environment variables** can be set in client config or .env file
3. **Test connection** after setup using client's MCP testing features
4. **Enable debug mode** by adding `"DEBUG": "true"` to env variables for troubleshooting

### Environment Variables

Create a `.env` file in the project root:

```bash
# Required: Your Shopify domain
RECHARGE_STOREFRONT_DOMAIN=your-shop.myshopify.com

# Required: Admin API token for session creation
RECHARGE_ADMIN_TOKEN=your_admin_api_token_here

# Optional: Recharge API URL (defaults to production)
RECHARGE_API_URL=https://api.rechargeapps.com

# Optional: Default customer session token (if you have one)
RECHARGE_SESSION_TOKEN=

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
| `RECHARGE_ADMIN_TOKEN` | Yes* | Admin API token for session creation | `your_admin_api_token_here` |
| `RECHARGE_API_URL` | No | Recharge API endpoint (defaults to production, no fallback if invalid) | `https://api.stage.rechargeapps.com` |
| `RECHARGE_SESSION_TOKEN` | No | Default customer session token | `st_abc123` |
| `MCP_SERVER_NAME` | No | Server identification | `recharge-mcp` |
| `MCP_SERVER_VERSION` | No | Server version | `1.0.0` |
| `DEBUG` | No | Enable debug logging | `true` |

*Required unless provided in each tool call

### Important: API URL Behavior

- **Default**: Uses production API (`https://api.rechargeapps.com`) when `RECHARGE_API_URL` is not set
- **Custom URL**: Only uses alternative URL if explicitly specified and valid
- **No Fallback**: If custom URL is invalid, server fails to start (prevents unintentional production changes)
- **Security**: All URLs must use HTTPS protocol

### Per-Tool Configuration

Override environment variables in individual tool calls:

```json
{
  "name": "get_subscriptions",
  "arguments": {
    "store_url": "different-shop.myshopify.com",
    "admin_token": "different_admin_api_token",
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
| `get_customer` | Get current customer information | `customer_email` or `customer_id` |
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

### Utility Tools (2 tools)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `purge_session_cache` | Clear cached session tokens | `all`, `older_than_minutes`, `reason` |
| `get_session_cache_stats` | View cache statistics | - |

## Usage Examples

### 1. Basic Customer Operations

#### Customer Lookup
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

// Update customer information with Unicode support
{
  "name": "update_customer",
  "arguments": {
    "customer_email": "customer@example.com",
    "first_name": "José",
    "last_name": "García",
    "phone": "+34-123-456-789"
  }
}
```

### 2. Customer Service Workflow

```json
// 1. Look up customer
{
  "name": "get_customer",
  "arguments": {"customer_email": "customer@example.com"}
}

// 2. Check their subscriptions
{
  "name": "get_subscriptions",
  "arguments": {"customer_email": "customer@example.com"}
}

// 3. View recent orders
{
  "name": "get_orders",
  "arguments": {"customer_email": "customer@example.com"}
}
```

### 3. Subscription Management Workflow

```json
// 1. Get subscription details
{
  "name": "get_subscription",
  "arguments": {
    "customer_email": "customer@example.com",
    "subscription_id": "sub_123"
  }
}

// 2. Skip next delivery
{
  "name": "skip_subscription",
  "arguments": {
    "customer_email": "customer@example.com",
    "subscription_id": "sub_123",
    "date": "2024-02-15"
  }
}

// 3. Add one-time product to next delivery
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

### 4. Advanced Multi-Customer Operations

```json
// Customer A operations
{"name": "get_subscriptions", "arguments": {"customer_email": "alice@example.com"}}

// Customer B operations  
{"name": "get_orders", "arguments": {"customer_email": "bob@example.com"}}

// Back to Customer A (reuses cached session)
{"name": "get_addresses", "arguments": {"customer_email": "alice@example.com"}}
```

### 5. Session Cache Management

```json
// Clear all cached sessions (recommended when switching environments)
{
  "name": "purge_session_cache",
  "arguments": {
    "all": true,
    "reason": "switching from dev to production"
  }
}

// Clear only sessions older than 2 hours
{
  "name": "purge_session_cache",
  "arguments": {
    "all": false,
    "older_than_minutes": 120,
    "reason": "cleanup old sessions"
  }
}

// Check cache statistics
{
  "name": "get_session_cache_stats",
  "arguments": {}
}
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

## Unicode and International Support

### Full Unicode Support

The server provides comprehensive Unicode support for international customers:

#### Customer Names
- **Unicode Normalization**: NFC normalization for consistent storage
- **International Characters**: Support for letters, marks, numbers from all languages
- **Character Validation**: Prevents control characters while allowing proper Unicode
- **Length Limits**: 255 characters maximum for names

#### International Addresses
- **Address Fields**: Full Unicode support for street addresses, cities, provinces
- **Postal Codes**: Country-specific validation for US, Canada, UK formats
- **Phone Numbers**: International E.164 format support
- **Character Encoding**: Proper handling of international characters and diacritics (emojis and special symbols not supported by shipping providers)

#### Validation Features
- **NFC Normalization**: Canonical decomposition and composition
- **Control Character Removal**: Strips problematic characters
- **Whitespace Normalization**: Consistent spacing handling
- **Length Validation**: Appropriate limits for each field type
- **Shipping Compatibility**: Restricts characters that may cause issues with shipping labels and payment processors

#### Examples

```json
// International customer update
{
  "name": "update_customer",
  "arguments": {
    "customer_email": "müller@example.de",
    "first_name": "François",
    "last_name": "Müller",
    "phone": "+49-30-12345678"
  }
}

// International address creation
{
  "name": "create_address",
  "arguments": {
    "customer_email": "tanaka@example.jp",
    "first_name": "Tanaka",
    "last_name": "Taro", 
    "address1": "1-2-3 Jinnan, Shibuya-ku",
    "city": "Tokyo",
    "province": "Tokyo",
    "zip": "150-0041",
    "country": "Japan",
    "phone": "+81-3-1234-5678"
  }
}

// Note: While Unicode letters are supported (José, Müller, etc.), 
// emojis and mathematical symbols are not supported by shipping providers
```

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

## Testing

### Available Test Commands

```bash
# Run all tests
npm run test

# Run comprehensive test suite
npm run test:full

# Validate API key logic
npm run test:api-keys

# Check syntax and configuration
npm run validate

# View API coverage
npm run coverage
```

### Test Categories

#### 1. Syntax and Configuration Tests
- Node.js version validation
- Package.json integrity
- Environment file validation
- Source file syntax checking

#### 2. API Integration Tests
- Authentication flow validation
- Session management testing
- Error handling verification
- Unicode support validation

#### 3. Business Logic Tests
- Subscription frequency validation
- Variant existence checking
- Address format validation
- Customer data handling

#### 4. Security Tests
- Token handling validation
- Customer data isolation
- Input sanitization
- Error message security

### Running Specific Tests

```bash
# Test environment setup
npm run test:api-keys

# Validate all configurations
npm run validate

# Check project health
npm run health

# Test MCP protocol startup
npm run mcp:test
```

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

**Problem**: `403 Forbidden` on write operations (skip, update, cancel)
```bash
# Solution: Check token permissions
# Your Admin API token needs WRITE permissions, not just read
# Go to Recharge admin → API tokens → Check permissions
# Ensure token has: write_subscriptions, write_customers, write_orders
# Create new token with full permissions if needed
```

**Problem**: Read operations work but write operations fail with 403
```bash
# This is a classic token permissions issue
# Your token has read permissions but missing write permissions
# Solution: Update token permissions to include ALL write scopes:
# - write_customers
# - write_subscriptions  
# - write_orders
# - write_addresses
# - write_payment_methods
# - write_discounts
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

**Problem**: `Invalid RECHARGE_API_URL specified`
```bash
# Solution: Fix or remove the custom API URL
# The server will NOT fall back to production to prevent unintentional changes

# Option 1: Fix the URL format (must be HTTPS)
# IMPORTANT: Only specify this for non-production environments
# If invalid URL is specified, server will fail to start (no fallback to production)
# This prevents unintentional production changes when intending to use staging/test
# Production: https://api.rechargeapps.com (default - don't specify)
# Staging: https://api.stage.rechargeapps.com
# Sandbox: https://api.sandbox.rechargeapps.com
#RECHARGE_API_URL=https://api.stage.rechargeapps.com

# Option 2: Remove the setting to use production
# Comment out or delete the RECHARGE_API_URL line in .env

# Option 3: Use a valid staging/test URL
# Staging: https://api.stage.rechargeapps.com
# Sandbox: https://api.sandbox.rechargeapps.com
```

#### Unicode and Character Issues

**Problem**: `Invalid characters in name/address`
```bash
# Solution: Use proper Unicode characters
# Allowed: Letters, numbers, spaces, punctuation
# Avoid: Control characters, special symbols
# Use international formats for phone numbers
```

**Problem**: `Postal code format invalid`
```bash
# Solution: Use country-specific formats
# US: 12345 or 12345-6789
# Canada: A1A 1A1 or A1A1A1
# UK: SW1A 1AA or M1 1AA
```

#### Subscription Issues

**Problem**: `Invalid subscription frequency`
```bash
# Solution: Use valid frequency ranges
# Daily: 1-90 days
# Weekly: 1-52 weeks  
# Monthly: 1-12 months
# Maximum total: 365 days
```

**Problem**: `Variant not found or not subscription-enabled`
```bash
# Solution: Validate variant exists and is configured
# Use get_products to find valid variants
# Ensure product is enabled for subscriptions
# Check storefront_purchase_options setting
```

#### Redirect Issues

**Problem**: `Too many redirects` or `API returned redirect`
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

**Problem**: `Cross-environment token contamination`
```bash
# Solution: Purge session cache when switching environments
# Use the purge_session_cache tool to clear cached tokens
# This prevents dev tokens from being used in production
```

**Problem**: `Too many cached sessions affecting performance`
```bash
# Solution: Clean up old sessions periodically
# Use purge_session_cache with older_than_minutes parameter
# Or check get_session_cache_stats to monitor cache size
```

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

**Problem**: `Session creation returned invalid token`
```bash
# Solution: Check admin token permissions and format
# Ensure admin token has customer session creation permissions
# Verify token is not expired or revoked
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
- Unicode normalization details

### Getting Help

1. **Check Documentation**: Review this README
2. **Enable Debug Mode**: Use `DEBUG=true` for detailed logging
3. **Validate Setup**: Run `npm run validate`
4. **Test API Keys**: Run `npm run test:api-keys`
5. **Check Coverage**: Run `npm run coverage`
6. **Run Full Tests**: Run `npm run test:full`

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

#### Unicode Security
- **Normalize Unicode input** to prevent encoding attacks
- **Validate character sets** to prevent injection
- **Sanitize control characters** from user input
- **Use proper encoding** for international data

### Security Features

#### Built-in Protections
- **Customer data isolation**: Each customer gets separate session token
- **Wrong customer prevention**: Blocks ambiguous tool calls
- **Input validation**: Zod schema validation for all inputs
- **Error sanitization**: Sensitive data removed from logs and error messages
- **Session token caching**: Secure in-memory session management
- **Automatic session renewal**: Expired sessions recreated transparently
- **Parameter cleanup**: Sensitive parameters removed from API requests
- **Session cache isolation**: Environment-specific session management
- **Unicode normalization**: Prevents encoding-based attacks
- **API URL validation**: Custom URLs must use HTTPS, no fallback to production
- **Fail-fast configuration**: Invalid settings caught at startup

### Reporting Security Issues

For security issues, please follow responsible disclosure practices and contact the project maintainers directly.

## Performance

### Performance Features

#### Session Management
- **Intelligent Caching**: Customer sessions cached to avoid repeated API calls
- **Automatic Renewal**: Expired sessions renewed transparently
- **Environment Isolation**: Session cache can be purged when switching environments
- **Multi-Customer Support**: Efficient handling of multiple customer sessions

#### Request Optimization
- **Connection Pooling**: Axios instances with optimized connection handling
- **Request Timeouts**: 30-second timeouts prevent hanging requests
- **Error Recovery**: Automatic retry for expired session tokens

#### Memory Management
- **Efficient Caching**: In-memory session cache with automatic cleanup
- **Unicode Normalization**: Optimized Unicode processing
- **Garbage Collection**: Proper cleanup of expired sessions

#### Monitoring
- **Debug Logging**: Comprehensive performance metrics when enabled
- **Request Tracking**: Monitor API call patterns and response times
- **Error Tracking**: Track error rates and types

### Performance Tips

1. **Reuse Customer Sessions**: Use the same customer email/ID for related operations
2. **Enable Caching**: Let the server cache customer sessions automatically
3. **Batch Operations**: Group related operations for the same customer
4. **Purge When Switching Environments**: Use `purge_session_cache` when switching between dev/test/production
4. **Monitor Debug Output**: Use `DEBUG=true` to identify performance bottlenecks

## Contributing

Contributions are welcome! When contributing:

- **Follow existing patterns**: Use the established code structure and naming conventions
- **Add proper validation**: Use Zod schemas for all new tool parameters
- **Test thoroughly**: Run `npm run test:full` before submitting changes
- **Update documentation**: Keep the README current with any changes
- **Handle errors properly**: Use the existing error handling patterns
- **Support Unicode**: Ensure international character support in new features
- **Add business validation**: Include appropriate business rule validation

### Development Guidelines

1. **Code Quality**: Follow existing patterns and use proper TypeScript/JSDoc
2. **Testing**: Add tests for new functionality
3. **Documentation**: Update README and inline documentation
4. **Security**: Follow security best practices
5. **Performance**: Consider performance implications of changes
6. **Unicode Support**: Ensure proper international character handling

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

## Support

### Resources
- **Documentation**: This README and comprehensive inline code documentation
- **Examples**: Complete usage examples throughout this README
- **Debug Mode**: Detailed logging for troubleshooting
- **Test Suite**: Comprehensive testing tools

### Getting Help
- **Debug Mode**: Enable with `DEBUG=true` for troubleshooting
- **Validation**: Run `npm run validate` to check setup
- **Coverage**: Run `npm run coverage` to see API coverage
- **Full Tests**: Run `npm run test:full` for comprehensive testing

### Project Statistics
- **39 Tools**: Complete Recharge Storefront API coverage
- **10 Categories**: Comprehensive subscription management
- **Production Ready**: Error handling, logging, and monitoring
- **Secure**: Built-in customer data protection with session token isolation
- **International**: Full Unicode support for global customers
- **Well Documented**: Comprehensive guides and examples
- **Thoroughly Tested**: Comprehensive test suite with multiple validation layers

---

*Built with care for the Recharge and MCP communities*
