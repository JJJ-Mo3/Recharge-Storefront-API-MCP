#!/bin/bash

# Recharge Storefront API MCP Server Setup Script
# This script sets up the development environment

set -e

echo "🚀 Setting up Recharge Storefront API MCP Server..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

# Check if running in supported environment
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    print_warning "Windows detected. Some features may not work as expected."
fi

# Check Node.js version
print_info "Checking Node.js version..."
if ! command -v node >/dev/null 2>&1; then
    print_error "Node.js is not installed. Please install Node.js 18.0.0 or higher."
    exit 1
fi

node_version=$(node -v | sed 's/v//')
required_version="18.0.0"

# Simple version comparison
if ! node -e "
const current = process.version.slice(1).split('.').map(Number);
const required = '$required_version'.split('.').map(Number);
const isValid = current[0] > required[0] || 
  (current[0] === required[0] && current[1] > required[1]) ||
  (current[0] === required[0] && current[1] === required[1] && current[2] >= required[2]);
if (!isValid) process.exit(1);
" 2>/dev/null; then
    print_error "Node.js version $node_version is not supported. Please install Node.js $required_version or higher."
    exit 1
fi

print_status "Node.js version $node_version is supported"

# Check npm version
if ! command -v npm >/dev/null 2>&1; then
    print_error "npm is not installed. Please install npm."
    exit 1
fi

npm_version=$(npm -v 2>/dev/null || echo "unknown")
print_info "npm version: $npm_version"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Are you in the correct directory?"
    exit 1
fi

# Install dependencies
print_info "Installing dependencies..."
if npm install; then
    print_status "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Check for security vulnerabilities
print_info "Checking for security vulnerabilities..."
if npm audit --audit-level=high --omit=dev; then
    print_status "No high-severity vulnerabilities found"
else
    print_warning "Security vulnerabilities detected. Run 'npm audit fix' to resolve."
fi

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    print_info "Creating .env file from template..."
    if [ -f .env.example ]; then
        cp .env.example .env
    else
        print_warning ".env.example not found, creating basic .env file..."
        cat > .env << 'EOF'
# Recharge Storefront API Configuration

# Store Configuration
RECHARGE_STOREFRONT_DOMAIN=your-shop.myshopify.com

# Authentication
RECHARGE_ADMIN_TOKEN=your_admin_api_token_here

# Optional: Default customer session token
RECHARGE_SESSION_TOKEN=

# MCP Server Configuration
MCP_SERVER_NAME=recharge-storefront-api-mcp
MCP_SERVER_VERSION=1.0.0

# Development Configuration
DEBUG=false
EOF
    fi
    print_warning "Please edit .env file with your Recharge API credentials"
    print_info "Required variables:"
    print_info "  - RECHARGE_STOREFRONT_DOMAIN=your-shop.myshopify.com"
    print_info "  - RECHARGE_ADMIN_TOKEN=your_admin_token_here"
else
    print_status ".env file already exists"
fi

# Validate .env file format
if [ -f .env ]; then
    print_info "Validating .env file format..."
    if grep -q "RECHARGE_STOREFRONT_DOMAIN=" .env; then
        domain=$(grep "RECHARGE_STOREFRONT_DOMAIN=" .env | cut -d'=' -f2)
        if [ "$domain" = "your-shop.myshopify.com" ] || [ -z "$domain" ] || [ "$domain" = "" ]; then
            print_warning "Please update RECHARGE_STOREFRONT_DOMAIN with your actual domain"
        else
            # Validate domain format
            if [[ ! "$domain" =~ \.myshopify\.com$ ]]; then
                print_warning "Domain should end with .myshopify.com: $domain"
            else
                print_status "Domain configured: $domain"
            fi
        fi
    else
        print_warning "RECHARGE_STOREFRONT_DOMAIN not found in .env file"
    fi
    
    if grep -q "RECHARGE_ADMIN_TOKEN=" .env; then
        token=$(grep "RECHARGE_ADMIN_TOKEN=" .env | cut -d'=' -f2)
        if [ "$token" = "your_admin_api_token_here" ] || [ "$token" = "your_admin_token_here" ] || [ -z "$token" ] || [ "$token" = "" ]; then
            print_warning "Please update RECHARGE_ADMIN_TOKEN with your actual admin token"
        else
            # Basic token validation
            if [ ${#token} -lt 10 ]; then
                print_warning "Admin token appears to be too short: ${#token} characters"
            else
                print_status "Admin token configured"
            fi
        fi
    else
        print_warning "RECHARGE_ADMIN_TOKEN not found in .env file"
    fi
fi

# Create logs directory if it doesn't exist
if [ ! -d "logs" ]; then
    print_info "Creating logs directory..."
    mkdir -p logs
    print_status "Logs directory created"
fi

# Validate the setup
print_info "Validating setup..."
if npm run validate; then
    print_status "Setup validation passed"
else
    print_error "Setup validation failed"
    exit 1
fi

# Display project statistics
print_info "Project Statistics:"
tool_count=$(find src/tools -name "*-tools.js" | wc -l)
echo "  🔧 Tool categories: $tool_count"
echo "  📁 Source files: $(find src -name "*.js" | wc -l)"
echo "  📋 Scripts available: $(node -p "Object.keys(require('./package.json').scripts).length")"

print_status "Setup complete!"
echo ""
print_info "Next steps:"
echo "  1. Edit .env file with your Recharge API credentials"
echo "  2. Run 'npm start' to start the server"
echo "  3. Run 'npm run dev' for development mode with file watching"
echo "  4. Run 'npm run dev:debug' for development with debug logging"
echo ""
print_info "Available commands:"
echo "  npm run validate    - Validate configuration and syntax"
echo "  npm run coverage    - Show API coverage report"
echo "  npm run test        - Run tests"
echo ""
print_info "For more information, see README.md"