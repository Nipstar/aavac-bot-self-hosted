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
    let retellApiKey = Deno.env.get('RETELL_API_KEY');
    let retellTextAgentId = Deno.env.get('RETELL_TEXT_AGENT_ID');

    const { message, chat_id, api_key: widgetApiKey } = await req.json();

    // Check if api_key is provided to fetch widget-specific config
    if (widgetApiKey) {
      console.log('Fetching widget config for api_key:', widgetApiKey.substring(0, 10) + '...');
      
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: widget, error } = await supabase
        .from('widget_configs')
        .select('retell_api_key, chat_agent_id')
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
        if (widget.chat_agent_id) {
          retellTextAgentId = widget.chat_agent_id;
          console.log('Using widget-specific chat agent ID:', retellTextAgentId);
        }
      }
    }

    if (!retellApiKey) {
      console.error('RETELL_API_KEY is not configured');
      throw new Error('RETELL_API_KEY is not configured');
    }

    if (!retellTextAgentId) {
      console.error('RETELL_TEXT_AGENT_ID is not configured');
      throw new Error('RETELL_TEXT_AGENT_ID is not configured');
    }

    if (!message) {
      throw new Error('Message is required');
    }

    let currentChatId = chat_id;

    // If no chat_id, create a new chat session first
    if (!currentChatId) {
      console.log('Creating new chat session with agent:', retellTextAgentId);
      
      const createChatResponse = await fetch("https://api.retellai.com/create-chat", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${retellApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: retellTextAgentId,
        }),
      });

      if (!createChatResponse.ok) {
        const errorText = await createChatResponse.text();
        console.error('Retell create-chat error:', createChatResponse.status, errorText);
        throw new Error(`Failed to create chat session: ${createChatResponse.status}`);
      }

      const chatData = await createChatResponse.json();
      currentChatId = chatData.chat_id;
      console.log('Chat session created:', currentChatId);
    }

    // Now send the message using the chat_id
    console.log('Sending message to chat:', currentChatId);
    
    const completionResponse = await fetch("https://api.retellai.com/create-chat-completion", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${retellApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: currentChatId,
        content: message,
      }),
    });

    if (!completionResponse.ok) {
      const errorText = await completionResponse.text();
      console.error('Retell completion error:', completionResponse.status, errorText);
      throw new Error(`Failed to send message: ${completionResponse.status}`);
    }

    const completionData = await completionResponse.json();
    console.log('Chat completion response received');

    // Extract the latest agent message
    const messages = completionData.messages || [];
    const agentMessages = messages.filter((m: { role: string }) => m.role === 'agent');
    const latestAgentMessage = agentMessages.length > 0 
      ? agentMessages[agentMessages.length - 1].content 
      : '';

    return new Response(JSON.stringify({ 
      response: latestAgentMessage,
      chat_id: currentChatId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in retell-text-chat function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
