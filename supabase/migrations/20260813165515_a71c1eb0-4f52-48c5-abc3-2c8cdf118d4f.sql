-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin','professional','client');
CREATE TYPE public.verification_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.request_status AS ENUM ('pending','quoted','accepted','done','cancelled');
CREATE TYPE public.amba_zone AS ENUM ('CABA','Norte','Sur','Oeste');

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  avatar_url text,
  phone text,
  location text,
  zone public.amba_zone,
  security_verified boolean NOT NULL DEFAULT false,
  is_blocked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- PRO DETAILS
CREATE TABLE public.pro_details (
  pro_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  bio text NOT NULL DEFAULT '',
  headline text NOT NULL DEFAULT '',
  categories text[] NOT NULL DEFAULT '{}',
  zones public.amba_zone[] NOT NULL DEFAULT '{}',
  work_radius_km integer NOT NULL DEFAULT 10,
  hourly_rate numeric(10,2) NOT NULL DEFAULT 0,
  starting_price numeric(10,2) NOT NULL DEFAULT 0,
  years_experience integer NOT NULL DEFAULT 0,
  certificates_url text[] NOT NULL DEFAULT '{}',
  id_document_url text,
  verification public.verification_status NOT NULL DEFAULT 'pending',
  is_featured boolean NOT NULL DEFAULT false,
  is_premium boolean NOT NULL DEFAULT false,
  onboarding_complete boolean NOT NULL DEFAULT false,
  rating_avg numeric(3,2) NOT NULL DEFAULT 0,
  reviews_count integer NOT NULL DEFAULT 0,
  jobs_done integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pro_details TO anon;
GRANT SELECT, INSERT, UPDATE ON public.pro_details TO authenticated;
GRANT ALL ON public.pro_details TO service_role;
ALTER TABLE public.pro_details ENABLE ROW LEVEL SECURITY;

-- SERVICE REQUESTS
CREATE TABLE public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  description text NOT NULL,
  address text NOT NULL DEFAULT '',
  zone public.amba_zone NOT NULL,
  budget_hint text,
  status public.request_status NOT NULL DEFAULT 'pending',
  accepted_quote_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_requests TO authenticated;
GRANT ALL ON public.service_requests TO service_role;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

-- QUOTES
CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  pro_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  price_offered numeric(10,2) NOT NULL,
  message text NOT NULL DEFAULT '',
  accepted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, pro_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO authenticated;
GRANT ALL ON public.quotes TO service_role;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- REVIEWS
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id uuid REFERENCES public.service_requests(id) ON DELETE SET NULL,
  stars integer NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text NOT NULL DEFAULT '',
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- POLICIES: profiles
CREATE POLICY "Profiles are publicly readable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- POLICIES: user_roles
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- POLICIES: pro_details
CREATE POLICY "Pro details publicly readable" ON public.pro_details FOR SELECT USING (true);
CREATE POLICY "Pros insert own details" ON public.pro_details FOR INSERT TO authenticated WITH CHECK (auth.uid() = pro_id);
CREATE POLICY "Pros update own details" ON public.pro_details FOR UPDATE TO authenticated USING (auth.uid() = pro_id) WITH CHECK (auth.uid() = pro_id);
CREATE POLICY "Admins update pro details" ON public.pro_details FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- POLICIES: service_requests
CREATE POLICY "Clients manage own requests" ON public.service_requests FOR ALL TO authenticated USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Pros read open requests" ON public.service_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'professional'));
CREATE POLICY "Admins read requests" ON public.service_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- POLICIES: quotes
CREATE POLICY "Pros manage own quotes" ON public.quotes FOR ALL TO authenticated USING (auth.uid() = pro_id) WITH CHECK (auth.uid() = pro_id);
CREATE POLICY "Clients read quotes on their requests" ON public.quotes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.service_requests r WHERE r.id = request_id AND r.client_id = auth.uid()));
CREATE POLICY "Clients accept quotes on their requests" ON public.quotes FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.service_requests r WHERE r.id = request_id AND r.client_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.service_requests r WHERE r.id = request_id AND r.client_id = auth.uid()));
CREATE POLICY "Admins read quotes" ON public.quotes FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- POLICIES: reviews
CREATE POLICY "Visible reviews are public" ON public.reviews FOR SELECT USING (is_hidden = false OR auth.uid() = client_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Clients create own reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Clients update own reviews" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Admins moderate reviews" ON public.reviews FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete reviews" ON public.reviews FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- TRIGGERS
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER pro_details_updated BEFORE UPDATE ON public.pro_details FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER service_requests_updated BEFORE UPDATE ON public.service_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;

  r := CASE WHEN NEW.raw_user_meta_data->>'role' = 'professional' THEN 'professional'::public.app_role
            ELSE 'client'::public.app_role END;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, r) ON CONFLICT DO NOTHING;

  IF r = 'professional' THEN
    INSERT INTO public.pro_details (pro_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ratings recompute
CREATE OR REPLACE FUNCTION public.recalc_pro_rating() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target uuid;
BEGIN
  target := COALESCE(NEW.pro_id, OLD.pro_id);
  UPDATE public.pro_details p SET
    rating_avg = COALESCE((SELECT ROUND(AVG(stars)::numeric,2) FROM public.reviews WHERE pro_id = target AND is_hidden = false),0),
    reviews_count = (SELECT COUNT(*) FROM public.reviews WHERE pro_id = target AND is_hidden = false)
  WHERE p.pro_id = target;
  RETURN NULL;
END; $$;
CREATE TRIGGER reviews_recalc AFTER INSERT OR UPDATE OR DELETE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.recalc_pro_rating();