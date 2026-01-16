-- Add RLS policies for teams table
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Team owners can do everything with their teams
CREATE POLICY "Team owners can manage their teams"
ON public.teams
FOR ALL
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Team members can view teams they belong to
CREATE POLICY "Team members can view their teams"
ON public.teams
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_members.team_id = teams.id 
    AND team_members.user_id = auth.uid()
  )
);