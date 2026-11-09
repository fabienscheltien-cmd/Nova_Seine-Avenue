<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Admin back-office lives under `src/routes/admin*.tsx`; simple site-scoped modules use the generic `CrudModule` (src/components/admin) — keeps modules consistent and small. The managed site comes from `useAdminSite()` (src/lib/admin-site.tsx).
- Privileged actions (registrants, cancellation e-mails, access and account management) are server functions in `src/lib/admin.functions.ts`, each re-checking the caller's role.
- Uploaded images are compressed client-side (`uploadImage` in src/lib/admin.ts), stored once in the `media` table — the workspace blocks public storage buckets — and served by the `/media/$id` server route with a one-year cache; `image_url` columns hold the short `/media/<id>` path. Older rows may still hold data URLs, which keep working. Only raster formats are accepted (an SVG could carry script).
- Content history is recorded by the `record_history` DB trigger into `content_history` (30-day retention) — restore reads snapshots from there.
- Users may only update their personal profile columns; `profiles.email` is written server-side from the verified login e-mail.
- Checks: `npm test` (unit), `npm run test:db` (migrations + RLS on a throwaway PostgreSQL 16, see supabase/tests).
