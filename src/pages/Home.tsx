import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import FloatingVoiceWidget from "@/components/FloatingVoiceWidget";
import { Sparkles, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface DemoSettings {
  title: string | null;
  greeting: string | null;
  enable_voice: boolean | null;
  enable_chat: boolean | null;
  primary_color: string | null;
  attribution_text: string | null;
  attribution_url: string | null;
}

const Home = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<DemoSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      // Use secure RPC function that doesn't expose sensitive fields
      const { data } = await supabase.rpc("get_demo_display_settings");

      if (data && data.length > 0) {
        const row = data[0];
        setSettings({
          title: row.demo_title,
          greeting: row.demo_greeting,
          enable_voice: row.demo_enable_voice,
          enable_chat: row.demo_enable_chat,
          primary_color: row.demo_primary_color,
          attribution_text: row.demo_attribution_text,
          attribution_url: row.demo_attribution_url,
        });
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
        <span className="text-xl font-bold text-gradient">
          AI Widget Platform
        </span>
        <div className="flex items-center gap-2">
          {user ? (
            <Link to="/dashboard">
              <Button size="sm">Dashboard</Button>
            </Link>
          ) : (
            <Link to="/auth">
              <Button size="sm">Sign In</Button>
            </Link>
          )}
        </div>
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
                AI Assistant Demo
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
            {(settings?.enable_chat !== false) && (
              <div className="glass rounded-xl p-4 text-left">
                <h3 className="font-semibold text-foreground mb-2">💬 Chat Mode</h3>
                <p className="text-sm text-muted-foreground">
                  Type your questions and get instant AI responses
                </p>
              </div>
            )}
            {(settings?.enable_voice !== false) && (
              <div className="glass rounded-xl p-4 text-left">
                <h3 className="font-semibold text-foreground mb-2">🎤 Voice Mode</h3>
                <p className="text-sm text-muted-foreground">
                  Have a natural voice conversation with the AI
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Floating Widget */}
        <FloatingVoiceWidget 
          config={{
            title: settings?.title || "AI Assistant",
            greeting: settings?.greeting || "Hi there! 👋 How can I help you today?",
            enableVoice: settings?.enable_voice ?? true,
            enableChat: settings?.enable_chat ?? true,
            primaryColor: settings?.primary_color || undefined,
            isDemo: true,
            attributionText: settings?.attribution_text || "Powered By Antek Automation",
            attributionUrl: settings?.attribution_url || "https://www.antekautomation.com",
          }}
        />
      </div>
    </div>
  );
};

export default Home;