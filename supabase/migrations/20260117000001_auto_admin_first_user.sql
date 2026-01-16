-- =============================================
-- Auto-Assign Admin Role to First User
-- =============================================
-- This migration creates a database trigger that automatically assigns
-- the admin role to the first user who signs up. This eliminates the need
-- for manual SQL execution to create the initial admin user.
--
-- Security Note: After the first admin is created, you can enable
-- disable_public_signup in global_settings to prevent additional signups.
-- =============================================

-- Function to auto-assign admin role to first user
CREATE OR REPLACE FUNCTION public.auto_assign_admin_to_first_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Count existing users
  SELECT COUNT(*) INTO user_count FROM auth.users;

  -- If this is the first user (count will be 1 after insert), make them admin
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    RAISE LOG 'Auto-assigned admin role to first user: %', NEW.email;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-assign admin role
-- This runs AFTER a new user is inserted into auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_admin_to_first_user();
