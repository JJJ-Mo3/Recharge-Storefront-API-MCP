# Public Recharge Storefront API MCP Server

## Product Requirements Document & Technical Specification

**Version:** 1.1.0
**Date:** December 24, 2024
**Status:** Draft
**Infrastructure:** Netlify Functions + Supabase Database

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Overview](#2-product-overview)
3. [Architecture Overview](#3-architecture-overview)
4. [Database Schema](#4-database-schema)
5. [API Specification](#5-api-specification)
6. [Authentication & Security](#6-authentication--security)
7. [Tool Definitions](#7-tool-definitions)
8. [Netlify Functions Implementation](#8-netlify-functions-implementation)
9. [Session Management](#9-session-management)
10. [Rate Limiting & Quotas](#10-rate-limiting--quotas)
11. [Error Handling](#11-error-handling)
12. [Monitoring & Logging](#12-monitoring--logging)
13. [Deployment Guide](#13-deployment-guide)
14. [Testing Strategy](#14-testing-strategy)
15. [Migration from Local Server](#15-migration-from-local-server)
16. [Appendices](#appendices)

---

## 1. Executive Summary

### 1.1 Purpose

This document specifies the requirements and technical implementation details for converting the local Recharge Storefront API MCP Server into a publicly hosted, multi-tenant service. The public server will enable AI assistants to manage Recharge subscriptions through the Model Context Protocol (MCP) without requiring users to run local infrastructure.

### 1.2 Infrastructure Choice

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Serverless Functions** | Netlify Functions | MCP gateway, tool execution, management APIs |
| **Database** | Supabase PostgreSQL | Credential storage, session cache, usage logs |
| **Authentication** | Custom API Keys | Secure access to MCP endpoints |
| **CDN/Edge** | Netlify Edge | Global distribution, low latency |

### 1.3 Goals

- **Accessibility**: Enable any MCP-compatible AI client to access Recharge APIs without local setup
- **Multi-tenancy**: Support multiple Shopify stores and users simultaneously
- **Security**: Secure credential storage and transmission with enterprise-grade protection
- **Scalability**: Handle high request volumes with automatic scaling via Netlify
- **Reliability**: 99.9% uptime with proper error handling and recovery

### 1.4 Key Differences from Local Server

| Aspect | Local Server | Public Server |
|--------|-------------|---------------|
| Transport | stdio | HTTP/SSE |
| Credentials | Environment variables | Encrypted Supabase storage |
| Multi-tenancy | Single store | Multiple stores/users |
| Session Cache | In-memory (process) | Database-backed (Supabase) |
| Authentication | None (local trust) | API keys with scopes |
| Rate Limiting | None | Tiered limits per API key |
| Deployment | User-managed | Netlify Functions |
| Runtime | Node.js 18+ | Netlify Functions (Node.js) |

---

## 2. Product Overview

### 2.1 System Context

```
+------------------+     MCP Protocol      +----------------------+
|   AI Assistant   | -------------------> |  Netlify Functions   |
| (Claude, etc.)   |     (HTTPS)          |  (MCP Gateway)       |
+------------------+                       +----------------------+
                                                    |
                                           +--------+--------+
                                           |                 |
                                    +------v------+   +------v------+
                                    |  Supabase   |   |  Recharge   |
                                    |  Database   |   |    API      |
                                    +-------------+   +-------------+
```

### 2.2 Supported Functionality - Complete Tool List (46 Tools)

The public server provides the same 46 tools as the local server across 11 categories:

#### Customer Management (4 tools)
| Tool Name | Description | Scope |
|-----------|-------------|-------|
| `get_customer` | Retrieve current customer information | read |
| `update_customer` | Update customer information (email, name, phone) | write |
| `get_customer_by_email` | Find customer by email address to get customer ID | read |
| `create_customer_session_by_id` | Create a customer session using customer ID | admin |

#### Subscription Management (10 tools)
| Tool Name | Description | Scope |
|-----------|-------------|-------|
| `get_subscriptions` | Get subscriptions for a customer with filtering | read |
| `get_subscription` | Get detailed information about a specific subscription | read |
| `create_subscription` | Create a new subscription | write |
| `update_subscription` | Update subscription details (frequency, quantity, date) | write |
| `skip_subscription` | Skip a subscription delivery for a specific date | write |
| `unskip_subscription` | Unskip a previously skipped subscription delivery | write |
| `swap_subscription` | Swap the variant of a subscription | write |
| `cancel_subscription` | Cancel a subscription | write |
| `activate_subscription` | Activate a cancelled subscription | write |
| `set_subscription_next_charge_date` | Set the next charge date for a subscription | write |

#### Address Management (5 tools)
| Tool Name | Description | Scope |
|-----------|-------------|-------|
| `get_addresses` | Get addresses for a customer | read |
| `get_address` | Get detailed information about a specific address | read |
| `create_address` | Create a new address | write |
| `update_address` | Update an existing address | write |
| `delete_address` | Delete an address | write |

#### Payment Methods (3 tools)
| Tool Name | Description | Scope |
|-----------|-------------|-------|
| `get_payment_methods` | Get payment methods for a customer | read |
| `get_payment_method` | Get detailed information about a specific payment method | read |
| `update_payment_method` | Update a payment method | write |

#### Product Catalog (2 tools)
| Tool Name | Description | Scope |
|-----------|-------------|-------|
| `get_products` | Get products available for subscription | read |
| `get_product` | Get detailed information about a specific product | read |

#### Order Management (2 tools)
| Tool Name | Description | Scope |
|-----------|-------------|-------|
| `get_orders` | Get orders for a customer | read |
| `get_order` | Get detailed information about a specific order | read |

#### Charge Management (2 tools)
| Tool Name | Description | Scope |
|-----------|-------------|-------|
| `get_charges` | Get charges for a customer | read |
| `get_charge` | Get detailed information about a specific charge | read |

#### One-time Products (5 tools)
| Tool Name | Description | Scope |
|-----------|-------------|-------|
| `get_onetimes` | Get one-time products for a customer | read |
| `get_onetime` | Get detailed information about a specific one-time product | read |
| `create_onetime` | Create a one-time product to add to next delivery | write |
| `update_onetime` | Update a one-time product | write |
| `delete_onetime` | Delete a one-time product | write |

#### Bundle Management (7 tools)
| Tool Name | Description | Scope |
|-----------|-------------|-------|
| `get_bundles` | Get bundles for a customer | read |
| `get_bundle` | Get detailed information about a specific bundle | read |
| `get_bundle_selections` | Get bundle selections for a specific bundle | read |
| `get_bundle_selection` | Get detailed information about a specific bundle selection | read |
| `create_bundle_selection` | Create a bundle selection | write |
| `update_bundle_selection` | Update a bundle selection | write |
| `delete_bundle_selection` | Delete a bundle selection | write |

#### Discount Management (4 tools)
| Tool Name | Description | Scope |
|-----------|-------------|-------|
| `get_discounts` | Get discounts for a customer | read |
| `get_discount` | Get detailed information about a specific discount | read |
| `apply_discount` | Apply a discount code | write |
| `remove_discount` | Remove a discount | write |

#### Utility Tools (2 tools)
| Tool Name | Description | Scope |
|-----------|-------------|-------|
| `purge_session_cache` | Clear cached customer session tokens | admin |
| `get_session_cache_stats` | Get statistics about cached session tokens | read |

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
                              | MCP Protocol (HTTPS)
                              v
+------------------------------------------------------------------+
|                      Netlify Platform                             |
|  +------------------------------------------------------------+  |
|  |                    Netlify Functions                        |  |
|  |  +------------------+  +------------------+                 |  |
|  |  |  mcp-gateway     |  |  management-api  |                 |  |
|  |  |  (main handler)  |  |  (stores, keys)  |                 |  |
|  |  +------------------+  +------------------+                 |  |
|  +------------------------------------------------------------+  |
|  |                    Netlify Edge (CDN)                       |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+
                              |
              +---------------+---------------+
              |               |               |
              v               v               v
+------------------+  +------------------+  +------------------+
|    Supabase      |  |  Session Cache   |  |    Recharge      |
|    PostgreSQL    |  |  (Supabase)      |  |      API         |
|                  |  |                  |  |                  |
|  - stores        |  |  - session_tokens|  |  - Storefront    |
|  - api_keys      |  |                  |  |  - Admin         |
|  - usage_logs    |  |                  |  |                  |
|  - rate_limits   |  |                  |  |                  |
+------------------+  +------------------+  +------------------+
```

### 3.2 Component Descriptions

#### Netlify Functions

| Function | Path | Purpose |
|----------|------|---------|
| `mcp-gateway` | `/.netlify/functions/mcp-gateway` | Main MCP protocol handler |
| `stores` | `/.netlify/functions/stores` | Store management CRUD |
| `api-keys` | `/.netlify/functions/api-keys` | API key management |
| `health` | `/.netlify/functions/health` | Health check endpoint |

#### Supabase Database

| Table | Purpose |
|-------|---------|
| `stores` | Shopify store configuration with encrypted Recharge tokens |
| `api_keys` | MCP API key management with scopes and rate limits |
| `session_tokens` | Cached Recharge session tokens per customer |
| `usage_logs` | API usage tracking and analytics |
| `rate_limits` | Per-key rate limit tracking |

### 3.3 Request Flow

```
1. MCP Client sends HTTPS POST to Netlify Function with API key
2. Netlify Function validates API key against Supabase
3. Check rate limits in Supabase
4. Retrieve store credentials from Supabase (decrypt admin token)
5. Check/create Recharge session token in cache
6. Execute tool against Recharge Storefront API
7. Format and return MCP response
8. Log usage to Supabase
```

### 3.4 Project Structure

```
recharge-mcp-public/
├── netlify/
│   └── functions/
│       ├── mcp-gateway.ts          # Main MCP protocol handler
│       ├── stores.ts               # Store management API
│       ├── api-keys.ts             # API key management
│       └── health.ts               # Health check endpoint
├── src/
│   ├── lib/
│   │   ├── supabase.ts             # Supabase client
│   │   ├── encryption.ts           # Token encryption/decryption
│   │   ├── rate-limiter.ts         # Rate limiting logic
│   │   └── auth.ts                 # API key validation
│   ├── recharge/
│   │   ├── client.ts               # Recharge API client
│   │   └── session-cache.ts        # Session token cache
│   ├── tools/
│   │   ├── index.ts                # Tool registry
│   │   ├── customer-tools.ts       # Customer management
│   │   ├── subscription-tools.ts   # Subscription management
│   │   ├── address-tools.ts        # Address management
│   │   ├── payment-tools.ts        # Payment method management
│   │   ├── product-tools.ts        # Product catalog
│   │   ├── order-tools.ts          # Order management
│   │   ├── charge-tools.ts         # Charge management
│   │   ├── onetimes-tools.ts       # One-time products
│   │   ├── bundle-tools.ts         # Bundle management
│   │   ├── discount-tools.ts       # Discount management
│   │   └── utility-tools.ts        # Utility tools
│   ├── utils/
│   │   ├── error-handler.ts        # Error handling utilities
│   │   └── validators.ts           # Input validation
│   └── types/
│       ├── mcp.ts                  # MCP protocol types
│       ├── recharge.ts             # Recharge API types
│       └── database.ts             # Database types
├── supabase/
│   └── migrations/
│       ├── 001_create_stores.sql
│       ├── 002_create_api_keys.sql
│       ├── 003_create_session_tokens.sql
│       ├── 004_create_usage_logs.sql
│       ├── 005_create_rate_limits.sql
│       └── 006_create_functions.sql
├── netlify.toml                    # Netlify configuration
├── package.json
├── tsconfig.json
└── .env.example
```

---

## 4. Database Schema

### 4.1 Schema Overview

The database uses Supabase PostgreSQL with Row Level Security (RLS) enabled on all tables.

### 4.2 Migration Files

#### Migration 001: Create Stores Table

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

CREATE INDEX IF NOT EXISTS idx_stores_user_id ON stores(user_id);
CREATE INDEX IF NOT EXISTS idx_stores_shopify_domain ON stores(shopify_domain);
CREATE INDEX IF NOT EXISTS idx_stores_is_active ON stores(is_active) WHERE is_active = true;

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

-- Service role can access all stores (for Netlify Functions)
CREATE POLICY "Service role can access all stores"
  ON stores FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### Migration 002: Create API Keys Table

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

CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_store_id ON api_keys(store_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active) WHERE is_active = true;

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

-- Service role can access all api_keys (for Netlify Functions)
CREATE POLICY "Service role can access all api_keys"
  ON api_keys FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

#### Migration 003: Create Session Tokens Table

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
    - Service role only access (Netlify Functions)
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

CREATE INDEX IF NOT EXISTS idx_session_tokens_store_customer ON session_tokens(store_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_session_tokens_expires_at ON session_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_session_tokens_customer_email ON session_tokens(store_id, customer_email) WHERE customer_email IS NOT NULL;

ALTER TABLE session_tokens ENABLE ROW LEVEL SECURITY;

-- Only service role can access session tokens (Netlify Functions)
CREATE POLICY "Service role can manage session_tokens"
  ON session_tokens FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

#### Migration 004: Create Usage Logs Table

```sql
/*
  # Create usage_logs table

  1. New Tables
    - `usage_logs`
      - `id` (uuid, primary key)
      - `api_key_id` (uuid, references api_keys)
      - `store_id` (uuid, references stores)
      - `user_id` (uuid, references auth.users)
      - `tool_name` (text)
      - `customer_id` (text, optional)
      - `status` (text, success/error)
      - `error_message` (text, optional)
      - `execution_time_ms` (integer)
      - `request_metadata` (jsonb)
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

CREATE INDEX IF NOT EXISTS idx_usage_logs_api_key_id ON usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_store_id ON usage_logs(store_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_tool_name ON usage_logs(tool_name);
CREATE INDEX IF NOT EXISTS idx_usage_logs_status ON usage_logs(status);

-- Partition by month for better performance (optional)
-- CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at_month ON usage_logs(date_trunc('month', created_at));

ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage_logs"
  ON usage_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can insert and select usage logs
CREATE POLICY "Service role can manage usage_logs"
  ON usage_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

#### Migration 005: Create Rate Limits Table

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

CREATE INDEX IF NOT EXISTS idx_rate_limits_api_key_window ON rate_limits(api_key_id, window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage rate_limits"
  ON rate_limits FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

#### Migration 006: Create Database Functions

```sql
/*
  # Create database functions

  1. Functions
    - encrypt_token / decrypt_token (using pgcrypto)
    - check_rate_limit
    - cleanup_expired_sessions
    - increment_rate_limit
*/

-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to check and increment rate limit
-- Returns true if within limit, false if exceeded
CREATE OR REPLACE FUNCTION check_and_increment_rate_limit(
  p_api_key_id uuid,
  p_tier text,
  p_window_minutes integer DEFAULT 1
)
RETURNS jsonb AS $$
DECLARE
  v_limit integer;
  v_current_count integer;
  v_window_start timestamptz;
  v_within_limit boolean;
BEGIN
  -- Define limits per tier (requests per minute)
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

  v_within_limit := v_current_count <= v_limit;

  RETURN jsonb_build_object(
    'within_limit', v_within_limit,
    'current_count', v_current_count,
    'limit', v_limit,
    'window_start', v_window_start,
    'reset_at', v_window_start + (p_window_minutes || ' minutes')::interval
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS integer AS $$
DECLARE
  v_deleted integer;
BEGIN
  WITH deleted AS (
    DELETE FROM session_tokens
    WHERE expires_at < now()
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted FROM deleted;

  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old rate limit records
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS integer AS $$
DECLARE
  v_deleted integer;
BEGIN
  WITH deleted AS (
    DELETE FROM rate_limits
    WHERE window_start < now() - interval '1 hour'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted FROM deleted;

  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get session token (with expiry check)
CREATE OR REPLACE FUNCTION get_valid_session_token(
  p_store_id uuid,
  p_customer_id text
)
RETURNS TABLE(
  session_token_encrypted text,
  customer_email text,
  is_valid boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    st.session_token_encrypted,
    st.customer_email,
    (st.expires_at > now()) as is_valid
  FROM session_tokens st
  WHERE st.store_id = p_store_id
    AND st.customer_id = p_customer_id;

  -- Update last_used_at if found
  UPDATE session_tokens
  SET last_used_at = now()
  WHERE store_id = p_store_id
    AND customer_id = p_customer_id
    AND expires_at > now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to upsert session token
CREATE OR REPLACE FUNCTION upsert_session_token(
  p_store_id uuid,
  p_customer_id text,
  p_customer_email text,
  p_session_token_encrypted text,
  p_expires_hours integer DEFAULT 4
)
RETURNS void AS $$
BEGIN
  INSERT INTO session_tokens (
    store_id,
    customer_id,
    customer_email,
    session_token_encrypted,
    expires_at
  )
  VALUES (
    p_store_id,
    p_customer_id,
    p_customer_email,
    p_session_token_encrypted,
    now() + (p_expires_hours || ' hours')::interval
  )
  ON CONFLICT (store_id, customer_id)
  DO UPDATE SET
    customer_email = EXCLUDED.customer_email,
    session_token_encrypted = EXCLUDED.session_token_encrypted,
    last_used_at = now(),
    expires_at = now() + (p_expires_hours || ' hours')::interval;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate API key and return details
CREATE OR REPLACE FUNCTION validate_api_key(p_key_hash text)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'is_valid', true,
    'key_id', ak.id,
    'user_id', ak.user_id,
    'store_id', ak.store_id,
    'scopes', ak.scopes,
    'rate_limit_tier', ak.rate_limit_tier,
    'shopify_domain', s.shopify_domain,
    'recharge_admin_token_encrypted', s.recharge_admin_token_encrypted,
    'recharge_api_url', s.recharge_api_url
  )
  INTO v_result
  FROM api_keys ak
  JOIN stores s ON s.id = ak.store_id
  WHERE ak.key_hash = p_key_hash
    AND ak.is_active = true
    AND s.is_active = true
    AND (ak.expires_at IS NULL OR ak.expires_at > now());

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('is_valid', false, 'error', 'Invalid or expired API key');
  END IF;

  -- Update last_used_at
  UPDATE api_keys
  SET last_used_at = now()
  WHERE key_hash = p_key_hash;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 5. API Specification

### 5.1 Base URL

```
Production: https://<your-site>.netlify.app/.netlify/functions/mcp-gateway
Custom Domain: https://mcp.your-domain.com/.netlify/functions/mcp-gateway
```

### 5.2 MCP Protocol Endpoints

#### Initialize (Handshake)

```http
POST /.netlify/functions/mcp-gateway
Content-Type: application/json
Authorization: Bearer <api_key>

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "claude-desktop",
      "version": "1.0.0"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {}
    },
    "serverInfo": {
      "name": "recharge-storefront-api-mcp",
      "version": "1.0.0"
    }
  }
}
```

#### List Tools

```http
POST /.netlify/functions/mcp-gateway
Content-Type: application/json
Authorization: Bearer <api_key>

{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list",
  "params": {}
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "get_customer",
        "description": "Retrieve current customer information",
        "inputSchema": {
          "type": "object",
          "properties": {
            "customer_id": {
              "type": "string",
              "description": "Customer ID"
            },
            "customer_email": {
              "type": "string",
              "format": "email",
              "description": "Customer email for lookup"
            }
          }
        }
      },
      {
        "name": "get_subscriptions",
        "description": "Get subscriptions for a specific customer",
        "inputSchema": {
          "type": "object",
          "properties": {
            "customer_id": { "type": "string" },
            "customer_email": { "type": "string", "format": "email" },
            "status": {
              "type": "string",
              "enum": ["active", "cancelled", "expired"]
            },
            "limit": { "type": "number", "default": 50, "maximum": 250 },
            "page": { "type": "number", "default": 1 }
          }
        }
      }
    ]
  }
}
```

#### Call Tool

```http
POST /.netlify/functions/mcp-gateway
Content-Type: application/json
Authorization: Bearer <api_key>

{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "get_subscriptions",
    "arguments": {
      "customer_email": "customer@example.com",
      "status": "active",
      "limit": 10
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Subscriptions:\n{\n  \"subscriptions\": [...]\n}"
      }
    ]
  }
}
```

### 5.3 Management API Endpoints

#### Create Store

```http
POST /.netlify/functions/stores
Content-Type: application/json
Authorization: Bearer <supabase_auth_token>

{
  "shopify_domain": "my-store.myshopify.com",
  "store_name": "My Store",
  "recharge_admin_token": "sk_live_..."
}
```

**Response:**
```json
{
  "id": "uuid",
  "shopify_domain": "my-store.myshopify.com",
  "store_name": "My Store",
  "is_active": true,
  "created_at": "2024-12-24T00:00:00Z"
}
```

#### Create API Key

```http
POST /.netlify/functions/api-keys
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
  "api_key": "rmcp_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "key_prefix": "rmcp_a1b",
  "name": "Production Key",
  "scopes": ["read", "write"],
  "rate_limit_tier": "standard",
  "created_at": "2024-12-24T00:00:00Z"
}
```

### 5.4 Error Response Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32600,
    "message": "Invalid Request",
    "data": {
      "details": "Missing required parameter: customer_email",
      "timestamp": "2024-12-24T00:00:00Z"
    }
  }
}
```

**MCP Error Codes:**

| Code | Message | HTTP Status | Description |
|------|---------|-------------|-------------|
| -32700 | Parse error | 400 | Invalid JSON |
| -32600 | Invalid Request | 400 | Invalid MCP request structure |
| -32601 | Method not found | 404 | Unknown MCP method |
| -32602 | Invalid params | 400 | Invalid tool parameters |
| -32603 | Internal error | 500 | Server error |
| -32001 | Unauthorized | 401 | Invalid or missing API key |
| -32002 | Rate limited | 429 | Too many requests |
| -32003 | Forbidden | 403 | Insufficient scopes |
| -32004 | Store not found | 404 | Store configuration not found |
| -32005 | Recharge API error | 502 | Error from Recharge API |

---

## 6. Authentication & Security

### 6.1 API Key Format

```
rmcp_<random_32_chars>

Example: rmcp_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
Prefix:  rmcp_a1b (for identification in logs)
```

### 6.2 API Key Generation

```typescript
// src/lib/auth.ts

import { createHash, randomBytes } from 'crypto';

export function generateApiKey(): { apiKey: string; keyHash: string; keyPrefix: string } {
  const randomPart = randomBytes(24).toString('base64url');
  const apiKey = `rmcp_${randomPart}`;
  const keyHash = createHash('sha256').update(apiKey).digest('hex');
  const keyPrefix = apiKey.substring(0, 11); // "rmcp_" + 6 chars

  return { apiKey, keyHash, keyPrefix };
}

export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}
```

### 6.3 API Key Validation

```typescript
// src/lib/auth.ts

import { createClient } from '@supabase/supabase-js';

export interface APIKeyValidation {
  isValid: boolean;
  keyId?: string;
  userId?: string;
  storeId?: string;
  scopes?: string[];
  rateLimitTier?: string;
  shopifyDomain?: string;
  rechargeAdminTokenEncrypted?: string;
  rechargeApiUrl?: string;
  error?: string;
}

export async function validateAPIKey(apiKey: string): Promise<APIKeyValidation> {
  if (!apiKey || !apiKey.startsWith('rmcp_')) {
    return { isValid: false, error: 'Invalid API key format' };
  }

  const keyHash = hashApiKey(apiKey);

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .rpc('validate_api_key', { p_key_hash: keyHash });

  if (error) {
    console.error('API key validation error:', error);
    return { isValid: false, error: 'Validation failed' };
  }

  if (!data.is_valid) {
    return { isValid: false, error: data.error || 'Invalid API key' };
  }

  return {
    isValid: true,
    keyId: data.key_id,
    userId: data.user_id,
    storeId: data.store_id,
    scopes: data.scopes,
    rateLimitTier: data.rate_limit_tier,
    shopifyDomain: data.shopify_domain,
    rechargeAdminTokenEncrypted: data.recharge_admin_token_encrypted,
    rechargeApiUrl: data.recharge_api_url
  };
}
```

### 6.4 Scope Requirements by Tool

```typescript
// src/tools/index.ts

export const toolScopes: Record<string, 'read' | 'write' | 'admin'> = {
  // Customer Management
  'get_customer': 'read',
  'update_customer': 'write',
  'get_customer_by_email': 'read',
  'create_customer_session_by_id': 'admin',

  // Subscription Management
  'get_subscriptions': 'read',
  'get_subscription': 'read',
  'create_subscription': 'write',
  'update_subscription': 'write',
  'skip_subscription': 'write',
  'unskip_subscription': 'write',
  'swap_subscription': 'write',
  'cancel_subscription': 'write',
  'activate_subscription': 'write',
  'set_subscription_next_charge_date': 'write',

  // Address Management
  'get_addresses': 'read',
  'get_address': 'read',
  'create_address': 'write',
  'update_address': 'write',
  'delete_address': 'write',

  // Payment Methods
  'get_payment_methods': 'read',
  'get_payment_method': 'read',
  'update_payment_method': 'write',

  // Product Catalog
  'get_products': 'read',
  'get_product': 'read',

  // Order Management
  'get_orders': 'read',
  'get_order': 'read',

  // Charge Management
  'get_charges': 'read',
  'get_charge': 'read',

  // One-time Products
  'get_onetimes': 'read',
  'get_onetime': 'read',
  'create_onetime': 'write',
  'update_onetime': 'write',
  'delete_onetime': 'write',

  // Bundle Management
  'get_bundles': 'read',
  'get_bundle': 'read',
  'get_bundle_selections': 'read',
  'get_bundle_selection': 'read',
  'create_bundle_selection': 'write',
  'update_bundle_selection': 'write',
  'delete_bundle_selection': 'write',

  // Discount Management
  'get_discounts': 'read',
  'get_discount': 'read',
  'apply_discount': 'write',
  'remove_discount': 'write',

  // Utility Tools
  'purge_session_cache': 'admin',
  'get_session_cache_stats': 'read'
};

export function hasRequiredScope(userScopes: string[], requiredScope: string): boolean {
  if (requiredScope === 'read') {
    return userScopes.includes('read') || userScopes.includes('write') || userScopes.includes('admin');
  }
  if (requiredScope === 'write') {
    return userScopes.includes('write') || userScopes.includes('admin');
  }
  if (requiredScope === 'admin') {
    return userScopes.includes('admin');
  }
  return false;
}
```

### 6.5 Token Encryption

```typescript
// src/lib/encryption.ts

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;

export function encryptToken(token: string): string {
  const encryptionKey = process.env.ENCRYPTION_KEY!;

  const salt = randomBytes(SALT_LENGTH);
  const key = scryptSync(encryptionKey, salt, KEY_LENGTH);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(token, 'utf8'),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();

  // Format: salt (16) + iv (16) + tag (16) + encrypted
  const result = Buffer.concat([salt, iv, tag, encrypted]);
  return result.toString('base64');
}

export function decryptToken(encryptedToken: string): string {
  const encryptionKey = process.env.ENCRYPTION_KEY!;

  const data = Buffer.from(encryptedToken, 'base64');

  const salt = data.subarray(0, SALT_LENGTH);
  const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

  const key = scryptSync(encryptionKey, salt, KEY_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
}
```

### 6.6 Security Headers

```typescript
// Applied to all responses

const securityHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Content-Security-Policy': "default-src 'none'",
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};
```

---

## 7. Tool Definitions

### 7.1 Tool Input Schema (Public Server)

For the public server, authentication parameters are removed from individual tool schemas since authentication is handled at the gateway level via API key:

**Local Server Schema (for reference):**
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
  customer_id: z.string().optional().describe('Customer ID'),
  customer_email: z.string().email().optional().describe('Customer email for lookup'),
});
```

### 7.2 Complete Tool Schemas

```typescript
// src/tools/schemas.ts

import { z } from 'zod';

// Base schema for customer identification
export const customerIdentificationSchema = z.object({
  customer_id: z.string().optional().describe('Customer ID'),
  customer_email: z.string().email().optional().describe('Customer email for lookup'),
});

// Subscription schemas
export const getSubscriptionsSchema = customerIdentificationSchema.extend({
  status: z.enum(['active', 'cancelled', 'expired']).optional().describe('Filter by status'),
  limit: z.number().max(250).default(50).describe('Number of results'),
  page: z.number().default(1).describe('Page number'),
});

export const subscriptionIdSchema = customerIdentificationSchema.extend({
  subscription_id: z.string().describe('Subscription ID'),
});

export const createSubscriptionSchema = customerIdentificationSchema.extend({
  address_id: z.string().describe('Address ID'),
  next_charge_scheduled_at: z.string().describe('Next charge date (YYYY-MM-DD)'),
  order_interval_frequency: z.number().min(1).describe('Interval frequency'),
  order_interval_unit: z.enum(['day', 'week', 'month']).describe('Interval unit'),
  quantity: z.number().min(1).max(1000).describe('Quantity'),
  variant_id: z.number().min(1).describe('Product variant ID'),
  properties: z.array(z.object({
    name: z.string(),
    value: z.string(),
  })).optional().describe('Product properties'),
});

export const updateSubscriptionSchema = subscriptionIdSchema.extend({
  next_charge_scheduled_at: z.string().optional(),
  order_interval_frequency: z.number().min(1).optional(),
  order_interval_unit: z.enum(['day', 'week', 'month']).optional(),
  quantity: z.number().min(1).max(1000).optional(),
  variant_id: z.number().min(1).optional(),
  properties: z.array(z.object({
    name: z.string(),
    value: z.string(),
  })).optional(),
});

export const skipSubscriptionSchema = subscriptionIdSchema.extend({
  date: z.string().describe('Date to skip (YYYY-MM-DD)'),
});

export const swapSubscriptionSchema = subscriptionIdSchema.extend({
  variant_id: z.number().min(1).describe('New variant ID'),
  quantity: z.number().optional().describe('New quantity'),
});

export const cancelSubscriptionSchema = subscriptionIdSchema.extend({
  cancellation_reason: z.string().optional().describe('Reason for cancellation'),
  cancellation_reason_comments: z.string().optional().describe('Additional comments'),
});

// Address schemas
export const addressIdSchema = customerIdentificationSchema.extend({
  address_id: z.string().describe('Address ID'),
});

export const createAddressSchema = customerIdentificationSchema.extend({
  address1: z.string().min(1).max(255).describe('Street address'),
  address2: z.string().max(255).optional().describe('Apartment, suite, etc.'),
  city: z.string().min(1).max(100).describe('City'),
  province: z.string().min(1).max(100).describe('State/Province'),
  zip: z.string().min(2).max(12).describe('ZIP/Postal code'),
  country: z.string().min(2).max(100).describe('Country'),
  first_name: z.string().min(1).max(255).describe('First name'),
  last_name: z.string().min(1).max(255).describe('Last name'),
  company: z.string().max(255).optional().describe('Company name'),
  phone: z.string().optional().describe('Phone number'),
});

export const updateAddressSchema = addressIdSchema.extend({
  address1: z.string().min(1).max(255).optional(),
  address2: z.string().max(255).optional(),
  city: z.string().min(1).max(100).optional(),
  province: z.string().min(1).max(100).optional(),
  zip: z.string().min(2).max(12).optional(),
  country: z.string().min(2).max(100).optional(),
  first_name: z.string().min(1).max(255).optional(),
  last_name: z.string().min(1).max(255).optional(),
  company: z.string().max(255).optional(),
  phone: z.string().optional(),
});

// One-time schemas
export const onetimeIdSchema = customerIdentificationSchema.extend({
  onetime_id: z.string().describe('One-time product ID'),
});

export const createOnetimeSchema = customerIdentificationSchema.extend({
  variant_id: z.number().describe('Product variant ID'),
  quantity: z.number().describe('Quantity'),
  next_charge_scheduled_at: z.string().describe('Next charge date'),
  price: z.number().optional().describe('Price override'),
  properties: z.array(z.object({
    name: z.string(),
    value: z.string(),
  })).optional(),
});

// Bundle schemas
export const bundleIdSchema = customerIdentificationSchema.extend({
  bundle_id: z.string().describe('Bundle ID'),
});

export const bundleSelectionIdSchema = customerIdentificationSchema.extend({
  bundle_selection_id: z.string().describe('Bundle selection ID'),
});

export const createBundleSelectionSchema = customerIdentificationSchema.extend({
  bundle_id: z.string().describe('Bundle ID'),
  variant_id: z.number().describe('Variant ID'),
  quantity: z.number().describe('Quantity'),
  external_variant_id: z.number().optional(),
});

// Discount schemas
export const discountIdSchema = customerIdentificationSchema.extend({
  discount_id: z.string().describe('Discount ID'),
});

export const applyDiscountSchema = customerIdentificationSchema.extend({
  discount_code: z.string().describe('Discount code to apply'),
});

// Customer schemas
export const updateCustomerSchema = customerIdentificationSchema.extend({
  email: z.string().email().optional().describe('New email'),
  first_name: z.string().min(1).max(255).optional().describe('First name'),
  last_name: z.string().min(1).max(255).optional().describe('Last name'),
  phone: z.string().optional().describe('Phone number'),
});

export const customerByEmailSchema = z.object({
  email: z.string().email().describe('Customer email'),
});

export const createSessionSchema = z.object({
  customer_id: z.string().describe('Customer ID'),
  return_url: z.string().optional().describe('Return URL'),
});

// Utility schemas
export const purgeSessionCacheSchema = z.object({
  all: z.boolean().default(true).describe('Clear all sessions'),
  older_than_minutes: z.number().min(1).max(1440).optional().describe('Clear older than X minutes'),
  reason: z.string().default('manual purge').describe('Reason for purging'),
});

// Pagination schemas
export const paginationSchema = customerIdentificationSchema.extend({
  limit: z.number().max(250).default(50).describe('Number of results'),
  page: z.number().default(1).describe('Page number'),
});
```

---

## 8. Netlify Functions Implementation

### 8.1 Netlify Configuration

```toml
# netlify.toml

[build]
  command = "npm run build"
  functions = "netlify/functions"
  publish = "public"

[functions]
  node_bundler = "esbuild"
  external_node_modules = ["@supabase/supabase-js"]

[[headers]]
  for = "/.netlify/functions/*"
  [headers.values]
    Access-Control-Allow-Origin = "*"
    Access-Control-Allow-Methods = "POST, OPTIONS"
    Access-Control-Allow-Headers = "Content-Type, Authorization"
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "DENY"

[functions."mcp-gateway"]
  timeout = 30

[functions."stores"]
  timeout = 10

[functions."api-keys"]
  timeout = 10
```

### 8.2 MCP Gateway Function

```typescript
// netlify/functions/mcp-gateway.ts

import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { validateAPIKey, hashApiKey } from '../../src/lib/auth';
import { decryptToken } from '../../src/lib/encryption';
import { RechargeClient } from '../../src/recharge/client';
import { SessionCache } from '../../src/recharge/session-cache';
import { tools, toolScopes, hasRequiredScope } from '../../src/tools';

interface MCPRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: number | string | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

function jsonRPCError(code: number, message: string, id?: number | string | null, data?: unknown): MCPResponse {
  return {
    jsonrpc: '2.0',
    id: id ?? null,
    error: { code, message, data }
  };
}

function jsonRPCSuccess(id: number | string, result: unknown): MCPResponse {
  return {
    jsonrpc: '2.0',
    id,
    result
  };
}

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify(jsonRPCError(-32600, 'Method not allowed'))
    };
  }

  const startTime = Date.now();

  try {
    // Extract API key
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify(jsonRPCError(-32001, 'Unauthorized: Missing API key'))
      };
    }
    const apiKey = authHeader.substring(7);

    // Parse request body
    let mcpRequest: MCPRequest;
    try {
      mcpRequest = JSON.parse(event.body || '{}');
    } catch (e) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify(jsonRPCError(-32700, 'Parse error: Invalid JSON'))
      };
    }

    if (mcpRequest.jsonrpc !== '2.0') {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify(jsonRPCError(-32600, 'Invalid Request: jsonrpc must be 2.0', mcpRequest.id))
      };
    }

    // Validate API key
    const validation = await validateAPIKey(apiKey);
    if (!validation.isValid) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify(jsonRPCError(-32001, `Unauthorized: ${validation.error}`, mcpRequest.id))
      };
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check rate limit
    const { data: rateLimitResult } = await supabase.rpc('check_and_increment_rate_limit', {
      p_api_key_id: validation.keyId,
      p_tier: validation.rateLimitTier
    });

    if (!rateLimitResult?.within_limit) {
      // Log rate limited request
      await logUsage(supabase, {
        apiKeyId: validation.keyId!,
        storeId: validation.storeId!,
        userId: validation.userId!,
        toolName: mcpRequest.method,
        status: 'rate_limited',
        executionTimeMs: Date.now() - startTime
      });

      return {
        statusCode: 429,
        headers: {
          ...corsHeaders,
          'X-RateLimit-Limit': rateLimitResult?.limit?.toString() || '60',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitResult?.reset_at || new Date(Date.now() + 60000).toISOString(),
          'Retry-After': '60'
        },
        body: JSON.stringify(jsonRPCError(-32002, 'Rate limit exceeded', mcpRequest.id, {
          limit: rateLimitResult?.limit,
          reset_at: rateLimitResult?.reset_at
        }))
      };
    }

    // Handle MCP methods
    let result: unknown;

    switch (mcpRequest.method) {
      case 'initialize':
        result = {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: {
            name: 'recharge-storefront-api-mcp',
            version: '1.0.0'
          }
        };
        break;

      case 'tools/list':
        result = { tools: getToolDefinitions(validation.scopes!) };
        break;

      case 'tools/call':
        result = await executeToolCall(
          supabase,
          validation,
          mcpRequest.params as { name: string; arguments?: Record<string, unknown> }
        );
        break;

      default:
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify(jsonRPCError(-32601, `Method not found: ${mcpRequest.method}`, mcpRequest.id))
        };
    }

    // Log successful request
    const executionTime = Date.now() - startTime;
    await logUsage(supabase, {
      apiKeyId: validation.keyId!,
      storeId: validation.storeId!,
      userId: validation.userId!,
      toolName: mcpRequest.method,
      status: 'success',
      executionTimeMs: executionTime
    });

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'X-RateLimit-Limit': rateLimitResult?.limit?.toString() || '60',
        'X-RateLimit-Remaining': (rateLimitResult?.limit - rateLimitResult?.current_count)?.toString() || '59'
      },
      body: JSON.stringify(jsonRPCSuccess(mcpRequest.id, result))
    };

  } catch (error: any) {
    console.error('MCP Gateway Error:', error);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify(jsonRPCError(-32603, `Internal error: ${error.message}`))
    };
  }
};

function getToolDefinitions(scopes: string[]) {
  return tools
    .filter(tool => hasRequiredScope(scopes, toolScopes[tool.name] || 'read'))
    .map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }));
}

async function executeToolCall(
  supabase: any,
  validation: any,
  params: { name: string; arguments?: Record<string, unknown> }
) {
  const { name, arguments: args = {} } = params;

  // Find tool
  const tool = tools.find(t => t.name === name);
  if (!tool) {
    throw new Error(`Tool not found: ${name}`);
  }

  // Check scope
  const requiredScope = toolScopes[name] || 'read';
  if (!hasRequiredScope(validation.scopes, requiredScope)) {
    throw new Error(`Insufficient permissions. Required scope: ${requiredScope}`);
  }

  // Validate input
  const validatedArgs = tool.inputSchema.parse(args);

  // Decrypt admin token
  const adminToken = decryptToken(validation.rechargeAdminTokenEncrypted);

  // Create session cache
  const sessionCache = new SessionCache(supabase, validation.storeId);

  // Create Recharge client
  const client = new RechargeClient({
    storeUrl: validation.shopifyDomain,
    adminToken,
    apiUrl: validation.rechargeApiUrl,
    sessionCache
  });

  // Execute tool
  return await tool.execute(client, validatedArgs);
}

async function logUsage(supabase: any, data: {
  apiKeyId: string;
  storeId: string;
  userId: string;
  toolName: string;
  status: 'success' | 'error' | 'rate_limited';
  executionTimeMs: number;
  errorMessage?: string;
}) {
  try {
    await supabase.from('usage_logs').insert({
      api_key_id: data.apiKeyId,
      store_id: data.storeId,
      user_id: data.userId,
      tool_name: data.toolName,
      status: data.status,
      execution_time_ms: data.executionTimeMs,
      error_message: data.errorMessage
    });
  } catch (error) {
    console.error('Failed to log usage:', error);
  }
}
```

### 8.3 Recharge Client

```typescript
// src/recharge/client.ts

import axios, { AxiosInstance } from 'axios';
import { SessionCache } from './session-cache';

export interface RechargeClientConfig {
  storeUrl: string;
  adminToken: string;
  apiUrl?: string;
  sessionCache: SessionCache;
}

export class RechargeClient {
  private storeUrl: string;
  private adminToken: string;
  private apiUrl: string;
  private sessionCache: SessionCache;
  private storefrontApi: AxiosInstance;
  private adminApi: AxiosInstance;

  constructor(config: RechargeClientConfig) {
    this.storeUrl = config.storeUrl;
    this.adminToken = config.adminToken;
    this.apiUrl = config.apiUrl || 'https://api.rechargeapps.com';
    this.sessionCache = config.sessionCache;

    this.storefrontApi = axios.create({
      baseURL: this.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Recharge-Version': '2021-11'
      }
    });

    this.adminApi = axios.create({
      baseURL: this.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Recharge-Access-Token': this.adminToken,
        'X-Recharge-Version': '2021-11'
      }
    });
  }

  async getOrCreateSessionToken(customerId?: string, customerEmail?: string): Promise<string> {
    // Check cache first
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

    // Look up customer by email if needed
    if (!customerId && customerEmail) {
      const customer = await this.getCustomerByEmail(customerEmail);
      customerId = customer.id.toString();
    }

    if (!customerId) {
      throw new Error('Customer ID or email required for session creation');
    }

    // Create new session
    const session = await this.createCustomerSessionById(customerId);
    await this.sessionCache.setSessionToken(customerId, session.apiToken, customerEmail);

    return session.apiToken;
  }

  private async makeRequest(
    method: string,
    endpoint: string,
    data?: any,
    params?: any,
    customerId?: string,
    customerEmail?: string
  ) {
    const sessionToken = await this.getOrCreateSessionToken(customerId, customerEmail);

    const response = await this.storefrontApi.request({
      method,
      url: endpoint,
      data,
      params,
      headers: {
        'X-Recharge-Access-Token': sessionToken
      }
    });

    return response.data;
  }

  private async makeAdminRequest(method: string, endpoint: string, data?: any, params?: any) {
    const response = await this.adminApi.request({
      method,
      url: endpoint,
      data,
      params
    });

    return response.data;
  }

  // Customer methods
  async getCustomer(customerId?: string, customerEmail?: string) {
    return this.makeRequest('GET', '/customer', null, null, customerId, customerEmail);
  }

  async updateCustomer(updateData: any, customerId?: string, customerEmail?: string) {
    return this.makeRequest('PUT', '/customer', updateData, null, customerId, customerEmail);
  }

  async getCustomerByEmail(email: string) {
    const response = await this.makeAdminRequest('GET', '/customers', null, { email });
    if (!response.customers?.length) {
      throw new Error(`Customer not found: ${email}`);
    }
    return response.customers[0];
  }

  async createCustomerSessionById(customerId: string, options?: any) {
    const response = await this.makeAdminRequest('POST', `/customers/${customerId}/sessions`, options);
    return response.customer_session;
  }

  // Subscription methods
  async getSubscriptions(params?: any, customerId?: string, customerEmail?: string) {
    return this.makeRequest('GET', '/subscriptions', null, params, customerId, customerEmail);
  }

  async getSubscription(subscriptionId: string, customerId?: string, customerEmail?: string) {
    return this.makeRequest('GET', `/subscriptions/${subscriptionId}`, null, null, customerId, customerEmail);
  }

  async createSubscription(data: any, customerId?: string, customerEmail?: string) {
    return this.makeRequest('POST', '/subscriptions', data, null, customerId, customerEmail);
  }

  async updateSubscription(subscriptionId: string, data: any, customerId?: string, customerEmail?: string) {
    return this.makeRequest('PUT', `/subscriptions/${subscriptionId}`, data, null, customerId, customerEmail);
  }

  async skipSubscription(subscriptionId: string, date: string, customerId?: string, customerEmail?: string) {
    return this.makeRequest('POST', `/subscriptions/${subscriptionId}/skip`, { date }, null, customerId, customerEmail);
  }

  async unskipSubscription(subscriptionId: string, date: string, customerId?: string, customerEmail?: string) {
    return this.makeRequest('POST', `/subscriptions/${subscriptionId}/unskip`, { date }, null, customerId, customerEmail);
  }

  async swapSubscription(subscriptionId: string, data: any, customerId?: string, customerEmail?: string) {
    return this.makeRequest('POST', `/subscriptions/${subscriptionId}/swap`, data, null, customerId, customerEmail);
  }

  async cancelSubscription(subscriptionId: string, data?: any, customerId?: string, customerEmail?: string) {
    return this.makeRequest('POST', `/subscriptions/${subscriptionId}/cancel`, data, null, customerId, customerEmail);
  }

  async activateSubscription(subscriptionId: string, customerId?: string, customerEmail?: string) {
    return this.makeRequest('POST', `/subscriptions/${subscriptionId}/activate`, null, null, customerId, customerEmail);
  }

  async setNextChargeDate(subscriptionId: string, date: string, customerId?: string, customerEmail?: string) {
    return this.makeRequest('POST', `/subscriptions/${subscriptionId}/set_next_charge_date`, { date }, null, customerId, customerEmail);
  }

  // Address methods
  async getAddresses(params?: any, customerId?: string, customerEmail?: string) {
    return this.makeRequest('GET', '/addresses', null, params, customerId, customerEmail);
  }

  async getAddress(addressId: string, customerId?: string, customerEmail?: string) {
    return this.makeRequest('GET', `/addresses/${addressId}`, null, null, customerId, customerEmail);
  }

  async createAddress(data: any, customerId?: string, customerEmail?: string) {
    return this.makeRequest('POST', '/addresses', data, null, customerId, customerEmail);
  }

  async updateAddress(addressId: string, data: any, customerId?: string, customerEmail?: string) {
    return this.makeRequest('PUT', `/addresses/${addressId}`, data, null, customerId, customerEmail);
  }

  async deleteAddress(addressId: string, customerId?: string, customerEmail?: string) {
    return this.makeRequest('DELETE', `/addresses/${addressId}`, null, null, customerId, customerEmail);
  }

  // Payment methods
  async getPaymentMethods(params?: any, customerId?: string, customerEmail?: string) {
    return this.makeRequest('GET', '/payment_methods', null, params, customerId, customerEmail);
  }

  async getPaymentMethod(paymentMethodId: string, customerId?: string, customerEmail?: string) {
    return this.makeRequest('GET', `/payment_methods/${paymentMethodId}`, null, null, customerId, customerEmail);
  }

  async updatePaymentMethod(paymentMethodId: string, data: any, customerId?: string, customerEmail?: string) {
    return this.makeRequest('PUT', `/payment_methods/${paymentMethodId}`, data, null, customerId, customerEmail);
  }

  // Product methods
  async getProducts(params?: any, customerId?: string, customerEmail?: string) {
    return this.makeRequest('GET', '/products', null, params, customerId, customerEmail);
  }

  async getProduct(productId: string, customerId?: string, customerEmail?: string) {
    return this.makeRequest('GET', `/products/${productId}`, null, null, customerId, customerEmail);
  }

  // Order methods
  async getOrders(params?: any, customerId?: string, customerEmail?: string) {
    return this.makeRequest('GET', '/orders', null, params, customerId, customerEmail);
  }

  async getOrder(orderId: string, customerId?: string, customerEmail?: string) {
    return this.makeRequest('GET', `/orders/${orderId}`, null, null, customerId, customerEmail);
  }

  // Charge methods
  async getCharges(params?: any, customerId?: string, customerEmail?: string) {
    return this.makeRequest('GET', '/charges', null, params, customerId, customerEmail);
  }

  async getCharge(chargeId: string, customerId?: string, customerEmail?: string) {
    return this.makeRequest('GET', `/charges/${chargeId}`, null, null, customerId, customerEmail);
  }

  // One-time methods
  async getOnetimes(params?: any, customerId?: string, customerEmail?: string) {
    return this.makeRequest('GET', '/onetimes', null, params, customerId, customerEmail);
  }

  async getOnetime(onetimeId: string, customerId?: string, customerEmail?: string) {
    return this.makeRequest('GET', `/onetimes/${onetimeId}`, null, null, customerId, customerEmail);
  }

  async createOnetime(data: any, customerId?: string, customerEmail?: string) {
    return this.makeRequest('POST', '/onetimes', data, null, customerId, customerEmail);
  }

  async updateOnetime(onetimeId: string, data: any, customerId?: string, customerEmail?: string) {
    return this.makeRequest('PUT', `/onetimes/${onetimeId}`, data, null, customerId, customerEmail);
  }

  async deleteOnetime(onetimeId: string, customerId?: string, customerEmail?: string) {
    return this.makeRequest('DELETE', `/onetimes/${onetimeId}`, null, null, customerId, customerEmail);
  }

  // Bundle methods
  async getBundles(params?: any, customerId?: string, customerEmail?: string) {
    return this.makeRequest('GET', '/bundles', null, params, customerId, customerEmail);
  }

  async getBundle(bundleId: string, customerId?: string, customerEmail?: string) {
    return this.makeRequest('GET', `/bundles/${bundleId}`, null, null, customerId, customerEmail);
  }

  async getBundleSelections(bundleId: string, params?: any, customerId?: string, customerEmail?: string) {
    return this.makeRequest('GET', `/bundles/${bundleId}/bundle_selections`, null, params, customerId, customerEmail);
  }

  async getBundleSelection(bundleSelectionId: string, customerId?: string, customerEmail?: string) {
    return this.makeRequest('GET', `/bundle_selections/${bundleSelectionId}`, null, null, customerId, customerEmail);
  }

  async createBundleSelection(data: any, customerId?: string, customerEmail?: string) {
    return this.makeRequest('POST', '/bundle_selections', data, null, customerId, customerEmail);
  }

  async updateBundleSelection(bundleSelectionId: string, data: any, customerId?: string, customerEmail?: string) {
    return this.makeRequest('PUT', `/bundle_selections/${bundleSelectionId}`, data, null, customerId, customerEmail);
  }

  async deleteBundleSelection(bundleSelectionId: string, customerId?: string, customerEmail?: string) {
    return this.makeRequest('DELETE', `/bundle_selections/${bundleSelectionId}`, null, null, customerId, customerEmail);
  }

  // Discount methods
  async getDiscounts(params?: any, customerId?: string, customerEmail?: string) {
    return this.makeRequest('GET', '/discounts', null, params, customerId, customerEmail);
  }

  async getDiscount(discountId: string, customerId?: string, customerEmail?: string) {
    return this.makeRequest('GET', `/discounts/${discountId}`, null, null, customerId, customerEmail);
  }

  async applyDiscount(discountCode: string, customerId?: string, customerEmail?: string) {
    return this.makeRequest('POST', '/discounts', { discount_code: discountCode }, null, customerId, customerEmail);
  }

  async removeDiscount(discountId: string, customerId?: string, customerEmail?: string) {
    return this.makeRequest('DELETE', `/discounts/${discountId}`, null, null, customerId, customerEmail);
  }
}
```

### 8.4 Session Cache (Database-Backed)

```typescript
// src/recharge/session-cache.ts

import { SupabaseClient } from '@supabase/supabase-js';
import { encryptToken, decryptToken } from '../lib/encryption';

export class SessionCache {
  private supabase: SupabaseClient;
  private storeId: string;

  constructor(supabase: SupabaseClient, storeId: string) {
    this.supabase = supabase;
    this.storeId = storeId;
  }

  async getSessionToken(customerId: string): Promise<string | null> {
    const { data } = await this.supabase
      .rpc('get_valid_session_token', {
        p_store_id: this.storeId,
        p_customer_id: customerId
      });

    if (!data || !data[0] || !data[0].is_valid) {
      return null;
    }

    try {
      return decryptToken(data[0].session_token_encrypted);
    } catch (error) {
      console.error('Failed to decrypt session token:', error);
      await this.clearSession(customerId);
      return null;
    }
  }

  async setSessionToken(customerId: string, sessionToken: string, customerEmail?: string): Promise<void> {
    const encrypted = encryptToken(sessionToken);

    await this.supabase.rpc('upsert_session_token', {
      p_store_id: this.storeId,
      p_customer_id: customerId,
      p_customer_email: customerEmail || null,
      p_session_token_encrypted: encrypted,
      p_expires_hours: 4
    });
  }

  async getCustomerIdByEmail(email: string): Promise<string | null> {
    const { data } = await this.supabase
      .from('session_tokens')
      .select('customer_id')
      .eq('store_id', this.storeId)
      .eq('customer_email', email)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    return data?.customer_id ?? null;
  }

  async clearSession(customerId: string): Promise<void> {
    await this.supabase
      .from('session_tokens')
      .delete()
      .eq('store_id', this.storeId)
      .eq('customer_id', customerId);
  }

  async clearAll(): Promise<number> {
    const { data } = await this.supabase
      .from('session_tokens')
      .delete()
      .eq('store_id', this.storeId)
      .select('id');

    return data?.length ?? 0;
  }

  async getStats(): Promise<{
    totalSessions: number;
    emailMappings: number;
    oldestSessionAge: number | null;
    newestSessionAge: number | null;
  }> {
    const { count: totalSessions } = await this.supabase
      .from('session_tokens')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', this.storeId);

    const { count: emailMappings } = await this.supabase
      .from('session_tokens')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', this.storeId)
      .not('customer_email', 'is', null);

    const { data: oldest } = await this.supabase
      .from('session_tokens')
      .select('created_at')
      .eq('store_id', this.storeId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    const { data: newest } = await this.supabase
      .from('session_tokens')
      .select('created_at')
      .eq('store_id', this.storeId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = Date.now();

    return {
      totalSessions: totalSessions ?? 0,
      emailMappings: emailMappings ?? 0,
      oldestSessionAge: oldest
        ? Math.floor((now - new Date(oldest.created_at).getTime()) / 1000)
        : null,
      newestSessionAge: newest
        ? Math.floor((now - new Date(newest.created_at).getTime()) / 1000)
        : null
    };
  }
}
```

---

## 9. Session Management

### 9.1 Session Lifecycle

```
1. Tool call received with customer_id or customer_email
2. Check Supabase for cached session token (with expiry check)
3. If cached and not expired:
   a. Decrypt token
   b. Update last_used_at
   c. Return decrypted token
4. If not cached or expired:
   a. Look up customer via Admin API (if email provided)
   b. Create session via Admin API
   c. Encrypt and store in Supabase
   d. Return new token
5. On 401/403 from Recharge:
   a. Clear cached session from Supabase
   b. Retry with new session (up to 2 retries)
```

### 9.2 Session Expiry Strategy

| Event | Action | TTL |
|-------|--------|-----|
| Session created | Set expires_at | 4 hours |
| Session used | Update last_used_at | - |
| Session expired | Deleted on next access or cron | - |
| Scheduled cleanup | Delete all expired sessions | Every hour |

### 9.3 Scheduled Cleanup (Netlify Scheduled Function)

```typescript
// netlify/functions/cleanup-sessions.ts

import { Handler, schedule } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const handler: Handler = async () => {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Cleanup expired sessions
  const { data: sessionsDeleted } = await supabase.rpc('cleanup_expired_sessions');

  // Cleanup old rate limits
  const { data: rateLimitsDeleted } = await supabase.rpc('cleanup_old_rate_limits');

  console.log(`Cleanup complete: ${sessionsDeleted} sessions, ${rateLimitsDeleted} rate limits`);

  return { statusCode: 200, body: 'Cleanup complete' };
};

// Run every hour
export const scheduledHandler = schedule('0 * * * *', handler);
```

---

## 10. Rate Limiting & Quotas

### 10.1 Rate Limit Tiers

| Tier | Requests/Minute | Requests/Hour | Requests/Day | Price |
|------|----------------|---------------|--------------|-------|
| Free | 10 | 100 | 500 | $0 |
| Standard | 60 | 1,000 | 10,000 | $29/mo |
| Professional | 300 | 5,000 | 50,000 | $99/mo |
| Enterprise | 1,000 | 20,000 | 200,000 | Custom |

### 10.2 Rate Limit Headers

All responses include rate limit headers:

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 2024-12-24T00:01:00Z
Retry-After: 60  (only on 429 responses)
```

---

## 11. Error Handling

### 11.1 Error Categories

| Category | MCP Error Code | HTTP Status | Retry |
|----------|---------------|-------------|-------|
| Parse error | -32700 | 400 | No |
| Invalid request | -32600 | 400 | No |
| Method not found | -32601 | 404 | No |
| Invalid params | -32602 | 400 | No |
| Internal error | -32603 | 500 | Yes |
| Unauthorized | -32001 | 401 | No |
| Rate limited | -32002 | 429 | Yes (with backoff) |
| Forbidden | -32003 | 403 | No |
| Store not found | -32004 | 404 | No |
| Recharge API error | -32005 | 502 | Yes |

### 11.2 Error Response Format

```typescript
interface MCPError {
  jsonrpc: '2.0';
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
      timestamp: string;
    };
  };
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

### 12.2 Usage Analytics Queries

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

-- Top users by request count
SELECT
  user_id,
  COUNT(*) as requests,
  COUNT(*) FILTER (WHERE status = 'error') as errors
FROM usage_logs
WHERE created_at > now() - interval '24 hours'
GROUP BY user_id
ORDER BY requests DESC
LIMIT 10;
```

---

## 13. Deployment Guide

### 13.1 Prerequisites

- Netlify account (Pro plan recommended for scheduled functions)
- Supabase project
- Domain (optional, for custom URL)

### 13.2 Environment Variables

```bash
# Supabase
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Encryption
ENCRYPTION_KEY=<32-character-random-string>

# Optional
DEBUG=false
NODE_ENV=production
```

### 13.3 Deployment Steps

1. **Create Supabase Project**
   ```bash
   # Install Supabase CLI
   npm install -g supabase

   # Initialize and link
   supabase init
   supabase link --project-ref <project-ref>

   # Apply migrations
   supabase db push
   ```

2. **Deploy to Netlify**
   ```bash
   # Install Netlify CLI
   npm install -g netlify-cli

   # Login and initialize
   netlify login
   netlify init

   # Set environment variables
   netlify env:set SUPABASE_URL "https://<project>.supabase.co"
   netlify env:set SUPABASE_SERVICE_ROLE_KEY "eyJ..."
   netlify env:set ENCRYPTION_KEY "$(openssl rand -hex 16)"

   # Deploy
   netlify deploy --prod
   ```

3. **Verify Deployment**
   ```bash
   curl -X POST https://<site>.netlify.app/.netlify/functions/health
   ```

### 13.4 MCP Client Configuration

```json
{
  "mcpServers": {
    "recharge-storefront-api": {
      "transport": "http",
      "url": "https://<site>.netlify.app/.netlify/functions/mcp-gateway",
      "headers": {
        "Authorization": "Bearer rmcp_<your_api_key>"
      }
    }
  }
}
```

---

## 14. Testing Strategy

### 14.1 Test Categories

- **Unit Tests**: Tool schemas, encryption, validation
- **Integration Tests**: API key validation, session cache, rate limiting
- **End-to-End Tests**: Full MCP request/response cycle
- **Load Tests**: Performance under high concurrency

### 14.2 Test Commands

```bash
# Run all tests
npm test

# Run specific test suite
npm run test:unit
npm run test:integration
npm run test:e2e

# Load testing with k6
k6 run tests/load/mcp-gateway.js
```

---

## 15. Migration from Local Server

### 15.1 Breaking Changes

1. **Authentication**: Requires API key instead of environment variables
2. **Transport**: HTTP POST instead of stdio
3. **Removed Parameters**: `store_url`, `admin_token`, `session_token` removed from tool schemas

### 15.2 Migration Steps for Users

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
      "url": "https://mcp.example.com/.netlify/functions/mcp-gateway",
      "headers": {
        "Authorization": "Bearer rmcp_..."
      }
    }
  }
}
```

---

## Appendices

### A. Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `ENCRYPTION_KEY` | Yes | 32-character encryption key |
| `DEBUG` | No | Enable debug logging |
| `NODE_ENV` | No | Environment (production/development) |

### B. API Key Scopes Reference

| Scope | Permissions |
|-------|-------------|
| `read` | All GET operations |
| `write` | All POST/PUT/DELETE operations + read |
| `admin` | Session creation, cache management + write |

### C. Recharge API Version

This server uses **Recharge API Version 2021-11**.

### D. Security Checklist

- [ ] All Recharge tokens encrypted at rest (AES-256-GCM)
- [ ] API keys hashed with SHA-256
- [ ] RLS enabled on all Supabase tables
- [ ] HTTPS only (enforced by Netlify)
- [ ] Rate limiting per API key
- [ ] Usage logging for audit trail
- [ ] Input validation with Zod schemas
- [ ] Security headers on all responses

---

**Document Version History**

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-12-24 | Initial PRD with Supabase Edge Functions |
| 1.1.0 | 2024-12-24 | Updated to Netlify Functions + Supabase Database |

---

*This document provides the complete specification for building the Public Recharge Storefront API MCP Server using Netlify Functions for compute and Supabase for database. All 46 tools from the local server are preserved with full feature parity.*
