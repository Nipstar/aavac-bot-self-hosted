import { useState, useEffect, useRef, useCallback } from "react";
import { RetellWebClient } from "retell-client-js-sdk";
import { Mic, MicOff, Phone, PhoneOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type CallState = "idle" | "connecting" | "connected" | "ended";

interface VoiceWidgetProps {
  className?: string;
}

const VoiceWidget = ({ className }: VoiceWidgetProps) => {
  const [callState, setCallState] = useState<CallState>("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const retellClient = useRef<RetellWebClient | null>(null);
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
    const apiKey = import.meta.env.VITE_RETELL_API_KEY;
    const agentId = import.meta.env.VITE_RETELL_VOICE_AGENT_ID;

    if (!apiKey || !agentId) {
      throw new Error("API key or Agent ID not configured");
    }

    const response = await fetch("https://api.retellai.com/v2/create-web-call", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agent_id: agentId,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to create call");
    }

    return response.json();
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
      {/* Main Widget */}
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
    </div>
  );
};

export default VoiceWidget;
