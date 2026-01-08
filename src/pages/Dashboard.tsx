import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Plus,
  Loader2,
  MoreVertical,
  Copy,
  Trash2,
  Code,
  User,
  LogOut,
  Settings,
  Shield,
} from "lucide-react";

interface Widget {
  id: string;
  name: string;
  title: string | null;
  greeting: string | null;
  api_key: string;
  enable_voice: boolean | null;
  enable_chat: boolean | null;
  primary_color: string | null;
  position: string | null;
  created_at: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, profile, loading, signOut } = useAuth();
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loadingWidgets, setLoadingWidgets] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newWidgetName, setNewWidgetName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchWidgets();
      checkAdminRole();
    }
  }, [user]);

  const checkAdminRole = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user!.id)
      .eq("role", "admin")
      .maybeSingle();
    
    setIsAdmin(!!data);
  };

  const fetchWidgets = async () => {
    const { data, error } = await supabase
      .from("widget_configs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching widgets:", error);
      toast.error("Failed to load widgets");
    } else {
      setWidgets(data || []);
    }
    setLoadingWidgets(false);
  };

  const canCreateWidget = widgets.length < 100;

  const createWidget = async () => {
    if (!newWidgetName.trim()) {
      toast.error("Please enter a widget name");
      return;
    }

    if (!canCreateWidget) {
      toast.error("You've reached the maximum limit of 100 widgets per account.");
      return;
    }

    setIsCreating(true);

    const apiKey = `wgt_${Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")}`;

    const { error } = await supabase.from("widget_configs").insert({
      name: newWidgetName,
      api_key: apiKey,
      user_id: user?.id,
    });

    if (error) {
      console.error("Error creating widget:", error);
      toast.error("Failed to create widget");
    } else {
      toast.success("Widget created!");
      setNewWidgetName("");
      setIsCreateOpen(false);
      fetchWidgets();
    }

    setIsCreating(false);
  };

  const deleteWidget = async (id: string) => {
    const { error } = await supabase.from("widget_configs").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete widget");
    } else {
      toast.success("Widget deleted");
      fetchWidgets();
    }
  };

  const copyEmbedCode = (apiKey: string) => {
    const embedCode = `<script src="${import.meta.env.VITE_SUPABASE_URL}/functions/v1/widget-embed?api_key=${apiKey}"></script>`;
    navigator.clipboard.writeText(embedCode);
    toast.success("Embed code copied to clipboard!");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-gradient">
            AAVAC Bot
          </Link>
          
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{profile?.full_name || "User"}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin/demo">
                      <Shield className="w-4 h-4 mr-2" />
                      Admin Settings
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/settings">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Your Widgets</h1>
            <p className="text-muted-foreground">
              {widgets.length}/100 widgets used
            </p>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button disabled={!canCreateWidget} className="gap-2">
                <Plus className="w-4 h-4" />
                New Widget
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Widget</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="widgetName">Widget Name</Label>
                  <Input
                    id="widgetName"
                    placeholder="My Website Widget"
                    value={newWidgetName}
                    onChange={(e) => setNewWidgetName(e.target.value)}
                  />
                </div>
                <Button
                  onClick={createWidget}
                  disabled={isCreating}
                  className="w-full"
                >
                  {isCreating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Create Widget"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loadingWidgets ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : widgets.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Code className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No widgets yet</h2>
            <p className="text-muted-foreground mb-6">
              Create your first widget to get started
            </p>
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Widget
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {widgets.map((widget) => (
              <div
                key={widget.id}
                className="glass rounded-xl p-6 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">{widget.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {widget.title || "AI Assistant"}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => copyEmbedCode(widget.api_key)}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Embed Code
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={`/widget/${widget.id}`}>
                          <Settings className="w-4 h-4 mr-2" />
                          Edit Settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => deleteWidget(widget.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className={widget.enable_voice ? "text-primary" : ""}>
                    Voice: {widget.enable_voice ? "On" : "Off"}
                  </span>
                  <span className={widget.enable_chat ? "text-primary" : ""}>
                    Chat: {widget.enable_chat ? "On" : "Off"}
                  </span>
                </div>

                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => copyEmbedCode(widget.api_key)}
                >
                  <Code className="w-4 h-4" />
                  Get Embed Code
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
