
-- ===== Roles =====
CREATE TYPE public.app_role AS ENUM ('super_admin', 'site_admin', 'occupant');

-- ===== Sites =====
CREATE TABLE public.sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  address text,
  logo_url text,
  primary_color text,
  booking_url text,
  resto_url text,
  reception_email text,
  reception_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sites TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sites TO authenticated;
GRANT ALL ON public.sites TO service_role;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

-- ===== User roles =====
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  site_id uuid REFERENCES public.sites(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, site_id)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_site_admin(_user_id uuid, _site_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (role = 'super_admin' OR (role = 'site_admin' AND site_id = _site_id))
  )
$$;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin')
         OR (site_id IS NOT NULL AND public.is_site_admin(auth.uid(), site_id)));

CREATE POLICY "Public read sites" ON public.sites FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins update site" ON public.sites FOR UPDATE TO authenticated
  USING (public.is_site_admin(auth.uid(), id)) WITH CHECK (public.is_site_admin(auth.uid(), id));
CREATE POLICY "Super admins insert sites" ON public.sites FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins delete sites" ON public.sites FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Pending grants applied at first sign-in (matched by verified email)
CREATE TABLE public.role_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role public.app_role NOT NULL,
  site_id uuid REFERENCES public.sites(id) ON DELETE CASCADE,
  invited_by uuid,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.role_invitations TO authenticated;
GRANT ALL ON public.role_invitations TO service_role;
ALTER TABLE public.role_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read invitations" ON public.role_invitations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR (site_id IS NOT NULL AND public.is_site_admin(auth.uid(), site_id)));

-- ===== Profiles =====
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text,
  first_name text,
  last_name text,
  company text,
  floor text,
  site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
  newsletter_opt_in boolean NOT NULL DEFAULT false,
  newsletter_consent_at timestamptz,
  notifications_opt_in boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own profile read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'super_admin')
         OR (site_id IS NOT NULL AND public.is_site_admin(auth.uid(), site_id)));
CREATE POLICY "Own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Own profile delete" ON public.profiles FOR DELETE TO authenticated USING (id = auth.uid());

-- ===== Generic updated_at =====
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- ===== News =====
CREATE TABLE public.news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  title text NOT NULL,
  summary text,
  content text,
  category text,
  image_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','scheduled')),
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ===== Events =====
CREATE TABLE public.event_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  name text NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.event_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  name text NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.event_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  name text NOT NULL,
  category_id uuid REFERENCES public.event_categories(id) ON DELETE SET NULL,
  location_id uuid REFERENCES public.event_locations(id) ON DELETE SET NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  description text,
  capacity int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  title text NOT NULL,
  category_id uuid REFERENCES public.event_categories(id) ON DELETE SET NULL,
  location_id uuid REFERENCES public.event_locations(id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  description text,
  image_url text,
  capacity int,
  registered_count int NOT NULL DEFAULT 0,
  registration_open boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','cancelled')),
  series_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX events_site_start_idx ON public.events(site_id, starts_at);

CREATE TABLE public.event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

-- ===== Building =====
CREATE TABLE public.faq_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  name text NOT NULL,
  position int NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.faq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  theme_id uuid NOT NULL REFERENCES public.faq_themes(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL DEFAULT '',
  position int NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  role_label text NOT NULL,
  name text,
  email text,
  phone text,
  hours text,
  is_emergency boolean NOT NULL DEFAULT false,
  position int NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  hours text,
  provider text,
  prices text,
  link text,
  image_url text,
  position int NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.building_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  position int NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','handled')),
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  entity text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===== Grants =====
GRANT SELECT ON public.news, public.event_categories, public.event_locations, public.events,
  public.faq_themes, public.faq_items, public.contacts, public.services, public.building_info TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.news, public.event_categories, public.event_locations,
  public.event_templates, public.events, public.event_registrations, public.faq_themes, public.faq_items,
  public.contacts, public.services, public.building_info, public.contact_messages TO authenticated;
GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.news, public.event_categories, public.event_locations, public.event_templates,
  public.events, public.event_registrations, public.faq_themes, public.faq_items, public.contacts,
  public.services, public.building_info, public.contact_messages, public.activity_log TO service_role;

ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.building_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- ===== Policies: public read of published content =====
CREATE POLICY "Public read news" ON public.news FOR SELECT TO anon, authenticated
  USING (status IN ('published','scheduled') AND published_at IS NOT NULL AND published_at <= now());
CREATE POLICY "Public read events" ON public.events FOR SELECT TO anon, authenticated
  USING (status IN ('published','cancelled'));
CREATE POLICY "Public read categories" ON public.event_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read locations" ON public.event_locations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read faq themes" ON public.faq_themes FOR SELECT TO anon, authenticated USING (visible);
CREATE POLICY "Public read faq items" ON public.faq_items FOR SELECT TO anon, authenticated USING (visible);
CREATE POLICY "Public read contacts" ON public.contacts FOR SELECT TO anon, authenticated USING (visible);
CREATE POLICY "Public read services" ON public.services FOR SELECT TO anon, authenticated USING (visible);
CREATE POLICY "Public read building info" ON public.building_info FOR SELECT TO anon, authenticated USING (visible);

-- ===== Policies: admin manage (per table) =====
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['news','event_categories','event_locations','event_templates','events',
    'faq_themes','faq_items','contacts','services','building_info'] LOOP
    EXECUTE format('CREATE POLICY "Admins manage %1$s" ON public.%1$I FOR ALL TO authenticated
      USING (public.is_site_admin(auth.uid(), site_id)) WITH CHECK (public.is_site_admin(auth.uid(), site_id))', t);
    EXECUTE format('CREATE TRIGGER touch_%1$s BEFORE UPDATE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at()', t);
  END LOOP;
END $$;
CREATE TRIGGER touch_sites BEFORE UPDATE ON public.sites FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_contact_messages BEFORE UPDATE ON public.contact_messages FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Contact messages: inserted by server code only; admins read/update
CREATE POLICY "Admins read messages" ON public.contact_messages FOR SELECT TO authenticated
  USING (public.is_site_admin(auth.uid(), site_id));
CREATE POLICY "Admins update messages" ON public.contact_messages FOR UPDATE TO authenticated
  USING (public.is_site_admin(auth.uid(), site_id)) WITH CHECK (public.is_site_admin(auth.uid(), site_id));
CREATE POLICY "Admins delete messages" ON public.contact_messages FOR DELETE TO authenticated
  USING (public.is_site_admin(auth.uid(), site_id));

-- Activity log
CREATE POLICY "Admins read log" ON public.activity_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR (site_id IS NOT NULL AND public.is_site_admin(auth.uid(), site_id)));
CREATE POLICY "Actors write log" ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- Registrations
CREATE POLICY "Own registrations read" ON public.event_registrations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_site_admin(auth.uid(), site_id));
CREATE POLICY "Own registrations insert" ON public.event_registrations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own registrations delete" ON public.event_registrations FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_site_admin(auth.uid(), site_id));

-- Registration validation + counter
CREATE OR REPLACE FUNCTION public.validate_registration() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.events%ROWTYPE;
BEGIN
  SELECT * INTO e FROM public.events WHERE id = NEW.event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Événement introuvable'; END IF;
  IF e.status <> 'published' THEN RAISE EXCEPTION 'Inscriptions fermées'; END IF;
  IF NOT e.registration_open THEN RAISE EXCEPTION 'Inscriptions fermées'; END IF;
  IF e.ends_at < now() THEN RAISE EXCEPTION 'Événement terminé'; END IF;
  IF e.capacity IS NOT NULL AND e.registered_count >= e.capacity THEN RAISE EXCEPTION 'Complet'; END IF;
  NEW.site_id := e.site_id;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_registration BEFORE INSERT ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.validate_registration();

CREATE OR REPLACE FUNCTION public.sync_registered_count() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.events SET registered_count =
    (SELECT count(*) FROM public.event_registrations WHERE event_id = COALESCE(NEW.event_id, OLD.event_id))
  WHERE id = COALESCE(NEW.event_id, OLD.event_id);
  RETURN NULL;
END $$;
CREATE TRIGGER sync_registered_count AFTER INSERT OR DELETE ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.sync_registered_count();

-- ===== Seed: Seine Avenue =====
INSERT INTO public.sites (id, name, slug, address)
VALUES ('5e1e0000-0000-4000-8000-000000000001', 'Seine Avenue', 'seine-avenue', 'Asnières-sur-Seine');

INSERT INTO public.event_locations (site_id, name, position) VALUES
  ('5e1e0000-0000-4000-8000-000000000001', 'Salle Fitness', 1),
  ('5e1e0000-0000-4000-8000-000000000001', 'Hall d''accueil', 2);

INSERT INTO public.event_categories (id, site_id, name, position) VALUES
  ('ca7e0000-0000-4000-8000-000000000001', '5e1e0000-0000-4000-8000-000000000001', 'Sport', 1),
  ('ca7e0000-0000-4000-8000-000000000002', '5e1e0000-0000-4000-8000-000000000001', 'Bien-être', 2),
  ('ca7e0000-0000-4000-8000-000000000003', '5e1e0000-0000-4000-8000-000000000001', 'Animation', 3),
  ('ca7e0000-0000-4000-8000-000000000004', '5e1e0000-0000-4000-8000-000000000001', 'Services', 4);

INSERT INTO public.event_templates (site_id, name, category_id, start_time, end_time) VALUES
  ('5e1e0000-0000-4000-8000-000000000001', 'Cross Training', 'ca7e0000-0000-4000-8000-000000000001', '12:00', '13:00'),
  ('5e1e0000-0000-4000-8000-000000000001', 'Pilates', 'ca7e0000-0000-4000-8000-000000000002', '13:05', '13:50'),
  ('5e1e0000-0000-4000-8000-000000000001', 'CAF', 'ca7e0000-0000-4000-8000-000000000001', '12:15', '13:00'),
  ('5e1e0000-0000-4000-8000-000000000001', 'Stretching', 'ca7e0000-0000-4000-8000-000000000002', '13:00', '13:45'),
  ('5e1e0000-0000-4000-8000-000000000001', 'Circuit renfo', 'ca7e0000-0000-4000-8000-000000000001', '12:15', '13:00'),
  ('5e1e0000-0000-4000-8000-000000000001', 'Boxing', 'ca7e0000-0000-4000-8000-000000000001', '13:05', '13:50');

INSERT INTO public.faq_themes (site_id, name, position) VALUES
  ('5e1e0000-0000-4000-8000-000000000001', 'Accès et badges', 1),
  ('5e1e0000-0000-4000-8000-000000000001', 'Réservations', 2),
  ('5e1e0000-0000-4000-8000-000000000001', 'Restauration', 3),
  ('5e1e0000-0000-4000-8000-000000000001', 'Services', 4),
  ('5e1e0000-0000-4000-8000-000000000001', 'Sécurité', 5),
  ('5e1e0000-0000-4000-8000-000000000001', 'Contacts', 6);

INSERT INTO public.role_invitations (email, role, site_id) VALUES
  ('aurelie.godin@nova-serenity.fr', 'super_admin', NULL),
  ('fabien.scheltien@nova-serenity.fr', 'super_admin', NULL),
  ('accueilseineavenu@gmail.com', 'site_admin', '5e1e0000-0000-4000-8000-000000000001');
