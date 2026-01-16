-- Create global_settings table for platform-wide configuration
CREATE TABLE IF NOT EXISTS public.global_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  retell_api_key text,
  default_voice_agent_id text,
  default_chat_agent_id text,
  default_attribution_text text DEFAULT 'Powered By Antek Automation',
  default_attribution_url text DEFAULT 'https://www.antekautomation.com',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

-- Enable RLS on global_settings
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage global settings
CREATE POLICY "Admins can manage global settings"
ON public.global_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Public can read global settings (for widget defaults)
CREATE POLICY "Public can read global settings"
ON public.global_settings
FOR SELECT
USING (true);

-- Insert default row
INSERT INTO public.global_settings (id) VALUES (gen_random_uuid());

-- Add chat_type and webhook_url to widget_configs
ALTER TABLE public.widget_configs 
ADD COLUMN IF NOT EXISTS chat_type text DEFAULT 'retell',
ADD COLUMN IF NOT EXISTS webhook_url text,
ADD COLUMN IF NOT EXISTS attribution_text text DEFAULT 'Powered By Antek Automation';

-- Update default attribution_link to Antek Automation
ALTER TABLE public.widget_configs 
ALTER COLUMN attribution_link SET DEFAULT 'https://www.antekautomation.com';

-- Add chat_type and webhook fields to demo_settings
ALTER TABLE public.demo_settings
ADD COLUMN IF NOT EXISTS chat_type text DEFAULT 'retell',
ADD COLUMN IF NOT EXISTS webhook_url text,
ADD COLUMN IF NOT EXISTS attribution_text text DEFAULT 'Powered By Antek Automation',
ADD COLUMN IF NOT EXISTS attribution_url text DEFAULT 'https://www.antekautomation.com';