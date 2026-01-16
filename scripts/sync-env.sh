#!/bin/bash

# =============================================
# Environment Variable Sync Script
# =============================================
# Syncs environment variables from .env to:
# - Vercel environment variables (production)
# - Supabase edge function secrets
#
# This eliminates the need to manually enter credentials
# in multiple locations.
#
# Run with: npm run sync:env
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
echo "║         Environment Variable Sync Script                  ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
  echo -e "${RED}Error: .env file not found${NC}"
  echo "Please create a .env file with your configuration"
  echo "You can copy .env.example as a template: cp .env.example .env"
  exit 1
fi

# Load .env file
echo -e "${YELLOW}Loading .env file...${NC}"
set -a
source .env
set +a
echo -e "${GREEN}✓ Environment variables loaded${NC}"
echo ""

# Validate required variables
MISSING_VARS=0

if [ -z "$VITE_SUPABASE_URL" ]; then
  echo -e "${RED}✗ VITE_SUPABASE_URL is not set${NC}"
  ((MISSING_VARS++))
fi

if [ -z "$VITE_SUPABASE_PUBLISHABLE_KEY" ]; then
  echo -e "${RED}✗ VITE_SUPABASE_PUBLISHABLE_KEY is not set${NC}"
  ((MISSING_VARS++))
fi

if [ -z "$VITE_SUPABASE_PROJECT_ID" ]; then
  echo -e "${RED}✗ VITE_SUPABASE_PROJECT_ID is not set${NC}"
  ((MISSING_VARS++))
fi

if [ $MISSING_VARS -gt 0 ]; then
  echo ""
  echo -e "${RED}Error: Missing required environment variables${NC}"
  echo "Please check your .env file"
  exit 1
fi

echo -e "${GREEN}✓ All required variables are set${NC}"
echo ""

# Sync to Vercel
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                Syncing to Vercel                          ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

if command -v vercel &> /dev/null; then
  echo -e "${YELLOW}Syncing environment variables to Vercel production...${NC}"
  echo ""

  # Note: vercel env add will prompt if variable already exists
  # Using echo to pipe the value to avoid interactive prompt

  echo -e "${YELLOW}Setting VITE_SUPABASE_URL...${NC}"
  echo "$VITE_SUPABASE_URL" | vercel env add VITE_SUPABASE_URL production 2>/dev/null || \
    vercel env rm VITE_SUPABASE_URL production -y 2>/dev/null && echo "$VITE_SUPABASE_URL" | vercel env add VITE_SUPABASE_URL production

  echo -e "${YELLOW}Setting VITE_SUPABASE_PUBLISHABLE_KEY...${NC}"
  echo "$VITE_SUPABASE_PUBLISHABLE_KEY" | vercel env add VITE_SUPABASE_PUBLISHABLE_KEY production 2>/dev/null || \
    vercel env rm VITE_SUPABASE_PUBLISHABLE_KEY production -y 2>/dev/null && echo "$VITE_SUPABASE_PUBLISHABLE_KEY" | vercel env add VITE_SUPABASE_PUBLISHABLE_KEY production

  echo -e "${YELLOW}Setting VITE_SUPABASE_PROJECT_ID...${NC}"
  echo "$VITE_SUPABASE_PROJECT_ID" | vercel env add VITE_SUPABASE_PROJECT_ID production 2>/dev/null || \
    vercel env rm VITE_SUPABASE_PROJECT_ID production -y 2>/dev/null && echo "$VITE_SUPABASE_PROJECT_ID" | vercel env add VITE_SUPABASE_PROJECT_ID production

  echo ""
  echo -e "${GREEN}✓ Vercel environment variables synced${NC}"
  echo ""
  echo -e "${YELLOW}Note: You may need to redeploy on Vercel for changes to take effect${NC}"
  echo "Run: vercel --prod"
else
  echo -e "${YELLOW}⚠ Vercel CLI not installed${NC}"
  echo ""
  echo "Install with: npm i -g vercel"
  echo ""
  echo "Or manually add these variables in Vercel Dashboard:"
  echo "  → Project Settings → Environment Variables"
  echo ""
  echo "  VITE_SUPABASE_URL = $VITE_SUPABASE_URL"
  echo "  VITE_SUPABASE_PUBLISHABLE_KEY = $VITE_SUPABASE_PUBLISHABLE_KEY"
  echo "  VITE_SUPABASE_PROJECT_ID = $VITE_SUPABASE_PROJECT_ID"
fi

echo ""

# Sync Retell secrets to Supabase
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}             Syncing to Supabase Secrets                   ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

if [ -n "$RETELL_API_KEY" ] || [ -n "$RETELL_AGENT_ID" ] || [ -n "$RETELL_TEXT_AGENT_ID" ]; then
  # Check if Supabase CLI is installed
  if ! command -v supabase &> /dev/null; then
    echo -e "${YELLOW}⚠ Supabase CLI not installed${NC}"
    echo "Install with: npm install -g supabase"
    echo ""
    echo "Or manually set these secrets in Supabase Dashboard:"
    echo "  → Edge Functions → Secrets"
    echo ""
    if [ -n "$RETELL_API_KEY" ]; then
      echo "  RETELL_API_KEY = (your api key)"
    fi
    if [ -n "$RETELL_AGENT_ID" ]; then
      echo "  RETELL_AGENT_ID = $RETELL_AGENT_ID"
    fi
    if [ -n "$RETELL_TEXT_AGENT_ID" ]; then
      echo "  RETELL_TEXT_AGENT_ID = $RETELL_TEXT_AGENT_ID"
    fi
  else
    # Check if logged in to Supabase
    if ! supabase projects list &> /dev/null; then
      echo -e "${YELLOW}⚠ Not logged in to Supabase${NC}"
      echo "Please run: supabase login"
      echo ""
      echo "Then run this script again to sync secrets"
    else
      echo -e "${YELLOW}Syncing Retell secrets to Supabase...${NC}"

      if [ -n "$RETELL_API_KEY" ]; then
        supabase secrets set RETELL_API_KEY="$RETELL_API_KEY"
        echo -e "${GREEN}✓ RETELL_API_KEY set${NC}"
      fi

      if [ -n "$RETELL_AGENT_ID" ]; then
        supabase secrets set RETELL_AGENT_ID="$RETELL_AGENT_ID"
        echo -e "${GREEN}✓ RETELL_AGENT_ID set${NC}"
      fi

      if [ -n "$RETELL_TEXT_AGENT_ID" ]; then
        supabase secrets set RETELL_TEXT_AGENT_ID="$RETELL_TEXT_AGENT_ID"
        echo -e "${GREEN}✓ RETELL_TEXT_AGENT_ID set${NC}"
      fi

      echo ""
      echo -e "${GREEN}✓ Supabase secrets synced${NC}"
    fi
  fi
else
  echo -e "${YELLOW}⚠ No Retell credentials found in .env${NC}"
  echo ""
  echo "To sync Retell credentials, add these to your .env file:"
  echo "  RETELL_API_KEY=your_api_key"
  echo "  RETELL_AGENT_ID=your_voice_agent_id"
  echo "  RETELL_TEXT_AGENT_ID=your_chat_agent_id"
  echo ""
  echo "You can also configure Retell AI later via the Admin Settings panel"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Environment sync complete!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
