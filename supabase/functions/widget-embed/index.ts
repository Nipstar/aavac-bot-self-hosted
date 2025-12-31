import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// This endpoint serves the embeddable widget script
serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const apiKey = url.searchParams.get('api_key') || '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

  // Minified widget embed script
  const embedScript = `
(function() {
  var API_KEY = "${apiKey}";
  var BASE_URL = "${supabaseUrl}/functions/v1";
  
  // Fetch widget config
  fetch(BASE_URL + "/widget-config?api_key=" + API_KEY)
    .then(function(res) { return res.json(); })
    .then(function(config) {
      if (config.error) {
        console.error("RetellWidget: " + config.error);
        return;
      }
      initWidget(config);
    })
    .catch(function(err) {
      console.error("RetellWidget: Failed to load config", err);
    });

  function initWidget(config) {
    // Inject styles
    var style = document.createElement("style");
    style.textContent = \`
      .retell-widget-container { position: fixed; bottom: 24px; z-index: 999999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
      .retell-widget-container.bottom-right { right: 24px; }
      .retell-widget-container.bottom-left { left: 24px; }
      .retell-widget-btn { width: 56px; height: 56px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(0,0,0,0.2); transition: transform 0.2s, box-shadow 0.2s; }
      .retell-widget-btn:hover { transform: scale(1.05); box-shadow: 0 6px 25px rgba(0,0,0,0.25); }
      .retell-widget-btn svg { width: 24px; height: 24px; fill: white; }
      .retell-widget-panel { position: absolute; bottom: 70px; width: 360px; max-height: 500px; background: #1a1a2e; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); overflow: hidden; transition: opacity 0.3s, transform 0.3s; }
      .retell-widget-panel.bottom-right { right: 0; }
      .retell-widget-panel.bottom-left { left: 0; }
      .retell-widget-panel.hidden { opacity: 0; transform: translateY(10px); pointer-events: none; }
      .retell-widget-header { padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: space-between; }
      .retell-widget-header-info { display: flex; align-items: center; gap: 12px; }
      .retell-widget-avatar { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
      .retell-widget-avatar svg { width: 20px; height: 20px; }
      .retell-widget-title { font-weight: 600; color: white; font-size: 14px; }
      .retell-widget-status { font-size: 12px; color: rgba(255,255,255,0.6); }
      .retell-widget-close { background: none; border: none; padding: 8px; cursor: pointer; border-radius: 8px; transition: background 0.2s; }
      .retell-widget-close:hover { background: rgba(255,255,255,0.1); }
      .retell-widget-close svg { width: 20px; height: 20px; fill: rgba(255,255,255,0.6); }
      .retell-widget-messages { height: 320px; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
      .retell-widget-msg { max-width: 85%; padding: 12px; border-radius: 16px; font-size: 14px; line-height: 1.4; animation: retell-fade-in 0.3s; }
      .retell-widget-msg.user { margin-left: auto; border-bottom-right-radius: 4px; color: white; }
      .retell-widget-msg.agent { margin-right: auto; background: rgba(255,255,255,0.1); color: white; border-bottom-left-radius: 4px; }
      .retell-widget-input-area { padding: 12px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; gap: 8px; }
      .retell-widget-input { flex: 1; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; padding: 10px 16px; font-size: 14px; color: white; outline: none; }
      .retell-widget-input::placeholder { color: rgba(255,255,255,0.5); }
      .retell-widget-input:focus { border-color: rgba(255,255,255,0.4); }
      .retell-widget-send { background: none; border: none; padding: 10px; border-radius: 12px; cursor: pointer; transition: background 0.2s; }
      .retell-widget-send:hover { background: rgba(255,255,255,0.1); }
      .retell-widget-send:disabled { opacity: 0.5; cursor: not-allowed; }
      .retell-widget-send svg { width: 20px; height: 20px; }
      .retell-widget-typing { display: flex; gap: 4px; padding: 12px; }
      .retell-widget-typing span { width: 8px; height: 8px; background: rgba(255,255,255,0.4); border-radius: 50%; animation: retell-bounce 1.4s infinite; }
      .retell-widget-typing span:nth-child(2) { animation-delay: 0.2s; }
      .retell-widget-typing span:nth-child(3) { animation-delay: 0.4s; }
      @keyframes retell-fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes retell-bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-6px); } }
    \`;
    document.head.appendChild(style);

    // Create container
    var container = document.createElement("div");
    container.className = "retell-widget-container " + (config.position || "bottom-right");
    
    var primaryColor = config.primary_color || "#14b8a6";
    
    // Create panel
    var panel = document.createElement("div");
    panel.className = "retell-widget-panel " + (config.position || "bottom-right") + " hidden";
    panel.innerHTML = \`
      <div class="retell-widget-header">
        <div class="retell-widget-header-info">
          <div class="retell-widget-avatar" style="background:\${primaryColor}20">
            <svg viewBox="0 0 24 24" fill="\${primaryColor}"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
          </div>
          <div>
            <div class="retell-widget-title">\${config.title || "AI Assistant"}</div>
            <div class="retell-widget-status">Online now</div>
          </div>
        </div>
        <button class="retell-widget-close">
          <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
      </div>
      <div class="retell-widget-messages"></div>
      <div class="retell-widget-input-area">
        <input type="text" class="retell-widget-input" placeholder="Type a message...">
        <button class="retell-widget-send" style="background:\${primaryColor}">
          <svg viewBox="0 0 24 24" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
    \`;
    
    // Create toggle button
    var btn = document.createElement("button");
    btn.className = "retell-widget-btn";
    btn.style.background = primaryColor;
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
    
    container.appendChild(panel);
    container.appendChild(btn);
    document.body.appendChild(container);
    
    // State
    var isOpen = false;
    var chatId = null;
    var isSending = false;
    var messages = panel.querySelector(".retell-widget-messages");
    var input = panel.querySelector(".retell-widget-input");
    var sendBtn = panel.querySelector(".retell-widget-send");
    var closeBtn = panel.querySelector(".retell-widget-close");
    
    // Add greeting
    addMessage("agent", config.greeting || "Hi! How can I help you today?");
    
    // Toggle
    btn.onclick = function() {
      isOpen = !isOpen;
      panel.classList.toggle("hidden", !isOpen);
      btn.innerHTML = isOpen 
        ? '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>'
        : '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
      if (isOpen) input.focus();
    };
    
    closeBtn.onclick = function() {
      isOpen = false;
      panel.classList.add("hidden");
      btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
    };
    
    function addMessage(role, text) {
      var msg = document.createElement("div");
      msg.className = "retell-widget-msg " + role;
      if (role === "user") msg.style.background = primaryColor;
      msg.textContent = text;
      messages.appendChild(msg);
      messages.scrollTop = messages.scrollHeight;
    }
    
    function showTyping() {
      var typing = document.createElement("div");
      typing.className = "retell-widget-msg agent retell-widget-typing";
      typing.innerHTML = "<span></span><span></span><span></span>";
      messages.appendChild(typing);
      messages.scrollTop = messages.scrollHeight;
      return typing;
    }
    
    function sendMessage() {
      var text = input.value.trim();
      if (!text || isSending) return;
      
      addMessage("user", text);
      input.value = "";
      isSending = true;
      sendBtn.disabled = true;
      
      var typing = showTyping();
      
      fetch(BASE_URL + "/retell-text-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, chat_id: chatId })
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        typing.remove();
        if (data.chat_id) chatId = data.chat_id;
        if (data.response) addMessage("agent", data.response);
        if (data.error) addMessage("agent", "Sorry, something went wrong. Please try again.");
      })
      .catch(function() {
        typing.remove();
        addMessage("agent", "Sorry, I couldn't connect. Please try again.");
      })
      .finally(function() {
        isSending = false;
        sendBtn.disabled = false;
      });
    }
    
    sendBtn.onclick = sendMessage;
    input.onkeydown = function(e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    };
  }
})();
`;

  return new Response(embedScript, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=300',
    },
  });
});