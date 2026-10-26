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
- Derive favicon, Apple touch icon and manifest icons from the current brand logo; use separate mask-safe app icon padding to preserve the symbol under launcher cropping.
- previous_version_leads returns only archive rows whose original user_id matches the caller; global canonical_link uniqueness on leads blocks re-adding any link from any account.

- Keep lead collection and the lead register above the overview and feature navigation; share presentation tokens in src/styles.css to keep user, sign-in and admin screens consistent.
- Use account-session helpers for bounded post-login role routing and device-local logout so slow role requests do not trap sign-in or revoke other devices.
- Use the shared lead-status control for explicit verification assignments; opening the workspace always defaults to active leads.
- Use project-owned bounded auth transport and abortable read deadlines with one transient retry; retain cached rows on background read failures and never automatically retry writes, to prevent indefinite loading without duplicating actions.
