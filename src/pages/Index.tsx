import VoiceWidget from "@/components/VoiceWidget";
import { Sparkles } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-glow-secondary/5 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-12 max-w-md text-center">
        {/* Header */}
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
              AI Voice Assistant
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            <span className="text-gradient">Voice</span>{" "}
            <span className="text-foreground">Chat</span>
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Start a conversation with our AI assistant. Just click the button below
            and begin speaking naturally.
          </p>
        </div>

        {/* Voice Widget */}
        <VoiceWidget className="animate-scale-in" />

        {/* Instructions */}
        <div
          className="glass rounded-2xl p-6 space-y-4 animate-fade-in"
          style={{ animationDelay: "0.3s" }}
        >
          <h2 className="font-semibold text-foreground">How it works</h2>
          <ul className="space-y-3 text-sm text-muted-foreground text-left">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                1
              </span>
              <span>Click the call button to start a conversation</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                2
              </span>
              <span>Allow microphone access when prompted</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                3
              </span>
              <span>Speak naturally and wait for the AI to respond</span>
            </li>
          </ul>
        </div>

        {/* Footer note */}
        <p className="text-xs text-muted-foreground/60">
          Powered by Retell AI
        </p>
      </div>
    </div>
  );
};

export default Index;
