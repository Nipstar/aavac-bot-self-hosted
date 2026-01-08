-- Add attribution_link column to widget_configs
ALTER TABLE public.widget_configs ADD COLUMN IF NOT EXISTS attribution_link text DEFAULT 'https://aavacbot.com';

-- Drop the widget limit trigger since app is now free with unlimited widgets
DROP TRIGGER IF EXISTS enforce_widget_limit ON public.widget_configs;
DROP FUNCTION IF EXISTS public.check_widget_limit() CASCADE;