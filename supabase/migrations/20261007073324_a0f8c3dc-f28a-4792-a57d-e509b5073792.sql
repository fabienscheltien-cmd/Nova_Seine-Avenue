ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS onboarding_done boolean NOT NULL DEFAULT false;
ALTER TABLE public.contact_messages ADD COLUMN IF NOT EXISTS reply text, ADD COLUMN IF NOT EXISTS replied_at timestamptz;

CREATE TABLE public.content_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  entity text NOT NULL,
  entity_id uuid NOT NULL,
  operation text NOT NULL,
  snapshot jsonb NOT NULL,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.content_history TO authenticated;
GRANT ALL ON public.content_history TO service_role;
ALTER TABLE public.content_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read history" ON public.content_history FOR SELECT TO authenticated
  USING (public.is_site_admin(auth.uid(), site_id) AND created_at > now() - interval '30 days');
CREATE INDEX content_history_site_idx ON public.content_history(site_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.record_history() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb; sid uuid;
BEGIN
  r := to_jsonb(OLD);
  IF TG_TABLE_NAME = 'sites' THEN sid := OLD.id; ELSE sid := (r->>'site_id')::uuid; END IF;
  INSERT INTO public.content_history(site_id, entity, entity_id, operation, snapshot, actor_id)
  VALUES (sid, TG_TABLE_NAME, OLD.id, lower(TG_OP), r, auth.uid());
  DELETE FROM public.content_history WHERE created_at < now() - interval '30 days';
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.record_history() FROM PUBLIC, anon, authenticated;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['events','news','faq_items','faq_themes','contacts','services','building_info','event_templates','sites'] LOOP
    EXECUTE format('CREATE TRIGGER history_%1$s AFTER UPDATE OR DELETE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.record_history()', t);
  END LOOP;
END $$;

CREATE POLICY "Admins read registrant profiles" ON public.profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.event_registrations r WHERE r.user_id = profiles.id AND public.is_site_admin(auth.uid(), r.site_id)));