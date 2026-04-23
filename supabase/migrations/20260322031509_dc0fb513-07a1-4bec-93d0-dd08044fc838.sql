
-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- User roles table (MUST be before has_role function)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view roles" ON public.user_roles FOR SELECT TO authenticated USING (true);

-- has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Now add admin-only policies using has_role
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT '',
  laboratory TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  approved BOOLEAN NOT NULL DEFAULT false,
  institution TEXT NOT NULL DEFAULT '',
  program TEXT NOT NULL DEFAULT '',
  advisor TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Disease databases
CREATE TABLE public.disease_databases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  disease TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.disease_databases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view databases" ON public.disease_databases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert databases" ON public.disease_databases FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Authenticated can update databases" ON public.disease_databases FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete databases" ON public.disease_databases FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_disease_databases_updated_at BEFORE UPDATE ON public.disease_databases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Database versions
CREATE TABLE public.database_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  database_id UUID NOT NULL REFERENCES public.disease_databases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  version_number TEXT NOT NULL DEFAULT '1.0',
  row_count INTEGER NOT NULL DEFAULT 0,
  data JSONB DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.database_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view versions" ON public.database_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert versions" ON public.database_versions FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Authenticated can update versions" ON public.database_versions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete versions" ON public.database_versions FOR DELETE TO authenticated USING (true);

-- Database variables
CREATE TABLE public.database_variables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  database_id UUID NOT NULL REFERENCES public.disease_databases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  variable_type TEXT NOT NULL DEFAULT 'text',
  category TEXT NOT NULL DEFAULT 'Geral',
  description TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.database_variables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view variables" ON public.database_variables FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert variables" ON public.database_variables FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update variables" ON public.database_variables FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete variables" ON public.database_variables FOR DELETE TO authenticated USING (true);

-- Activity log
CREATE TABLE public.activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  user_name TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT '',
  entity_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view activity" ON public.activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert activity" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Version backups table (automatic backup feature)
CREATE TABLE public.version_backups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  database_id UUID NOT NULL REFERENCES public.disease_databases(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES public.database_versions(id) ON DELETE CASCADE,
  version_name TEXT NOT NULL,
  version_number TEXT NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  data JSONB DEFAULT '[]'::jsonb,
  backup_reason TEXT NOT NULL DEFAULT 'auto',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.version_backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view backups" ON public.version_backups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert backups" ON public.version_backups FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Authenticated can delete backups" ON public.version_backups FOR DELETE TO authenticated USING (true);
