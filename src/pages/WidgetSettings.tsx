import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save, Copy, ExternalLink } from "lucide-react";

interface WidgetConfig {
  id: string;
  name: string;
  title: string | null;
  greeting: string | null;
  api_key: string;
  enable_voice: boolean | null;
  enable_chat: boolean | null;
  primary_color: string | null;
  position: string | null;
  voice_agent_id: string | null;
  chat_agent_id: string | null;
  allowed_domains: string[] | null;
  retell_api_key: string | null;
  attribution_link: string | null;
}

export default function WidgetSettings() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [widget, setWidget] = useState<WidgetConfig | null>(null);
  const [loadingWidget, setLoadingWidget] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [greeting, setGreeting] = useState("");
  const [enableVoice, setEnableVoice] = useState(true);
  const [enableChat, setEnableChat] = useState(true);
  const [primaryColor, setPrimaryColor] = useState("#14b8a6");
  const [position, setPosition] = useState("bottom-right");
  const [voiceAgentId, setVoiceAgentId] = useState("");
  const [chatAgentId, setChatAgentId] = useState("");
  const [retellApiKey, setRetellApiKey] = useState("");
  const [allowedDomains, setAllowedDomains] = useState("");
  const [attributionLink, setAttributionLink] = useState("https://aavacbot.com");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && id) {
      fetchWidget();
    }
  }, [user, id]);

  const fetchWidget = async () => {
    const { data, error } = await supabase
      .from("widget_configs")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      toast.error("Widget not found");
      navigate("/dashboard");
      return;
    }

    setWidget(data);
    setName(data.name);
    setTitle(data.title || "");
    setGreeting(data.greeting || "");
    setEnableVoice(data.enable_voice ?? true);
    setEnableChat(data.enable_chat ?? true);
    setPrimaryColor(data.primary_color || "#14b8a6");
    setPosition(data.position || "bottom-right");
    setVoiceAgentId(data.voice_agent_id || "");
    setChatAgentId(data.chat_agent_id || "");
    setRetellApiKey(data.retell_api_key || "");
    setAllowedDomains((data.allowed_domains || []).join("\n"));
    setAttributionLink(data.attribution_link || "https://aavacbot.com");
    setLoadingWidget(false);
  };

  const saveSettings = async () => {
    if (!widget) return;

    setIsSaving(true);

    const { error } = await supabase
      .from("widget_configs")
      .update({
        name,
        title: title || null,
        greeting: greeting || null,
        enable_voice: enableVoice,
        enable_chat: enableChat,
        primary_color: primaryColor,
        position,
        voice_agent_id: voiceAgentId || null,
        chat_agent_id: chatAgentId || null,
        retell_api_key: retellApiKey || null,
        allowed_domains: allowedDomains
          .split("\n")
          .map((d) => d.trim())
          .filter(Boolean),
        attribution_link: attributionLink || null,
      })
      .eq("id", widget.id);

    if (error) {
      toast.error("Failed to save settings");
    } else {
      toast.success("Settings saved!");
    }

    setIsSaving(false);
  };

  const copyEmbedCode = () => {
    if (!widget) return;
    const embedCode = `<script src="${import.meta.env.VITE_SUPABASE_URL}/functions/v1/widget-embed?api_key=${widget.api_key}"></script>`;
    navigator.clipboard.writeText(embedCode);
    toast.success("Embed code copied!");
  };

  if (loading || loadingWidget) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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

      {/* Settings Form */}
      <main className="container mx-auto px-6 py-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-8">Widget Settings</h1>

        <div className="space-y-8">
          {/* Basic Settings */}
          <section className="glass rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-semibold">Basic Settings</h2>

            <div className="space-y-2">
              <Label htmlFor="name">Widget Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Website Widget"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Display Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="AI Assistant"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="greeting">Greeting Message</Label>
              <Textarea
                id="greeting"
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                placeholder="Hi! How can I help you today?"
                rows={2}
              />
            </div>
          </section>

          {/* Features */}
          <section className="glass rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-semibold">Features</h2>

            <div className="flex items-center justify-between">
              <div>
                <Label>Voice Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Allow voice conversations
                </p>
              </div>
              <Switch
                checked={enableVoice}
                onCheckedChange={setEnableVoice}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Chat Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Allow text conversations
                </p>
              </div>
              <Switch
                checked={enableChat}
                onCheckedChange={setEnableChat}
              />
            </div>
          </section>

          {/* Appearance */}
          <section className="glass rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-semibold">Appearance</h2>

            <div className="space-y-2">
              <Label htmlFor="color">Primary Color</Label>
              <div className="flex gap-3">
                <Input
                  id="color"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Widget Position</Label>
              <Select value={position} onValueChange={setPosition}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom-right">Bottom Right</SelectItem>
                  <SelectItem value="bottom-left">Bottom Left</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>

          {/* Attribution Link */}
          <section className="glass rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-semibold">Attribution Link</h2>
            <p className="text-sm text-muted-foreground">
              A small "Powered by" link appears at the bottom of the widget. Customize the URL or leave empty to remove.
            </p>

            <div className="space-y-2">
              <Label htmlFor="attributionLink">Attribution URL</Label>
              <Input
                id="attributionLink"
                value={attributionLink}
                onChange={(e) => setAttributionLink(e.target.value)}
                placeholder="https://yourwebsite.com"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to hide the attribution link entirely
              </p>
            </div>
          </section>

          {/* Retell Configuration */}
          <section className="glass rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-semibold">Retell AI Configuration</h2>
            <p className="text-sm text-muted-foreground">
              Enter your Retell API key and agent IDs to connect voice and chat
            </p>

            <div className="space-y-2">
              <Label htmlFor="retellApiKey">Retell API Key</Label>
              <Input
                id="retellApiKey"
                type="password"
                value={retellApiKey}
                onChange={(e) => setRetellApiKey(e.target.value)}
                placeholder="key_xxxxx"
              />
              <p className="text-xs text-muted-foreground">
                Get your API key from{" "}
                <a
                  href="https://dashboard.retellai.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Retell Dashboard
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="voiceAgent">Voice Agent ID</Label>
              <Input
                id="voiceAgent"
                value={voiceAgentId}
                onChange={(e) => setVoiceAgentId(e.target.value)}
                placeholder="agent_xxxxx"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="chatAgent">Chat Agent ID</Label>
              <Input
                id="chatAgent"
                value={chatAgentId}
                onChange={(e) => setChatAgentId(e.target.value)}
                placeholder="agent_xxxxx"
              />
            </div>
          </section>

          {/* Domain Whitelisting */}
          <section className="glass rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-semibold">Allowed Domains</h2>
            <p className="text-sm text-muted-foreground">
              Restrict which websites can use this widget (one per line). Leave
              empty to allow all domains.
            </p>

            <div className="space-y-2">
              <Textarea
                value={allowedDomains}
                onChange={(e) => setAllowedDomains(e.target.value)}
                placeholder="example.com&#10;mysite.com"
                rows={4}
              />
            </div>
          </section>

          {/* Embed Code */}
          <section className="glass rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">Embed Code</h2>
            <p className="text-sm text-muted-foreground">
              Add this code before the closing &lt;/body&gt; tag on your website.
            </p>

            <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm break-all">
              {`<script src="${import.meta.env.VITE_SUPABASE_URL}/functions/v1/widget-embed?api_key=${widget?.api_key}"></script>`}
            </div>

            <Button onClick={copyEmbedCode} variant="outline" className="gap-2">
              <Copy className="w-4 h-4" />
              Copy Embed Code
            </Button>
          </section>
        </div>
      </main>
    </div>
  );
}
