import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let retellApiKey = Deno.env.get('RETELL_API_KEY');
    let retellAgentId = Deno.env.get('RETELL_AGENT_ID');

    // Check if api_key is provided to fetch widget-specific config
    const body = await req.json().catch(() => ({}));
    const widgetApiKey = body.api_key;

    if (widgetApiKey) {
      console.log('Fetching widget config for api_key:', widgetApiKey.substring(0, 10) + '...');
      
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: widget, error } = await supabase
        .from('widget_configs')
        .select('retell_api_key, voice_agent_id')
        .eq('api_key', widgetApiKey)
        .single();

      if (error) {
        console.error('Error fetching widget config:', error);
      } else if (widget) {
        // Use widget-specific keys if available
        if (widget.retell_api_key) {
          retellApiKey = widget.retell_api_key;
          console.log('Using widget-specific Retell API key');
        }
        if (widget.voice_agent_id) {
          retellAgentId = widget.voice_agent_id;
          console.log('Using widget-specific voice agent ID:', retellAgentId);
        }
      }
    }

    if (!retellApiKey) {
      console.error('RETELL_API_KEY is not configured');
      throw new Error('RETELL_API_KEY is not configured');
    }

    if (!retellAgentId) {
      console.error('RETELL_AGENT_ID is not configured');
      throw new Error('RETELL_AGENT_ID is not configured');
    }

    console.log('Creating web call with agent:', retellAgentId);

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
      throw new Error(`Failed to create call: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('Web call created successfully');

    return new Response(JSON.stringify({ access_token: data.access_token }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in retell-create-call function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
