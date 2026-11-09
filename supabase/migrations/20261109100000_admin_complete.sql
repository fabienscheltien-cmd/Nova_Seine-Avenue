-- Compléments du back-office, compatibles avec la base existante.

-- ===== Catégorie « Autre » (filtre des événements) =====
INSERT INTO public.event_categories (id, site_id, name, position)
VALUES ('ca7e0000-0000-4000-8000-000000000005', '5e1e0000-0000-4000-8000-000000000001', 'Autre', 5)
ON CONFLICT (id) DO NOTHING;

-- ===== Historique des modifications =====
ALTER TABLE public.content_history ADD COLUMN IF NOT EXISTS actor_email text;

CREATE OR REPLACE FUNCTION public.record_history() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r jsonb := to_jsonb(OLD);
  ignored text[] := ARRAY['updated_at', 'registered_count', 'position'];
  sid uuid;
BEGIN
  -- Mises à jour purement techniques (compteur d'inscrits, horodatage, ordre) : rien à historiser.
  IF TG_OP = 'UPDATE' AND (to_jsonb(NEW) - ignored) = (r - ignored) THEN
    RETURN NULL;
  END IF;
  sid := CASE WHEN TG_TABLE_NAME = 'sites' THEN OLD.id ELSE (r ->> 'site_id')::uuid END;
  -- Suppression d'un site entier (et de ses contenus en cascade) : rien à restaurer.
  IF sid IS NULL OR NOT EXISTS (SELECT 1 FROM public.sites WHERE id = sid) THEN
    RETURN NULL;
  END IF;
  INSERT INTO public.content_history (site_id, entity, entity_id, operation, snapshot, actor_id, actor_email)
  VALUES (sid, TG_TABLE_NAME, OLD.id, lower(TG_OP), r, auth.uid(), auth.jwt() ->> 'email');
  DELETE FROM public.content_history WHERE created_at < now() - interval '30 days';
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.record_history() FROM PUBLIC, anon, authenticated;

-- ===== Déconnexion forcée de toutes les sessions d'un utilisateur (serveur uniquement) =====
CREATE OR REPLACE FUNCTION public.admin_force_sign_out(_user_id uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public, auth AS $$
  DELETE FROM auth.sessions WHERE user_id = _user_id;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_force_sign_out(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_force_sign_out(uuid) TO service_role;

-- ===== Profils : l'utilisateur ne modifie que ses informations personnelles =====
-- L'e-mail du profil sert au serveur à retrouver un compte (invitations, inscrits) :
-- seul le serveur l'écrit, à partir de l'e-mail vérifié de la connexion.
REVOKE INSERT, UPDATE ON public.profiles FROM authenticated, anon;
GRANT UPDATE (first_name, last_name, company, floor, newsletter_opt_in, newsletter_consent_at,
  notifications_opt_in) ON public.profiles TO authenticated;

-- ===== Rôles : le dernier super-admin ne peut pas être retiré =====
CREATE OR REPLACE FUNCTION public.protect_last_super_admin() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.role = 'super_admin' AND (TG_OP = 'DELETE' OR NEW.role <> 'super_admin')
     AND (SELECT count(*) FROM public.user_roles WHERE role = 'super_admin' AND id <> OLD.id) = 0 THEN
    RAISE EXCEPTION 'Impossible de retirer le dernier super-admin.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
REVOKE EXECUTE ON FUNCTION public.protect_last_super_admin() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS protect_last_super_admin ON public.user_roles;
CREATE TRIGGER protect_last_super_admin BEFORE UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.protect_last_super_admin();

-- ===== Images =====
-- Stockées une seule fois dans la base (l'espace de travail interdit les buckets publics)
-- et servies par la route /media/<id> avec mise en cache : les fiches ne portent qu'une adresse courte,
-- et une image partagée par toute une série d'événements n'est enregistrée qu'une fois.
CREATE TABLE public.media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  data_url text NOT NULL CHECK (data_url ~ '^data:image/(webp|jpeg|png|gif);base64,' AND length(data_url) <= 2000000),
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Lecture uniquement par le serveur (route /media), à partir d'un identifiant impossible à deviner :
-- personne ne peut lister les images, notamment celles d'un brouillon.
REVOKE ALL ON public.media FROM anon, authenticated;
GRANT INSERT, DELETE ON public.media TO authenticated;
GRANT ALL ON public.media TO service_role;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins add media" ON public.media FOR INSERT TO authenticated
  WITH CHECK (public.is_site_admin(auth.uid(), site_id));
CREATE POLICY "Admins delete media" ON public.media FOR DELETE TO authenticated
  USING (public.is_site_admin(auth.uid(), site_id));
