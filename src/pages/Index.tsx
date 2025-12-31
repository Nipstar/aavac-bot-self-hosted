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
      <div className="relative z-10 flex flex-col items-center gap-10 w-full max-w-lg text-center">
        {/* Header */}
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
              AI Assistant
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            <span className="text-gradient">Voice</span>{" "}
            <span className="text-foreground">&</span>{" "}
            <span className="text-gradient">Chat</span>
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Switch between voice and chat to interact with the AI assistant
          </p>
        </div>

        {/* Voice Widget */}
        <VoiceWidget className="animate-scale-in w-full" />

        {/* Footer note */}
        <p className="text-xs text-muted-foreground/60">
          Powered by Retell AI
        </p>
      </div>
    </div>
  );
};

export default Index;
