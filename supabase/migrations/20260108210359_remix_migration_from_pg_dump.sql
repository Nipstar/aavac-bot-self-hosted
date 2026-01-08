CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'moderator',
    'user'
);


--
-- Name: check_team_member_limit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_team_member_limit() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: check_widget_limit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_widget_limit() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  user_tier TEXT;
  widget_count INTEGER;
  is_admin BOOLEAN;
BEGIN
  -- Check if user is admin (bypass all limits)
  SELECT public.has_role(NEW.user_id, 'admin'::app_role) INTO is_admin;
  IF is_admin THEN
    RETURN NEW;
  END IF;

  -- Get user's subscription tier
  SELECT subscription_tier INTO user_tier
  FROM public.profiles
  WHERE user_id = NEW.user_id;
  
  -- Count existing widgets
  SELECT COUNT(*) INTO widget_count
  FROM public.widget_configs
  WHERE user_id = NEW.user_id;
  
  -- Check limits: free = 1 widget, pro = unlimited
  IF user_tier = 'free' AND widget_count >= 1 THEN
    RAISE EXCEPTION 'Free tier is limited to 1 widget. Upgrade to Pro for unlimited widgets.';
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: generate_widget_api_key(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_widget_api_key() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN 'wgt_' || encode(gen_random_bytes(24), 'hex');
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', '')
  );
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: demo_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.demo_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text DEFAULT 'AI Assistant'::text,
    greeting text DEFAULT 'Hi there! 👋 How can I help you today?'::text,
    enable_voice boolean DEFAULT true,
    enable_chat boolean DEFAULT true,
    primary_color text DEFAULT '#14b8a6'::text,
    retell_api_key text,
    voice_agent_id text,
    chat_agent_id text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email text,
    full_name text,
    avatar_url text,
    subscription_tier text DEFAULT 'free'::text NOT NULL,
    stripe_customer_id text,
    stripe_subscription_id text,
    subscription_status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT profiles_subscription_status_check CHECK ((subscription_status = ANY (ARRAY['active'::text, 'canceled'::text, 'past_due'::text, 'trialing'::text, NULL::text]))),
    CONSTRAINT profiles_subscription_tier_check CHECK ((subscription_tier = ANY (ARRAY['free'::text, 'pro'::text])))
);


--
-- Name: team_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    email text NOT NULL,
    role text DEFAULT 'viewer'::text NOT NULL,
    token text DEFAULT encode(extensions.gen_random_bytes(32), 'hex'::text) NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT team_invitations_role_check CHECK ((role = ANY (ARRAY['editor'::text, 'viewer'::text])))
);


--
-- Name: team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    invited_email text,
    invited_at timestamp with time zone,
    accepted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT team_members_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'editor'::text, 'viewer'::text])))
);


--
-- Name: teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    name text DEFAULT 'My Team'::text NOT NULL,
    logo_url text,
    company_name text,
    primary_color text DEFAULT '#14b8a6'::text,
    secondary_color text DEFAULT '#0f172a'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: widget_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.widget_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    api_key text NOT NULL,
    primary_color text DEFAULT '#14b8a6'::text,
    "position" text DEFAULT 'bottom-right'::text,
    title text DEFAULT 'AI Assistant'::text,
    greeting text DEFAULT 'Hi! How can I help you today?'::text,
    enable_voice boolean DEFAULT true,
    enable_chat boolean DEFAULT true,
    voice_agent_id text,
    chat_agent_id text,
    allowed_domains text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid,
    retell_api_key text,
    CONSTRAINT widget_configs_position_check CHECK (("position" = ANY (ARRAY['bottom-right'::text, 'bottom-left'::text])))
);


--
-- Name: demo_settings demo_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demo_settings
    ADD CONSTRAINT demo_settings_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: team_invitations team_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_invitations
    ADD CONSTRAINT team_invitations_pkey PRIMARY KEY (id);


--
-- Name: team_invitations team_invitations_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_invitations
    ADD CONSTRAINT team_invitations_token_key UNIQUE (token);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_team_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_user_id_key UNIQUE (team_id, user_id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: widget_configs widget_configs_api_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.widget_configs
    ADD CONSTRAINT widget_configs_api_key_key UNIQUE (api_key);


--
-- Name: widget_configs widget_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.widget_configs
    ADD CONSTRAINT widget_configs_pkey PRIMARY KEY (id);


--
-- Name: team_members enforce_team_member_limit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER enforce_team_member_limit BEFORE INSERT ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.check_team_member_limit();


--
-- Name: widget_configs enforce_widget_limit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER enforce_widget_limit BEFORE INSERT ON public.widget_configs FOR EACH ROW EXECUTE FUNCTION public.check_widget_limit();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: teams update_teams_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: widget_configs update_widget_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_widget_configs_updated_at BEFORE UPDATE ON public.widget_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: demo_settings demo_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demo_settings
    ADD CONSTRAINT demo_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: team_invitations team_invitations_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_invitations
    ADD CONSTRAINT team_invitations_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: teams teams_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: widget_configs widget_configs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.widget_configs
    ADD CONSTRAINT widget_configs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: widget_configs Admins can manage all widgets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all widgets" ON public.widget_configs TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: demo_settings Admins can manage demo settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage demo settings" ON public.demo_settings USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: teams Admins can view all teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all teams" ON public.teams FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: widget_configs Admins can view all widgets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all widgets" ON public.widget_configs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: demo_settings Admins can view demo settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view demo settings" ON public.demo_settings FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: team_invitations Invited users can view their invitation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Invited users can view their invitation" ON public.team_invitations FOR SELECT USING ((email = (( SELECT users.email
   FROM auth.users
  WHERE (users.id = auth.uid())))::text));


--
-- Name: demo_settings Public can view demo settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view demo settings" ON public.demo_settings FOR SELECT USING (true);


--
-- Name: widget_configs Public can view widgets by api_key; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view widgets by api_key" ON public.widget_configs FOR SELECT TO anon USING (true);


--
-- Name: team_members Team members can view other members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can view other members" ON public.team_members FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.team_members tm
  WHERE ((tm.team_id = team_members.team_id) AND (tm.user_id = auth.uid())))));


--
-- Name: teams Team members can view their team; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can view their team" ON public.teams FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.team_members
  WHERE ((team_members.team_id = teams.id) AND (team_members.user_id = auth.uid())))));


--
-- Name: team_invitations Team owners can manage invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team owners can manage invitations" ON public.team_invitations USING ((EXISTS ( SELECT 1
   FROM public.teams
  WHERE ((teams.id = team_invitations.team_id) AND (teams.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.teams
  WHERE ((teams.id = team_invitations.team_id) AND (teams.owner_id = auth.uid())))));


--
-- Name: team_members Team owners can manage members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team owners can manage members" ON public.team_members USING ((EXISTS ( SELECT 1
   FROM public.teams
  WHERE ((teams.id = team_members.team_id) AND (teams.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.teams
  WHERE ((teams.id = team_members.team_id) AND (teams.owner_id = auth.uid())))));


--
-- Name: teams Team owners can manage their team; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team owners can manage their team" ON public.teams USING ((auth.uid() = owner_id)) WITH CHECK ((auth.uid() = owner_id));


--
-- Name: widget_configs Users can create their own widgets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own widgets" ON public.widget_configs FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: widget_configs Users can delete their own widgets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own widgets" ON public.widget_configs FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: widget_configs Users can update their own widgets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own widgets" ON public.widget_configs FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: team_members Users can view their own membership; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own membership" ON public.team_members FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: widget_configs Users can view their own widgets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own widgets" ON public.widget_configs FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: demo_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.demo_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: team_invitations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

--
-- Name: team_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

--
-- Name: teams; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: widget_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.widget_configs ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;