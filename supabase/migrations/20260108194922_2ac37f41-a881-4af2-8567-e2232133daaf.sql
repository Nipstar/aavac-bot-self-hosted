-- Update check_widget_limit to bypass for admins
CREATE OR REPLACE FUNCTION public.check_widget_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_tier TEXT;
  widget_count INTEGER;
  is_admin BOOLEAN;
BEGIN
  -- Check if user is admin (bypass all limits)
  SELECT public.has_role(NEW.user_id, 'admin'::app_role) INTO is_admin;
  IF is_admin THEN
    RETURN NEW;
  END IF;

  -- Get user's subscription tier
  SELECT subscription_tier INTO user_tier
  FROM public.profiles
  WHERE user_id = NEW.user_id;
  
  -- Count existing widgets
  SELECT COUNT(*) INTO widget_count
  FROM public.widget_configs
  WHERE user_id = NEW.user_id;
  
  -- Check limits: free = 1 widget, pro = unlimited
  IF user_tier = 'free' AND widget_count >= 1 THEN
    RAISE EXCEPTION 'Free tier is limited to 1 widget. Upgrade to Pro for unlimited widgets.';
  END IF;
  
  RETURN NEW;
END;
$$;