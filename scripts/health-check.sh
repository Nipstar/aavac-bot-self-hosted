#!/bin/bash

# =============================================
# Deployment Health Check Script
# =============================================
# Validates the entire deployment by checking:
# - Supabase connection and authentication
# - Database schema (tables exist)
# - Edge functions deployment
# - Settings initialization (global_settings, demo_settings)
# - Admin user configuration
# - Environment variables
#
# Run with: npm run health:check
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
echo "║           Deployment Health Check                         ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo "Validating your deployment..."
echo ""

ERRORS=0
WARNINGS=0

# Check 1: Supabase CLI installed
echo -n "Checking Supabase CLI... "
if command -v supabase &> /dev/null; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗ Not installed${NC}"
  ((ERRORS++))
fi

# Check 2: Supabase connection
echo -n "Checking Supabase connection... "
if supabase projects list &> /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗ Not logged in or no connection${NC}"
  ((ERRORS++))
fi

# Check 3: Database tables
echo -n "Checking database tables... "
TABLE_COUNT=$(supabase db execute --query "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public'" 2>/dev/null | tail -1 || echo "0")
if [ "$TABLE_COUNT" -gt 5 ]; then
  echo -e "${GREEN}✓ ($TABLE_COUNT tables found)${NC}"
else
  echo -e "${RED}✗ Missing tables (found: $TABLE_COUNT)${NC}"
  ((ERRORS++))
fi

# Check 4: Specific required tables
echo -n "Checking required tables... "
REQUIRED_TABLES=("profiles" "user_roles" "teams" "widget_configs" "demo_settings" "global_settings")
MISSING_TABLES=""

for table in "${REQUIRED_TABLES[@]}"; do
  TABLE_EXISTS=$(supabase db execute --query "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public' AND tablename='$table'" 2>/dev/null | tail -1 || echo "0")
  if [ "$TABLE_EXISTS" -eq 0 ]; then
    MISSING_TABLES="$MISSING_TABLES $table"
  fi
done

if [ -z "$MISSING_TABLES" ]; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗ Missing tables:$MISSING_TABLES${NC}"
  ((ERRORS++))
fi

# Check 5: Edge functions
echo -n "Checking edge functions... "
FUNCTION_COUNT=$(supabase functions list 2>/dev/null | grep -c "retell\|widget" || echo "0")
if [ "$FUNCTION_COUNT" -ge 3 ]; then
  echo -e "${GREEN}✓ ($FUNCTION_COUNT functions deployed)${NC}"
else
  echo -e "${YELLOW}⚠ Only $FUNCTION_COUNT functions found (expected 5)${NC}"
  ((WARNINGS++))
fi

# Check 6: Global settings
echo -n "Checking global settings... "
GLOBAL_SETTINGS=$(supabase db execute --query "SELECT COUNT(*) FROM global_settings" 2>/dev/null | tail -1 || echo "0")
if [ "$GLOBAL_SETTINGS" -gt 0 ]; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗ No global settings found${NC}"
  ((ERRORS++))
fi

# Check 7: Demo settings
echo -n "Checking demo settings... "
DEMO_SETTINGS=$(supabase db execute --query "SELECT COUNT(*) FROM demo_settings" 2>/dev/null | tail -1 || echo "0")
if [ "$DEMO_SETTINGS" -gt 0 ]; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗ No demo settings found${NC}"
  ((ERRORS++))
fi

# Check 8: Auto-admin trigger
echo -n "Checking auto-admin trigger... "
TRIGGER_EXISTS=$(supabase db execute --query "SELECT COUNT(*) FROM pg_trigger WHERE tgname='on_auth_user_created_admin'" 2>/dev/null | tail -1 || echo "0")
if [ "$TRIGGER_EXISTS" -gt 0 ]; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${YELLOW}⚠ Auto-admin trigger not found${NC}"
  ((WARNINGS++))
fi

# Check 9: Admin user exists
echo -n "Checking for admin user... "
ADMIN_COUNT=$(supabase db execute --query "SELECT COUNT(*) FROM user_roles WHERE role='admin'" 2>/dev/null | tail -1 || echo "0")
if [ "$ADMIN_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✓ ($ADMIN_COUNT admin user(s) found)${NC}"
else
  echo -e "${YELLOW}⚠ No admin user yet (will auto-create on first signup)${NC}"
  ((WARNINGS++))
fi

# Check 10: .env file
echo -n "Checking .env file... "
if [ -f .env ]; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗ .env file missing${NC}"
  ((ERRORS++))
fi

# Check 11: Environment variables in .env
if [ -f .env ]; then
  echo -n "Checking required env vars in .env... "
  source .env 2>/dev/null || true

  MISSING_ENV=""
  [ -z "$VITE_SUPABASE_URL" ] && MISSING_ENV="$MISSING_ENV VITE_SUPABASE_URL"
  [ -z "$VITE_SUPABASE_PUBLISHABLE_KEY" ] && MISSING_ENV="$MISSING_ENV VITE_SUPABASE_PUBLISHABLE_KEY"
  [ -z "$VITE_SUPABASE_PROJECT_ID" ] && MISSING_ENV="$MISSING_ENV VITE_SUPABASE_PROJECT_ID"

  if [ -z "$MISSING_ENV" ]; then
    echo -e "${GREEN}✓${NC}"
  else
    echo -e "${RED}✗ Missing:$MISSING_ENV${NC}"
    ((ERRORS++))
  fi
fi

# Check 12: Retell configuration (optional)
echo -n "Checking Retell configuration... "
if [ -f .env ]; then
  source .env 2>/dev/null || true
  if [ -n "$RETELL_API_KEY" ]; then
    echo -e "${GREEN}✓ Configured in .env${NC}"
  else
    echo -e "${YELLOW}⚠ Not configured in .env (can configure via Admin panel)${NC}"
    ((WARNINGS++))
  fi
else
  echo -e "${YELLOW}⚠ No .env file${NC}"
fi

# Summary
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed! Deployment is healthy.${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
  echo ""
  echo "Your deployment is ready to use!"
  echo ""
  exit 0
elif [ $ERRORS -eq 0 ] && [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}⚠ $WARNINGS warning(s) found, but deployment should work.${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
  echo ""
  echo "Your deployment is functional with minor issues."
  echo "Review the warnings above and address if needed."
  echo ""
  exit 0
else
  echo -e "${RED}❌ $ERRORS error(s) found. Deployment may not work correctly.${NC}"
  if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠ Also found $WARNINGS warning(s).${NC}"
  fi
  echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
  echo ""
  echo "Please resolve the errors above before using the deployment."
  echo ""
  echo "Common fixes:"
  echo "  - Run: supabase login"
  echo "  - Run: supabase db push"
  echo "  - Run: ./scripts/deploy-functions.sh"
  echo "  - Create .env file: cp .env.example .env"
  echo ""
  exit 1
fi
