import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Palette, Loader2, Save } from "lucide-react";

interface Team {
  id: string;
  owner_id: string;
  name: string;
  logo_url: string | null;
  company_name: string | null;
  primary_color: string;
  secondary_color: string;
}

export default function WhitelabelSettings() {
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#14b8a6");
  const [secondaryColor, setSecondaryColor] = useState("#0f172a");

  useEffect(() => {
    if (user) {
      fetchTeamSettings();
    }
  }, [user]);

  async function fetchTeamSettings() {
    if (!user) return;
    setLoading(true);

    try {
      let { data: existingTeam, error: teamError } = await supabase
        .from("teams")
        .select("*")
        .eq("owner_id", user.id)
        .single();

      if (teamError && teamError.code === "PGRST116") {
        // No team exists, create one
        const { data: newTeam, error: createError } = await supabase
          .from("teams")
          .insert({ owner_id: user.id, name: "My Team" })
          .select()
          .single();

        if (createError) throw createError;
        existingTeam = newTeam;
      } else if (teamError) {
        throw teamError;
      }

      if (existingTeam) {
        setTeam(existingTeam);
        setCompanyName(existingTeam.company_name || "");
        setLogoUrl(existingTeam.logo_url || "");
        setPrimaryColor(existingTeam.primary_color || "#14b8a6");
        setSecondaryColor(existingTeam.secondary_color || "#0f172a");
      }
    } catch (error: any) {
      console.error("Error fetching team settings:", error);
      toast.error("Failed to load branding settings");
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    if (!team) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("teams")
        .update({
          company_name: companyName || null,
          logo_url: logoUrl || null,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
        })
        .eq("id", team.id);

      if (error) throw error;
      toast.success("Branding settings saved!");
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Whitelabel & Branding
        </CardTitle>
        <CardDescription>
          Customize your dashboard and widget appearance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Company Name */}
        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name</Label>
          <Input
            id="companyName"
            placeholder="Your Company"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Displayed in the dashboard header and widget
          </p>
        </div>

        {/* Logo URL */}
        <div className="space-y-2">
          <Label htmlFor="logoUrl">Logo URL</Label>
          <div className="flex gap-2">
            <Input
              id="logoUrl"
              placeholder="https://example.com/logo.png"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="flex-1"
            />
            {logoUrl && (
              <div className="w-10 h-10 border rounded flex items-center justify-center bg-muted overflow-hidden">
                <img 
                  src={logoUrl} 
                  alt="Logo preview" 
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Use a square logo (recommended: 200x200px or larger)
          </p>
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="primaryColor">Primary Color</Label>
            <div className="flex gap-2">
              <Input
                id="primaryColor"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#14b8a6"
                className="flex-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondaryColor">Secondary Color</Label>
            <div className="flex gap-2">
              <Input
                id="secondaryColor"
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Input
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                placeholder="#0f172a"
                className="flex-1"
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <Label>Preview</Label>
          <div 
            className="p-4 rounded-lg border"
            style={{ backgroundColor: secondaryColor }}
          >
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain rounded" />
              ) : (
                <div 
                  className="w-8 h-8 rounded flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: primaryColor }}
                >
                  {companyName?.[0] || "A"}
                </div>
              )}
              <span className="text-white font-semibold">
                {companyName || "Your Company"}
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              <button 
                className="px-3 py-1.5 rounded text-sm text-white"
                style={{ backgroundColor: primaryColor }}
              >
                Primary Button
              </button>
              <button 
                className="px-3 py-1.5 rounded text-sm border border-white/30 text-white/80"
              >
                Secondary
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <Button onClick={saveSettings} disabled={saving} className="w-full">
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Branding
        </Button>
      </CardContent>
    </Card>
  );
}
