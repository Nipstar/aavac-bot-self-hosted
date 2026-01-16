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
  background_color: string | null;
  text_color: string | null;
  secondary_color: string | null;
  button_text_color: string | null;
  attribution_text: string | null;
  attribution_url: string | null;
}

const schemaData = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "name": "Antek Automation",
  "alternateName": "Antek AI Automation",
  "url": "https://www.antekautomation.com/",
  "description": "AI automation agency providing AI chatbots, voice AI phone agents, and workflow automation to capture leads, book appointments, and handle customer queries 24/7.",
  "image": "https://www.antekautomation.com/logo.svg",
  "telephone": "+44-3330-389960",
  "email": "hello@antekautomation.com",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Chantry House, 38 Chantry Way",
    "addressLocality": "Andover",
    "addressRegion": "Hampshire",
    "postalCode": "SP10 1LZ",
    "addressCountry": "GB"
  },
  "areaServed": {
    "@type": "Country",
    "name": "United Kingdom"
  }
};

const Home = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<DemoSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.rpc("get_demo_display_settings");

      if (data && data.length > 0) {
        const row = data[0];
        setSettings({
          title: row.demo_title,
          greeting: row.demo_greeting,
          enable_voice: row.demo_enable_voice,
          enable_chat: row.demo_enable_chat,
          primary_color: row.demo_primary_color,
          background_color: row.demo_background_color,
          text_color: row.demo_text_color,
          secondary_color: row.demo_secondary_color,
          button_text_color: row.demo_button_text_color,
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
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />
      
      <nav className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between">
        <span className="text-xl font-bold text-gradient">AI Widget Platform</span>
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
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-glow-secondary/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-10 w-full max-w-lg text-center">
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

        <FloatingVoiceWidget 
          config={{
            title: settings?.title || "AI Assistant",
            greeting: settings?.greeting || "Hi there! 👋 How can I help you today?",
            enableVoice: settings?.enable_voice ?? true,
            enableChat: settings?.enable_chat ?? true,
            primaryColor: settings?.primary_color || "#14b8a6",
            backgroundColor: settings?.background_color || "#ffffff",
            textColor: settings?.text_color || "#1f2937",
            secondaryColor: settings?.secondary_color || "#f3f4f6",
            buttonTextColor: settings?.button_text_color || "#ffffff",
            isDemo: true,
            attributionText: settings?.attribution_text || "Powered By Antek Automation",
            attributionUrl: settings?.attribution_url || "https://www.antekautomation.com",
          }}
        />
      </div>
      
      {/* Hidden Attribution Link */}
      <a 
        href="https://www.antekautomation.com" 
        target="_blank" 
        rel="noopener noreferrer"
        className="sr-only"
        aria-hidden="true"
      >
        Powered by Antek Automation - AI Chatbots, Voice AI Phone Agents & Workflow Automation
      </a>
    </div>
  );
};

export default Home;