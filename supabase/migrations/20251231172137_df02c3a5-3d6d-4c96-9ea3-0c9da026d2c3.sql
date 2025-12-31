-- Fix the generate_widget_api_key function to have explicit search_path
CREATE OR REPLACE FUNCTION public.generate_widget_api_key()
RETURNS TEXT AS $$
BEGIN
  RETURN 'wgt_' || encode(gen_random_bytes(24), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;