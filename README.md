# TEAM SHAHIN — Lead Workspace

Private team workspace for collecting, verifying and archiving leads.

- **Stack:** TanStack Start (React 19 + TypeScript), Tailwind CSS v4
- **Data & auth:** managed Postgres backend (Supabase-compatible)
- **Hosting:** any Node/edge host; Vercel is supported through `vite.config.ts`

## Development

You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

Then open the printed local address.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Backend connection (browser) |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Backend connection (server) |
| `VITE_SITE_URL` | Canonical site origin used for link-preview metadata; defaults to the current deployment |

## Notes

- Never commit account passwords or API keys to this repository. Share them through a password manager or the host's secret store instead.
- Site icons and the link-preview card are generated from `public/team-shahin-logo-v2.png`; re-generate them if the brand mark changes.
