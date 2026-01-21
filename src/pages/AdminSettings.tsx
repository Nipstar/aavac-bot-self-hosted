import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save, ExternalLink, Shield, Users, Globe, Settings } from "lucide-react";
import TeamManagement from "@/components/TeamManagement";

interface GlobalSettings {
  id: string;
  retell_api_key: string | null;
  default_voice_agent_id: string | null;
  default_chat_agent_id: string | null;
  default_attribution_text: string | null;
  default_attribution_url: string | null;
  disable_public_signup: boolean | null;
}

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
  chat_type: string | null;
  webhook_url: string | null;
  attribution_text: string | null;
  attribution_url: string | null;
}

export default function AdminSettings() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  const [demoSettings, setDemoSettings] = useState<DemoSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Global settings form state
  const [globalRetellApiKey, setGlobalRetellApiKey] = useState("");
  const [defaultVoiceAgentId, setDefaultVoiceAgentId] = useState("");
  const [defaultChatAgentId, setDefaultChatAgentId] = useState("");
  const [defaultAttributionText, setDefaultAttributionText] = useState("Powered By Antek Automation");
  const [defaultAttributionUrl, setDefaultAttributionUrl] = useState("https://www.antekautomation.com");
  const [disablePublicSignup, setDisablePublicSignup] = useState(false);

  // Demo settings form state
  const [title, setTitle] = useState("");
  const [greeting, setGreeting] = useState("");
  const [enableVoice, setEnableVoice] = useState(true);
  const [enableChat, setEnableChat] = useState(true);
  const [primaryColor, setPrimaryColor] = useState("#14b8a6");
  const [demoRetellApiKey, setDemoRetellApiKey] = useState("");
  const [voiceAgentId, setVoiceAgentId] = useState("");
  const [chatAgentId, setChatAgentId] = useState("");
  const [chatType, setChatType] = useState("retell");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [demoAttributionText, setDemoAttributionText] = useState("");
  const [demoAttributionUrl, setDemoAttributionUrl] = useState("");

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

    // Fetch global settings
    const { data: globalData } = await supabase
      .from("global_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (globalData) {
      setGlobalSettings(globalData);
      setGlobalRetellApiKey(globalData.retell_api_key || "");
      setDefaultVoiceAgentId(globalData.default_voice_agent_id || "");
      setDefaultChatAgentId(globalData.default_chat_agent_id || "");
      setDefaultAttributionText(globalData.default_attribution_text || "Powered By Antek Automation");
      setDefaultAttributionUrl(globalData.default_attribution_url || "https://www.antekautomation.com");
      setDisablePublicSignup(globalData.disable_public_signup ?? false);
    }

    // Fetch demo settings
    const { data: demoData } = await supabase
      .from("demo_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (demoData) {
      setDemoSettings(demoData);
      setTitle(demoData.title || "");
      setGreeting(demoData.greeting || "");
      setEnableVoice(demoData.enable_voice ?? true);
      setEnableChat(demoData.enable_chat ?? true);
      setPrimaryColor(demoData.primary_color || "#14b8a6");
      setDemoRetellApiKey(demoData.retell_api_key || "");
      setVoiceAgentId(demoData.voice_agent_id || "");
      setChatAgentId(demoData.chat_agent_id || "");
      setChatType(demoData.chat_type || "retell");
      setWebhookUrl(demoData.webhook_url || "");
      setDemoAttributionText(demoData.attribution_text || "");
      setDemoAttributionUrl(demoData.attribution_url || "");
    }

    setLoadingSettings(false);
  };

  const saveGlobalSettings = async () => {
    if (!globalSettings) return;

    setIsSaving(true);

    const { error } = await supabase
      .from("global_settings")
      .update({
        retell_api_key: globalRetellApiKey || null,
        default_voice_agent_id: defaultVoiceAgentId || null,
        default_chat_agent_id: defaultChatAgentId || null,
        default_attribution_text: defaultAttributionText || null,
        default_attribution_url: defaultAttributionUrl || null,
        disable_public_signup: disablePublicSignup,
        updated_at: new Date().toISOString(),
        updated_by: user?.id,
      })
      .eq("id", globalSettings.id);

    if (error) {
      toast.error("Failed to save global settings");
      console.error(error);
    } else {
      toast.success("Global settings saved!");
    }

    setIsSaving(false);
  };

  const saveDemoSettings = async () => {
    if (!demoSettings) return;

    setIsSaving(true);

    const { error } = await supabase
      .from("demo_settings")
      .update({
        title: title || null,
        greeting: greeting || null,
        enable_voice: enableVoice,
        enable_chat: enableChat,
        primary_color: primaryColor,
        retell_api_key: demoRetellApiKey || null,
        voice_agent_id: voiceAgentId || null,
        chat_agent_id: chatAgentId || null,
        chat_type: chatType,
        webhook_url: webhookUrl || null,
        attribution_text: demoAttributionText || null,
        attribution_url: demoAttributionUrl || null,
        updated_at: new Date().toISOString(),
        updated_by: user?.id,
      })
      .eq("id", demoSettings.id);

    if (error) {
      toast.error("Failed to save demo settings");
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
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Admin Settings</h1>
            <p className="text-sm text-muted-foreground">Platform configuration and team management</p>
          </div>
        </div>

        <Tabs defaultValue="global" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="global" className="gap-2">
              <Globe className="w-4 h-4" />
              Global Settings
            </TabsTrigger>
            <TabsTrigger value="demo" className="gap-2">
              <Settings className="w-4 h-4" />
              Demo Widget
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-2">
              <Users className="w-4 h-4" />
              Team Members
            </TabsTrigger>
          </TabsList>

          <TabsContent value="global" className="space-y-6">
            <section className="glass rounded-xl p-6 space-y-6">
              <h2 className="text-lg font-semibold">Global Retell AI Configuration</h2>
              <p className="text-sm text-muted-foreground">
                These settings are used as defaults for all widgets. Individual widgets can override these.
              </p>

              <div className="space-y-2">
                <Label htmlFor="globalRetellApiKey">Global Retell API Key</Label>
                <Input
                  id="globalRetellApiKey"
                  type="password"
                  value={globalRetellApiKey}
                  onChange={(e) => setGlobalRetellApiKey(e.target.value)}
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
                <Label htmlFor="defaultVoiceAgentId">Default Voice Agent ID</Label>
                <Input
                  id="defaultVoiceAgentId"
                  value={defaultVoiceAgentId}
                  onChange={(e) => setDefaultVoiceAgentId(e.target.value)}
                  placeholder="agent_xxxxx"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultChatAgentId">Default Chat Agent ID</Label>
                <Input
                  id="defaultChatAgentId"
                  value={defaultChatAgentId}
                  onChange={(e) => setDefaultChatAgentId(e.target.value)}
                  placeholder="agent_xxxxx"
                />
              </div>
            </section>

            <section className="glass rounded-xl p-6 space-y-6">
              <h2 className="text-lg font-semibold">Default Attribution</h2>
              <p className="text-sm text-muted-foreground">
                Default attribution settings for new widgets. Users can customize per widget.
              </p>

              <div className="space-y-2">
                <Label htmlFor="defaultAttributionText">Attribution Text</Label>
                <Input
                  id="defaultAttributionText"
                  value={defaultAttributionText}
                  onChange={(e) => setDefaultAttributionText(e.target.value)}
                  placeholder="Powered By Antek Automation"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultAttributionUrl">Attribution URL</Label>
                <Input
                  id="defaultAttributionUrl"
                  value={defaultAttributionUrl}
                  onChange={(e) => setDefaultAttributionUrl(e.target.value)}
                  placeholder="https://www.antekautomation.com"
                />
              </div>
            </section>

            <section className="glass rounded-xl p-6 space-y-6">
              <h2 className="text-lg font-semibold">Security Settings</h2>
              <p className="text-sm text-muted-foreground">
                Control access to the platform. First user is always allowed to sign up and becomes admin.
              </p>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Disable Public Sign-ups</Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, only invited users can create accounts
                  </p>
                </div>
                <Switch
                  checked={disablePublicSignup}
                  onCheckedChange={setDisablePublicSignup}
                />
              </div>
            </section>

            <Button onClick={saveGlobalSettings} disabled={isSaving} className="gap-2">
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Global Settings
            </Button>
          </TabsContent>

          <TabsContent value="demo" className="space-y-6">
            <section className="glass rounded-xl p-6 space-y-6">
              <h2 className="text-lg font-semibold">Display Settings</h2>

              <div className="space-y-2">
                <Label htmlFor="title">Widget Title</Label>
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
                  placeholder="Hi there! 👋 How can I help you today?"
                  rows={2}
                />
              </div>

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
              <h2 className="text-lg font-semibold">Chat Configuration</h2>

              <div className="space-y-2">
                <Label>Chat Type</Label>
                <Select value={chatType} onValueChange={setChatType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retell">Retell AI</SelectItem>
                    <SelectItem value="webhook">Webhook (n8n, Make, etc.)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose between Retell AI for chat or a custom webhook for integrations like n8n
                </p>
              </div>

              {chatType === "webhook" ? (
                <div className="space-y-2">
                  <Label htmlFor="webhookUrl">Webhook URL</Label>
                  <Input
                    id="webhookUrl"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://your-n8n-instance.com/webhook/..."
                  />
                  <p className="text-xs text-muted-foreground">
                    The webhook should accept POST with {`{ message: string, chat_id?: string }`} and return {`{ response: string }`}
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="demoRetellApiKey">Retell API Key (overrides global)</Label>
                    <Input
                      id="demoRetellApiKey"
                      type="password"
                      value={demoRetellApiKey}
                      onChange={(e) => setDemoRetellApiKey(e.target.value)}
                      placeholder="Leave empty to use global key"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="chatAgentId">Chat Agent ID</Label>
                    <Input
                      id="chatAgentId"
                      value={chatAgentId}
                      onChange={(e) => setChatAgentId(e.target.value)}
                      placeholder="agent_xxxxx"
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="voiceAgentId">Voice Agent ID</Label>
                <Input
                  id="voiceAgentId"
                  value={voiceAgentId}
                  onChange={(e) => setVoiceAgentId(e.target.value)}
                  placeholder="agent_xxxxx"
                />
              </div>
            </section>

            <section className="glass rounded-xl p-6 space-y-6">
              <h2 className="text-lg font-semibold">Demo Attribution</h2>

              <div className="space-y-2">
                <Label htmlFor="demoAttributionText">Attribution Text</Label>
                <Input
                  id="demoAttributionText"
                  value={demoAttributionText}
                  onChange={(e) => setDemoAttributionText(e.target.value)}
                  placeholder="Leave empty to use global default"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="demoAttributionUrl">Attribution URL</Label>
                <Input
                  id="demoAttributionUrl"
                  value={demoAttributionUrl}
                  onChange={(e) => setDemoAttributionUrl(e.target.value)}
                  placeholder="Leave empty to use global default"
                />
              </div>
            </section>

            <Button onClick={saveDemoSettings} disabled={isSaving} className="gap-2">
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Demo Settings
            </Button>
          </TabsContent>

          <TabsContent value="team">
            <TeamManagement />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}