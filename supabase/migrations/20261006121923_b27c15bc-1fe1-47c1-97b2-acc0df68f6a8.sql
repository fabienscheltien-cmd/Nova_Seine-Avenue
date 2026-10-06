
REVOKE EXECUTE ON FUNCTION public.validate_registration() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_registered_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_site_admin(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_site_admin(uuid, uuid) TO authenticated;
