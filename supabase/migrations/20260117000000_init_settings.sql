-- =============================================
-- Initialize Global and Demo Settings
-- =============================================
-- This migration auto-initializes the global_settings and demo_settings tables
-- with default values, eliminating the need for manual SQL execution.
-- The INSERT statements are idempotent - they only insert if no records exist.
-- =============================================

-- Initialize global settings (idempotent - only if not exists)
INSERT INTO public.global_settings (
  default_attribution_text,
  default_attribution_url,
  min_password_length,
  require_uppercase,
  require_number,
  require_special_char,
  disable_public_signup
)
SELECT
  'Powered By Antek Automation',
  'https://www.antekautomation.com',
  8,
  true,
  true,
  false,
  false
WHERE NOT EXISTS (SELECT 1 FROM public.global_settings LIMIT 1);

-- Initialize demo settings (idempotent - only if not exists)
INSERT INTO public.demo_settings (
  title,
  greeting,
  enable_voice,
  enable_chat,
  primary_color,
  secondary_color,
  background_color,
  text_color,
  button_text_color,
  attribution_text,
  attribution_url,
  chat_type
)
SELECT
  'AI Assistant',
  'Hi there! 👋 How can I help you today?',
  true,
  true,
  '#14b8a6',
  '#f3f4f6',
  '#ffffff',
  '#1f2937',
  '#ffffff',
  'Powered By Antek Automation',
  'https://www.antekautomation.com',
  'retell'
WHERE NOT EXISTS (SELECT 1 FROM public.demo_settings LIMIT 1);
