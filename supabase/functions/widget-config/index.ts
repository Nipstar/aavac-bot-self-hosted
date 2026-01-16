import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const apiKey = url.searchParams.get('api_key');

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'api_key parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate API key format (wgt_ prefix + 48 hex chars)
    if (!/^wgt_[a-f0-9]{48}$/.test(apiKey)) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    // Use service role key to bypass RLS (public policy was removed for security)
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching widget config for api_key:', apiKey.substring(0, 10) + '...');

    // Only select the columns we need to return (no sensitive data)
    const { data, error } = await supabase
      .from('widget_configs')
      .select('id, title, greeting, primary_color, position, enable_voice, enable_chat, attribution_link, attribution_text, chat_type, allowed_domains')
      .eq('api_key', apiKey)
      .single();

    if (error || !data) {
      console.error('Widget config not found');
      return new Response(
        JSON.stringify({ error: 'Widget configuration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check allowed domains if configured
    const origin = req.headers.get('origin') || req.headers.get('referer') || '';
    if (data.allowed_domains && data.allowed_domains.length > 0) {
      const isAllowed = data.allowed_domains.some((domain: string) => 
        origin.includes(domain)
      );
      if (!isAllowed && origin) {
        console.warn('Domain not allowed');
        return new Response(
          JSON.stringify({ error: 'Domain not allowed' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('Returning widget config');

    // Return public config (exclude allowed_domains from response)
    const publicConfig = {
      id: data.id,
      title: data.title,
      greeting: data.greeting,
      primary_color: data.primary_color,
      position: data.position,
      enable_voice: data.enable_voice,
      enable_chat: data.enable_chat,
      attribution_link: data.attribution_link,
      attribution_text: data.attribution_text,
      chat_type: data.chat_type,
    };

    return new Response(
      JSON.stringify(publicConfig),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in widget-config function:', error);
    return new Response(
      JSON.stringify({ error: 'Service temporarily unavailable' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});