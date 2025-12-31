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

    const { message, chat_id } = await req.json();

    if (!message) {
      throw new Error('Message is required');
    }

    let currentChatId = chat_id;

    // If no chat_id, create a new chat session first
    if (!currentChatId) {
      console.log('Creating new chat session with agent:', RETELL_TEXT_AGENT_ID);
      
      const createChatResponse = await fetch("https://api.retellai.com/create-chat", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RETELL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: RETELL_TEXT_AGENT_ID,
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
        "Authorization": `Bearer ${RETELL_API_KEY}`,
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
