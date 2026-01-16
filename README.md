# AI Widget Platform - Self-Hosted

Deploy your own AI voice and chat widget platform powered by Retell AI on Vercel and Supabase.

## ✨ Features

- 🎤 **Voice Widgets** - AI-powered voice calls via Retell AI
- 💬 **Chat Widgets** - Text-based AI chat interactions
- 🎨 **Whitelabel Branding** - Customize colors, logos, and attribution
- 👥 **Team Management** - Multi-user support with roles
- 🔌 **Easy Embedding** - Drop-in widgets for any website
- 🔒 **Secure** - Row-level security with Supabase
- ⚡ **Fast** - React + Vite + shadcn/ui

---

## 🚀 Quick Deploy (Recommended)

### Prerequisites (5 minutes)

Before deploying, you need:

1. **Supabase Account** - [Sign up free](https://supabase.com)
   - Create a new project
   - Save your Project URL, Anon Key, and Project Reference

2. **Retell AI Account** - [Sign up](https://retellai.com)
   - Create voice and chat agents
   - Get your API key and agent IDs

### One-Click Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FYOUR_USERNAME%2FYOUR_REPO&project-name=ai-widget-platform&repository-name=ai-widget-platform)

**After clicking Deploy:**

1. Vercel will fork the repository to your GitHub account
2. Wait for the initial deployment to complete
3. Go to your Vercel project → Settings → Environment Variables
4. Add these three variables:
   - `VITE_SUPABASE_URL` = Your Supabase project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = Your Supabase anon key
   - `VITE_SUPABASE_PROJECT_ID` = Your Supabase project reference
5. Redeploy the project for env vars to take effect
6. Continue to Post-Deployment Setup below

### Post-Deployment Setup (Required)

After Vercel deployment completes, run this automated setup:

```bash
# Clone your deployed repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO
cd YOUR_REPO

# Install dependencies
npm install

# Run automated post-deployment script
npm run setup:production
```

This script will:
- ✅ Set up database schema automatically
- ✅ Deploy edge functions to Supabase
- ✅ Configure Supabase secrets
- ✅ Initialize demo and global settings
- ✅ Set up auto-admin for first user
- ✅ Validate entire deployment

**Finally:**
1. Visit your Vercel deployment URL
2. Sign up with your email
3. You'll automatically have admin access! 🎉

**That's it!** Your deployment is complete.

Run `npm run health:check` to validate everything is working correctly.

---

## 🛠️ For Technical Users: Full CLI Setup

If you prefer complete control, use the interactive setup wizard:

```bash
git clone YOUR_REPO
cd YOUR_REPO

# Run interactive setup (handles everything)
npm run setup

# Or run steps individually:
npm install                 # Install dependencies
npm run setup               # Interactive guided setup
npm run deploy:functions    # Deploy edge functions
npm run sync:env            # Sync environment variables
npm run health:check        # Validate deployment
```

The `npm run setup` command will interactively guide you through:
- Supabase configuration
- Database setup (automatic via migrations)
- Edge function deployment
- Retell AI configuration
- Environment variable setup

---

## 📋 What Gets Automated

### ✅ Fully Automated
- Database schema application
- Demo and global settings initialization
- First admin user creation (auto-assigned on signup)
- Edge function deployment
- Secret configuration

### ⚙️ Requires User Input
- Supabase credentials (project URL, anon key)
- Retell AI credentials (API key, agent IDs)
- Admin email for first signup

### 📝 Manual Steps (One-Time)
- Supabase project creation (via dashboard)
- Retell AI account creation
- Vercel deployment (one-click or CLI)

---

## 🧪 Available Commands

```bash
npm run dev                  # Start development server (localhost:8080)
npm run build                # Production build
npm run preview              # Preview production build

npm run setup                # Interactive guided setup
npm run setup:production     # Post-deployment automation
npm run deploy:functions     # Deploy edge functions to Supabase
npm run sync:env             # Sync .env to Vercel and Supabase
npm run health:check         # Validate deployment health
```

---

## 📁 Project Structure

```
├── src/
│   ├── components/          # React components
│   │   ├── ui/              # shadcn/ui components
│   │   ├── VoiceWidget.tsx  # Main voice widget
│   │   └── ...
│   ├── pages/               # Page components (routes)
│   ├── contexts/            # React contexts (AuthContext)
│   ├── hooks/               # Custom React hooks
│   ├── integrations/        # Supabase client & types
│   └── lib/                 # Utilities
├── supabase/
│   ├── functions/           # Edge functions (Deno)
│   └── migrations/          # Database migrations
├── scripts/
│   ├── setup.sh             # Interactive setup wizard
│   ├── post-deploy.sh       # Post-deployment automation
│   ├── deploy-functions.sh  # Edge function deployment
│   ├── sync-env.sh          # Environment sync script
│   └── health-check.sh      # Deployment validation
├── public/                  # Static assets
└── ...config files
```

---

## 🔧 Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Library**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Deployment**: Vercel (frontend) + Supabase (backend)
- **Voice/Chat**: Retell AI
- **State Management**: TanStack Query + React Context

---

## 📚 Documentation

- **[SELF-HOSTING.md](./SELF-HOSTING.md)** - Complete self-hosting guide with detailed instructions
- **[CLAUDE.md](./CLAUDE.md)** - Architecture and development guide for contributors

---

## 🔐 Security

- ✅ Row Level Security (RLS) on all database tables
- ✅ Supabase Auth for user management
- ✅ Environment variables for sensitive data
- ✅ Auto-admin only for first user (prevents unauthorized access)
- ✅ CORS configured for edge functions

**Security Best Practices:**
- Never commit `.env` files to version control
- Keep your Supabase service role key secret
- Rotate API keys regularly
- Enable `disable_public_signup` after creating admin user (optional)

---

## 🐛 Troubleshooting

### "Invalid API key" errors
- Verify your Supabase anon key in `.env` and Vercel environment variables
- Check that environment variables are set correctly in Vercel dashboard

### Edge functions not working
```bash
# Check function logs
supabase functions logs retell-create-call

# Redeploy functions
npm run deploy:functions
```

### Database connection issues
- Verify your Supabase project is running
- Check RLS policies are correctly configured
- Ensure migrations were applied: `supabase db push`

### Health check failing
```bash
npm run health:check  # Run validation script
```

Common fixes:
- `supabase login` - Log in to Supabase CLI
- `supabase db push` - Apply database migrations
- `npm run deploy:functions` - Deploy edge functions
- `cp .env.example .env` - Create .env file

---

## 🆘 Getting Help

- **Documentation**: See [SELF-HOSTING.md](./SELF-HOSTING.md)
- **Supabase Docs**: https://supabase.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Retell AI Docs**: https://docs.retellai.com

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

Built with:
- [Lovable](https://lovable.dev) - AI-powered web development
- [Supabase](https://supabase.com) - Backend as a service
- [Vercel](https://vercel.com) - Deployment platform
- [Retell AI](https://retellai.com) - Voice AI infrastructure
- [shadcn/ui](https://ui.shadcn.com) - UI component library

---

**Ready to deploy?** Click the Deploy to Vercel button above and follow the setup instructions! 🚀
