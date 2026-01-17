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

## 🚀 Quick Deploy (3 Steps)

### Prerequisites

Before deploying, you need:

1. **Node.js** installed - [Download](https://nodejs.org/)
2. **Supabase CLI** installed:
   - **Mac**: `brew install supabase/tap/supabase`
   - **Windows**: `scoop install supabase` or `npm install -g supabase`
3. **Supabase Account** - [Sign up](https://supabase.com) → Create a new empty project
4. **Retell AI Account** (optional) - [Sign up](https://retellai.com) for voice/chat agents

---

## Step 1: Setup Backend (Database & Functions)

Clone the repository and run the setup script:

```bash
# Clone and navigate to the project
git clone <your-repo-url>
cd <project-folder>

# Install dependencies
npm install

# Run the backend setup script
chmod +x scripts/easy-setup-supabase.sh
./scripts/easy-setup-supabase.sh
```

The script will guide you through:
1. Linking your Supabase project
2. Setting up database tables automatically
3. Deploying serverless functions
4. (Optional) Configuring Retell AI API keys

**Save the environment variables shown at the end** - you'll need them for Step 2.

---

## Step 2: Deploy Frontend (Vercel)

1. Go to [Vercel](https://vercel.com) and click **Add New Project**
2. Import this repository from GitHub
3. In the **Environment Variables** section, add these 3 variables from Step 1:
   - `VITE_SUPABASE_URL` - Your Supabase project URL
   - `VITE_SUPABASE_PROJECT_ID` - Your project reference
   - `VITE_SUPABASE_PUBLISHABLE_KEY` - Your Supabase anon key (Dashboard → Settings → API)
4. Click **Deploy**

---

## Step 3: Create Admin User

1. Visit your new Vercel deployment URL (e.g., `https://your-app.vercel.app`)
2. Click **Sign up** and create an account with your email
3. 🎉 **Success!** The first user is automatically granted Admin access

---

## 🎛️ Configuration

After deployment, log in to your app and:

1. **Admin Dashboard** - Configure global Retell AI settings at `/admin`
2. **Create Widgets** - Set up custom widgets with unique API keys
3. **Team Management** - Invite team members and manage roles
4. **Whitelabel Branding** - Customize colors, logos, and attribution

---

## 📁 Project Structure

```
├── src/
│   ├── components/          # React components
│   │   ├── ui/              # shadcn/ui components
│   │   ├── VoiceWidget.tsx  # Main voice widget
│   │   └── FloatingVoiceWidget.tsx
│   ├── pages/               # Page components (routes)
│   ├── contexts/            # React contexts (AuthContext)
│   ├── hooks/               # Custom React hooks
│   ├── integrations/        # Supabase client & types
│   └── lib/                 # Utilities
├── supabase/
│   ├── functions/           # Edge functions (Deno)
│   └── migrations/          # Database migrations
├── scripts/
│   ├── easy-setup-supabase.sh  # Backend setup script
│   ├── deploy-functions.sh     # Deploy edge functions
│   └── health-check.sh         # Deployment validation
└── public/                  # Static assets
```

---

## 🧪 Development

```bash
# Start development server (http://localhost:8080)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
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

## 🐛 Troubleshooting

### Backend Setup Issues

**Supabase Login Error**: Run `supabase login` manually if the script fails to authenticate.

**Database Migration Failed**:
```bash
supabase db reset  # Reset local database (dev only)
supabase db push   # Reapply migrations
```

### Deployment Issues

**"Invalid API key" errors**:
- Verify environment variables in Vercel Dashboard → Settings → Environment Variables
- Ensure `VITE_SUPABASE_PUBLISHABLE_KEY` is the anon key (not service role key)

**Edge functions not working**:
```bash
# Check function logs
supabase functions logs retell-create-call

# Redeploy functions
npm run deploy:functions
```

**Health Check**:
```bash
# Validate entire deployment
npm run health:check
```

### Common Fixes

```bash
# Re-authenticate with Supabase
supabase login

# Re-link your project
supabase link --project-ref YOUR_PROJECT_REF

# Re-push database schema
supabase db push

# Re-deploy edge functions
npm run deploy:functions
```

---

## 📚 Additional Documentation

- **[EASY_SETUP.md](./EASY_SETUP.md)** - Step-by-step setup guide
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
- Configure allowed domains for production widgets

---

## 🆘 Getting Help

- **[Supabase Docs](https://supabase.com/docs)** - Backend documentation
- **[Vercel Docs](https://vercel.com/docs)** - Deployment documentation
- **[Retell AI Docs](https://docs.retellai.com)** - Voice AI documentation
- **[shadcn/ui](https://ui.shadcn.com)** - UI component library

---

## 🙏 Acknowledgments

Built with:
- [Supabase](https://supabase.com) - Backend as a service
- [Vercel](https://vercel.com) - Deployment platform
- [Retell AI](https://retellai.com) - Voice AI infrastructure
- [shadcn/ui](https://ui.shadcn.com) - UI component library

---

## 📄 License

This project is licensed under the MIT License.

---

**Ready to deploy?** Follow the 3-step guide above and you'll be live in minutes! 🚀
