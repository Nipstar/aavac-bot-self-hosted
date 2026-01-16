import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));

    // Input validation
    if (body.api_key && typeof body.api_key !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (body.is_demo !== undefined && typeof body.is_demo !== 'boolean') {
      return new Response(
        JSON.stringify({ error: 'Invalid request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let retellApiKey = Deno.env.get('RETELL_API_KEY');
    let retellAgentId = Deno.env.get('RETELL_AGENT_ID');

    const widgetApiKey = body.api_key;
    const isDemo = body.is_demo === true;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try global settings first as fallback
    const { data: globalSettings } = await supabase
      .from('global_settings')
      .select('retell_api_key, default_voice_agent_id')
      .limit(1)
      .maybeSingle();

    if (globalSettings) {
      if (globalSettings.retell_api_key) {
        retellApiKey = globalSettings.retell_api_key;
      }
      if (globalSettings.default_voice_agent_id) {
        retellAgentId = globalSettings.default_voice_agent_id;
      }
    }

    if (widgetApiKey) {
      console.log('Fetching widget config');

      const { data: widget, error } = await supabase
        .from('widget_configs')
        .select('retell_api_key, voice_agent_id')
        .eq('api_key', widgetApiKey)
        .single();

      if (error) {
        console.error('Error fetching widget config');
      } else if (widget) {
        if (widget.retell_api_key) {
          retellApiKey = widget.retell_api_key;
        }
        if (widget.voice_agent_id) {
          retellAgentId = widget.voice_agent_id;
        }
      }
    } else if (isDemo) {
      console.log('Fetching demo settings');
      const { data: demoSettings, error } = await supabase
        .from('demo_settings')
        .select('retell_api_key, voice_agent_id')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching demo settings');
      } else if (demoSettings) {
        if (demoSettings.retell_api_key) {
          retellApiKey = demoSettings.retell_api_key;
        }
        if (demoSettings.voice_agent_id) {
          retellAgentId = demoSettings.voice_agent_id;
        }
      }
    }

    if (!retellApiKey) {
      console.error('Retell API key not configured');
      return new Response(
        JSON.stringify({ error: 'Voice service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!retellAgentId) {
      console.error('Retell agent ID not configured');
      return new Response(
        JSON.stringify({ error: 'Voice service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating web call');

    const response = await fetch("https://api.retellai.com/v2/create-web-call", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${retellApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agent_id: retellAgentId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Retell API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Unable to start voice call. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Web call created successfully');

    return new Response(JSON.stringify({ access_token: data.access_token }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in retell-create-call function:', error);
    return new Response(
      JSON.stringify({ error: 'Service temporarily unavailable' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});