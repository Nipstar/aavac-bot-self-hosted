# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI Widget Platform for deploying voice and chat widgets powered by Retell AI. It's a full-stack application with a React/Vite frontend and Supabase backend, designed to be self-hosted on Vercel (frontend) and Supabase (backend). The platform supports multi-tenancy with teams, whitelabel branding, and embeddable widgets.

## Development Commands

```bash
# Development
npm run dev          # Start dev server on http://[::]:8080
npm run build        # Production build
npm run build:dev    # Development build with source maps
npm run preview      # Preview production build
npm run lint         # Run ESLint

# Database
supabase link --project-ref YOUR_PROJECT_REF
supabase db push     # Apply database migrations

# Edge Functions
./scripts/deploy-functions.sh                      # Deploy all edge functions
supabase functions deploy retell-create-call       # Deploy individual function
supabase functions logs retell-create-call         # View function logs
supabase secrets set RETELL_API_KEY=your_key       # Set edge function secrets

# Deployment
vercel --prod        # Deploy to Vercel
```

## Architecture

### Frontend Architecture

- **Framework**: React 18 + TypeScript + Vite
- **Routing**: React Router v6 with protected routes
- **State Management**:
  - React Context for auth (`AuthContext`)
  - TanStack Query for server state
  - Local state with hooks
- **Styling**: Tailwind CSS + shadcn/ui components
- **Path Aliases**: `@/` maps to `./src/`

### Backend Architecture

- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth with role-based access control
- **Edge Functions**: Deno-based serverless functions for:
  - `retell-create-call` - Initiate voice calls via Retell AI
  - `retell-text-chat` - Handle chat interactions
  - `widget-config` - Serve widget configuration
  - `widget-embed` - Serve embeddable widget code
  - `wordpress-plugin` - WordPress integration

### Data Model

Key database tables:
- `profiles` - User profiles linked to auth.users
- `user_roles` - Role assignments (admin/moderator/user)
- `teams` - Team/organization records
- `team_members` - Team membership and roles
- `team_invitations` - Pending team invitations
- `global_settings` - Platform-wide settings (Retell API keys, defaults)
- `demo_settings` - Public demo widget settings
- `widget_configs` - Embeddable widget configurations with API keys

All tables use Row Level Security (RLS) policies.

### Authentication Flow

1. User signs up/signs in via `AuthContext`
2. `AuthContext` subscribes to Supabase auth state changes
3. On auth change, fetches user profile from `profiles` table
4. Profile data includes subscription tier and metadata
5. Routes check auth state via `useAuth()` hook
6. Admin routes check `user_roles` table for admin role

### Widget System

Widgets can be configured in three modes:
1. **Demo Mode** (`is_demo: true`) - Uses `demo_settings` table
2. **Widget Mode** (`api_key: string`) - Uses `widget_configs` table
3. **Global Fallback** - Uses `global_settings` table

The edge functions cascade through these configurations to find Retell API credentials.

## Key Files and Locations

### Entry Points
- `src/main.tsx` - Application entry point
- `src/App.tsx` - Root component with routing setup
- `index.html` - HTML template

### Pages (src/pages/)
- `Home.tsx` - Landing page with demo widget
- `Auth.tsx` - Login/signup page
- `Dashboard.tsx` - Main user dashboard (widget list)
- `WidgetSettings.tsx` - Widget configuration editor
- `AdminSettings.tsx` - Admin panel for global settings
- `Settings.tsx` - User account settings
- `Embed.tsx` - Widget embed code viewer

### Core Components (src/components/)
- `VoiceWidget.tsx` - Main voice widget UI (inline)
- `FloatingVoiceWidget.tsx` - Floating voice widget button
- `WhitelabelSettings.tsx` - Whitelabel branding form
- `TeamManagement.tsx` - Team member management UI
- `ui/` - shadcn/ui components (auto-generated)

### Configuration
- `vite.config.ts` - Vite bundler config
- `tailwind.config.ts` - Tailwind CSS config
- `components.json` - shadcn/ui configuration
- `.env.example` - Environment variable template
- `vercel.json` - Vercel deployment config

### Database
- `scripts/database-schema.sql` - Complete database schema
- `supabase/migrations/` - Database migration history

## Environment Variables

Required for frontend:
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SUPABASE_PROJECT_ID=xxx
```

Required for edge functions (set via `supabase secrets set`):
```
RETELL_API_KEY=your_key
RETELL_AGENT_ID=voice_agent_id
RETELL_TEXT_AGENT_ID=chat_agent_id
```

## Common Patterns

### Adding a New Page
1. Create component in `src/pages/`
2. Add route in `src/App.tsx` (before the `*` catch-all route)
3. Optionally add to navigation in relevant components

### Creating a New Widget Setting
1. Add column to `widget_configs` or `demo_settings` table via migration
2. Update types in `src/integrations/supabase/types.ts`
3. Add form field in `WidgetSettings.tsx` or `AdminSettings.tsx`
4. Update edge function logic if needed

### Adding an Edge Function
1. Create in `supabase/functions/<function-name>/index.ts`
2. Deploy with `supabase functions deploy <function-name> --no-verify-jwt`
3. Set any required secrets with `supabase secrets set`
4. Add CORS headers for browser requests

### Using Supabase Client
```typescript
import { supabase } from "@/integrations/supabase/client";

// Query with RLS
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('column', value);

// Use with TanStack Query
const { data } = useQuery({
  queryKey: ['key'],
  queryFn: async () => {
    const { data } = await supabase.from('table').select();
    return data;
  }
});
```

### Authentication Checks
```typescript
import { useAuth } from "@/contexts/AuthContext";

const { user, session, profile, loading } = useAuth();

// Redirect if not authenticated
useEffect(() => {
  if (!loading && !user) {
    navigate('/auth');
  }
}, [user, loading]);
```

## Important Notes

- **TypeScript Config**: Strict type checking is disabled (`noImplicitAny: false`, `strictNullChecks: false`) - this is intentional for rapid development
- **Component Library**: Uses shadcn/ui - components are copied into `src/components/ui/` and can be customized
- **Retell SDK**: The `retell-client-js-sdk` package is used for voice widget functionality
- **Database Migrations**: Always use migrations for schema changes, never edit the schema SQL directly
- **Row Level Security**: All database operations go through RLS policies - test with different user roles
- **Edge Function CORS**: All edge functions must include CORS headers for browser access
- **Widget Embedding**: Widgets are embedded via iframe with configuration passed via query params or postMessage
- **Development Port**: Dev server runs on port 8080 (not the default 5173)

## Deployment Checklist

1. Ensure `.env` variables are set in Vercel
2. Deploy edge functions: `./scripts/deploy-functions.sh`
3. Set edge function secrets: `supabase secrets set RETELL_API_KEY=...`
4. Run database migrations: `supabase db push`
5. Deploy frontend: `vercel --prod`
6. Create admin user via SQL (see SELF-HOSTING.md)
7. Configure global settings via admin panel
