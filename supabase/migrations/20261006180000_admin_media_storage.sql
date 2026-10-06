-- ===== Stockage des images du back-office =====
-- Fichiers rangés par site : media/<site_id>/<fichier>. Lecture publique, écriture réservée aux admins du site.
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.can_manage_media(_user_id uuid, _path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (role = 'super_admin'
           OR (role = 'site_admin' AND site_id::text = split_part(_path, '/', 1)))
  )
$$;
REVOKE EXECUTE ON FUNCTION public.can_manage_media(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_media(uuid, text) TO authenticated;

CREATE POLICY "Public read media" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'media');
CREATE POLICY "Admins upload media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND public.can_manage_media(auth.uid(), name));
CREATE POLICY "Admins update media" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'media' AND public.can_manage_media(auth.uid(), name));
CREATE POLICY "Admins delete media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND public.can_manage_media(auth.uid(), name));
