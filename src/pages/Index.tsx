import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import FloatingVoiceWidget from "@/components/FloatingVoiceWidget";
import { Sparkles, Code, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface DemoSettings {
  title: string | null;
  greeting: string | null;
  enable_voice: boolean | null;
  enable_chat: boolean | null;
  primary_color: string | null;
}

const Index = () => {
  const [settings, setSettings] = useState<DemoSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("demo_settings")
        .select("title, greeting, enable_voice, enable_chat, primary_color")
        .limit(1)
        .maybeSingle();

      if (data) {
        setSettings(data);
      }
      setLoading(false);
    };

    fetchSettings();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-gradient">
          AAVAC Bot
        </Link>
        <Link to="/auth">
          <Button variant="outline" size="sm">
            Sign In
          </Button>
        </Link>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background gradient effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-glow-secondary/5 rounded-full blur-3xl" />
        </div>
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
            Click the chat button in the bottom-right corner to interact with the AI assistant
          </p>
        </div>

        {/* Info Cards */}
        <div className="grid gap-4 w-full">
          <div className="glass rounded-xl p-4 text-left">
            <h3 className="font-semibold text-foreground mb-2">💬 Chat Mode</h3>
            <p className="text-sm text-muted-foreground">
              Type your questions and get instant AI responses
            </p>
          </div>
          <div className="glass rounded-xl p-4 text-left">
            <h3 className="font-semibold text-foreground mb-2">🎤 Voice Mode</h3>
            <p className="text-sm text-muted-foreground">
              Have a natural voice conversation with the AI
            </p>
          </div>
        </div>

        {/* Embed Link */}
        <Link 
          to="/embed"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-sm font-medium"
        >
          <Code className="w-4 h-4" />
          Get Embed Code
        </Link>

        {/* Footer note */}
        <p className="text-xs text-muted-foreground/60">
          Powered by Retell AI
        </p>
      </div>

      {/* Floating Widget */}
      <FloatingVoiceWidget 
        config={{
          title: settings?.title || "AI Assistant",
          greeting: settings?.greeting || "Hi there! 👋 How can I help you today?",
          enableVoice: settings?.enable_voice ?? true,
          enableChat: settings?.enable_chat ?? true,
          primaryColor: settings?.primary_color || undefined,
        }}
      />
      </div>
    </div>
  );
};

export default Index;
