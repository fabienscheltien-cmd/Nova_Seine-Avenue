-- ===== Catégorie « Autre » (filtre des événements) =====
INSERT INTO public.event_categories (id, site_id, name, position)
VALUES ('ca7e0000-0000-4000-8000-000000000005', '5e1e0000-0000-4000-8000-000000000001', 'Autre', 5)
ON CONFLICT (id) DO NOTHING;

-- ===== Écran de première connexion de l'admin de site =====
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admin_onboarded_at timestamptz;

-- ===== Historique des modifications (30 jours) =====
CREATE TABLE public.content_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES public.sites(id) ON DELETE CASCADE,
  table_name text NOT NULL,
  row_id uuid NOT NULL,
  operation text NOT NULL CHECK (operation IN ('update', 'delete')),
  old_data jsonb NOT NULL,
  changed_by uuid,
  changed_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX content_history_site_idx ON public.content_history(site_id, created_at DESC);
CREATE INDEX content_history_created_idx ON public.content_history(created_at);
GRANT SELECT ON public.content_history TO authenticated;
GRANT ALL ON public.content_history TO service_role;
ALTER TABLE public.content_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read history" ON public.content_history FOR SELECT TO authenticated
  USING (site_id IS NOT NULL AND public.is_site_admin(auth.uid(), site_id));

CREATE OR REPLACE FUNCTION public.record_content_history() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  old_json jsonb := to_jsonb(OLD);
  ignored text[] := ARRAY['updated_at', 'registered_count', 'position'];
  sid uuid;
BEGIN
  -- Les mises à jour purement techniques (compteur d'inscrits, horodatage, ordre d'affichage) ne sont pas historisées.
  IF TG_OP = 'UPDATE' AND (to_jsonb(NEW) - ignored) = (old_json - ignored) THEN
    RETURN NEW;
  END IF;
  sid := COALESCE((old_json ->> 'site_id')::uuid, CASE WHEN TG_TABLE_NAME = 'sites' THEN OLD.id END);
  -- Suppression d'un site entier (et de ses contenus en cascade) : rien à restaurer ici.
  IF sid IS NULL OR NOT EXISTS (SELECT 1 FROM public.sites WHERE id = sid) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  INSERT INTO public.content_history (site_id, table_name, row_id, operation, old_data, changed_by, changed_by_email)
  VALUES (sid, TG_TABLE_NAME, OLD.id, lower(TG_OP), old_json, auth.uid(), auth.jwt() ->> 'email');
  DELETE FROM public.content_history WHERE created_at < now() - interval '30 days';
  RETURN COALESCE(NEW, OLD);
END $$;
REVOKE EXECUTE ON FUNCTION public.record_content_history() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['news', 'events', 'event_templates', 'faq_themes', 'faq_items',
    'contacts', 'services', 'building_info', 'sites'] LOOP
    EXECUTE format('CREATE TRIGGER history_%1$s AFTER UPDATE OR DELETE ON public.%1$I
      FOR EACH ROW EXECUTE FUNCTION public.record_content_history()', t);
  END LOOP;
END $$;

-- ===== Déconnexion forcée de toutes les sessions d'un utilisateur (serveur uniquement) =====
CREATE OR REPLACE FUNCTION public.admin_force_sign_out(_user_id uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public, auth AS $$
  DELETE FROM auth.sessions WHERE user_id = _user_id;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_force_sign_out(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_force_sign_out(uuid) TO service_role;
