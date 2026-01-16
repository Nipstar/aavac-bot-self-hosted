-- Add more color customization fields to widget_configs
ALTER TABLE public.widget_configs 
ADD COLUMN IF NOT EXISTS background_color text DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS text_color text DEFAULT '#1f2937',
ADD COLUMN IF NOT EXISTS secondary_color text DEFAULT '#f3f4f6',
ADD COLUMN IF NOT EXISTS button_text_color text DEFAULT '#ffffff';

-- Add color customization to demo_settings
ALTER TABLE public.demo_settings
ADD COLUMN IF NOT EXISTS background_color text DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS text_color text DEFAULT '#1f2937',
ADD COLUMN IF NOT EXISTS secondary_color text DEFAULT '#f3f4f6',
ADD COLUMN IF NOT EXISTS button_text_color text DEFAULT '#ffffff';

-- Add default colors and signup control to global_settings
ALTER TABLE public.global_settings
ADD COLUMN IF NOT EXISTS default_background_color text DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS default_text_color text DEFAULT '#1f2937',
ADD COLUMN IF NOT EXISTS default_secondary_color text DEFAULT '#f3f4f6',
ADD COLUMN IF NOT EXISTS default_button_text_color text DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS disable_public_signup boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS min_password_length integer DEFAULT 8,
ADD COLUMN IF NOT EXISTS require_uppercase boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS require_number boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS require_special_char boolean DEFAULT false;