import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// This endpoint serves the embeddable widget script with voice and chat support
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

  // Widget embed script with voice and chat modes
  const embedScript = `
(function() {
  var API_KEY = "${apiKey}";
  var BASE_URL = "${supabaseUrl}/functions/v1";
  var retellClient = null;
  
  // Load Retell SDK
  var retellScript = document.createElement("script");
  retellScript.src = "https://unpkg.com/retell-client-js-sdk@2.0.7/dist/index.umd.js";
  retellScript.onload = function() {
    console.log("RetellWidget: SDK loaded");
  };
  document.head.appendChild(retellScript);
  
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
    var enableVoice = config.enable_voice !== false;
    var enableChat = config.enable_chat !== false;
    var currentMode = enableChat ? "chat" : "voice";
    var callState = "idle";
    var isAgentSpeaking = false;
    
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
      .retell-widget-mode-toggle { display: flex; padding: 8px 16px; gap: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); }
      .retell-widget-mode-btn { flex: 1; padding: 8px; border: none; border-radius: 8px; background: transparent; color: rgba(255,255,255,0.6); cursor: pointer; font-size: 13px; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; }
      .retell-widget-mode-btn.active { background: rgba(255,255,255,0.1); color: white; }
      .retell-widget-mode-btn:hover:not(.active) { background: rgba(255,255,255,0.05); }
      .retell-widget-mode-btn svg { width: 16px; height: 16px; fill: currentColor; }
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
      .retell-widget-voice-area { padding: 40px 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 320px; }
      .retell-widget-call-btn { width: 80px; height: 80px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.3s; }
      .retell-widget-call-btn svg { width: 32px; height: 32px; fill: white; }
      .retell-widget-call-btn:hover { transform: scale(1.05); }
      .retell-widget-call-btn.calling { animation: retell-pulse 1.5s infinite; }
      .retell-widget-call-btn.active { background: #ef4444 !important; }
      .retell-widget-call-status { margin-top: 16px; color: rgba(255,255,255,0.8); font-size: 14px; text-align: center; }
      .retell-widget-visualizer { display: flex; align-items: center; justify-content: center; gap: 4px; height: 40px; margin-top: 20px; }
      .retell-widget-bar { width: 4px; background: white; border-radius: 2px; transition: height 0.1s; }
      @keyframes retell-fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes retell-bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-6px); } }
      @keyframes retell-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(20, 184, 166, 0.4); } 50% { box-shadow: 0 0 0 15px rgba(20, 184, 166, 0); } }
    \`;
    document.head.appendChild(style);

    // Create container
    var container = document.createElement("div");
    container.className = "retell-widget-container " + (config.position || "bottom-right");
    
    var primaryColor = config.primary_color || "#14b8a6";
    
    // Build mode toggle HTML
    var modeToggleHtml = "";
    if (enableVoice && enableChat) {
      modeToggleHtml = \`
        <div class="retell-widget-mode-toggle">
          <button class="retell-widget-mode-btn \${currentMode === 'chat' ? 'active' : ''}" data-mode="chat">
            <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
            Chat
          </button>
          <button class="retell-widget-mode-btn \${currentMode === 'voice' ? 'active' : ''}" data-mode="voice">
            <svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6.91 6c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/></svg>
            Voice
          </button>
        </div>
      \`;
    }
    
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
      \${modeToggleHtml}
      <div class="retell-widget-content">
        <div class="retell-widget-chat-content" style="display: \${currentMode === 'chat' ? 'block' : 'none'}">
          <div class="retell-widget-messages"></div>
          <div class="retell-widget-input-area">
            <input type="text" class="retell-widget-input" placeholder="Type a message...">
            <button class="retell-widget-send" style="background:\${primaryColor}">
              <svg viewBox="0 0 24 24" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
          </div>
        </div>
        <div class="retell-widget-voice-content" style="display: \${currentMode === 'voice' ? 'flex' : 'none'}; flex-direction: column; align-items: center; justify-content: center; min-height: 380px;">
          <button class="retell-widget-call-btn" style="background: \${primaryColor}">
            <svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6.91 6c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/></svg>
          </button>
          <div class="retell-widget-call-status">Click to start voice call</div>
          <div class="retell-widget-visualizer" style="display: none;">
            <div class="retell-widget-bar" style="height: 8px;"></div>
            <div class="retell-widget-bar" style="height: 12px;"></div>
            <div class="retell-widget-bar" style="height: 16px;"></div>
            <div class="retell-widget-bar" style="height: 12px;"></div>
            <div class="retell-widget-bar" style="height: 8px;"></div>
          </div>
        </div>
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
    var chatContent = panel.querySelector(".retell-widget-chat-content");
    var voiceContent = panel.querySelector(".retell-widget-voice-content");
    var callBtn = panel.querySelector(".retell-widget-call-btn");
    var callStatus = panel.querySelector(".retell-widget-call-status");
    var visualizer = panel.querySelector(".retell-widget-visualizer");
    var bars = panel.querySelectorAll(".retell-widget-bar");
    var modeBtns = panel.querySelectorAll(".retell-widget-mode-btn");
    
    // Add greeting for chat
    if (enableChat) {
      addMessage("agent", config.greeting || "Hi! How can I help you today?");
    }
    
    // Mode toggle
    modeBtns.forEach(function(modeBtn) {
      modeBtn.onclick = function() {
        var mode = this.getAttribute("data-mode");
        currentMode = mode;
        modeBtns.forEach(function(b) { b.classList.remove("active"); });
        this.classList.add("active");
        
        if (mode === "chat") {
          chatContent.style.display = "block";
          voiceContent.style.display = "none";
        } else {
          chatContent.style.display = "none";
          voiceContent.style.display = "flex";
        }
      };
    });
    
    // Toggle
    btn.onclick = function() {
      isOpen = !isOpen;
      panel.classList.toggle("hidden", !isOpen);
      btn.innerHTML = isOpen 
        ? '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>'
        : '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
      if (isOpen && currentMode === "chat") input.focus();
    };
    
    closeBtn.onclick = function() {
      isOpen = false;
      panel.classList.add("hidden");
      btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
      // End call if active
      if (callState === "active" && retellClient) {
        retellClient.stopCall();
        callState = "idle";
        updateVoiceUI();
      }
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
        body: JSON.stringify({ message: text, chat_id: chatId, api_key: API_KEY })
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
    
    // Voice functionality
    function updateVoiceUI() {
      if (callState === "idle") {
        callBtn.classList.remove("calling", "active");
        callBtn.style.background = primaryColor;
        callBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6.91 6c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/></svg>';
        callStatus.textContent = "Click to start voice call";
        visualizer.style.display = "none";
      } else if (callState === "connecting") {
        callBtn.classList.add("calling");
        callBtn.classList.remove("active");
        callStatus.textContent = "Connecting...";
        visualizer.style.display = "none";
      } else if (callState === "active") {
        callBtn.classList.remove("calling");
        callBtn.classList.add("active");
        callBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><line x1="4" y1="4" x2="20" y2="20" stroke="white" stroke-width="2"/></svg>';
        callStatus.textContent = isAgentSpeaking ? "AI is speaking..." : "Listening...";
        visualizer.style.display = "flex";
      }
    }
    
    function animateVisualizer() {
      if (callState !== "active") return;
      bars.forEach(function(bar, i) {
        var height = isAgentSpeaking ? Math.random() * 30 + 10 : Math.random() * 15 + 5;
        bar.style.height = height + "px";
      });
      requestAnimationFrame(animateVisualizer);
    }
    
    async function startVoiceCall() {
      if (callState !== "idle") return;
      
      try {
        // Check for microphone permission
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        callState = "connecting";
        updateVoiceUI();
        
        // Create call via edge function
        var response = await fetch(BASE_URL + "/retell-create-call", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ api_key: API_KEY })
        });
        
        var data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        if (!data.access_token) {
          throw new Error("No access token received");
        }
        
        // Initialize Retell client
        if (window.RetellWebClient) {
          retellClient = new window.RetellWebClient();
          
          retellClient.on("call_started", function() {
            console.log("RetellWidget: Call started");
            callState = "active";
            updateVoiceUI();
            animateVisualizer();
          });
          
          retellClient.on("call_ended", function() {
            console.log("RetellWidget: Call ended");
            callState = "idle";
            isAgentSpeaking = false;
            updateVoiceUI();
          });
          
          retellClient.on("agent_start_talking", function() {
            isAgentSpeaking = true;
            updateVoiceUI();
          });
          
          retellClient.on("agent_stop_talking", function() {
            isAgentSpeaking = false;
            updateVoiceUI();
          });
          
          retellClient.on("error", function(err) {
            console.error("RetellWidget: Error", err);
            callState = "idle";
            isAgentSpeaking = false;
            updateVoiceUI();
            callStatus.textContent = "Call failed. Try again.";
          });
          
          await retellClient.startCall({
            accessToken: data.access_token,
            sampleRate: 24000,
            captureDeviceId: "default"
          });
        } else {
          throw new Error("Retell SDK not loaded");
        }
        
      } catch (err) {
        console.error("RetellWidget: Failed to start call", err);
        callState = "idle";
        updateVoiceUI();
        callStatus.textContent = err.message || "Failed to start call";
      }
    }
    
    function endVoiceCall() {
      if (retellClient) {
        retellClient.stopCall();
      }
      callState = "idle";
      isAgentSpeaking = false;
      updateVoiceUI();
    }
    
    callBtn.onclick = function() {
      if (callState === "idle") {
        startVoiceCall();
      } else {
        endVoiceCall();
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
