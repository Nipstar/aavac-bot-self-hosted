# Self-Hosting Guide

This guide provides step-by-step instructions for deploying the AI Widget Platform as a self-hosted solution using **Vercel** (frontend) and **Supabase** (backend).

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Supabase Setup](#supabase-setup)
4. [Database Installation](#database-installation)
5. [Edge Functions Deployment](#edge-functions-deployment)
6. [Environment Configuration](#environment-configuration)
7. [Vercel Deployment](#vercel-deployment)
8. [Post-Deployment Setup](#post-deployment-setup)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** or **yarn** package manager
- **Git** - [Download](https://git-scm.com/)
- **Supabase CLI** - [Installation Guide](https://supabase.com/docs/guides/cli)
- **Vercel CLI** (optional) - `npm i -g vercel`

You'll also need accounts on:
- [Supabase](https://supabase.com) (free tier available)
- [Vercel](https://vercel.com) (free tier available)
- [Retell AI](https://retellai.com) (for voice/chat agents)

---

## Quick Start

For those who want to get started quickly:

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd <project-folder>

# 2. Install dependencies
npm install

# 3. Run the setup script (see scripts/setup.sh)
chmod +x scripts/setup.sh
./scripts/setup.sh

# 4. Deploy to Vercel
vercel --prod
```

---

## Supabase Setup

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **"New Project"**
3. Fill in the project details:
   - **Name**: Your project name (e.g., "ai-widget-platform")
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose the closest region to your users
4. Click **"Create new project"** and wait for setup to complete

### Step 2: Get Your API Keys

Once your project is created:

1. Go to **Settings** → **API**
2. Copy and save the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`) - Keep this secret!

### Step 3: Install Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Windows (via scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# npm (all platforms)
npm install -g supabase

# Verify installation
supabase --version
```

### Step 4: Login to Supabase CLI

```bash
supabase login
```

This will open a browser window for authentication.

---

## Database Installation

### Option A: Using the Setup Script (Recommended)

```bash
# Make the script executable
chmod +x scripts/setup-database.sh

# Run the database setup
./scripts/setup-database.sh
```

### Option B: Manual SQL Execution

1. Go to your Supabase Dashboard → **SQL Editor**
2. Copy and paste the contents of `scripts/database-schema.sql`
3. Click **"Run"**

### Option C: Using Supabase CLI

```bash
# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# Push the database schema
supabase db push
```

---

## Edge Functions Deployment

### Option A: Using the Deployment Script (Recommended)

```bash
# Make the script executable
chmod +x scripts/deploy-functions.sh

# Deploy all edge functions
./scripts/deploy-functions.sh
```

### Option B: Manual Deployment

```bash
# Link your project first
supabase link --project-ref YOUR_PROJECT_REF

# Deploy each function individually
supabase functions deploy retell-create-call --no-verify-jwt
supabase functions deploy retell-text-chat --no-verify-jwt
supabase functions deploy widget-config --no-verify-jwt
supabase functions deploy widget-embed --no-verify-jwt
supabase functions deploy wordpress-plugin --no-verify-jwt
```

### Setting Edge Function Secrets

```bash
# Set required secrets
supabase secrets set RETELL_API_KEY=your_retell_api_key
supabase secrets set RETELL_AGENT_ID=your_voice_agent_id
supabase secrets set RETELL_TEXT_AGENT_ID=your_chat_agent_id
```

---

## Environment Configuration

### Create your .env file

Create a `.env` file in the project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
VITE_SUPABASE_PROJECT_ID=your_project_ref

# Optional: Retell AI (if using globally)
VITE_RETELL_API_KEY=your_retell_api_key
```

### For Vercel Deployment

Add these environment variables in your Vercel project settings:

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon/public key |
| `VITE_SUPABASE_PROJECT_ID` | Your Supabase project reference |

---

## Vercel Deployment

### Option A: Deploy via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New Project"**
3. Import your Git repository
4. Configure the project:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add environment variables (see above)
6. Click **"Deploy"**

### Option B: Deploy via CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### Vercel Configuration

Create `vercel.json` in your project root (if not exists):

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## Post-Deployment Setup

### 1. Create Your First Admin User

1. Go to your deployed app and sign up with your email
2. In Supabase Dashboard, go to **SQL Editor**
3. Run the following SQL to make yourself an admin:

```sql
-- Replace 'your-email@example.com' with your actual email
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'your-email@example.com';
```

### 2. Configure Global Settings

1. Log in to your app as an admin
2. Go to **Admin Settings**
3. Configure your Retell API key and agent IDs

### 3. Create Demo Settings

```sql
-- Insert initial demo settings
INSERT INTO public.demo_settings (
  title,
  greeting,
  primary_color,
  enable_voice,
  enable_chat
) VALUES (
  'AI Assistant',
  'Hi there! 👋 How can I help you today?',
  '#14b8a6',
  true,
  true
);
```

### 4. Set Up Initial Global Settings

```sql
-- Insert initial global settings
INSERT INTO public.global_settings (
  min_password_length,
  require_uppercase,
  require_number,
  require_special_char,
  disable_public_signup
) VALUES (
  8,
  true,
  true,
  false,
  false
);
```

---

## Troubleshooting

### Common Issues

#### "Invalid API key" errors

- Verify your Supabase anon key is correct in `.env`
- Check that environment variables are set in Vercel

#### Edge functions not working

```bash
# Check function logs
supabase functions logs retell-create-call

# Redeploy functions
supabase functions deploy --all --no-verify-jwt
```

#### Database connection issues

- Verify your Supabase project is running
- Check RLS policies are correctly set up
- Ensure your service role key is set for edge functions

#### CORS errors

- Edge functions include CORS headers by default
- For custom domains, update `allowed_domains` in widget configs

### Getting Help

- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Retell AI Documentation](https://docs.retellai.com)

---

## Updating the Platform

To update to the latest version:

```bash
# Pull latest changes
git pull origin main

# Install any new dependencies
npm install

# Deploy database migrations (if any)
supabase db push

# Redeploy edge functions
./scripts/deploy-functions.sh

# Redeploy to Vercel
vercel --prod
```

---

## Security Considerations

1. **Never commit** `.env` files or API keys to version control
2. Keep your **service_role key** secret - only use in server-side code
3. Configure **allowed_domains** for production widgets
4. Enable **Row Level Security (RLS)** on all tables (already configured)
5. Use **strong passwords** for all admin accounts
6. Regularly **rotate API keys** for security

---

## License

This project is licensed under the MIT License. See `LICENSE` for details.
