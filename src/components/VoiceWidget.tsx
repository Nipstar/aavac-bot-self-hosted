import { useState, useEffect, useRef, useCallback } from "react";
import { RetellWebClient } from "retell-client-js-sdk";
import { Mic, MicOff, Phone, PhoneOff, Loader2, MessageSquare, Volume2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type CallState = "idle" | "connecting" | "connected" | "ended";
type WidgetMode = "voice" | "chat";

interface ChatMessage {
  role: "user" | "agent";
  text: string;
}

interface VoiceWidgetProps {
  className?: string;
}

const VoiceWidget = ({ className }: VoiceWidgetProps) => {
  const [mode, setMode] = useState<WidgetMode>("voice");
  const [callState, setCallState] = useState<CallState>("idle");
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [chatCallState, setChatCallState] = useState<"idle" | "active">("idle");
  const retellClient = useRef<RetellWebClient | null>(null);
  const textRetellClient = useRef<RetellWebClient | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Voice client setup
  useEffect(() => {
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
  }, [toast]);

  // Text chat client setup
  useEffect(() => {
    textRetellClient.current = new RetellWebClient();

    const client = textRetellClient.current;

    client.on("call_started", () => {
      console.log("Text chat call started");
      setChatCallState("active");
    });

    client.on("call_ended", () => {
      console.log("Text chat call ended");
      setChatCallState("idle");
    });

    client.on("agent_start_talking", () => {
      // For text mode, we'll capture the transcript
    });

    client.on("update", (update) => {
      // Handle transcript updates from the agent
      if (update.transcript) {
        const agentMessages = update.transcript
          .filter((t: { role: string }) => t.role === "agent")
          .map((t: { content: string }) => t.content);
        
        if (agentMessages.length > 0) {
          const latestAgentMessage = agentMessages[agentMessages.length - 1];
          setChatMessages((prev) => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg?.role === "agent" && lastMsg.text !== latestAgentMessage) {
              return [...prev.slice(0, -1), { role: "agent", text: latestAgentMessage }];
            } else if (lastMsg?.role !== "agent") {
              return [...prev, { role: "agent", text: latestAgentMessage }];
            }
            return prev;
          });
        }
      }
    });

    client.on("error", (error) => {
      console.error("Retell text chat error:", error);
      toast({
        title: "Chat Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
      setIsSending(false);
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

  const createTextWebCall = async (message: string) => {
    const { data, error } = await supabase.functions.invoke("retell-text-chat", {
      body: { message },
    });

    if (error) {
      console.error("Edge function error:", error);
      throw new Error("Failed to create text chat");
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
      const { access_token } = await createTextWebCall(userMessage);

      // Start a new call for this message
      await textRetellClient.current?.startCall({
        accessToken: access_token,
      });

      // The response will come through the update event
      setIsSending(false);
    } catch (error) {
      console.error("Chat message failed:", error);
      toast({
        title: "Message Failed",
        description: error instanceof Error ? error.message : "Unable to send message",
        variant: "destructive",
      });
      setIsSending(false);
    }
  }, [inputText, isSending, toast]);

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
              onClick={callState === "connected" ? endVoiceCall : startVoiceCall}
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
            <div className="h-72 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 && (
                <div className="h-full flex items-center justify-center">
                  <p className="text-center text-muted-foreground text-sm">
                    Start a conversation...
                  </p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "max-w-[80%] p-3 rounded-2xl text-sm animate-fade-in",
                    msg.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground rounded-br-sm"
                      : "mr-auto bg-secondary text-secondary-foreground rounded-bl-sm"
                  )}
                >
                  {msg.text}
                </div>
              ))}
              {isSending && (
                <div className="mr-auto bg-secondary text-secondary-foreground rounded-2xl rounded-bl-sm p-3 max-w-[80%]">
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
                className="flex-1 bg-secondary/50 border border-border rounded-xl px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
              />
              <button
                onClick={sendChatMessage}
                disabled={isSending || !inputText.trim()}
                className="bg-primary text-primary-foreground p-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default VoiceWidget;
