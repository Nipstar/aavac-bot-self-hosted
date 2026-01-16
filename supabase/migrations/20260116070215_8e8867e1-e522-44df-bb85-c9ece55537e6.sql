-- Drop existing functions to recreate with new return types
DROP FUNCTION IF EXISTS public.get_demo_display_settings();
DROP FUNCTION IF EXISTS public.get_widget_display_config(text);

-- Create get_demo_display_settings function with all color fields
CREATE FUNCTION public.get_demo_display_settings()
RETURNS TABLE (
  demo_title text,
  demo_greeting text,
  demo_enable_voice boolean,
  demo_enable_chat boolean,
  demo_primary_color text,
  demo_background_color text,
  demo_text_color text,
  demo_secondary_color text,
  demo_button_text_color text,
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
    d.background_color,
    d.text_color,
    d.secondary_color,
    d.button_text_color,
    d.attribution_text,
    d.attribution_url
  FROM demo_settings d
  LIMIT 1;
END;
$$;

-- Create get_widget_display_config function with all color fields
CREATE FUNCTION public.get_widget_display_config(widget_api_key text)
RETURNS TABLE (
  widget_title text,
  widget_greeting text,
  widget_enable_voice boolean,
  widget_enable_chat boolean,
  widget_primary_color text,
  widget_background_color text,
  widget_text_color text,
  widget_secondary_color text,
  widget_button_text_color text,
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
    w.background_color,
    w.text_color,
    w.secondary_color,
    w.button_text_color,
    w.position,
    w.attribution_link,
    w.attribution_text,
    w.chat_type
  FROM widget_configs w
  WHERE w.api_key = widget_api_key;
END;
$$;