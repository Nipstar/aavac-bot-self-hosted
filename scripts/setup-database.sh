#!/bin/bash

# =============================================
# AI Widget Platform - Database Setup Script
# =============================================
# This script sets up the database schema using Supabase CLI.
# For manual setup, copy the contents of database-schema.sql
# and run it in the Supabase SQL Editor.
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
echo "║              Database Setup Script                        ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: Supabase CLI is not installed.${NC}"
    echo ""
    echo "Installation options:"
    echo "  macOS:   brew install supabase/tap/supabase"
    echo "  Windows: scoop install supabase"
    echo "  npm:     npm install -g supabase"
    echo ""
    echo "Alternative: Run the SQL in scripts/database-schema.sql manually in"
    echo "the Supabase SQL Editor at:"
    echo "https://supabase.com/dashboard/project/YOUR_PROJECT_REF/sql"
    exit 1
fi

echo -e "${GREEN}✓ Supabase CLI is installed${NC}"

# Check if logged in
echo -e "${YELLOW}Checking Supabase login status...${NC}"
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}Not logged in. Initiating login...${NC}"
    supabase login
fi
echo -e "${GREEN}✓ Logged in to Supabase${NC}"

echo ""

# Check if project is linked
if [ ! -f "supabase/.temp/project-ref" ]; then
    echo -e "${YELLOW}No project linked. Please enter your Supabase project reference:${NC}"
    echo "(You can find this in your Supabase dashboard URL: supabase.com/dashboard/project/YOUR_REF)"
    read -p "Project Reference: " PROJECT_REF
    
    if [ -z "$PROJECT_REF" ]; then
        echo -e "${RED}Error: Project reference is required.${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Linking to project...${NC}"
    supabase link --project-ref "$PROJECT_REF"
    echo -e "${GREEN}✓ Project linked${NC}"
else
    echo -e "${GREEN}✓ Project already linked${NC}"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                  Database Schema Setup                    ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Check if database-schema.sql exists
if [ ! -f "scripts/database-schema.sql" ]; then
    echo -e "${RED}Error: scripts/database-schema.sql not found.${NC}"
    exit 1
fi

echo "This will set up the following:"
echo "  - Tables: profiles, user_roles, teams, team_members, team_invitations,"
echo "            global_settings, demo_settings, widget_configs"
echo "  - Functions: has_role, generate_widget_api_key, handle_new_user, etc."
echo "  - Triggers: Auto-update timestamps, user creation, limits"
echo "  - RLS Policies: Secure access control for all tables"
echo ""

read -p "Do you want to proceed? (y/n): " PROCEED

if [ "$PROCEED" != "y" ] && [ "$PROCEED" != "Y" ]; then
    echo -e "${YELLOW}Setup cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}Running database schema...${NC}"

# Method 1: Using supabase db push (if migrations exist)
# supabase db push

# Method 2: Direct SQL execution using supabase db execute (if available)
# Note: The supabase CLI may not support direct SQL execution in all versions.
# In that case, we provide instructions for manual execution.

# Check if we can use the SQL directly
if supabase db execute --help &> /dev/null 2>&1; then
    # Direct execution available
    supabase db execute --file scripts/database-schema.sql
    echo -e "${GREEN}✓ Database schema applied successfully!${NC}"
else
    # Direct execution not available - provide manual instructions
    echo -e "${YELLOW}Note: Direct SQL execution not available in this CLI version.${NC}"
    echo ""
    echo "Please run the schema manually:"
    echo ""
    echo "  1. Go to your Supabase Dashboard"
    echo "  2. Navigate to SQL Editor"
    echo "  3. Copy the contents of scripts/database-schema.sql"
    echo "  4. Paste and run in the SQL Editor"
    echo ""
    
    # Get project ref if available
    if [ -f "supabase/.temp/project-ref" ]; then
        PROJECT_REF=$(cat supabase/.temp/project-ref)
        echo "Direct link to SQL Editor:"
        echo "https://supabase.com/dashboard/project/${PROJECT_REF}/sql"
    fi
    
    echo ""
    read -p "Would you like to open the schema file now? (y/n): " OPEN_FILE
    
    if [ "$OPEN_FILE" = "y" ] || [ "$OPEN_FILE" = "Y" ]; then
        # Try to open with default editor
        if command -v code &> /dev/null; then
            code scripts/database-schema.sql
        elif command -v nano &> /dev/null; then
            nano scripts/database-schema.sql
        elif command -v vim &> /dev/null; then
            vim scripts/database-schema.sql
        else
            cat scripts/database-schema.sql
        fi
    fi
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Database setup instructions complete!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo "  1. Deploy edge functions: ./scripts/deploy-functions.sh"
echo "  2. Create .env file with your Supabase credentials"
echo "  3. Deploy to Vercel: vercel --prod"
echo ""
