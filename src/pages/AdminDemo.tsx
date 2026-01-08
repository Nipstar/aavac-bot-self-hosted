import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save, ExternalLink, Shield } from "lucide-react";

interface DemoSettings {
  id: string;
  title: string | null;
  greeting: string | null;
  enable_voice: boolean | null;
  enable_chat: boolean | null;
  primary_color: string | null;
  retell_api_key: string | null;
  voice_agent_id: string | null;
  chat_agent_id: string | null;
}

export default function AdminDemo() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [settings, setSettings] = useState<DemoSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [greeting, setGreeting] = useState("");
  const [enableVoice, setEnableVoice] = useState(true);
  const [enableChat, setEnableChat] = useState(true);
  const [primaryColor, setPrimaryColor] = useState("#14b8a6");
  const [retellApiKey, setRetellApiKey] = useState("");
  const [voiceAgentId, setVoiceAgentId] = useState("");
  const [chatAgentId, setChatAgentId] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      checkAdminAndFetchSettings();
    }
  }, [user]);

  const checkAdminAndFetchSettings = async () => {
    // Check if user is admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user!.id)
      .eq("role", "admin")
      .maybeSingle();

    const adminStatus = !!roleData;
    setIsAdmin(adminStatus);

    if (!adminStatus) {
      toast.error("Admin access required");
      navigate("/dashboard");
      return;
    }

    // Fetch settings
    const { data, error } = await supabase
      .from("demo_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) {
      toast.error("Failed to load demo settings");
      console.error(error);
      setLoadingSettings(false);
      return;
    }

    if (data) {
      setSettings(data);
      setTitle(data.title || "");
      setGreeting(data.greeting || "");
      setEnableVoice(data.enable_voice ?? true);
      setEnableChat(data.enable_chat ?? true);
      setPrimaryColor(data.primary_color || "#14b8a6");
      setRetellApiKey(data.retell_api_key || "");
      setVoiceAgentId(data.voice_agent_id || "");
      setChatAgentId(data.chat_agent_id || "");
    }
    setLoadingSettings(false);
  };

  const saveSettings = async () => {
    if (!settings) return;

    setIsSaving(true);

    const { error } = await supabase
      .from("demo_settings")
      .update({
        title: title || null,
        greeting: greeting || null,
        enable_voice: enableVoice,
        enable_chat: enableChat,
        primary_color: primaryColor,
        retell_api_key: retellApiKey || null,
        voice_agent_id: voiceAgentId || null,
        chat_agent_id: chatAgentId || null,
        updated_at: new Date().toISOString(),
        updated_by: user?.id,
      })
      .eq("id", settings.id);

    if (error) {
      toast.error("Failed to save settings");
      console.error(error);
    } else {
      toast.success("Demo settings saved!");
    }

    setIsSaving(false);
  };

  if (loading || loadingSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <Button onClick={saveSettings} disabled={isSaving} className="gap-2">
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-2xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Demo Widget Settings</h1>
            <p className="text-sm text-muted-foreground">Admin only - Configure the homepage demo</p>
          </div>
        </div>

        <div className="space-y-8">
          <section className="glass rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-semibold">Display Settings</h2>

            <div className="space-y-2">
              <Label htmlFor="title">Widget Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="AI Assistant" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="greeting">Greeting Message</Label>
              <Textarea id="greeting" value={greeting} onChange={(e) => setGreeting(e.target.value)} placeholder="Hi there! 👋 How can I help you today?" rows={2} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Primary Color</Label>
              <div className="flex gap-3">
                <Input id="color" type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-16 h-10 p-1 cursor-pointer" />
                <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1" />
              </div>
            </div>
          </section>

          <section className="glass rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-semibold">Features</h2>
            <div className="flex items-center justify-between">
              <div>
                <Label>Voice Mode</Label>
                <p className="text-sm text-muted-foreground">Allow voice conversations in demo</p>
              </div>
              <Switch checked={enableVoice} onCheckedChange={setEnableVoice} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Chat Mode</Label>
                <p className="text-sm text-muted-foreground">Allow text conversations in demo</p>
              </div>
              <Switch checked={enableChat} onCheckedChange={setEnableChat} />
            </div>
          </section>

          <section className="glass rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-semibold">Retell AI Configuration</h2>
            <p className="text-sm text-muted-foreground">Configure the Retell API for the demo widget.</p>
            <div className="space-y-2">
              <Label htmlFor="retellApiKey">Retell API Key</Label>
              <Input id="retellApiKey" type="password" value={retellApiKey} onChange={(e) => setRetellApiKey(e.target.value)} placeholder="Uses global secret if empty" />
              <p className="text-xs text-muted-foreground">
                Get your API key from{" "}
                <a href="https://dashboard.retellai.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  Retell Dashboard <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="voiceAgent">Voice Agent ID</Label>
              <Input id="voiceAgent" value={voiceAgentId} onChange={(e) => setVoiceAgentId(e.target.value)} placeholder="Uses global secret if empty" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chatAgent">Chat Agent ID</Label>
              <Input id="chatAgent" value={chatAgentId} onChange={(e) => setChatAgentId(e.target.value)} placeholder="Uses global secret if empty" />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
