-- ===== Profils : l'utilisateur ne modifie que ses informations personnelles =====
-- L'e-mail du profil sert au serveur à retrouver un compte (invitations, inscrits) :
-- seul le serveur l'écrit, à partir de l'e-mail vérifié de la connexion.
REVOKE INSERT, UPDATE ON public.profiles FROM authenticated, anon;
GRANT UPDATE (first_name, last_name, company, floor, newsletter_opt_in, newsletter_consent_at,
  notifications_opt_in, admin_onboarded_at) ON public.profiles TO authenticated;

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
CREATE TRIGGER protect_last_super_admin BEFORE UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.protect_last_super_admin();
