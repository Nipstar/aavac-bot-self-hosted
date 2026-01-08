import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, UserPlus, Trash2, Mail, Crown, Loader2 } from "lucide-react";

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  invited_email: string | null;
  accepted_at: string | null;
  created_at: string;
}

interface TeamInvitation {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  created_at: string;
}

interface Team {
  id: string;
  owner_id: string;
  name: string;
}

export default function TeamManagement() {
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTeamData();
    }
  }, [user]);

  async function fetchTeamData() {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch or create team
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

      setTeam(existingTeam);

      if (existingTeam) {
        // Fetch members
        const { data: membersData, error: membersError } = await supabase
          .from("team_members")
          .select("*")
          .eq("team_id", existingTeam.id);

        if (membersError) throw membersError;
        setMembers(membersData || []);

        // Fetch pending invitations
        const { data: invitesData, error: invitesError } = await supabase
          .from("team_invitations")
          .select("*")
          .eq("team_id", existingTeam.id);

        if (invitesError) throw invitesError;
        setInvitations(invitesData || []);
      }
    } catch (error: any) {
      console.error("Error fetching team data:", error);
      toast.error("Failed to load team data");
    } finally {
      setLoading(false);
    }
  }

  async function sendInvitation() {
    if (!team || !inviteEmail) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from("team_invitations")
        .insert({
          team_id: team.id,
          email: inviteEmail.toLowerCase(),
          role: inviteRole,
        });

      if (error) throw error;

      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      fetchTeamData();
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setSending(false);
    }
  }

  async function cancelInvitation(invitationId: string) {
    try {
      const { error } = await supabase
        .from("team_invitations")
        .delete()
        .eq("id", invitationId);

      if (error) throw error;
      toast.success("Invitation cancelled");
      fetchTeamData();
    } catch (error: any) {
      toast.error("Failed to cancel invitation");
    }
  }

  async function removeMember(memberId: string) {
    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
      toast.success("Member removed");
      fetchTeamData();
    } catch (error: any) {
      toast.error("Failed to remove member");
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
          <Users className="w-5 h-5" />
          Team Management
        </CardTitle>
        <CardDescription>
          Invite team members to collaborate on your widgets
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Owner */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Crown className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-medium">{user?.email}</p>
              <p className="text-xs text-muted-foreground">Owner</p>
            </div>
          </div>
          <Badge variant="secondary">Owner</Badge>
        </div>

        {/* Current Members */}
        {members.map((member) => (
          <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="font-medium">{member.invited_email || "Team member"}</p>
                <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">{member.role}</Badge>
              <Button variant="ghost" size="icon" onClick={() => removeMember(member.id)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}

        {/* Pending Invitations */}
        {invitations.map((invite) => (
          <div key={invite.id} className="flex items-center justify-between p-3 rounded-lg border border-dashed border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <Mail className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">{invite.email}</p>
                <p className="text-xs text-muted-foreground">Pending invitation</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                Pending
              </Badge>
              <Button variant="ghost" size="icon" onClick={() => cancelInvitation(invite.id)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}

        {/* Invite Form */}
        <div className="pt-4 border-t border-border">
          <Label className="text-sm font-medium mb-3 block">Invite Team Member</Label>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="colleague@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1"
            />
            <Select value={inviteRole} onValueChange={setInviteRole}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={sendInvitation} disabled={!inviteEmail || sending}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Viewers can see widgets. Editors can create and modify widgets.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
