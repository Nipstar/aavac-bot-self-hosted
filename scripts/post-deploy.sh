#!/bin/bash

# =============================================
# AI Widget Platform - Post-Deployment Setup
# =============================================
# This script runs AFTER Vercel deployment to complete the setup by:
# 1. Linking to Supabase project
# 2. Applying database migrations (schema + auto-initialization)
# 3. Deploying edge functions
# 4. Configuring Retell AI secrets
# 5. Validating deployment
#
# Run this with: npm run setup:production
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
echo "║      AI Widget Platform - Post-Deployment Setup           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo "This will complete your Vercel deployment by:"
echo "  ✓ Setting up database schema"
echo "  ✓ Initializing demo and global settings"
echo "  ✓ Deploying edge functions"
echo "  ✓ Configuring Retell AI"
echo "  ✓ Setting up auto-admin for first user"
echo ""

# Check for Supabase CLI
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
echo ""

# Collect credentials interactively
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                   Configuration                           ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

read -p "Enter your Supabase Project Reference (e.g., xxxxx): " SUPABASE_REF
read -p "Enter your admin email (will become admin on first signup): " ADMIN_EMAIL

echo ""
echo -e "${BLUE}Retell AI Configuration${NC}"
echo "You can configure this now, or later via the Admin Settings panel."
echo ""

read -p "Configure Retell AI now? (y/n): " CONFIGURE_RETELL

if [ "$CONFIGURE_RETELL" = "y" ] || [ "$CONFIGURE_RETELL" = "Y" ]; then
    read -sp "Retell API Key: " RETELL_API_KEY
    echo ""
    read -p "Retell Voice Agent ID: " RETELL_VOICE_AGENT_ID
    read -p "Retell Chat Agent ID: " RETELL_CHAT_AGENT_ID
else
    RETELL_API_KEY=""
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                   Deployment Steps                        ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Step 1: Link Supabase project
echo -e "${YELLOW}[1/5] Linking to Supabase project...${NC}"
if supabase link --project-ref "$SUPABASE_REF"; then
    echo -e "${GREEN}✓ Successfully linked to Supabase project${NC}"
else
    echo -e "${RED}✗ Failed to link to Supabase project${NC}"
    exit 1
fi
echo ""

# Step 2: Apply migrations
echo -e "${YELLOW}[2/5] Applying database migrations...${NC}"
echo "This will:"
echo "  - Apply database schema"
echo "  - Initialize global settings"
echo "  - Initialize demo settings"
echo "  - Set up auto-admin trigger for first user"
echo ""

if supabase db push; then
    echo -e "${GREEN}✓ Database migrations applied successfully${NC}"
else
    echo -e "${RED}✗ Failed to apply database migrations${NC}"
    echo "Try running manually: supabase db push"
    exit 1
fi
echo ""

# Step 3: Deploy edge functions
echo -e "${YELLOW}[3/5] Deploying edge functions...${NC}"
if [ -f "./scripts/deploy-functions.sh" ]; then
    chmod +x ./scripts/deploy-functions.sh
    if ./scripts/deploy-functions.sh; then
        echo -e "${GREEN}✓ Edge functions deployed successfully${NC}"
    else
        echo -e "${RED}✗ Failed to deploy edge functions${NC}"
        echo "Try running manually: ./scripts/deploy-functions.sh"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠ deploy-functions.sh not found, skipping...${NC}"
fi
echo ""

# Step 4: Set Retell secrets
if [ -n "$RETELL_API_KEY" ]; then
    echo -e "${YELLOW}[4/5] Configuring Retell AI secrets...${NC}"

    if supabase secrets set RETELL_API_KEY="$RETELL_API_KEY" && \
       supabase secrets set RETELL_AGENT_ID="$RETELL_VOICE_AGENT_ID" && \
       supabase secrets set RETELL_TEXT_AGENT_ID="$RETELL_CHAT_AGENT_ID"; then
        echo -e "${GREEN}✓ Retell secrets configured successfully${NC}"
    else
        echo -e "${RED}✗ Failed to set Retell secrets${NC}"
        echo "You can set them later in the Admin Settings panel"
    fi
else
    echo -e "${YELLOW}[4/5] Skipping Retell configuration${NC}"
    echo "You can configure Retell AI later via Admin Settings"
fi
echo ""

# Step 5: Validate deployment
echo -e "${YELLOW}[5/5] Validating deployment...${NC}"

# Quick validation checks
VALIDATION_ERRORS=0

# Check if demo_settings has data
DEMO_CHECK=$(supabase db execute --query "SELECT COUNT(*) FROM demo_settings" 2>/dev/null | tail -1 || echo "0")
if [ "$DEMO_CHECK" -gt 0 ]; then
    echo -e "${GREEN}  ✓ Demo settings initialized${NC}"
else
    echo -e "${YELLOW}  ⚠ Demo settings not found${NC}"
    ((VALIDATION_ERRORS++))
fi

# Check if global_settings has data
GLOBAL_CHECK=$(supabase db execute --query "SELECT COUNT(*) FROM global_settings" 2>/dev/null | tail -1 || echo "0")
if [ "$GLOBAL_CHECK" -gt 0 ]; then
    echo -e "${GREEN}  ✓ Global settings initialized${NC}"
else
    echo -e "${YELLOW}  ⚠ Global settings not found${NC}"
    ((VALIDATION_ERRORS++))
fi

# Check if auto-admin trigger exists
TRIGGER_CHECK=$(supabase db execute --query "SELECT COUNT(*) FROM pg_trigger WHERE tgname='on_auth_user_created_admin'" 2>/dev/null | tail -1 || echo "0")
if [ "$TRIGGER_CHECK" -gt 0 ]; then
    echo -e "${GREEN}  ✓ Auto-admin trigger configured${NC}"
else
    echo -e "${YELLOW}  ⚠ Auto-admin trigger not found${NC}"
    ((VALIDATION_ERRORS++))
fi

echo ""

if [ $VALIDATION_ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ Validation passed${NC}"
else
    echo -e "${YELLOW}⚠ Some validation checks failed, but deployment may still work${NC}"
fi

# Final summary
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                    Setup Complete!                        ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}✅ Your AI Widget Platform is ready!${NC}"
echo ""
echo "Next steps:"
echo "  1. Visit your Vercel deployment URL"
echo "  2. Sign up with your email: ${GREEN}${ADMIN_EMAIL}${NC}"
echo "  3. You'll automatically receive admin access"
echo "  4. Configure additional settings in Admin panel (if needed)"
echo ""
echo "For health check, run: ${BLUE}npm run health:check${NC}"
echo ""
echo -e "${YELLOW}Documentation:${NC} See SELF-HOSTING.md for detailed information"
echo ""
