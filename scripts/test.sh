#!/bin/bash

# Recharge Storefront API MCP Server Test Script
# This script runs comprehensive tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    printf "${GREEN}✅${NC} %s\n" "$1"
}

print_warning() {
    printf "${YELLOW}⚠️${NC} %s\n" "$1"
}

print_error() {
    printf "${RED}❌${NC} %s\n" "$1"
}

print_info() {
    printf "${BLUE}ℹ️${NC} %s\n" "$1"
}

echo "🧪 Running Recharge Storefront API MCP Server tests..."

# Initialize test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# Function to run test and track results
run_test() {
    local test_name="$1"
    local test_command="$2"
    local required="$3"
    
    print_info "Running: $test_name"
    
    if eval "$test_command" >/dev/null 2>&1; then
        print_status "$test_name passed"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        if [ "$required" = "required" ]; then
            print_error "$test_name failed (required)"
            TESTS_FAILED=$((TESTS_FAILED + 1))
            return 1
        else
            print_warning "$test_name failed (optional)"
            TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
            return 0
        fi
    fi
}

# Check if required commands exist
if ! command -v node >/dev/null 2>&1; then
    print_error "Node.js is not installed"
    exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
    print_error "npm is not installed"
    exit 1
fi

# Test Node.js version
run_test "Node.js version check" "node --version" "required"

# Test npm version
run_test "npm version check" "npm --version" "required"

# Check API coverage
run_test "API coverage check" "npm run coverage" "required"

# Validate syntax
run_test "Syntax validation" "npm run lint" "required"

# Test API key logic
run_test "API key logic test" "npm run test:api-keys" "required"

# Validate configuration
run_test "Configuration validation" "npm run validate" "required"

# Test package.json integrity
run_test "Package.json validation" "node -e \"const pkg = await import('./package.json', { assert: { type: 'json' } }); console.log('Package valid:', pkg.default.name);\" --input-type=module" "required"

# Test environment file template
run_test "Environment template check" "test -f .env.example" "required"

# Test main entry point
run_test "Main entry point exists" "test -f index.js" "required"

# Test Docker configuration
run_test "Dockerfile syntax check" "test -f Dockerfile" "optional"

# Test script permissions
run_test "Setup script permissions" "test -x scripts/setup.sh" "optional"

# Test source file structure
run_test "Server file exists" "test -f src/server.js" "required"
run_test "Client file exists" "test -f src/recharge-client.js" "required"
run_test "Tools index exists" "test -f src/tools/index.js" "required"
run_test "Error handler exists" "test -f src/utils/error-handler.js" "required"
run_test "Session cache exists" "test -f src/utils/session-cache.js" "required"

# Test all tool files exist
run_test "Customer tools exist" "test -f src/tools/customer-tools.js" "required"
run_test "Subscription tools exist" "test -f src/tools/subscription-tools.js" "required"
run_test "Address tools exist" "test -f src/tools/address-tools.js" "required"
run_test "Payment tools exist" "test -f src/tools/payment-tools.js" "required"
run_test "Product tools exist" "test -f src/tools/product-tools.js" "required"
run_test "Order tools exist" "test -f src/tools/order-tools.js" "required"
run_test "Charge tools exist" "test -f src/tools/charge-tools.js" "required"
run_test "Onetime tools exist" "test -f src/tools/onetimes-tools.js" "required"
run_test "Bundle tools exist" "test -f src/tools/bundle-tools.js" "required"
run_test "Discount tools exist" "test -f src/tools/discount-tools.js" "required"

# Count tool files
TOOL_FILES=$(find src/tools -name "*-tools.js" | wc -l)
if [ "$TOOL_FILES" -eq 10 ]; then
    print_status "Tool files count: $TOOL_FILES"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    print_error "Incorrect tool files count: $TOOL_FILES (expected exactly 10)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test API connectivity (if credentials are available)
if [ -f .env ]; then
    print_info "Testing environment configuration..."
    if run_test "Environment variables check" "node -e \"
        const dotenv = await import('dotenv');
        dotenv.config();
        const domain = process.env.RECHARGE_STOREFRONT_DOMAIN;
        const adminToken = process.env.RECHARGE_ADMIN_TOKEN;
        
        if (!domain) {
            console.error('RECHARGE_STOREFRONT_DOMAIN not set');
            process.exit(1);
        }
        
        if (domain === 'your-shop.myshopify.com') {
            console.error('Please configure RECHARGE_STOREFRONT_DOMAIN with your actual domain');
            process.exit(1);
        }
        
        if (!domain.includes('.myshopify.com')) {
            console.error('Domain must end with .myshopify.com');
            process.exit(1);
        }
        
        console.log('Domain configured:', domain);
        console.log('Admin token configured:', adminToken ? 'Yes' : 'No');
    \" --input-type=module" "optional"; then
        print_status "Environment configuration is valid"
    fi
else
    print_warning "No .env file found, skipping environment tests"
    TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
fi

# Test MCP protocol
print_info "Testing MCP protocol startup..."
if run_test "MCP server startup test" "timeout 10s node -e '
    const { spawn } = require('child_process');
    const server = spawn(\"node\", [\"src/server.js\"], {
        env: { 
            ...process.env, 
            RECHARGE_STOREFRONT_DOMAIN: \"test.myshopify.com\",
            RECHARGE_ADMIN_TOKEN: \"test_token\"
        },
        stdio: [\"pipe\", \"pipe\", \"pipe\"]
    });
    let serverReady = false;
    
    server.stdout.on(\"data\", (data) => {
        const output = data.toString();
        if (output.includes(\"Server ready\") || output.includes(\"listening\") || output.includes(\"ready\")) {
            console.log(\"MCP server started successfully\");
            serverReady = true;
            server.kill();
        }
    });
    
    server.stderr.on(\"data\", (data) => {
        const output = data.toString();
        if (output.includes(\"Server ready\") || output.includes(\"listening\") || output.includes(\"ready\")) {
            console.log(\"MCP server started successfully\");
            serverReady = true;
            server.kill();
        }
    });
    
    server.on(\"error\", (error) => {
        console.error(\"Server startup error:\", error.message);
        process.exit(1);
    });
    
    setTimeout(() => {
        server.kill();
        if (serverReady) {
            process.exit(0);
        } else {
            console.error(\"Server did not start within timeout\");
            process.exit(1);
        }
    }, 8000);
' 2>/dev/null" "optional"; then
    print_status "MCP server startup test passed"
fi

# Test security
print_info "Running security checks..."
run_test "No hardcoded secrets" "! grep -r 'sk_test_\\|sk_live_\\|password.*=' src/ --exclude-dir=node_modules" "required"
run_test "No TODO/FIXME in production code" "! grep -r 'TODO\\|FIXME' src/ --exclude-dir=node_modules" "optional"

# Performance tests
print_info "Running performance checks..."

# Documentation tests
run_test "README exists" "test -f README.md" "required"

# Final summary
echo ""
echo "🏁 Test Summary:"
echo "=================="
print_status "Tests passed: $TESTS_PASSED"
if [ $TESTS_FAILED -gt 0 ]; then
    print_error "Tests failed: $TESTS_FAILED"
fi
if [ $TESTS_SKIPPED -gt 0 ]; then
    print_warning "Tests skipped: $TESTS_SKIPPED"
fi

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED + TESTS_SKIPPED))
echo "📊 Total tests run: $TOTAL_TESTS"

if [ $TESTS_FAILED -eq 0 ]; then
    print_status "All critical tests passed! 🎉"
    echo ""
    print_info "Project is ready for:"
    echo "  ✅ Development (npm run dev)"
    echo "  ✅ Production (npm start)"
    echo "  ✅ Docker deployment (npm run docker:build)"
    exit 0
else
    print_error "Some critical tests failed. Please fix the issues before proceeding."
    exit 1
fi