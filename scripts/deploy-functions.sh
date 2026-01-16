#!/bin/bash

# =============================================
# AI Widget Platform - Edge Functions Deployment
# =============================================
# This script deploys all Supabase Edge Functions.
# Make sure you have the Supabase CLI installed and are logged in.
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
echo "║          Edge Functions Deployment Script                 ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: Supabase CLI is not installed.${NC}"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

# Check if logged in
echo -e "${YELLOW}Checking Supabase login status...${NC}"
if ! supabase projects list &> /dev/null; then
    echo -e "${RED}Not logged in to Supabase. Please run: supabase login${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Logged in to Supabase${NC}"

# Check if project is linked
if [ ! -f "supabase/.temp/project-ref" ]; then
    echo -e "${YELLOW}Project not linked. Please enter your project reference:${NC}"
    read -p "Project Reference: " PROJECT_REF
    supabase link --project-ref "$PROJECT_REF"
fi

echo ""
echo -e "${YELLOW}Deploying Edge Functions...${NC}"
echo ""

# List of functions to deploy
FUNCTIONS=(
    "retell-create-call"
    "retell-text-chat"
    "widget-config"
    "widget-embed"
    "wordpress-plugin"
)

# Deploy each function
for func in "${FUNCTIONS[@]}"; do
    echo -e "${BLUE}Deploying: ${func}${NC}"
    
    if [ -d "supabase/functions/${func}" ]; then
        if supabase functions deploy "$func" --no-verify-jwt; then
            echo -e "${GREEN}✓ ${func} deployed successfully${NC}"
        else
            echo -e "${RED}✗ Failed to deploy ${func}${NC}"
        fi
    else
        echo -e "${YELLOW}! Function directory not found: supabase/functions/${func}${NC}"
    fi
    
    echo ""
done

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Edge Functions deployment complete!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Reminder about secrets
echo -e "${YELLOW}Don't forget to set your secrets:${NC}"
echo ""
echo "  supabase secrets set RETELL_API_KEY=your_api_key"
echo "  supabase secrets set RETELL_AGENT_ID=your_voice_agent_id"
echo "  supabase secrets set RETELL_TEXT_AGENT_ID=your_chat_agent_id"
echo ""
echo "Or set them in the Supabase Dashboard > Edge Functions > Secrets"
echo ""
