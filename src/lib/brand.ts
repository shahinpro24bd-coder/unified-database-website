/**
 * Canonical site address — used to build the absolute URLs that link-preview
 * crawlers (WhatsApp, Telegram, Facebook, X) need for `og:image` / `og:url`.
 *
 * Crawlers cannot resolve relative paths, so this must stay a full https URL.
 * When the site moves to a custom domain, set VITE_SITE_URL (e.g.
 * https://teamshahin.com) in the host's environment instead of editing here.
 */
const override = import.meta.env["VITE_SITE_URL"]?.trim();
export const SITE_ORIGIN = (override || "https://theamshahin24.vercel.app").replace(/\/+$/, "");

/** Brand share card (1200x630) served from public/share-card.png. */
export const SHARE_IMAGE = `${SITE_ORIGIN}/share-card.png`;

export const BRAND_NAME = "TEAM SHAHIN";
