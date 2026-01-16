import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_MESSAGE_LENGTH = 4000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { message, chat_id, api_key: widgetApiKey, is_demo } = body;

    // Input validation
    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (chat_id && typeof chat_id !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid chat_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let retellApiKey = Deno.env.get('RETELL_API_KEY');
    let retellTextAgentId = Deno.env.get('RETELL_TEXT_AGENT_ID');
    let chatType = 'retell';
    let webhookUrl = '';

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try global settings first as fallback
    const { data: globalSettings } = await supabase
      .from('global_settings')
      .select('retell_api_key, default_chat_agent_id')
      .limit(1)
      .maybeSingle();

    if (globalSettings) {
      if (globalSettings.retell_api_key) {
        retellApiKey = globalSettings.retell_api_key;
      }
      if (globalSettings.default_chat_agent_id) {
        retellTextAgentId = globalSettings.default_chat_agent_id;
      }
    }

    // Check if api_key is provided to fetch widget-specific config
    if (widgetApiKey) {
      console.log('Fetching widget config');

      const { data: widget, error } = await supabase
        .from('widget_configs')
        .select('retell_api_key, chat_agent_id, chat_type, webhook_url')
        .eq('api_key', widgetApiKey)
        .single();

      if (error) {
        console.error('Error fetching widget config');
      } else if (widget) {
        if (widget.retell_api_key) {
          retellApiKey = widget.retell_api_key;
        }
        if (widget.chat_agent_id) {
          retellTextAgentId = widget.chat_agent_id;
        }
        if (widget.chat_type) {
          chatType = widget.chat_type;
        }
        if (widget.webhook_url) {
          webhookUrl = widget.webhook_url;
        }
      }
    } else if (is_demo) {
      console.log('Fetching demo settings');
      const { data: demoSettings, error } = await supabase
        .from('demo_settings')
        .select('retell_api_key, chat_agent_id, chat_type, webhook_url')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching demo settings');
      } else if (demoSettings) {
        if (demoSettings.retell_api_key) {
          retellApiKey = demoSettings.retell_api_key;
        }
        if (demoSettings.chat_agent_id) {
          retellTextAgentId = demoSettings.chat_agent_id;
        }
        if (demoSettings.chat_type) {
          chatType = demoSettings.chat_type;
        }
        if (demoSettings.webhook_url) {
          webhookUrl = demoSettings.webhook_url;
        }
      }
    }

    // Handle webhook chat type
    if (chatType === 'webhook' && webhookUrl) {
      console.log('Using webhook for chat');
      
      try {
        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, chat_id }),
        });

        if (!webhookResponse.ok) {
          console.error('Webhook error:', webhookResponse.status);
          return new Response(
            JSON.stringify({ error: 'Chat service temporarily unavailable' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const webhookData = await webhookResponse.json();
        return new Response(JSON.stringify({ 
          response: webhookData.response || webhookData.message || '',
          chat_id: webhookData.chat_id || chat_id,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (webhookError) {
        console.error('Webhook request failed:', webhookError);
        return new Response(
          JSON.stringify({ error: 'Chat service temporarily unavailable' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Use Retell for chat
    if (!retellApiKey) {
      console.error('Retell API key not configured');
      return new Response(
        JSON.stringify({ error: 'Chat service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!retellTextAgentId) {
      console.error('Retell text agent ID not configured');
      return new Response(
        JSON.stringify({ error: 'Chat service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let currentChatId = chat_id;

    // If no chat_id, create a new chat session first
    if (!currentChatId) {
      console.log('Creating new chat session');
      
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
        console.error('Retell create-chat error:', createChatResponse.status);
        return new Response(
          JSON.stringify({ error: 'Unable to start chat. Please try again.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const chatData = await createChatResponse.json();
      currentChatId = chatData.chat_id;
      console.log('Chat session created');
    }

    // Now send the message using the chat_id
    console.log('Sending message to chat');
    
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
      console.error('Retell completion error:', completionResponse.status);
      return new Response(
        JSON.stringify({ error: 'Unable to send message. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
    return new Response(
      JSON.stringify({ error: 'Service temporarily unavailable' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});