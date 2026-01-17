# Easy Setup Guide 🚀

Deploy your own AI Widget Platform in 3 simple steps.

## Prerequisites

1.  **Node.js** installed ([Download](https://nodejs.org/))
2.  **Supabase CLI** installed:
    *   **Mac**: `brew install supabase/tap/supabase`
    *   **Windows**: `scoop install supabase` or `npm install -g supabase`
3.  **Supabase Account** ([Sign up](https://supabase.com)) -> Create a new empty project.

---

## Step 1: Setup Backend (Database & Functions)

Run this single command in your terminal from the project folder:

```bash
chmod +x scripts/easy-setup-supabase.sh
./scripts/easy-setup-supabase.sh
```

Follow the prompts to:
1.  Link your Supabase project.
2.  Automatically set up the database tables.
3.  Deploy the serverless functions.
4.  (Optional) Enter your Retell AI API keys.

At the end, the script will show you the **Environment Variables** you need for the next step.

## Step 2: Deploy Frontend (Vercel)

1.  Go to [Vercel](https://vercel.com) and click **Add New Project**.
2.  Import this repository.
3.  In the **Environment Variables** section, add the 3 variables shown at the end of Step 1:
    *   `VITE_SUPABASE_URL`
    *   `VITE_SUPABASE_PROJECT_ID`
    *   `VITE_SUPABASE_PUBLISHABLE_KEY` (Find this in Supabase Dashboard -> Settings -> API) - Your Supabase anon/public key
4.  Click **Deploy**.

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon/public key |
| `VITE_SUPABASE_PROJECT_ID` | Your Supabase project reference |


## Step 3: Create Admin User

1.  Visit your new Vercel App URL (e.g., `https://my-ai-widget.vercel.app`).
2.  **Sign up** with your email.
3.  🎉 **Success!** The first user is automatically granted Admin access.

---

### Troubleshooting

*   **Supabase Login Error**: Run `supabase login` manually if the script fails to authenticate.
*   **Missing Features**: Go to the **Admin Dashboard** in your app to configure Retell AI or specific settings later.
