import { useState, useEffect, useRef, useCallback } from "react";
import { RetellWebClient } from "retell-client-js-sdk";
import { Mic, MicOff, Phone, PhoneOff, Loader2, MessageSquare, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type CallState = "idle" | "connecting" | "connected" | "ended";
type WidgetMode = "voice" | "chat";

interface VoiceWidgetProps {
  className?: string;
}

const VoiceWidget = ({ className }: VoiceWidgetProps) => {
  const [mode, setMode] = useState<WidgetMode>("voice");
  const [callState, setCallState] = useState<CallState>("idle");
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "agent"; text: string }[]>([]);
  const [inputText, setInputText] = useState("");
  const retellClient = useRef<RetellWebClient | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    retellClient.current = new RetellWebClient();

    const client = retellClient.current;

    client.on("call_started", () => {
      console.log("Call started");
      setCallState("connected");
    });

    client.on("call_ended", () => {
      console.log("Call ended");
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
      console.error("Retell error:", error);
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
  }, [toast]);

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

  const createWebCall = async () => {
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

  const startCall = useCallback(async () => {
    try {
      const hasPermission = await checkMicrophonePermission();
      if (!hasPermission) return;

      setCallState("connecting");

      const { access_token } = await createWebCall();

      await retellClient.current?.startCall({
        accessToken: access_token,
      });
    } catch (error) {
      console.error("Call failed:", error);
      toast({
        title: "Call Failed",
        description: error instanceof Error ? error.message : "Unable to start call",
        variant: "destructive",
      });
      setCallState("idle");
    }
  }, [toast]);

  const endCall = useCallback(() => {
    retellClient.current?.stopCall();
  }, []);

  const sendChatMessage = useCallback(async () => {
    if (!inputText.trim()) return;

    const userMessage = inputText.trim();
    setInputText("");
    setChatMessages((prev) => [...prev, { role: "user", text: userMessage }]);

    // For now, show a placeholder response since Retell is primarily voice-based
    // You can integrate a text-based API here if needed
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        { role: "agent", text: "I'm a voice assistant. Please switch to voice mode to talk with me, or integrate a text-based API for chat functionality." },
      ]);
    }, 1000);
  }, [inputText]);

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

  return (
    <div className={cn("flex flex-col items-center gap-6", className)}>
      {/* Mode Toggle */}
      <div className="glass rounded-full p-1 flex gap-1">
        <button
          onClick={() => setMode("voice")}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
            mode === "voice"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Volume2 className="w-4 h-4" />
          Voice
        </button>
        <button
          onClick={() => setMode("chat")}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
            mode === "chat"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <MessageSquare className="w-4 h-4" />
          Chat
        </button>
      </div>

      {mode === "voice" ? (
        <>
          {/* Voice Mode */}
          <div className="relative">
            {/* Ripple effects when connected */}
            {callState === "connected" && (
              <>
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ripple" />
                <div
                  className="absolute inset-0 rounded-full bg-primary/20 animate-ripple"
                  style={{ animationDelay: "0.5s" }}
                />
              </>
            )}

            {/* Main button */}
            <button
              onClick={callState === "connected" ? endCall : startCall}
              disabled={callState === "connecting"}
              className={cn(
                "relative z-10 w-24 h-24 rounded-full transition-all duration-500",
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
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              ) : callState === "connected" ? (
                <PhoneOff className="w-10 h-10 text-destructive" />
              ) : (
                <Phone className="w-10 h-10 text-primary" />
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
          <div className="text-center animate-fade-in">
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
        </>
      ) : (
        <>
          {/* Chat Mode */}
          <div className="w-full max-w-md glass rounded-2xl overflow-hidden">
            {/* Chat Messages */}
            <div className="h-64 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 && (
                <p className="text-center text-muted-foreground text-sm">
                  Start a conversation...
                </p>
              )}
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "max-w-[80%] p-3 rounded-2xl text-sm",
                    msg.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground rounded-br-sm"
                      : "mr-auto bg-secondary text-secondary-foreground rounded-bl-sm"
                  )}
                >
                  {msg.text}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border p-3 flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                placeholder="Type a message..."
                className="flex-1 bg-secondary/50 border border-border rounded-xl px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                onClick={sendChatMessage}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default VoiceWidget;
