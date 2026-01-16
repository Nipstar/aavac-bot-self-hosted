-- =============================================
-- AI Widget Platform - Database Schema
-- =============================================
-- Run this SQL in your Supabase SQL Editor to set up all required tables,
-- functions, triggers, and RLS policies.
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ENUMS
-- =============================================

-- Create app_role enum if not exists
DO $$ BEGIN
    CREATE TYPE app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- TABLES
-- =============================================

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    subscription_tier TEXT NOT NULL DEFAULT 'free',
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    subscription_status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Teams table
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'My Team',
    owner_id UUID NOT NULL,
    company_name TEXT,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#14b8a6',
    secondary_color TEXT DEFAULT '#0f172a',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Team members table
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    invited_email TEXT,
    invited_at TIMESTAMP WITH TIME ZONE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(team_id, user_id)
);

-- Team invitations table
CREATE TABLE IF NOT EXISTS public.team_invitations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer',
    token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(team_id, email)
);

-- Global settings table
CREATE TABLE IF NOT EXISTS public.global_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    retell_api_key TEXT,
    default_voice_agent_id TEXT,
    default_chat_agent_id TEXT,
    default_attribution_text TEXT DEFAULT 'Powered By Antek Automation',
    default_attribution_url TEXT DEFAULT 'https://www.antekautomation.com',
    default_background_color TEXT DEFAULT '#ffffff',
    default_text_color TEXT DEFAULT '#1f2937',
    default_button_text_color TEXT DEFAULT '#ffffff',
    default_secondary_color TEXT DEFAULT '#f3f4f6',
    min_password_length INTEGER DEFAULT 8,
    require_uppercase BOOLEAN DEFAULT true,
    require_number BOOLEAN DEFAULT true,
    require_special_char BOOLEAN DEFAULT false,
    disable_public_signup BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_by UUID
);

-- Demo settings table
CREATE TABLE IF NOT EXISTS public.demo_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT DEFAULT 'AI Assistant',
    greeting TEXT DEFAULT 'Hi there! 👋 How can I help you today?',
    enable_voice BOOLEAN DEFAULT true,
    enable_chat BOOLEAN DEFAULT true,
    primary_color TEXT DEFAULT '#14b8a6',
    secondary_color TEXT DEFAULT '#f3f4f6',
    background_color TEXT DEFAULT '#ffffff',
    text_color TEXT DEFAULT '#1f2937',
    button_text_color TEXT DEFAULT '#ffffff',
    attribution_text TEXT DEFAULT 'Powered By Antek Automation',
    attribution_url TEXT DEFAULT 'https://www.antekautomation.com',
    retell_api_key TEXT,
    voice_agent_id TEXT,
    chat_agent_id TEXT,
    chat_type TEXT DEFAULT 'retell',
    webhook_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_by UUID
);

-- Widget configs table
CREATE TABLE IF NOT EXISTS public.widget_configs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    name TEXT NOT NULL,
    api_key TEXT NOT NULL UNIQUE,
    title TEXT DEFAULT 'AI Assistant',
    greeting TEXT DEFAULT 'Hi! How can I help you today?',
    enable_voice BOOLEAN DEFAULT true,
    enable_chat BOOLEAN DEFAULT true,
    primary_color TEXT DEFAULT '#14b8a6',
    secondary_color TEXT DEFAULT '#f3f4f6',
    background_color TEXT DEFAULT '#ffffff',
    text_color TEXT DEFAULT '#1f2937',
    button_text_color TEXT DEFAULT '#ffffff',
    position TEXT DEFAULT 'bottom-right',
    attribution_text TEXT DEFAULT 'Powered By Antek Automation',
    attribution_link TEXT DEFAULT 'https://www.antekautomation.com',
    retell_api_key TEXT,
    voice_agent_id TEXT,
    chat_agent_id TEXT,
    chat_type TEXT DEFAULT 'retell',
    webhook_url TEXT,
    allowed_domains TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function to check if user has role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Function to generate widget API key
CREATE OR REPLACE FUNCTION public.generate_widget_api_key()
RETURNS TEXT AS $$
BEGIN
    RETURN 'wgt_' || encode(gen_random_bytes(24), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check widget limit
CREATE OR REPLACE FUNCTION public.check_widget_limit()
RETURNS TRIGGER AS $$
DECLARE
    widget_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO widget_count
    FROM public.widget_configs
    WHERE user_id = NEW.user_id;
    
    IF widget_count >= 100 THEN
        RAISE EXCEPTION 'You have reached the maximum limit of 100 widgets per account.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check team member limit
CREATE OR REPLACE FUNCTION public.check_team_member_limit()
RETURNS TRIGGER AS $$
DECLARE
    member_count INTEGER;
    owner_tier TEXT;
BEGIN
    SELECT subscription_tier INTO owner_tier
    FROM public.profiles p
    JOIN public.teams t ON t.owner_id = p.user_id
    WHERE t.id = NEW.team_id;
    
    SELECT COUNT(*) INTO member_count
    FROM public.team_members
    WHERE team_id = NEW.team_id;
    
    IF owner_tier = 'pro' AND member_count >= 3 THEN
        RAISE EXCEPTION 'Pro accounts are limited to 3 team members. Contact support for higher limits.';
    END IF;
    
    IF owner_tier = 'free' THEN
        RAISE EXCEPTION 'Team members require a Pro subscription.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get demo display settings (public)
CREATE OR REPLACE FUNCTION public.get_demo_display_settings()
RETURNS TABLE(
    demo_title TEXT,
    demo_greeting TEXT,
    demo_enable_voice BOOLEAN,
    demo_enable_chat BOOLEAN,
    demo_primary_color TEXT,
    demo_background_color TEXT,
    demo_text_color TEXT,
    demo_secondary_color TEXT,
    demo_button_text_color TEXT,
    demo_attribution_text TEXT,
    demo_attribution_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.title,
        d.greeting,
        d.enable_voice,
        d.enable_chat,
        d.primary_color,
        d.background_color,
        d.text_color,
        d.secondary_color,
        d.button_text_color,
        d.attribution_text,
        d.attribution_url
    FROM demo_settings d
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get widget display config (public)
CREATE OR REPLACE FUNCTION public.get_widget_display_config(widget_api_key TEXT)
RETURNS TABLE(
    widget_title TEXT,
    widget_greeting TEXT,
    widget_enable_voice BOOLEAN,
    widget_enable_chat BOOLEAN,
    widget_primary_color TEXT,
    widget_background_color TEXT,
    widget_text_color TEXT,
    widget_secondary_color TEXT,
    widget_button_text_color TEXT,
    widget_position TEXT,
    widget_attribution_link TEXT,
    widget_attribution_text TEXT,
    widget_chat_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.title,
        w.greeting,
        w.enable_voice,
        w.enable_chat,
        w.primary_color,
        w.background_color,
        w.text_color,
        w.secondary_color,
        w.button_text_color,
        w.position,
        w.attribution_link,
        w.attribution_text,
        w.chat_type
    FROM widget_configs w
    WHERE w.api_key = widget_api_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- TRIGGERS
-- =============================================

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_teams_updated_at ON public.teams;
CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON public.teams
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_widget_configs_updated_at ON public.widget_configs;
CREATE TRIGGER update_widget_configs_updated_at
    BEFORE UPDATE ON public.widget_configs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_global_settings_updated_at ON public.global_settings;
CREATE TRIGGER update_global_settings_updated_at
    BEFORE UPDATE ON public.global_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_demo_settings_updated_at ON public.demo_settings;
CREATE TRIGGER update_demo_settings_updated_at
    BEFORE UPDATE ON public.demo_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Widget limit trigger
DROP TRIGGER IF EXISTS check_widget_limit_trigger ON public.widget_configs;
CREATE TRIGGER check_widget_limit_trigger
    BEFORE INSERT ON public.widget_configs
    FOR EACH ROW EXECUTE FUNCTION public.check_widget_limit();

-- Team member limit trigger
DROP TRIGGER IF EXISTS check_team_member_limit_trigger ON public.team_members;
CREATE TRIGGER check_team_member_limit_trigger
    BEFORE INSERT ON public.team_members
    FOR EACH ROW EXECUTE FUNCTION public.check_team_member_limit();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_configs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- User roles policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles
    FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Teams policies
DROP POLICY IF EXISTS "Team owners can manage their teams" ON public.teams;
CREATE POLICY "Team owners can manage their teams" ON public.teams
    FOR ALL USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Team members can view their teams" ON public.teams;
CREATE POLICY "Team members can view their teams" ON public.teams
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM team_members
        WHERE team_members.team_id = teams.id AND team_members.user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Admins can view all teams" ON public.teams;
CREATE POLICY "Admins can view all teams" ON public.teams
    FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Team members policies
DROP POLICY IF EXISTS "Team owners can manage members" ON public.team_members;
CREATE POLICY "Team owners can manage members" ON public.team_members
    FOR ALL USING (EXISTS (
        SELECT 1 FROM teams WHERE teams.id = team_members.team_id AND teams.owner_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM teams WHERE teams.id = team_members.team_id AND teams.owner_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can view their own membership" ON public.team_members;
CREATE POLICY "Users can view their own membership" ON public.team_members
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Team members can view other members" ON public.team_members;
CREATE POLICY "Team members can view other members" ON public.team_members
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid()
    ));

-- Team invitations policies
DROP POLICY IF EXISTS "Team owners can manage invitations" ON public.team_invitations;
CREATE POLICY "Team owners can manage invitations" ON public.team_invitations
    FOR ALL USING (EXISTS (
        SELECT 1 FROM teams WHERE teams.id = team_invitations.team_id AND teams.owner_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM teams WHERE teams.id = team_invitations.team_id AND teams.owner_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Invited users can view their invitation" ON public.team_invitations;
CREATE POLICY "Invited users can view their invitation" ON public.team_invitations
    FOR SELECT USING (email = (SELECT email FROM auth.users WHERE id = auth.uid())::TEXT);

-- Global settings policies
DROP POLICY IF EXISTS "Admins can manage global settings" ON public.global_settings;
CREATE POLICY "Admins can manage global settings" ON public.global_settings
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Demo settings policies
DROP POLICY IF EXISTS "Admins can manage demo settings" ON public.demo_settings;
CREATE POLICY "Admins can manage demo settings" ON public.demo_settings
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can view demo settings" ON public.demo_settings;
CREATE POLICY "Admins can view demo settings" ON public.demo_settings
    FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Widget configs policies
DROP POLICY IF EXISTS "Users can view their own widgets" ON public.widget_configs;
CREATE POLICY "Users can view their own widgets" ON public.widget_configs
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own widgets" ON public.widget_configs;
CREATE POLICY "Users can create their own widgets" ON public.widget_configs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own widgets" ON public.widget_configs;
CREATE POLICY "Users can update their own widgets" ON public.widget_configs
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own widgets" ON public.widget_configs;
CREATE POLICY "Users can delete their own widgets" ON public.widget_configs
    FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all widgets" ON public.widget_configs;
CREATE POLICY "Admins can view all widgets" ON public.widget_configs
    FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage all widgets" ON public.widget_configs;
CREATE POLICY "Admins can manage all widgets" ON public.widget_configs
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- INITIAL DATA
-- =============================================

-- Insert default global settings if not exists
INSERT INTO public.global_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.global_settings LIMIT 1);

-- Insert default demo settings if not exists
INSERT INTO public.demo_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.demo_settings LIMIT 1);

-- =============================================
-- GRANTS
-- =============================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant access to tables
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;

GRANT SELECT ON public.user_roles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.global_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demo_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.widget_configs TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_widget_api_key() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_demo_display_settings() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_widget_display_config(TEXT) TO anon, authenticated;

-- =============================================
-- DONE!
-- =============================================
-- Your database schema has been set up successfully.
-- Next steps:
-- 1. Deploy edge functions
-- 2. Configure environment variables
-- 3. Set up your first admin user
