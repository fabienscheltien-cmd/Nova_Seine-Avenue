\set ON_ERROR_STOP 1
-- Lancé par supabase/tests/run.sh après application des migrations.
SET client_min_messages = warning;
-- ===== Outils de test =====
CREATE SCHEMA t;
CREATE TABLE t.results (n serial, name text, ok boolean, detail text);
CREATE FUNCTION t.check(name text, ok boolean, detail text DEFAULT NULL) RETURNS void LANGUAGE sql AS
  $$ INSERT INTO t.results(name, ok, detail) VALUES (name, coalesce(ok, false), detail) $$;
GRANT USAGE ON SCHEMA t TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA t TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA t TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA t TO anon, authenticated, service_role;
-- Joue le rôle d'un utilisateur connecté (comme PostgREST avec un JWT).
CREATE FUNCTION t.as_user(uid uuid, email text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', uid, 'email', email, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END $$;
GRANT EXECUTE ON FUNCTION t.as_user(uuid, text) TO anon, authenticated, service_role;

-- ===== Jeu de données =====
\set SITE1 '''5e1e0000-0000-4000-8000-000000000001'''
INSERT INTO public.sites (id, name, slug) VALUES ('5e1e0000-0000-4000-8000-000000000002', 'Grand Parc', 'grand-parc');
INSERT INTO auth.users (id, email) VALUES
  ('aaaaaaaa-0000-4000-8000-000000000001', 'aurelie.godin@nova-serenity.fr'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'sterenn@example.fr'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'occupant@example.fr'),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'admin2@example.fr'),
  ('aaaaaaaa-0000-4000-8000-000000000005', 'autre@example.fr');
INSERT INTO public.profiles (id, email) SELECT id, email FROM auth.users;
INSERT INTO public.user_roles (user_id, role, site_id) VALUES
  ('aaaaaaaa-0000-4000-8000-000000000001', 'super_admin', NULL),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'site_admin', :SITE1),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'site_admin', '5e1e0000-0000-4000-8000-000000000002');
INSERT INTO public.news (id, site_id, title, status, published_at) VALUES
  ('11111111-0000-4000-8000-000000000001', :SITE1, 'Publiée', 'published', now() - interval '1 day'),
  ('11111111-0000-4000-8000-000000000002', :SITE1, 'Brouillon', 'draft', NULL),
  ('11111111-0000-4000-8000-000000000003', :SITE1, 'Programmée futur', 'scheduled', now() + interval '2 days'),
  ('11111111-0000-4000-8000-000000000004', '5e1e0000-0000-4000-8000-000000000002', 'Site 2', 'published', now());
INSERT INTO public.events (id, site_id, title, starts_at, ends_at, capacity, status) VALUES
  ('22222222-0000-4000-8000-000000000001', :SITE1, 'Pilates', now() + interval '1 day', now() + interval '1 day 1 hour', 1, 'published'),
  ('22222222-0000-4000-8000-000000000002', :SITE1, 'Brouillon', now() + interval '1 day', now() + interval '1 day 1 hour', 10, 'draft'),
  ('22222222-0000-4000-8000-000000000004', :SITE1, 'Yoga', now() + interval '2 day', now() + interval '2 day 1 hour', 10, 'published'),
  ('22222222-0000-4000-8000-000000000003', :SITE1, 'Passé', now() - interval '2 day', now() - interval '2 day' + interval '1 hour', 10, 'published');
INSERT INTO public.contact_messages (site_id, name, email, subject, message) VALUES
  (:SITE1, 'Paul', 'paul@x.fr', 'Badge', 'Perdu'), ('5e1e0000-0000-4000-8000-000000000002', 'Léa', 'lea@x.fr', 'Clim', 'Trop froid');
INSERT INTO auth.sessions (id, user_id) VALUES ('33333333-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000005');
INSERT INTO auth.refresh_tokens (token, user_id, session_id) VALUES ('rt', 'aaaaaaaa-0000-4000-8000-000000000005', '33333333-0000-4000-8000-000000000001');
TRUNCATE public.content_history;

-- ===== 1. Visiteur non connecté =====
BEGIN; SET LOCAL ROLE anon;
SELECT t.check('anon : voit seulement les actualités publiées (pas brouillon ni programmée future)',
  (SELECT array_agg(title ORDER BY title) FROM public.news WHERE site_id = :SITE1) = ARRAY['Publiée']);
SELECT t.check('anon : ne voit pas les événements en brouillon', NOT EXISTS (SELECT 1 FROM public.events WHERE status = 'draft'));
SELECT t.check('anon : lit les catégories de départ (dont « Autre »)', (SELECT count(*) FROM public.event_categories WHERE site_id = :SITE1) = 5);
SELECT t.check('anon : ne lit aucun message de contact', (SELECT count(*) FROM public.contact_messages) = 0);
SELECT t.check('anon : ne lit aucun rôle', (SELECT count(*) FROM public.user_roles) = 0);
SELECT t.check('anon : ne lit pas l''historique', (SELECT count(*) FROM public.content_history) = 0);
SELECT t.check('anon : ne lit aucun profil', (SELECT count(*) FROM public.profiles) = 0);
COMMIT;

-- ===== 2. Occupant =====
BEGIN; SELECT t.as_user('aaaaaaaa-0000-4000-8000-000000000003', 'occupant@example.fr');
DO $$ BEGIN INSERT INTO public.news (site_id, title) VALUES ('5e1e0000-0000-4000-8000-000000000001', 'pirate');
  PERFORM t.check('occupant : ne peut pas publier une actualité', false);
EXCEPTION WHEN insufficient_privilege THEN PERFORM t.check('occupant : ne peut pas publier une actualité', true); END $$;
DO $$ BEGIN INSERT INTO public.user_roles (user_id, role, site_id) VALUES ('aaaaaaaa-0000-4000-8000-000000000003', 'super_admin', NULL);
  PERFORM t.check('occupant : ne peut pas s''attribuer un rôle', false);
EXCEPTION WHEN insufficient_privilege THEN PERFORM t.check('occupant : ne peut pas s''attribuer un rôle', true); END $$;
WITH u AS (UPDATE public.profiles SET first_name = 'Moi' WHERE id = 'aaaaaaaa-0000-4000-8000-000000000003' RETURNING 1)
SELECT t.check('occupant : modifie son propre profil', (SELECT count(*) FROM u) = 1);
WITH u AS (UPDATE public.profiles SET first_name = 'Pirate' WHERE id = 'aaaaaaaa-0000-4000-8000-000000000005' RETURNING 1)
SELECT t.check('occupant : ne modifie pas le profil d''un autre', (SELECT count(*) FROM u) = 0);
WITH u AS (UPDATE public.profiles SET admin_onboarded_at = now() WHERE id = 'aaaaaaaa-0000-4000-8000-000000000003' RETURNING 1)
SELECT t.check('occupant : peut marquer son assistant comme vu (colonne sans enjeu de sécurité)', (SELECT count(*) FROM u) = 1);
DO $$ BEGIN UPDATE public.profiles SET email = 'remplacante@example.fr' WHERE id = 'aaaaaaaa-0000-4000-8000-000000000003';
  PERFORM t.check('occupant : ne peut pas changer l''e-mail de son profil (usurpation d''invitation)', false);
EXCEPTION WHEN insufficient_privilege THEN PERFORM t.check('occupant : ne peut pas changer l''e-mail de son profil (usurpation d''invitation)', true); END $$;
DO $$ BEGIN DELETE FROM public.profiles WHERE id = 'aaaaaaaa-0000-4000-8000-000000000003';
  INSERT INTO public.profiles (id, email) VALUES ('aaaaaaaa-0000-4000-8000-000000000003', 'remplacante@example.fr');
  PERFORM t.check('occupant : ne peut pas recréer son profil avec un autre e-mail', false);
EXCEPTION WHEN insufficient_privilege THEN PERFORM t.check('occupant : ne peut pas recréer son profil avec un autre e-mail', true); END $$;
WITH u AS (UPDATE public.profiles SET newsletter_opt_in = true, newsletter_consent_at = now(), notifications_opt_in = true, company = 'Acme', floor = '3', last_name = 'X' WHERE id = 'aaaaaaaa-0000-4000-8000-000000000003' RETURNING 1)
SELECT t.check('occupant : enregistre tous les champs de « Mon compte »', (SELECT count(*) FROM u) = 1);
INSERT INTO public.event_registrations (event_id, user_id, site_id) VALUES ('22222222-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000003', '5e1e0000-0000-4000-8000-000000000001');
SELECT t.check('occupant : s''inscrit, le compteur passe à 1', (SELECT registered_count FROM public.events WHERE id = '22222222-0000-4000-8000-000000000001') = 1);
DO $$ BEGIN INSERT INTO public.event_registrations (event_id, user_id, site_id) VALUES ('22222222-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000003', '5e1e0000-0000-4000-8000-000000000001');
  PERFORM t.check('occupant : ne peut pas s''inscrire à un événement terminé', false);
EXCEPTION WHEN raise_exception THEN PERFORM t.check('occupant : ne peut pas s''inscrire à un événement terminé', true); END $$;
DO $$ BEGIN INSERT INTO public.event_registrations (event_id, user_id, site_id) VALUES ('22222222-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000005', '5e1e0000-0000-4000-8000-000000000001');
  PERFORM t.check('occupant : ne peut pas inscrire quelqu''un d''autre', false);
EXCEPTION WHEN insufficient_privilege THEN PERFORM t.check('occupant : ne peut pas inscrire quelqu''un d''autre', true); END $$;
SELECT t.check('occupant : ne lit pas les messages de contact', (SELECT count(*) FROM public.contact_messages) = 0);
COMMIT;
-- Événement complet (1 place) pour un second occupant.
BEGIN; SELECT t.as_user('aaaaaaaa-0000-4000-8000-000000000005', 'autre@example.fr');
DO $$ BEGIN INSERT INTO public.event_registrations (event_id, user_id, site_id) VALUES ('22222222-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000005', '5e1e0000-0000-4000-8000-000000000001');
  PERFORM t.check('second occupant : refusé quand l''événement est complet', false);
EXCEPTION WHEN raise_exception THEN PERFORM t.check('second occupant : refusé quand l''événement est complet', true); END $$;
SELECT t.check('second occupant : ne voit pas l''inscription du premier', (SELECT count(*) FROM public.event_registrations) = 0);
COMMIT;

-- ===== 3. Admin du site Seine Avenue =====
BEGIN; SELECT t.as_user('aaaaaaaa-0000-4000-8000-000000000002', 'sterenn@example.fr');
SELECT t.check('admin site : voit aussi les brouillons de son site', (SELECT count(*) FROM public.news WHERE site_id = '5e1e0000-0000-4000-8000-000000000001') = 3);
INSERT INTO public.faq_items (id, site_id, theme_id, question, answer)
  SELECT '44444444-0000-4000-8000-000000000001', site_id, id, 'Badge ?', 'À l''accueil' FROM public.faq_themes WHERE site_id = '5e1e0000-0000-4000-8000-000000000001' ORDER BY position LIMIT 1;
SELECT t.check('admin site : ajoute une question FAQ', (SELECT count(*) FROM public.faq_items) = 1);
DO $$ BEGIN INSERT INTO public.news (site_id, title) VALUES ('5e1e0000-0000-4000-8000-000000000002', 'intrus');
  PERFORM t.check('admin site : ne peut pas écrire sur un autre site', false);
EXCEPTION WHEN insufficient_privilege THEN PERFORM t.check('admin site : ne peut pas écrire sur un autre site', true); END $$;
WITH u AS (UPDATE public.sites SET reception_email = 'accueil@seine.fr' WHERE id = '5e1e0000-0000-4000-8000-000000000001' RETURNING 1)
SELECT t.check('admin site : modifie la configuration de son site', (SELECT count(*) FROM u) = 1);
WITH u AS (UPDATE public.sites SET name = 'Piraté' WHERE id = '5e1e0000-0000-4000-8000-000000000002' RETURNING 1)
SELECT t.check('admin site : ne modifie pas un autre site', (SELECT count(*) FROM u) = 0);
DO $$ BEGIN INSERT INTO public.sites (name, slug) VALUES ('Nouveau', 'nouveau');
  PERFORM t.check('admin site : ne peut pas créer de site', false);
EXCEPTION WHEN insufficient_privilege THEN PERFORM t.check('admin site : ne peut pas créer de site', true); END $$;
SELECT t.check('admin site : lit les messages de son site uniquement', (SELECT array_agg(name) FROM public.contact_messages) = ARRAY['Paul']);
SELECT t.check('admin site : voit les inscriptions de son site', (SELECT count(*) FROM public.event_registrations) = 1);
SELECT t.check('admin site : ne lit pas les rôles d''un autre site', NOT EXISTS (SELECT 1 FROM public.user_roles WHERE site_id = '5e1e0000-0000-4000-8000-000000000002'));
DO $$ BEGIN INSERT INTO public.activity_log (actor_id, action) VALUES ('aaaaaaaa-0000-4000-8000-000000000001', 'usurpation');
  PERFORM t.check('admin site : ne peut pas écrire au journal au nom d''un autre', false);
EXCEPTION WHEN insufficient_privilege THEN PERFORM t.check('admin site : ne peut pas écrire au journal au nom d''un autre', true); END $$;
-- Stockage d'images
INSERT INTO storage.objects (bucket_id, name) VALUES ('media', '5e1e0000-0000-4000-8000-000000000001/photo.jpg');
SELECT t.check('admin site : téléverse une image dans le dossier de son site', true);
DO $$ BEGIN INSERT INTO storage.objects (bucket_id, name) VALUES ('media', '5e1e0000-0000-4000-8000-000000000002/photo.jpg');
  PERFORM t.check('admin site : ne téléverse pas dans le dossier d''un autre site', false);
EXCEPTION WHEN insufficient_privilege THEN PERFORM t.check('admin site : ne téléverse pas dans le dossier d''un autre site', true); END $$;
COMMIT;
BEGIN; SET LOCAL ROLE anon;
SELECT t.check('anon : le bucket « media » est public en lecture', (SELECT public FROM storage.buckets WHERE id = 'media') AND (SELECT count(*) FROM storage.objects) = 1);
COMMIT;
BEGIN; SELECT t.as_user('aaaaaaaa-0000-4000-8000-000000000003', 'occupant@example.fr');
DO $$ BEGIN INSERT INTO storage.objects (bucket_id, name) VALUES ('media', '5e1e0000-0000-4000-8000-000000000001/x.jpg');
  PERFORM t.check('occupant : ne peut pas téléverser d''image', false);
EXCEPTION WHEN insufficient_privilege THEN PERFORM t.check('occupant : ne peut pas téléverser d''image', true); END $$;
COMMIT;

-- ===== 4. Historique des modifications =====
BEGIN; SELECT t.as_user('aaaaaaaa-0000-4000-8000-000000000002', 'sterenn@example.fr');
UPDATE public.faq_items SET answer = 'Nouvelle réponse' WHERE id = '44444444-0000-4000-8000-000000000001';
SELECT t.check('historique : une modification garde l''ancienne version et son auteur',
  (SELECT old_data ->> 'answer' = 'À l''accueil' AND changed_by_email = 'sterenn@example.fr' AND operation = 'update'
   FROM public.content_history WHERE row_id = '44444444-0000-4000-8000-000000000001'));
UPDATE public.faq_items SET position = 7 WHERE id = '44444444-0000-4000-8000-000000000001';
SELECT t.check('historique : un simple changement d''ordre n''est pas historisé',
  (SELECT count(*) FROM public.content_history WHERE row_id = '44444444-0000-4000-8000-000000000001') = 1);
SELECT t.check('historique : une inscription ne crée pas d''entrée sur l''événement',
  NOT EXISTS (SELECT 1 FROM public.content_history WHERE table_name = 'events'));
DELETE FROM public.news WHERE id = '11111111-0000-4000-8000-000000000001';
SELECT t.check('historique : une suppression est historisée',
  EXISTS (SELECT 1 FROM public.content_history WHERE row_id = '11111111-0000-4000-8000-000000000001' AND operation = 'delete'));
-- Restauration comme dans l'interface : réinsertion de l'ancienne version, sans colonnes système.
INSERT INTO public.news (id, site_id, title, summary, content, category, image_url, status, published_at, created_by)
  SELECT r.id, r.site_id, r.title, r.summary, r.content, r.category, r.image_url, r.status, r.published_at, r.created_by
  FROM public.content_history h, jsonb_populate_record(NULL::public.news, h.old_data) r
  WHERE h.row_id = '11111111-0000-4000-8000-000000000001';
SELECT t.check('historique : l''actualité supprimée est restaurée avec le même identifiant',
  EXISTS (SELECT 1 FROM public.news WHERE id = '11111111-0000-4000-8000-000000000001' AND title = 'Publiée'));
DO $$ BEGIN INSERT INTO public.content_history (table_name, row_id, operation, old_data) VALUES ('news', gen_random_uuid(), 'update', '{}');
  PERFORM t.check('historique : impossible d''y écrire directement', false);
EXCEPTION WHEN insufficient_privilege THEN PERFORM t.check('historique : impossible d''y écrire directement', true); END $$;
COMMIT;
BEGIN; SELECT t.as_user('aaaaaaaa-0000-4000-8000-000000000004', 'admin2@example.fr');
SELECT t.check('historique : l''admin d''un autre site ne le voit pas', (SELECT count(*) FROM public.content_history) = 0);
COMMIT;
-- Purge à 30 jours : une entrée ancienne disparaît à la prochaine modification.
INSERT INTO public.content_history (site_id, table_name, row_id, operation, old_data, created_at)
  VALUES ('5e1e0000-0000-4000-8000-000000000001', 'news', gen_random_uuid(), 'update', '{}', now() - interval '31 days');
UPDATE public.news SET title = 'Publiée (modifiée)' WHERE id = '11111111-0000-4000-8000-000000000001';
SELECT t.check('historique : les entrées de plus de 30 jours sont purgées',
  NOT EXISTS (SELECT 1 FROM public.content_history WHERE created_at < now() - interval '30 days'));

-- ===== 5. Super-admin =====
BEGIN; SELECT t.as_user('aaaaaaaa-0000-4000-8000-000000000001', 'aurelie.godin@nova-serenity.fr');
INSERT INTO public.sites (id, name, slug) VALUES ('5e1e0000-0000-4000-8000-000000000003', 'Test', 'test');
SELECT t.check('super-admin : crée un site', true);
SELECT t.check('super-admin : lit les messages de tous les sites', (SELECT count(*) FROM public.contact_messages) = 2);
DELETE FROM public.sites WHERE id = '5e1e0000-0000-4000-8000-000000000002';
SELECT t.check('super-admin : supprime un site entier sans blocage par l''historique', NOT EXISTS (SELECT 1 FROM public.sites WHERE slug = 'grand-parc'));
COMMIT;

-- ===== 6. Fonctions réservées au serveur =====
BEGIN; SELECT t.as_user('aaaaaaaa-0000-4000-8000-000000000001', 'aurelie.godin@nova-serenity.fr');
DO $$ BEGIN PERFORM public.admin_force_sign_out('aaaaaaaa-0000-4000-8000-000000000005');
  PERFORM t.check('déconnexion forcée : interdite depuis le navigateur, même super-admin', false);
EXCEPTION WHEN insufficient_privilege THEN PERFORM t.check('déconnexion forcée : interdite depuis le navigateur, même super-admin', true); END $$;
COMMIT;
BEGIN; SET LOCAL ROLE service_role;
SELECT public.admin_force_sign_out('aaaaaaaa-0000-4000-8000-000000000005');
COMMIT;
SELECT t.check('déconnexion forcée (serveur) : sessions et jetons de rafraîchissement supprimés',
  NOT EXISTS (SELECT 1 FROM auth.sessions WHERE user_id = 'aaaaaaaa-0000-4000-8000-000000000005')
  AND NOT EXISTS (SELECT 1 FROM auth.refresh_tokens WHERE user_id = 'aaaaaaaa-0000-4000-8000-000000000005'));

-- ===== 7. Dernier super-admin =====
DO $$ BEGIN DELETE FROM public.user_roles WHERE role = 'super_admin';
  PERFORM t.check('dernier super-admin : sa suppression est bloquée par la base, même côté serveur', false);
EXCEPTION WHEN raise_exception THEN PERFORM t.check('dernier super-admin : sa suppression est bloquée par la base, même côté serveur', true); END $$;
DO $$ BEGIN UPDATE public.user_roles SET role = 'occupant' WHERE role = 'super_admin';
  PERFORM t.check('dernier super-admin : son rôle ne peut pas être rétrogradé', false);
EXCEPTION WHEN raise_exception THEN PERFORM t.check('dernier super-admin : son rôle ne peut pas être rétrogradé', true); END $$;
INSERT INTO public.user_roles (user_id, role) VALUES ('aaaaaaaa-0000-4000-8000-000000000005', 'super_admin');
DELETE FROM public.user_roles WHERE role = 'super_admin' AND user_id = 'aaaaaaaa-0000-4000-8000-000000000001';
SELECT t.check('dernier super-admin : avec deux super-admins, on peut en retirer un', (SELECT count(*) FROM public.user_roles WHERE role = 'super_admin') = 1);

-- ===== Rapport =====
SELECT CASE WHEN ok THEN 'OK   ' ELSE 'ÉCHEC' END AS statut, name FROM t.results ORDER BY n;
SELECT count(*) FILTER (WHERE ok) AS reussis, count(*) FILTER (WHERE NOT ok) AS echecs FROM t.results;
