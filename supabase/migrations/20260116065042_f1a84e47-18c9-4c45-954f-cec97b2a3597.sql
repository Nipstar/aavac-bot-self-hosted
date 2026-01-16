-- Fix security: Remove public access to sensitive columns in widget_configs
DROP POLICY IF EXISTS "Public can view widgets by api_key" ON public.widget_configs;

-- Create a secure function to get only non-sensitive widget config data by api_key
CREATE OR REPLACE FUNCTION public.get_widget_display_config(widget_api_key text)
RETURNS TABLE (
  widget_title text,
  widget_greeting text,
  widget_enable_voice boolean,
  widget_enable_chat boolean,
  widget_primary_color text,
  widget_position text,
  widget_attribution_link text,
  widget_attribution_text text,
  widget_chat_type text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.title,
    w.greeting,
    w.enable_voice,
    w.enable_chat,
    w.primary_color,
    w.position,
    w.attribution_link,
    w.attribution_text,
    w.chat_type
  FROM widget_configs w
  WHERE w.api_key = widget_api_key;
END;
$$;

-- Fix security: Remove public access to demo_settings sensitive data
DROP POLICY IF EXISTS "Public can view demo settings" ON public.demo_settings;

-- Create a secure function to get only non-sensitive demo settings
CREATE OR REPLACE FUNCTION public.get_demo_display_settings()
RETURNS TABLE (
  demo_title text,
  demo_greeting text,
  demo_enable_voice boolean,
  demo_enable_chat boolean,
  demo_primary_color text,
  demo_attribution_text text,
  demo_attribution_url text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.title,
    d.greeting,
    d.enable_voice,
    d.enable_chat,
    d.primary_color,
    d.attribution_text,
    d.attribution_url
  FROM demo_settings d
  LIMIT 1;
END;
$$;

-- Fix security: Remove public access to global_settings
DROP POLICY IF EXISTS "Public can read global settings" ON public.global_settings;