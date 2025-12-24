# Public Recharge Storefront API MCP Server

## Product Requirements Document & Technical Specification

**Version:** 1.0.0
**Date:** December 24, 2024
**Status:** Draft

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Overview](#2-product-overview)
3. [Architecture Overview](#3-architecture-overview)
4. [Database Schema](#4-database-schema)
5. [API Specification](#5-api-specification)
6. [Authentication & Security](#6-authentication--security)
7. [Tool Definitions](#7-tool-definitions)
8. [Edge Function Implementation](#8-edge-function-implementation)
9. [Session Management](#9-session-management)
10. [Rate Limiting & Quotas](#10-rate-limiting--quotas)
11. [Error Handling](#11-error-handling)
12. [Monitoring & Logging](#12-monitoring--logging)
13. [Deployment Guide](#13-deployment-guide)
14. [Testing Strategy](#14-testing-strategy)
15. [Migration from Local Server](#15-migration-from-local-server)

---

## 1. Executive Summary

### 1.1 Purpose

This document specifies the requirements and technical implementation details for converting the local Recharge Storefront API MCP Server into a publicly hosted, multi-tenant service. The public server will enable AI assistants to manage Recharge subscriptions through the Model Context Protocol (MCP) without requiring users to run local infrastructure.

### 1.2 Goals

- **Accessibility**: Enable any MCP-compatible AI client to access Recharge APIs without local setup
- **Multi-tenancy**: Support multiple Shopify stores and users simultaneously
- **Security**: Secure credential storage and transmission with enterprise-grade protection
- **Scalability**: Handle high request volumes with automatic scaling
- **Reliability**: 99.9% uptime with proper error handling and recovery

### 1.3 Key Differences from Local Server

| Aspect | Local Server | Public Server |
|--------|-------------|---------------|
| Transport | stdio | HTTP/SSE |
| Credentials | Environment variables | Encrypted database storage |
| Multi-tenancy | Single store | Multiple stores/users |
| Session Cache | In-memory (process) | Database-backed (Supabase) |
| Authentication | None (local trust) | API keys with scopes |
| Rate Limiting | None | Tiered limits per API key |
| Deployment | User-managed | Supabase Edge Functions |

---

## 2. Product Overview

### 2.1 System Context

```
+------------------+     MCP Protocol      +----------------------+
|   AI Assistant   | -------------------- |  Public MCP Server   |
| (Claude, GPT-5)  |     (HTTP/SSE)       |  (Edge Functions)    |
+------------------+                       +----------------------+
                                                    |
                                           +--------+--------+
                                           |                 |
                                    +------v------+   +------v------+
                                    |  Supabase   |   |  Recharge   |
                                    |  Database   |   |    API      |
                                    +-------------+   +-------------+
```

### 2.2 Supported Functionality

The public server provides the same 46 tools as the local server across 11 categories:

| Category | Tool Count | Description |
|----------|------------|-------------|
| Customer Management | 4 | Profile operations, lookup, session creation |
| Subscription Lifecycle | 9 | CRUD, skip, swap, cancel, activate |
| Address Management | 5 | CRUD for shipping/billing addresses |
| Payment Methods | 3 | View and update payment information |
| Product Catalog | 2 | Browse products and variants |
| Order Management | 2 | View order history |
| Charge Management | 2 | View billing and payments |
| One-time Products | 5 | Add products to deliveries |
| Bundle Management | 7 | Product bundle operations |
| Discount System | 4 | Apply and manage discounts |
| Utilities | 2 | Cache management, diagnostics |

### 2.3 User Personas

#### Store Administrator
- Configures Recharge credentials in the MCP portal
- Manages API keys for AI assistants
- Monitors usage and billing

#### AI Assistant Developer
- Integrates MCP server with AI applications
- Uses API keys to authenticate requests
- Builds subscription management workflows

#### End User (via AI)
- Interacts with AI assistant for subscription management
- No direct interaction with MCP server

---

## 3. Architecture Overview

### 3.1 High-Level Architecture

```
+------------------------------------------------------------------+
|                        MCP Client Layer                           |
|  +----------------+  +----------------+  +------------------+     |
|  | Claude Desktop |  |   Cursor IDE   |  | Custom AI Apps   |     |
|  +----------------+  +----------------+  +------------------+     |
+------------------------------------------------------------------+
                              |
                              | MCP Protocol (HTTP/SSE)
                              v
+------------------------------------------------------------------+
|                    Supabase Edge Functions                        |
|  +--------------------+  +--------------------+                   |
|  |   MCP Gateway      |  |  Tool Executor     |                   |
|  |   (mcp-gateway)    |  |  (tool-executor)   |                   |
|  +--------------------+  +--------------------+                   |
+------------------------------------------------------------------+
                              |
              +---------------+---------------+
              |               |               |
              v               v               v
+------------------+  +------------------+  +------------------+
|    Supabase      |  |  Session Cache   |  |    Recharge      |
|    Database      |  |  (Supabase)      |  |      API         |
+------------------+  +------------------+  +------------------+
```

### 3.2 Component Descriptions

#### MCP Gateway (`mcp-gateway`)
- Entry point for all MCP requests
- Handles MCP protocol negotiation
- Routes requests to appropriate tool handlers
- Manages SSE connections for streaming responses

#### Tool Executor (`tool-executor`)
- Executes individual tool calls
- Manages Recharge API client lifecycle
- Handles session token management
- Returns formatted MCP responses

#### Database Layer (Supabase)
- Stores encrypted Recharge credentials
- Manages API keys and permissions
- Caches session tokens
- Logs usage and audit trails

### 3.3 Request Flow

```
1. MCP Client sends HTTP request with API key
2. Edge Function validates API key
3. Retrieve store credentials from database
4. Check/create Recharge session token
5. Execute tool against Recharge API
6. Format and return MCP response
7. Log usage metrics
```

---

## 4. Database Schema

### 4.1 Schema Overview

The database uses Supabase PostgreSQL with Row Level Security (RLS) enabled on all tables.

### 4.2 Table Definitions

#### `stores` - Shopify Store Configuration

```sql
/*
  # Create stores table

  1. New Tables
    - `stores`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `shopify_domain` (text, unique per user)
      - `store_name` (text)
      - `recharge_admin_token_encrypted` (text, encrypted)
      - `recharge_api_url` (text, optional custom URL)
      - `is_active` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `stores` table
    - Users can only access their own stores
*/

CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shopify_domain text NOT NULL,
  store_name text,
  recharge_admin_token_encrypted text NOT NULL,
  recharge_api_url text DEFAULT 'https://api.rechargeapps.com',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT unique_user_domain UNIQUE (user_id, shopify_domain),
  CONSTRAINT valid_shopify_domain CHECK (shopify_domain ~ '^[a-z0-9-]+\.myshopify\.com$')
);

CREATE INDEX idx_stores_user_id ON stores(user_id);
CREATE INDEX idx_stores_shopify_domain ON stores(shopify_domain);

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stores"
  ON stores FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stores"
  ON stores FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stores"
  ON stores FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own stores"
  ON stores FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

#### `api_keys` - MCP API Key Management

```sql
/*
  # Create api_keys table

  1. New Tables
    - `api_keys`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `store_id` (uuid, references stores)
      - `key_hash` (text, SHA-256 hash of API key)
      - `key_prefix` (text, first 8 chars for identification)
      - `name` (text, user-friendly name)
      - `scopes` (text[], allowed operations)
      - `rate_limit_tier` (text, rate limit tier)
      - `is_active` (boolean)
      - `last_used_at` (timestamptz)
      - `expires_at` (timestamptz, optional)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Users can only manage their own API keys
*/

CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  name text NOT NULL,
  scopes text[] NOT NULL DEFAULT ARRAY['read'],
  rate_limit_tier text NOT NULL DEFAULT 'standard',
  is_active boolean DEFAULT true,
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT valid_rate_limit_tier CHECK (rate_limit_tier IN ('free', 'standard', 'professional', 'enterprise')),
  CONSTRAINT valid_scopes CHECK (scopes <@ ARRAY['read', 'write', 'admin']::text[])
);

CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_store_id ON api_keys(store_id);
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own api_keys"
  ON api_keys FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own api_keys"
  ON api_keys FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own api_keys"
  ON api_keys FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own api_keys"
  ON api_keys FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

#### `session_tokens` - Recharge Session Cache

```sql
/*
  # Create session_tokens table

  1. New Tables
    - `session_tokens`
      - `id` (uuid, primary key)
      - `store_id` (uuid, references stores)
      - `customer_id` (text, Recharge customer ID)
      - `customer_email` (text, optional email for lookup)
      - `session_token_encrypted` (text, encrypted token)
      - `created_at` (timestamptz)
      - `last_used_at` (timestamptz)
      - `expires_at` (timestamptz)

  2. Security
    - Enable RLS
    - Service role only access (edge functions)
*/

CREATE TABLE IF NOT EXISTS session_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id text NOT NULL,
  customer_email text,
  session_token_encrypted text NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '4 hours'),

  CONSTRAINT unique_store_customer UNIQUE (store_id, customer_id)
);

CREATE INDEX idx_session_tokens_store_customer ON session_tokens(store_id, customer_id);
CREATE INDEX idx_session_tokens_expires_at ON session_tokens(expires_at);
CREATE INDEX idx_session_tokens_customer_email ON session_tokens(store_id, customer_email);

ALTER TABLE session_tokens ENABLE ROW LEVEL SECURITY;

-- Only service role can access session tokens (edge functions)
CREATE POLICY "Service role can manage session_tokens"
  ON session_tokens FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

#### `usage_logs` - API Usage Tracking

```sql
/*
  # Create usage_logs table

  1. New Tables
    - `usage_logs`
      - `id` (uuid, primary key)
      - `api_key_id` (uuid, references api_keys)
      - `store_id` (uuid, references stores)
      - `tool_name` (text)
      - `customer_id` (text, optional)
      - `status` (text, success/error)
      - `error_message` (text, optional)
      - `execution_time_ms` (integer)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Users can view their own usage logs
*/

CREATE TABLE IF NOT EXISTS usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid REFERENCES api_keys(id) ON DELETE SET NULL,
  store_id uuid REFERENCES stores(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tool_name text NOT NULL,
  customer_id text,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  execution_time_ms integer,
  request_metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),

  CONSTRAINT valid_status CHECK (status IN ('success', 'error', 'rate_limited'))
);

CREATE INDEX idx_usage_logs_api_key_id ON usage_logs(api_key_id);
CREATE INDEX idx_usage_logs_store_id ON usage_logs(store_id);
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at DESC);
CREATE INDEX idx_usage_logs_tool_name ON usage_logs(tool_name);

ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage_logs"
  ON usage_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can insert usage logs
CREATE POLICY "Service role can insert usage_logs"
  ON usage_logs FOR INSERT
  TO service_role
  WITH CHECK (true);
```

#### `rate_limits` - Rate Limit Tracking

```sql
/*
  # Create rate_limits table

  1. New Tables
    - `rate_limits`
      - `id` (uuid, primary key)
      - `api_key_id` (uuid, references api_keys)
      - `window_start` (timestamptz)
      - `request_count` (integer)

  2. Security
    - Service role only
*/

CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 1,

  CONSTRAINT unique_api_key_window UNIQUE (api_key_id, window_start)
);

CREATE INDEX idx_rate_limits_api_key_window ON rate_limits(api_key_id, window_start);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage rate_limits"
  ON rate_limits FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

### 4.3 Database Functions

#### Encrypt/Decrypt Tokens

```sql
/*
  # Create encryption functions

  Uses pgcrypto extension for AES-256 encryption
*/

-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to encrypt sensitive data
CREATE OR REPLACE FUNCTION encrypt_token(token text, encryption_key text)
RETURNS text AS $$
BEGIN
  RETURN encode(
    pgp_sym_encrypt(token, encryption_key, 'cipher-algo=aes256'),
    'base64'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt sensitive data
CREATE OR REPLACE FUNCTION decrypt_token(encrypted_token text, encryption_key text)
RETURNS text AS $$
BEGIN
  RETURN pgp_sym_decrypt(
    decode(encrypted_token, 'base64'),
    encryption_key
  );
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Rate Limit Check

```sql
/*
  # Rate limit check function
*/

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_api_key_id uuid,
  p_tier text,
  p_window_minutes integer DEFAULT 1
)
RETURNS boolean AS $$
DECLARE
  v_limit integer;
  v_current_count integer;
  v_window_start timestamptz;
BEGIN
  -- Define limits per tier
  v_limit := CASE p_tier
    WHEN 'free' THEN 10
    WHEN 'standard' THEN 60
    WHEN 'professional' THEN 300
    WHEN 'enterprise' THEN 1000
    ELSE 10
  END;

  -- Calculate window start (truncate to minute)
  v_window_start := date_trunc('minute', now());

  -- Get or create rate limit record
  INSERT INTO rate_limits (api_key_id, window_start, request_count)
  VALUES (p_api_key_id, v_window_start, 1)
  ON CONFLICT (api_key_id, window_start)
  DO UPDATE SET request_count = rate_limits.request_count + 1
  RETURNING request_count INTO v_current_count;

  -- Clean old records (older than 1 hour)
  DELETE FROM rate_limits
  WHERE window_start < now() - interval '1 hour';

  RETURN v_current_count <= v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Session Token Cleanup

```sql
/*
  # Session cleanup function
*/

CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS integer AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM session_tokens
  WHERE expires_at < now()
  RETURNING COUNT(*) INTO v_deleted;

  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup (run every hour via cron)
SELECT cron.schedule(
  'cleanup-expired-sessions',
  '0 * * * *',
  'SELECT cleanup_expired_sessions()'
);
```

---

## 5. API Specification

### 5.1 Base URL

```
Production: https://<project-ref>.supabase.co/functions/v1/mcp-gateway
```

### 5.2 MCP Protocol Endpoints

#### List Tools

```http
POST /functions/v1/mcp-gateway
Content-Type: application/json
Authorization: Bearer <api_key>

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "get_customer",
        "description": "Retrieve current customer information",
        "inputSchema": {
          "type": "object",
          "properties": {
            "customer_id": { "type": "string" },
            "customer_email": { "type": "string", "format": "email" }
          }
        }
      }
    ]
  }
}
```

#### Call Tool

```http
POST /functions/v1/mcp-gateway
Content-Type: application/json
Authorization: Bearer <api_key>

{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "get_subscriptions",
    "arguments": {
      "customer_email": "customer@example.com",
      "status": "active"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Subscriptions:\n{...}"
      }
    ]
  }
}
```

### 5.3 Management API Endpoints

#### Create Store

```http
POST /functions/v1/stores
Content-Type: application/json
Authorization: Bearer <supabase_auth_token>

{
  "shopify_domain": "my-store.myshopify.com",
  "store_name": "My Store",
  "recharge_admin_token": "sk_..."
}
```

#### Create API Key

```http
POST /functions/v1/api-keys
Content-Type: application/json
Authorization: Bearer <supabase_auth_token>

{
  "store_id": "uuid",
  "name": "Production Key",
  "scopes": ["read", "write"],
  "rate_limit_tier": "standard"
}
```

**Response:**
```json
{
  "id": "uuid",
  "api_key": "rmcp_abc123...",
  "key_prefix": "rmcp_abc",
  "name": "Production Key",
  "scopes": ["read", "write"],
  "rate_limit_tier": "standard"
}
```

### 5.4 Error Responses

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32600,
    "message": "Invalid Request",
    "data": {
      "details": "Missing required parameter: customer_email"
    }
  }
}
```

**Error Codes:**
| Code | Message | Description |
|------|---------|-------------|
| -32700 | Parse error | Invalid JSON |
| -32600 | Invalid Request | Invalid MCP request |
| -32601 | Method not found | Unknown method |
| -32602 | Invalid params | Invalid parameters |
| -32603 | Internal error | Server error |
| -32001 | Unauthorized | Invalid or missing API key |
| -32002 | Rate limited | Too many requests |
| -32003 | Forbidden | Insufficient scopes |

---

## 6. Authentication & Security

### 6.1 API Key Format

```
rmcp_<random_32_chars>

Example: rmcp_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

### 6.2 API Key Validation

```typescript
interface APIKeyValidation {
  isValid: boolean;
  keyId: string | null;
  userId: string | null;
  storeId: string | null;
  scopes: string[];
  rateLimitTier: string;
  error?: string;
}

async function validateAPIKey(apiKey: string): Promise<APIKeyValidation> {
  // Extract prefix for logging
  const prefix = apiKey.substring(0, 12);

  // Hash the key for lookup
  const keyHash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(apiKey)
  );
  const hashHex = Array.from(new Uint8Array(keyHash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Look up in database
  const { data, error } = await supabase
    .from('api_keys')
    .select(`
      id,
      user_id,
      store_id,
      scopes,
      rate_limit_tier,
      is_active,
      expires_at
    `)
    .eq('key_hash', hashHex)
    .maybeSingle();

  if (error || !data) {
    return { isValid: false, error: 'Invalid API key' };
  }

  if (!data.is_active) {
    return { isValid: false, error: 'API key is deactivated' };
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { isValid: false, error: 'API key has expired' };
  }

  // Update last_used_at
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id);

  return {
    isValid: true,
    keyId: data.id,
    userId: data.user_id,
    storeId: data.store_id,
    scopes: data.scopes,
    rateLimitTier: data.rate_limit_tier
  };
}
```

### 6.3 Scope Requirements

| Tool Category | Required Scope |
|---------------|----------------|
| get_* tools | `read` |
| update_*, create_*, delete_* | `write` |
| purge_session_cache | `admin` |

### 6.4 Credential Encryption

```typescript
const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY');

async function encryptToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(ENCRYPTION_KEY),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(token)
  );

  // Combine salt + iv + encrypted
  const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  result.set(salt, 0);
  result.set(iv, salt.length);
  result.set(new Uint8Array(encrypted), salt.length + iv.length);

  return btoa(String.fromCharCode(...result));
}

async function decryptToken(encryptedToken: string): Promise<string> {
  const data = Uint8Array.from(atob(encryptedToken), c => c.charCodeAt(0));

  const salt = data.slice(0, 16);
  const iv = data.slice(16, 28);
  const encrypted = data.slice(28);

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(ENCRYPTION_KEY),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );

  return new TextDecoder().decode(decrypted);
}
```

### 6.5 Security Headers

```typescript
const securityHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Content-Security-Policy': "default-src 'none'",
  'Cache-Control': 'no-store, no-cache, must-revalidate'
};
```

---

## 7. Tool Definitions

### 7.1 Tool Registry

All tools from the local server are preserved with modifications for multi-tenant support:

```typescript
interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: ZodSchema;
  requiredScope: 'read' | 'write' | 'admin';
  execute: (context: ExecutionContext, args: unknown) => Promise<ToolResult>;
}

interface ExecutionContext {
  storeId: string;
  shopifyDomain: string;
  rechargeAdminToken: string;
  rechargeApiUrl: string;
  apiKeyId: string;
  userId: string;
}
```

### 7.2 Tool Categories and Scopes

```typescript
const toolRegistry: ToolDefinition[] = [
  // Customer Management (4 tools)
  {
    name: 'get_customer',
    description: 'Retrieve current customer information',
    requiredScope: 'read',
    inputSchema: customerSchema,
    execute: executeGetCustomer
  },
  {
    name: 'update_customer',
    description: 'Update customer information',
    requiredScope: 'write',
    inputSchema: updateCustomerSchema,
    execute: executeUpdateCustomer
  },
  {
    name: 'get_customer_by_email',
    description: 'Find customer by email address',
    requiredScope: 'read',
    inputSchema: customerByEmailSchema,
    execute: executeGetCustomerByEmail
  },
  {
    name: 'create_customer_session_by_id',
    description: 'Create customer session',
    requiredScope: 'admin',
    inputSchema: createSessionSchema,
    execute: executeCreateSession
  },

  // Subscription Management (9 tools)
  {
    name: 'get_subscriptions',
    requiredScope: 'read',
    // ...
  },
  {
    name: 'create_subscription',
    requiredScope: 'write',
    // ...
  },
  {
    name: 'update_subscription',
    requiredScope: 'write',
    // ...
  },
  {
    name: 'skip_subscription',
    requiredScope: 'write',
    // ...
  },
  {
    name: 'unskip_subscription',
    requiredScope: 'write',
    // ...
  },
  {
    name: 'swap_subscription',
    requiredScope: 'write',
    // ...
  },
  {
    name: 'cancel_subscription',
    requiredScope: 'write',
    // ...
  },
  {
    name: 'activate_subscription',
    requiredScope: 'write',
    // ...
  },
  {
    name: 'set_subscription_next_charge_date',
    requiredScope: 'write',
    // ...
  },

  // Address Management (5 tools)
  {
    name: 'get_addresses',
    requiredScope: 'read',
    // ...
  },
  {
    name: 'get_address',
    requiredScope: 'read',
    // ...
  },
  {
    name: 'create_address',
    requiredScope: 'write',
    // ...
  },
  {
    name: 'update_address',
    requiredScope: 'write',
    // ...
  },
  {
    name: 'delete_address',
    requiredScope: 'write',
    // ...
  },

  // Payment Methods (3 tools)
  {
    name: 'get_payment_methods',
    requiredScope: 'read',
    // ...
  },
  {
    name: 'get_payment_method',
    requiredScope: 'read',
    // ...
  },
  {
    name: 'update_payment_method',
    requiredScope: 'write',
    // ...
  },

  // Product Catalog (2 tools)
  {
    name: 'get_products',
    requiredScope: 'read',
    // ...
  },
  {
    name: 'get_product',
    requiredScope: 'read',
    // ...
  },

  // Order Management (2 tools)
  {
    name: 'get_orders',
    requiredScope: 'read',
    // ...
  },
  {
    name: 'get_order',
    requiredScope: 'read',
    // ...
  },

  // Charge Management (2 tools)
  {
    name: 'get_charges',
    requiredScope: 'read',
    // ...
  },
  {
    name: 'get_charge',
    requiredScope: 'read',
    // ...
  },

  // One-time Products (5 tools)
  {
    name: 'get_onetimes',
    requiredScope: 'read',
    // ...
  },
  {
    name: 'get_onetime',
    requiredScope: 'read',
    // ...
  },
  {
    name: 'create_onetime',
    requiredScope: 'write',
    // ...
  },
  {
    name: 'update_onetime',
    requiredScope: 'write',
    // ...
  },
  {
    name: 'delete_onetime',
    requiredScope: 'write',
    // ...
  },

  // Bundle Management (7 tools)
  {
    name: 'get_bundles',
    requiredScope: 'read',
    // ...
  },
  {
    name: 'get_bundle',
    requiredScope: 'read',
    // ...
  },
  {
    name: 'get_bundle_selections',
    requiredScope: 'read',
    // ...
  },
  {
    name: 'get_bundle_selection',
    requiredScope: 'read',
    // ...
  },
  {
    name: 'create_bundle_selection',
    requiredScope: 'write',
    // ...
  },
  {
    name: 'update_bundle_selection',
    requiredScope: 'write',
    // ...
  },
  {
    name: 'delete_bundle_selection',
    requiredScope: 'write',
    // ...
  },

  // Discount Management (4 tools)
  {
    name: 'get_discounts',
    requiredScope: 'read',
    // ...
  },
  {
    name: 'get_discount',
    requiredScope: 'read',
    // ...
  },
  {
    name: 'apply_discount',
    requiredScope: 'write',
    // ...
  },
  {
    name: 'remove_discount',
    requiredScope: 'write',
    // ...
  },

  // Utility Tools (2 tools)
  {
    name: 'purge_session_cache',
    requiredScope: 'admin',
    // ...
  },
  {
    name: 'get_session_cache_stats',
    requiredScope: 'read',
    // ...
  }
];
```

### 7.3 Input Schema Modifications

For the public server, authentication parameters are removed from individual tools since authentication is handled at the gateway level:

**Local Server Schema:**
```typescript
const baseSchema = z.object({
  session_token: z.string().optional(),
  admin_token: z.string().optional(),
  store_url: z.string().optional(),
  customer_id: z.string().optional(),
  customer_email: z.string().email().optional(),
});
```

**Public Server Schema:**
```typescript
const baseSchema = z.object({
  customer_id: z.string().optional(),
  customer_email: z.string().email().optional(),
});
// store_url, session_token, admin_token are derived from API key context
```

---

## 8. Edge Function Implementation

### 8.1 MCP Gateway Function

```typescript
// supabase/functions/mcp-gateway/index.ts

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MCPRequest {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

interface MCPResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Extract API key from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return jsonRPCError(-32001, "Unauthorized: Missing API key");
    }
    const apiKey = authHeader.substring(7);

    // Parse MCP request
    const mcpRequest: MCPRequest = await req.json();

    if (mcpRequest.jsonrpc !== "2.0") {
      return jsonRPCError(-32600, "Invalid Request: jsonrpc must be 2.0", mcpRequest.id);
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate API key
    const validation = await validateAPIKey(supabase, apiKey);
    if (!validation.isValid) {
      return jsonRPCError(-32001, `Unauthorized: ${validation.error}`, mcpRequest.id);
    }

    // Check rate limit
    const withinLimit = await checkRateLimit(supabase, validation.keyId!, validation.rateLimitTier);
    if (!withinLimit) {
      return jsonRPCError(-32002, "Rate limit exceeded", mcpRequest.id);
    }

    // Get store configuration
    const store = await getStoreConfig(supabase, validation.storeId!);
    if (!store) {
      return jsonRPCError(-32603, "Store configuration not found", mcpRequest.id);
    }

    // Handle MCP methods
    let result: unknown;

    switch (mcpRequest.method) {
      case "initialize":
        result = {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: {
            name: "recharge-storefront-api-mcp",
            version: "1.0.0"
          }
        };
        break;

      case "tools/list":
        result = { tools: getToolDefinitions(validation.scopes) };
        break;

      case "tools/call":
        result = await executeToolCall(
          supabase,
          store,
          validation,
          mcpRequest.params as { name: string; arguments?: Record<string, unknown> }
        );
        break;

      default:
        return jsonRPCError(-32601, `Method not found: ${mcpRequest.method}`, mcpRequest.id);
    }

    // Log usage
    const executionTime = Date.now() - startTime;
    await logUsage(supabase, {
      apiKeyId: validation.keyId!,
      storeId: validation.storeId!,
      userId: validation.userId!,
      toolName: mcpRequest.method,
      status: "success",
      executionTimeMs: executionTime
    });

    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: mcpRequest.id,
        result
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );

  } catch (error) {
    console.error("MCP Gateway Error:", error);
    return jsonRPCError(-32603, `Internal error: ${error.message}`);
  }
});

function jsonRPCError(code: number, message: string, id?: number | string): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      id: id ?? null,
      error: { code, message }
    }),
    {
      status: code === -32001 ? 401 : code === -32002 ? 429 : 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    }
  );
}
```

### 8.2 Tool Executor Module

```typescript
// supabase/functions/mcp-gateway/tool-executor.ts

import { RechargeClient } from "./recharge-client.ts";
import { SessionCache } from "./session-cache.ts";

interface ExecuteToolCallParams {
  name: string;
  arguments?: Record<string, unknown>;
}

export async function executeToolCall(
  supabase: SupabaseClient,
  store: StoreConfig,
  validation: APIKeyValidation,
  params: ExecuteToolCallParams
): Promise<ToolResult> {
  const { name, arguments: args = {} } = params;

  // Find tool definition
  const tool = toolRegistry.find(t => t.name === name);
  if (!tool) {
    throw new Error(`Tool not found: ${name}`);
  }

  // Check scope
  if (!validation.scopes.includes(tool.requiredScope)) {
    throw new Error(`Insufficient permissions. Required scope: ${tool.requiredScope}`);
  }

  // Validate input schema
  const validatedArgs = tool.inputSchema.parse(args);

  // Decrypt admin token
  const adminToken = await decryptToken(store.rechargeAdminTokenEncrypted);

  // Create execution context
  const context: ExecutionContext = {
    storeId: store.id,
    shopifyDomain: store.shopifyDomain,
    rechargeAdminToken: adminToken,
    rechargeApiUrl: store.rechargeApiUrl,
    apiKeyId: validation.keyId!,
    userId: validation.userId!
  };

  // Initialize session cache for this store
  const sessionCache = new SessionCache(supabase, store.id);

  // Create Recharge client
  const client = new RechargeClient({
    storeUrl: context.shopifyDomain,
    adminToken: context.rechargeAdminToken,
    apiUrl: context.rechargeApiUrl,
    sessionCache
  });

  // Execute tool
  return await tool.execute(context, client, validatedArgs);
}
```

### 8.3 Session Cache (Database-Backed)

```typescript
// supabase/functions/mcp-gateway/session-cache.ts

export class SessionCache {
  private supabase: SupabaseClient;
  private storeId: string;

  constructor(supabase: SupabaseClient, storeId: string) {
    this.supabase = supabase;
    this.storeId = storeId;
  }

  async getSessionToken(customerId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from("session_tokens")
      .select("session_token_encrypted, expires_at")
      .eq("store_id", this.storeId)
      .eq("customer_id", customerId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    // Check expiry
    if (new Date(data.expires_at) < new Date()) {
      await this.clearSession(customerId);
      return null;
    }

    // Update last_used_at
    await this.supabase
      .from("session_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("store_id", this.storeId)
      .eq("customer_id", customerId);

    // Decrypt and return
    return await decryptToken(data.session_token_encrypted);
  }

  async setSessionToken(
    customerId: string,
    sessionToken: string,
    customerEmail?: string
  ): Promise<void> {
    const encrypted = await encryptToken(sessionToken);

    await this.supabase
      .from("session_tokens")
      .upsert({
        store_id: this.storeId,
        customer_id: customerId,
        customer_email: customerEmail,
        session_token_encrypted: encrypted,
        last_used_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() // 4 hours
      }, {
        onConflict: "store_id,customer_id"
      });
  }

  async getCustomerIdByEmail(email: string): Promise<string | null> {
    const { data } = await this.supabase
      .from("session_tokens")
      .select("customer_id")
      .eq("store_id", this.storeId)
      .eq("customer_email", email)
      .maybeSingle();

    return data?.customer_id ?? null;
  }

  async clearSession(customerId: string): Promise<void> {
    await this.supabase
      .from("session_tokens")
      .delete()
      .eq("store_id", this.storeId)
      .eq("customer_id", customerId);
  }

  async clearAll(): Promise<number> {
    const { data } = await this.supabase
      .from("session_tokens")
      .delete()
      .eq("store_id", this.storeId)
      .select("id");

    return data?.length ?? 0;
  }

  async getStats(): Promise<SessionCacheStats> {
    const { data, count } = await this.supabase
      .from("session_tokens")
      .select("created_at", { count: "exact" })
      .eq("store_id", this.storeId)
      .order("created_at", { ascending: true });

    const emailCount = await this.supabase
      .from("session_tokens")
      .select("customer_email", { count: "exact" })
      .eq("store_id", this.storeId)
      .not("customer_email", "is", null);

    return {
      totalSessions: count ?? 0,
      emailMappings: emailCount.count ?? 0,
      oldestSessionAge: data?.[0]
        ? Math.floor((Date.now() - new Date(data[0].created_at).getTime()) / 1000)
        : null,
      newestSessionAge: data?.[data.length - 1]
        ? Math.floor((Date.now() - new Date(data[data.length - 1].created_at).getTime()) / 1000)
        : null
    };
  }
}
```

### 8.4 Recharge Client (Adapted for Deno)

```typescript
// supabase/functions/mcp-gateway/recharge-client.ts

export class RechargeClient {
  private storeUrl: string;
  private adminToken: string;
  private apiUrl: string;
  private sessionCache: SessionCache;

  constructor(config: {
    storeUrl: string;
    adminToken: string;
    apiUrl?: string;
    sessionCache: SessionCache;
  }) {
    this.storeUrl = config.storeUrl;
    this.adminToken = config.adminToken;
    this.apiUrl = config.apiUrl ?? "https://api.rechargeapps.com";
    this.sessionCache = sessionCache;
  }

  async getOrCreateSessionToken(
    customerId?: string,
    customerEmail?: string
  ): Promise<string> {
    // Look up cached session
    if (customerId) {
      const cached = await this.sessionCache.getSessionToken(customerId);
      if (cached) return cached;
    }

    if (customerEmail && !customerId) {
      customerId = await this.sessionCache.getCustomerIdByEmail(customerEmail);
      if (customerId) {
        const cached = await this.sessionCache.getSessionToken(customerId);
        if (cached) return cached;
      }
    }

    // Look up customer if needed
    if (!customerId && customerEmail) {
      const customer = await this.getCustomerByEmail(customerEmail);
      customerId = customer.id.toString();
    }

    if (!customerId) {
      throw new Error("Customer ID or email required for session creation");
    }

    // Create new session
    const session = await this.createCustomerSessionById(customerId);
    await this.sessionCache.setSessionToken(
      customerId,
      session.apiToken,
      customerEmail
    );

    return session.apiToken;
  }

  async makeRequest(
    method: string,
    endpoint: string,
    data?: Record<string, unknown>,
    params?: Record<string, unknown>,
    customerId?: string,
    customerEmail?: string
  ): Promise<unknown> {
    const sessionToken = await this.getOrCreateSessionToken(customerId, customerEmail);

    const url = new URL(endpoint, this.apiUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString(), {
      method: method.toUpperCase(),
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-Recharge-Access-Token": sessionToken,
        "X-Recharge-Version": "2021-11"
      },
      body: data ? JSON.stringify(data) : undefined
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new RechargeAPIError(
        errorData.message ?? `HTTP ${response.status}`,
        response.status,
        errorData.error_code
      );
    }

    return await response.json();
  }

  async makeAdminRequest(
    method: string,
    endpoint: string,
    data?: Record<string, unknown>,
    params?: Record<string, unknown>
  ): Promise<unknown> {
    const url = new URL(endpoint, this.apiUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString(), {
      method: method.toUpperCase(),
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-Recharge-Access-Token": this.adminToken,
        "X-Recharge-Version": "2021-11"
      },
      body: data ? JSON.stringify(data) : undefined
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new RechargeAPIError(
        errorData.message ?? `HTTP ${response.status}`,
        response.status,
        errorData.error_code
      );
    }

    return await response.json();
  }

  // Customer methods
  async getCustomer(customerId?: string, customerEmail?: string): Promise<Customer> {
    const response = await this.makeRequest("GET", "/customer", null, null, customerId, customerEmail);
    return response.customer;
  }

  async getCustomerByEmail(email: string): Promise<Customer> {
    const response = await this.makeAdminRequest("GET", "/customers", null, { email });
    if (!response.customers?.length) {
      throw new Error(`Customer not found: ${email}`);
    }
    return response.customers[0];
  }

  async createCustomerSessionById(customerId: string): Promise<CustomerSession> {
    const response = await this.makeAdminRequest("POST", `/customers/${customerId}/sessions`);
    return response.customer_session;
  }

  // Subscription methods
  async getSubscriptions(params?: SubscriptionParams, customerId?: string, customerEmail?: string) {
    return this.makeRequest("GET", "/subscriptions", null, params, customerId, customerEmail);
  }

  async getSubscription(subscriptionId: string, customerId?: string, customerEmail?: string) {
    return this.makeRequest("GET", `/subscriptions/${subscriptionId}`, null, null, customerId, customerEmail);
  }

  async skipSubscription(subscriptionId: string, date: string, customerId?: string, customerEmail?: string) {
    return this.makeRequest("POST", `/subscriptions/${subscriptionId}/skip`, { date }, null, customerId, customerEmail);
  }

  // ... Additional methods matching local server implementation
}
```

---

## 9. Session Management

### 9.1 Session Lifecycle

```
1. Tool call received with customer_id or customer_email
2. Check database for cached session token
3. If cached and not expired:
   a. Update last_used_at
   b. Return cached token
4. If not cached or expired:
   a. Look up customer (if email provided)
   b. Create session via Admin API
   c. Encrypt and store in database
   d. Return new token
5. On 401/403 from Recharge:
   a. Clear cached session
   b. Retry with new session (up to 2 retries)
```

### 9.2 Session Expiry Strategy

| Event | Action |
|-------|--------|
| Session created | Set expires_at = now + 4 hours |
| Session used | Update last_used_at |
| Session expired | Delete on next access |
| Hourly cron | Delete all expired sessions |
| Rate limit exceeded | No session impact |

### 9.3 Multi-Customer Isolation

Each session is scoped to:
- `store_id`: Prevents cross-store access
- `customer_id`: Prevents cross-customer access

---

## 10. Rate Limiting & Quotas

### 10.1 Rate Limit Tiers

| Tier | Requests/Minute | Requests/Hour | Requests/Day |
|------|----------------|---------------|--------------|
| Free | 10 | 100 | 500 |
| Standard | 60 | 1,000 | 10,000 |
| Professional | 300 | 5,000 | 50,000 |
| Enterprise | 1,000 | 20,000 | 200,000 |

### 10.2 Rate Limit Implementation

```typescript
async function checkRateLimit(
  supabase: SupabaseClient,
  apiKeyId: string,
  tier: string
): Promise<boolean> {
  const limits = {
    free: { minute: 10, hour: 100, day: 500 },
    standard: { minute: 60, hour: 1000, day: 10000 },
    professional: { minute: 300, hour: 5000, day: 50000 },
    enterprise: { minute: 1000, hour: 20000, day: 200000 }
  };

  const tierLimits = limits[tier] ?? limits.free;

  // Check minute window
  const { data: minuteCount } = await supabase
    .from("rate_limits")
    .select("request_count")
    .eq("api_key_id", apiKeyId)
    .gte("window_start", new Date(Date.now() - 60000).toISOString())
    .single();

  if (minuteCount && minuteCount.request_count >= tierLimits.minute) {
    return false;
  }

  // Increment counter
  await supabase.rpc("increment_rate_limit", {
    p_api_key_id: apiKeyId,
    p_window_start: new Date(Math.floor(Date.now() / 60000) * 60000).toISOString()
  });

  return true;
}
```

### 10.3 Rate Limit Headers

```typescript
const rateLimitHeaders = {
  "X-RateLimit-Limit": tierLimits.minute.toString(),
  "X-RateLimit-Remaining": (tierLimits.minute - currentCount).toString(),
  "X-RateLimit-Reset": resetTime.toISOString()
};
```

---

## 11. Error Handling

### 11.1 Error Categories

| Category | HTTP Status | MCP Error Code | Retry |
|----------|-------------|----------------|-------|
| Authentication | 401 | -32001 | No |
| Rate Limit | 429 | -32002 | Yes (backoff) |
| Permission | 403 | -32003 | No |
| Validation | 400 | -32602 | No |
| Not Found | 404 | -32603 | No |
| Recharge API | 5xx | -32603 | Yes |
| Internal | 500 | -32603 | Yes |

### 11.2 Error Response Format

```typescript
interface MCPError {
  jsonrpc: "2.0";
  id: number | string | null;
  error: {
    code: number;
    message: string;
    data?: {
      details?: string;
      rechargeError?: {
        statusCode: number;
        errorCode?: string;
        message: string;
      };
      retryAfter?: number;
    };
  };
}
```

### 11.3 Error Handling in Tools

```typescript
async function executeToolWithErrorHandling(
  tool: ToolDefinition,
  context: ExecutionContext,
  client: RechargeClient,
  args: unknown
): Promise<ToolResult> {
  try {
    return await tool.execute(context, client, args);
  } catch (error) {
    if (error instanceof RechargeAPIError) {
      return {
        content: [{
          type: "text",
          text: formatRechargeError(error)
        }],
        isError: true,
        _meta: {
          errorType: "RechargeAPIError",
          statusCode: error.statusCode,
          errorCode: error.errorCode
        }
      };
    }

    if (error instanceof z.ZodError) {
      return {
        content: [{
          type: "text",
          text: `Validation Error: ${error.issues.map(i => i.message).join(", ")}`
        }],
        isError: true,
        _meta: { errorType: "ValidationError" }
      };
    }

    return {
      content: [{
        type: "text",
        text: `Error: ${error.message}`
      }],
      isError: true,
      _meta: { errorType: "UnknownError" }
    };
  }
}
```

---

## 12. Monitoring & Logging

### 12.1 Metrics to Track

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| Request count | Total requests per minute | N/A |
| Error rate | Errors / Total requests | > 5% |
| Latency P50 | 50th percentile response time | > 500ms |
| Latency P95 | 95th percentile response time | > 2000ms |
| Rate limit hits | Rate limited requests | > 100/hour |
| Session creation | New sessions created | > 1000/hour |
| Recharge API errors | Errors from Recharge | > 10/minute |

### 12.2 Structured Logging

```typescript
interface LogEntry {
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  service: "mcp-gateway";
  traceId: string;
  apiKeyId?: string;
  storeId?: string;
  userId?: string;
  method: string;
  toolName?: string;
  customerId?: string;
  durationMs: number;
  status: "success" | "error" | "rate_limited";
  error?: {
    type: string;
    message: string;
    code?: number;
  };
}

function log(entry: LogEntry): void {
  console.log(JSON.stringify(entry));
}
```

### 12.3 Usage Analytics Dashboard

Queries for analytics:

```sql
-- Requests per tool (last 24 hours)
SELECT tool_name, COUNT(*) as count
FROM usage_logs
WHERE created_at > now() - interval '24 hours'
GROUP BY tool_name
ORDER BY count DESC;

-- Error rate per store
SELECT
  store_id,
  COUNT(*) FILTER (WHERE status = 'error') as errors,
  COUNT(*) as total,
  ROUND(COUNT(*) FILTER (WHERE status = 'error')::numeric / COUNT(*) * 100, 2) as error_rate
FROM usage_logs
WHERE created_at > now() - interval '1 hour'
GROUP BY store_id
HAVING COUNT(*) > 10
ORDER BY error_rate DESC;

-- Average response time per tool
SELECT
  tool_name,
  AVG(execution_time_ms) as avg_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms) as p95_ms
FROM usage_logs
WHERE created_at > now() - interval '1 hour'
GROUP BY tool_name;
```

---

## 13. Deployment Guide

### 13.1 Prerequisites

- Supabase project with Pro plan (for Edge Functions)
- Domain for MCP endpoint (optional)
- SSL certificate (handled by Supabase)

### 13.2 Environment Variables

```bash
# Required for Edge Functions
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ENCRYPTION_KEY=<32-character-random-string>

# Optional
DEBUG=false
```

### 13.3 Deployment Steps

1. **Create Supabase Project**
   ```bash
   supabase init
   supabase link --project-ref <project-ref>
   ```

2. **Apply Database Migrations**
   ```bash
   supabase db push
   ```

3. **Set Environment Secrets**
   ```bash
   supabase secrets set ENCRYPTION_KEY=<key>
   ```

4. **Deploy Edge Functions**
   ```bash
   supabase functions deploy mcp-gateway
   supabase functions deploy stores
   supabase functions deploy api-keys
   ```

5. **Verify Deployment**
   ```bash
   curl -X POST https://<project>.supabase.co/functions/v1/mcp-gateway \
     -H "Authorization: Bearer <api_key>" \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
   ```

### 13.4 MCP Client Configuration

```json
{
  "mcpServers": {
    "recharge-storefront-api": {
      "transport": "http",
      "url": "https://<project>.supabase.co/functions/v1/mcp-gateway",
      "headers": {
        "Authorization": "Bearer rmcp_<api_key>"
      }
    }
  }
}
```

---

## 14. Testing Strategy

### 14.1 Test Categories

#### Unit Tests
- Tool input schema validation
- Encryption/decryption functions
- Rate limit calculations
- Session cache operations

#### Integration Tests
- API key validation flow
- Session token lifecycle
- Tool execution with mock Recharge API
- Rate limiting behavior

#### End-to-End Tests
- Full MCP request/response cycle
- Multi-tenant isolation
- Error handling scenarios

### 14.2 Test Environment

```typescript
// Test fixtures
const testStore = {
  id: "test-store-uuid",
  shopifyDomain: "test-store.myshopify.com",
  rechargeAdminToken: "test_admin_token"
};

const testApiKey = {
  id: "test-key-uuid",
  apiKey: "rmcp_test_key_12345678901234567890",
  scopes: ["read", "write"]
};

// Mock Recharge API
const mockRechargeServer = createMockServer({
  "GET /customer": { customer: { id: 123, email: "test@example.com" } },
  "GET /subscriptions": { subscriptions: [] }
});
```

### 14.3 Load Testing

```bash
# Using k6 for load testing
k6 run --vus 100 --duration 5m load-test.js
```

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export default function() {
  const res = http.post(
    'https://<project>.supabase.co/functions/v1/mcp-gateway',
    JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'get_subscriptions',
        arguments: { customer_email: 'test@example.com' }
      }
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer rmcp_test_key'
      }
    }
  );

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 2000ms': (r) => r.timings.duration < 2000
  });

  sleep(0.1);
}
```

---

## 15. Migration from Local Server

### 15.1 Feature Parity Checklist

| Feature | Local | Public | Notes |
|---------|-------|--------|-------|
| 46 Tools | Yes | Yes | Same functionality |
| Session caching | In-memory | Database | Persistent |
| Multi-customer | Yes | Yes | Enhanced isolation |
| Unicode support | Yes | Yes | Same validation |
| Error handling | Yes | Yes | Enhanced for HTTP |
| Debug logging | Yes | Yes | Structured logs |
| Rate limiting | No | Yes | New feature |
| Multi-tenant | No | Yes | New feature |

### 15.2 Breaking Changes

1. **Authentication**: Requires API key instead of environment variables
2. **Transport**: HTTP instead of stdio
3. **Removed Parameters**: `store_url`, `admin_token`, `session_token` per-tool parameters removed (handled by API key)

### 15.3 Migration Steps for Users

1. **Create Account**: Register at the MCP portal
2. **Add Store**: Configure Shopify domain and Recharge admin token
3. **Generate API Key**: Create API key with appropriate scopes
4. **Update MCP Config**: Change from local to HTTP transport

**Before (Local):**
```json
{
  "mcpServers": {
    "recharge": {
      "command": "node",
      "args": ["src/server.js"],
      "env": {
        "RECHARGE_STOREFRONT_DOMAIN": "shop.myshopify.com",
        "RECHARGE_ADMIN_TOKEN": "sk_..."
      }
    }
  }
}
```

**After (Public):**
```json
{
  "mcpServers": {
    "recharge": {
      "transport": "http",
      "url": "https://mcp.recharge-api.com/v1",
      "headers": {
        "Authorization": "Bearer rmcp_..."
      }
    }
  }
}
```

---

## Appendices

### A. Complete Tool Reference

[See Section 7 for full tool definitions]

### B. API Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| -32700 | 400 | Parse error - Invalid JSON |
| -32600 | 400 | Invalid Request |
| -32601 | 404 | Method not found |
| -32602 | 400 | Invalid params |
| -32603 | 500 | Internal error |
| -32001 | 401 | Unauthorized |
| -32002 | 429 | Rate limited |
| -32003 | 403 | Forbidden |

### C. Database ER Diagram

```
+-------------+       +-------------+       +----------------+
|    users    |------>|   stores    |------>| session_tokens |
+-------------+       +-------------+       +----------------+
      |                     |
      |                     v
      |               +-------------+
      +-------------->|  api_keys   |
                      +-------------+
                            |
                            v
                      +-------------+
                      | usage_logs  |
                      +-------------+
                            |
                            v
                      +-------------+
                      | rate_limits |
                      +-------------+
```

### D. Security Considerations

1. **Token Encryption**: All Recharge tokens encrypted at rest with AES-256
2. **API Key Hashing**: API keys stored as SHA-256 hashes
3. **RLS Policies**: All tables protected with Row Level Security
4. **HTTPS Only**: All communication over TLS 1.3
5. **Rate Limiting**: Protection against abuse
6. **Audit Logging**: All operations logged for compliance

---

**Document Version History**

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-12-24 | Initial PRD and Technical Specification |

---

*This document serves as the complete specification for building the Public Recharge Storefront API MCP Server. Implementation should follow this specification closely to ensure feature parity with the local server while adding multi-tenant, security, and scalability capabilities.*
