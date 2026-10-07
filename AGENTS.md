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
- Admin back-office lives under `src/routes/admin*.tsx`; simple site-scoped modules use the generic `CrudPage` (src/components/admin) — keeps modules consistent and small.
- Uploaded images are compressed client-side and stored as data URLs in `image_url` columns — the workspace blocks public storage buckets.
- Content history is recorded by the `record_history` DB trigger into `content_history` (30-day retention) — restore reads snapshots from there.
