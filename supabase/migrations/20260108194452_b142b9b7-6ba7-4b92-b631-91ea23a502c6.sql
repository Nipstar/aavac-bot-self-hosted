-- Create teams table for Pro accounts
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Team',
  -- Whitelabel settings
  logo_url TEXT,
  company_name TEXT,
  primary_color TEXT DEFAULT '#14b8a6',
  secondary_color TEXT DEFAULT '#0f172a',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create team_members table (max 3 for Pro)
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'editor', 'viewer')),
  invited_email TEXT,
  invited_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Create team_invitations for pending invites
CREATE TABLE public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('editor', 'viewer')),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Teams policies: owner can manage, members can view
CREATE POLICY "Team owners can manage their team"
ON public.teams FOR ALL
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Team members can view their team"
ON public.teams FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.team_id = teams.id
    AND team_members.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all teams"
ON public.teams FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Team members policies
CREATE POLICY "Team owners can manage members"
ON public.team_members FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.teams
    WHERE teams.id = team_members.team_id
    AND teams.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.teams
    WHERE teams.id = team_members.team_id
    AND teams.owner_id = auth.uid()
  )
);

CREATE POLICY "Team members can view other members"
ON public.team_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = team_members.team_id
    AND tm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their own membership"
ON public.team_members FOR SELECT
USING (user_id = auth.uid());

-- Team invitations policies
CREATE POLICY "Team owners can manage invitations"
ON public.team_invitations FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.teams
    WHERE teams.id = team_invitations.team_id
    AND teams.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.teams
    WHERE teams.id = team_invitations.team_id
    AND teams.owner_id = auth.uid()
  )
);

CREATE POLICY "Invited users can view their invitation"
ON public.team_invitations FOR SELECT
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Function to check team member limit (max 3 for Pro)
CREATE OR REPLACE FUNCTION public.check_team_member_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_count INTEGER;
  owner_tier TEXT;
BEGIN
  -- Get team owner's subscription tier
  SELECT subscription_tier INTO owner_tier
  FROM public.profiles p
  JOIN public.teams t ON t.owner_id = p.user_id
  WHERE t.id = NEW.team_id;
  
  -- Count existing members (excluding owner)
  SELECT COUNT(*) INTO member_count
  FROM public.team_members
  WHERE team_id = NEW.team_id;
  
  -- Pro accounts limited to 3 team members
  IF owner_tier = 'pro' AND member_count >= 3 THEN
    RAISE EXCEPTION 'Pro accounts are limited to 3 team members. Contact support for higher limits.';
  END IF;
  
  -- Free accounts cannot have team members
  IF owner_tier = 'free' THEN
    RAISE EXCEPTION 'Team members require a Pro subscription.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to enforce team member limit
CREATE TRIGGER enforce_team_member_limit
BEFORE INSERT ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.check_team_member_limit();

-- Add updated_at trigger for teams
CREATE TRIGGER update_teams_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();