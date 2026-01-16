#!/bin/bash

# =============================================
# AI Widget Platform - Setup Script
# =============================================
# This script helps you set up the platform for self-hosting.
# It will guide you through the Supabase and Vercel configuration.
# =============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║           AI Widget Platform - Setup Script               ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check for required tools
echo -e "${YELLOW}Checking prerequisites...${NC}"

check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}✗ $1 is not installed. Please install it first.${NC}"
        exit 1
    else
        echo -e "${GREEN}✓ $1 is installed${NC}"
    fi
}

check_command "node"
check_command "npm"
check_command "git"

# Check for Supabase CLI (optional but recommended)
if command -v supabase &> /dev/null; then
    echo -e "${GREEN}✓ Supabase CLI is installed${NC}"
    SUPABASE_CLI=true
else
    echo -e "${YELLOW}! Supabase CLI is not installed (optional but recommended)${NC}"
    echo -e "  Install with: npm install -g supabase"
    SUPABASE_CLI=false
fi

echo ""

# Install npm dependencies
echo -e "${YELLOW}Installing npm dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"

echo ""

# Collect Supabase configuration
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                   Supabase Configuration                  ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "You'll need to create a Supabase project first if you haven't already."
echo "Visit: https://supabase.com/dashboard to create a project."
echo ""

read -p "Enter your Supabase Project URL (e.g., https://xxxxx.supabase.co): " SUPABASE_URL
read -p "Enter your Supabase Project Reference (the 'xxxxx' part): " SUPABASE_PROJECT_REF
read -p "Enter your Supabase Anon/Public Key: " SUPABASE_ANON_KEY
read -sp "Enter your Supabase Service Role Key (hidden): " SUPABASE_SERVICE_ROLE_KEY
echo ""

# Validate inputs
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_PROJECT_REF" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}Error: All Supabase fields are required.${NC}"
    exit 1
fi

# Create .env file
echo -e "${YELLOW}Creating .env file...${NC}"
cat > .env << EOF
# Supabase Configuration
VITE_SUPABASE_URL=${SUPABASE_URL}
VITE_SUPABASE_PUBLISHABLE_KEY=${SUPABASE_ANON_KEY}
VITE_SUPABASE_PROJECT_ID=${SUPABASE_PROJECT_REF}
EOF

echo -e "${GREEN}✓ .env file created${NC}"

echo ""

# Database setup
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                    Database Setup                         ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

read -p "Would you like to set up the database now? (y/n): " SETUP_DB

if [ "$SETUP_DB" = "y" ] || [ "$SETUP_DB" = "Y" ]; then
    if [ "$SUPABASE_CLI" = true ]; then
        echo -e "${YELLOW}Linking to Supabase project...${NC}"
        supabase link --project-ref "$SUPABASE_PROJECT_REF"

        echo -e "${YELLOW}Applying database migrations...${NC}"
        echo "This will:"
        echo "  - Apply database schema"
        echo "  - Initialize global settings"
        echo "  - Initialize demo settings"
        echo "  - Set up auto-admin trigger"

        if supabase db push; then
            echo -e "${GREEN}✓ Database schema applied successfully${NC}"
            echo -e "${GREEN}✓ Settings initialized automatically${NC}"
        else
            echo -e "${RED}✗ Failed to apply migrations${NC}"
            echo "You can try again with: supabase db push"
        fi
    else
        echo -e "${YELLOW}Supabase CLI not installed.${NC}"
        echo "Install it with: npm install -g supabase"
        echo "Then run: supabase db push"
    fi
else
    echo -e "${YELLOW}Skipping database setup.${NC}"
    echo "Run later with: supabase db push"
fi

echo ""

# Edge Functions deployment
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                 Edge Functions Setup                      ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

read -p "Would you like to deploy edge functions now? (y/n): " DEPLOY_FUNCTIONS

if [ "$DEPLOY_FUNCTIONS" = "y" ] || [ "$DEPLOY_FUNCTIONS" = "Y" ]; then
    if [ "$SUPABASE_CLI" = true ]; then
        chmod +x scripts/deploy-functions.sh
        ./scripts/deploy-functions.sh
    else
        echo -e "${YELLOW}Supabase CLI not installed. Please install it to deploy edge functions.${NC}"
        echo "Install with: npm install -g supabase"
    fi
else
    echo -e "${YELLOW}Skipping edge functions deployment. Run ./scripts/deploy-functions.sh later.${NC}"
fi

echo ""

# Retell AI configuration (optional)
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}              Retell AI Configuration (Optional)           ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

read -p "Would you like to configure Retell AI now? (y/n): " CONFIGURE_RETELL

if [ "$CONFIGURE_RETELL" = "y" ] || [ "$CONFIGURE_RETELL" = "Y" ]; then
    read -sp "Enter your Retell API Key (hidden): " RETELL_API_KEY
    echo ""
    read -p "Enter your Voice Agent ID: " RETELL_AGENT_ID
    read -p "Enter your Chat Agent ID: " RETELL_TEXT_AGENT_ID
    
    if [ "$SUPABASE_CLI" = true ] && [ -n "$RETELL_API_KEY" ]; then
        echo -e "${YELLOW}Setting Supabase secrets...${NC}"
        supabase secrets set RETELL_API_KEY="$RETELL_API_KEY"
        supabase secrets set RETELL_AGENT_ID="$RETELL_AGENT_ID"
        supabase secrets set RETELL_TEXT_AGENT_ID="$RETELL_TEXT_AGENT_ID"
        echo -e "${GREEN}✓ Retell secrets configured${NC}"
    else
        echo -e "${YELLOW}Please set these secrets manually in Supabase Dashboard > Edge Functions > Secrets${NC}"
    fi
else
    echo -e "${YELLOW}Skipping Retell configuration. You can configure it later in Admin Settings.${NC}"
fi

echo ""

# Final summary
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                        Summary                            ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}✓ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Deploy to Vercel:"
echo "     - Run: vercel --prod"
echo "     - Or connect your GitHub repo to Vercel"
echo ""
echo "  2. Create your first admin user:"
echo "     - Sign up on your deployed app"
echo "     - The first user automatically becomes admin!"
echo ""
echo "  3. (Optional) Configure Retell AI:"
echo "     - Via Admin Settings panel in the app"
echo "     - Or run: npm run sync:env"
echo ""
echo "  4. Validate deployment:"
echo "     - Run: npm run health:check"
echo ""
echo -e "${YELLOW}Documentation: See SELF-HOSTING.md for detailed instructions${NC}"
echo ""
