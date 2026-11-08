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
- Serve the brand logo from public/ as a plain file, not a Lovable asset pointer, so it loads on any host.
- Derive every site icon (favicon.ico, favicon PNG, Apple touch icon, manifest/maskable app icons) and the 1200x630 link-preview card public/share-card.png from the current brand logo; use separate mask-safe app icon padding to preserve the symbol under launcher cropping, and reference the card through absolute og:image/twitter:image URLs built from src/lib/brand.ts because crawlers cannot resolve relative paths.
- previous_version_leads returns only archive rows whose original user_id matches the caller; global canonical_link uniqueness on leads blocks re-adding any link from any account.

- Keep lead collection and the lead register above the overview and feature navigation; share presentation tokens in src/styles.css to keep user, sign-in and admin screens consistent.
- Use account-session helpers for bounded post-login role routing and device-local logout so slow role requests do not trap sign-in or revoke other devices.
- Use the shared lead-status control for explicit verification assignments; opening the workspace always defaults to active leads.
- Use project-owned bounded auth transport and abortable read deadlines with one transient retry; retain cached rows on background read failures and never automatically retry writes, to prevent indefinite loading without duplicating actions.
- vite.config.ts switches nitro to the "vercel" preset only when VERCEL is set, so the same repo deploys on Vercel while Lovable builds stay on Lovable hosting.
- Admin data access runs from the browser through admin-checked database functions and admin row policies (no server secrets), so the admin page works on hosts without the service key such as Vercel.
- Daily admin reports aggregate immutable lead-addition activity and current checked leads through an admin-only database function using Asia/Dhaka day boundaries; sent timestamps are assigned by a database trigger so every write path is counted consistently without inventing historical send dates.
- The admin "Show all leads" list uses a realtime channel (admin-all-leads) on public.leads; keep leads and lead_activity in the supabase_realtime publication when touching schema.
- Admin "view as" reuses the user's own workspace at /leads?as=<user id> instead of a parallel admin UI; the page must re-check has_role before rendering and rely on admin row policies, so one interface serves both roles and non-admins see nothing.
- Account suspension is enforced for the authenticated actor via restrictive RLS and guarded data RPCs; root monitoring signs devices out through per-user realtime plus polling, while active admins retain view-as access. Admin accounts cannot be paused to prevent administrative lockout.
- Account removal is soft removal through account_access, preserving identity and lead ownership; its blocked-access check includes removal. Directory flags are admin-written through guarded RPCs and owner/admin-readable, with shared directory sorting and workspace tags.
