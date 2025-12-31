import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RETELL_API_KEY = Deno.env.get('RETELL_API_KEY');
    const RETELL_TEXT_AGENT_ID = Deno.env.get('RETELL_TEXT_AGENT_ID');

    if (!RETELL_API_KEY) {
      console.error('RETELL_API_KEY is not configured');
      throw new Error('RETELL_API_KEY is not configured');
    }

    if (!RETELL_TEXT_AGENT_ID) {
      console.error('RETELL_TEXT_AGENT_ID is not configured');
      throw new Error('RETELL_TEXT_AGENT_ID is not configured');
    }

    const { message, conversation_id } = await req.json();

    if (!message) {
      throw new Error('Message is required');
    }

    console.log('Sending text message to agent:', RETELL_TEXT_AGENT_ID);

    // Create a text-based call/conversation with Retell
    const response = await fetch("https://api.retellai.com/v2/create-web-call", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RETELL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agent_id: RETELL_TEXT_AGENT_ID,
        metadata: {
          conversation_id: conversation_id,
          input_text: message,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Retell API error:', response.status, errorText);
      throw new Error(`Failed to send message: ${response.status}`);
    }

    const data = await response.json();
    console.log('Text call created successfully');

    return new Response(JSON.stringify({ 
      access_token: data.access_token,
      call_id: data.call_id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in retell-text-chat function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
