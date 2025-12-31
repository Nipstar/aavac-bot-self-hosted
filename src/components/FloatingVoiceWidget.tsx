import { useState, useEffect, useRef, useCallback } from "react";
import { RetellWebClient } from "retell-client-js-sdk";
import { 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff, 
  Loader2, 
  MessageSquare, 
  Volume2, 
  Send, 
  X,
  MessageCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type CallState = "idle" | "connecting" | "connected" | "ended";
type WidgetMode = "voice" | "chat";

interface ChatMessage {
  role: "user" | "agent";
  text: string;
}

export interface WidgetConfig {
  primaryColor?: string;
  position?: "bottom-right" | "bottom-left";
  greeting?: string;
  title?: string;
  enableVoice?: boolean;
  enableChat?: boolean;
}

interface FloatingVoiceWidgetProps {
  config?: WidgetConfig;
}

const FloatingVoiceWidget = ({ config }: FloatingVoiceWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<WidgetMode>("chat");
  const [callState, setCallState] = useState<CallState>("idle");
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const retellClient = useRef<RetellWebClient | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const {
    primaryColor = "hsl(175, 80%, 50%)",
    position = "bottom-right",
    greeting = "Hi! How can I help you today?",
    title = "AI Assistant",
    enableVoice = true,
    enableChat = true,
  } = config || {};

  // Add greeting message on first open
  useEffect(() => {
    if (isOpen && chatMessages.length === 0 && mode === "chat") {
      setChatMessages([{ role: "agent", text: greeting }]);
    }
  }, [isOpen, chatMessages.length, greeting, mode]);

  // Voice client setup
  useEffect(() => {
    if (!enableVoice) return;
    
    retellClient.current = new RetellWebClient();

    const client = retellClient.current;

    client.on("call_started", () => {
      console.log("Voice call started");
      setCallState("connected");
    });

    client.on("call_ended", () => {
      console.log("Voice call ended");
      setCallState("ended");
      setTimeout(() => setCallState("idle"), 1500);
    });

    client.on("agent_start_talking", () => {
      setIsAgentSpeaking(true);
    });

    client.on("agent_stop_talking", () => {
      setIsAgentSpeaking(false);
    });

    client.on("error", (error) => {
      console.error("Retell voice error:", error);
      toast({
        title: "Connection Error",
        description: "Failed to connect. Please try again.",
        variant: "destructive",
      });
      setCallState("idle");
    });

    return () => {
      client.stopCall();
    };
  }, [toast, enableVoice]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const checkMicrophonePermission = async (): Promise<boolean> => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      return true;
    } catch {
      toast({
        title: "Microphone Access Required",
        description: "Please allow microphone access to start the call.",
        variant: "destructive",
      });
      return false;
    }
  };

  const createVoiceWebCall = async () => {
    const { data, error } = await supabase.functions.invoke("retell-create-call");

    if (error) {
      console.error("Edge function error:", error);
      throw new Error("Failed to create call");
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return data;
  };

  const sendTextMessage = async (message: string): Promise<{ response: string; chat_id?: string }> => {
    const { data, error } = await supabase.functions.invoke("retell-text-chat", {
      body: { message, chat_id: chatId },
    });

    if (error) {
      console.error("Edge function error:", error);
      throw new Error("Failed to send message");
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return data;
  };

  const startVoiceCall = useCallback(async () => {
    try {
      const hasPermission = await checkMicrophonePermission();
      if (!hasPermission) return;

      setCallState("connecting");

      const { access_token } = await createVoiceWebCall();

      await retellClient.current?.startCall({
        accessToken: access_token,
      });
    } catch (error) {
      console.error("Voice call failed:", error);
      toast({
        title: "Call Failed",
        description: error instanceof Error ? error.message : "Unable to start call",
        variant: "destructive",
      });
      setCallState("idle");
    }
  }, [toast]);

  const endVoiceCall = useCallback(() => {
    retellClient.current?.stopCall();
  }, []);

  const sendChatMessage = useCallback(async () => {
    if (!inputText.trim() || isSending) return;

    const userMessage = inputText.trim();
    setInputText("");
    setChatMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setIsSending(true);

    try {
      const data = await sendTextMessage(userMessage);
      
      if (data.chat_id) {
        setChatId(data.chat_id);
      }

      if (data.response) {
        setChatMessages((prev) => [...prev, { role: "agent", text: data.response }]);
      }
    } catch (error) {
      console.error("Chat message failed:", error);
      toast({
        title: "Message Failed",
        description: error instanceof Error ? error.message : "Unable to send message",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  }, [inputText, isSending, toast, chatId]);

  const getStatusText = () => {
    switch (callState) {
      case "connecting":
        return "Connecting...";
      case "connected":
        return isAgentSpeaking ? "AI Speaking" : "Listening";
      case "ended":
        return "Call Ended";
      default:
        return "Start Voice Call";
    }
  };

  const positionClasses = position === "bottom-right" 
    ? "right-4 sm:right-6" 
    : "left-4 sm:left-6";

  return (
    <div className={cn("fixed bottom-4 sm:bottom-6 z-50", positionClasses)}>
      {/* Widget Panel */}
      <div
        className={cn(
          "absolute bottom-16 mb-2 transition-all duration-300 ease-out origin-bottom",
          position === "bottom-right" ? "right-0" : "left-0",
          isOpen 
            ? "opacity-100 scale-100 translate-y-0" 
            : "opacity-0 scale-95 translate-y-4 pointer-events-none"
        )}
      >
        <div className="w-[340px] sm:w-[380px] glass rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div 
            className="p-4 border-b border-border flex items-center justify-between"
            style={{ background: `linear-gradient(135deg, ${primaryColor}15, transparent)` }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${primaryColor}20` }}
              >
                <MessageCircle className="w-5 h-5" style={{ color: primaryColor }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="text-xs text-muted-foreground">Online now</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Mode Toggle - only show if both modes enabled */}
          {enableVoice && enableChat && (
            <div className="p-2 border-b border-border">
              <div className="flex gap-1 p-1 rounded-lg bg-secondary/50">
                <button
                  onClick={() => setMode("chat")}
                  className={cn(
                    "flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2",
                    mode === "chat"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <MessageSquare className="w-4 h-4" />
                  Chat
                </button>
                <button
                  onClick={() => setMode("voice")}
                  className={cn(
                    "flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2",
                    mode === "voice"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Volume2 className="w-4 h-4" />
                  Voice
                </button>
              </div>
            </div>
          )}

          {/* Content */}
          {mode === "chat" && enableChat ? (
            <>
              {/* Chat Messages */}
              <div className="h-80 overflow-y-auto p-4 space-y-3">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      "max-w-[85%] p-3 rounded-2xl text-sm animate-fade-in",
                      msg.role === "user"
                        ? "ml-auto bg-primary text-primary-foreground rounded-br-sm"
                        : "mr-auto bg-secondary text-secondary-foreground rounded-bl-sm"
                    )}
                  >
                    {msg.text}
                  </div>
                ))}
                {isSending && (
                  <div className="mr-auto bg-secondary text-secondary-foreground rounded-2xl rounded-bl-sm p-3 max-w-[85%]">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-border p-3 flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChatMessage()}
                  placeholder="Type a message..."
                  disabled={isSending}
                  className="flex-1 bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                />
                <button
                  onClick={sendChatMessage}
                  disabled={isSending || !inputText.trim()}
                  className="bg-primary text-primary-foreground p-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </>
          ) : mode === "voice" && enableVoice ? (
            <div className="p-6 flex flex-col items-center gap-6">
              {/* Voice Controls */}
              <div className="relative">
                {callState === "connected" && (
                  <>
                    <div className="absolute inset-0 rounded-full bg-primary/20 animate-ripple" />
                    <div
                      className="absolute inset-0 rounded-full bg-primary/20 animate-ripple"
                      style={{ animationDelay: "0.5s" }}
                    />
                  </>
                )}

                <button
                  onClick={callState === "connected" ? endVoiceCall : startVoiceCall}
                  disabled={callState === "connecting"}
                  className={cn(
                    "relative z-10 w-20 h-20 rounded-full transition-all duration-500",
                    "flex items-center justify-center",
                    "glass border-2",
                    callState === "idle" &&
                      "border-primary/50 hover:border-primary hover:glow-ring",
                    callState === "connecting" && "border-primary/30",
                    callState === "connected" &&
                      "border-primary animate-pulse-glow bg-primary/10",
                    callState === "ended" && "border-muted-foreground/30"
                  )}
                >
                  {callState === "connecting" ? (
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  ) : callState === "connected" ? (
                    <PhoneOff className="w-8 h-8 text-destructive" />
                  ) : (
                    <Phone className="w-8 h-8 text-primary" />
                  )}
                </button>
              </div>

              {/* Audio Visualizer */}
              {callState === "connected" && (
                <div className="flex items-center gap-1 h-8">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-1 rounded-full transition-all duration-150",
                        isAgentSpeaking ? "bg-primary" : "bg-muted-foreground/50"
                      )}
                      style={{
                        height: isAgentSpeaking ? `${Math.random() * 24 + 8}px` : "8px",
                        animation: isAgentSpeaking ? `wave 0.5s ease-in-out infinite` : "none",
                        animationDelay: `${i * 0.1}s`,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Status */}
              <div className="text-center">
                <p
                  className={cn(
                    "text-sm font-medium transition-colors",
                    callState === "connected" ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {getStatusText()}
                </p>

                {callState === "connected" && (
                  <div className="flex items-center justify-center gap-2 mt-2">
                    {isAgentSpeaking ? (
                      <Mic className="w-4 h-4 text-primary animate-pulse" />
                    ) : (
                      <MicOff className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-xs text-muted-foreground font-mono">
                      {isAgentSpeaking ? "Agent responding" : "Your turn to speak"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300",
          "shadow-lg hover:shadow-xl hover:scale-105",
          isOpen ? "rotate-0" : "rotate-0"
        )}
        style={{ 
          backgroundColor: primaryColor,
          boxShadow: `0 4px 20px ${primaryColor}40`
        }}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-primary-foreground" />
        ) : (
          <MessageCircle className="w-6 h-6 text-primary-foreground" />
        )}
      </button>
    </div>
  );
};

export default FloatingVoiceWidget;
