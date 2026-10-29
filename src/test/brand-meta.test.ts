import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { Route as IndexRoute } from "@/routes/index";
import { Route as AuthRoute } from "@/routes/auth";
import { Route as LeadsRoute } from "@/routes/_authenticated/leads";
import { Route as AdminRoute } from "@/routes/_authenticated/admin";
import { SHARE_IMAGE, SITE_ORIGIN } from "@/lib/brand";

type Meta = { name?: string; property?: string; content?: string };

// Read a route's declared metadata without rendering it or running its loader.
function headMeta(route: unknown): Meta[] {
  const options = (route as { options?: { head?: () => { meta?: Meta[] } } }).options;
  return options?.head?.()?.meta ?? [];
}

function contentOf(meta: Meta[], key: string): string | undefined {
  return meta.find((entry) => entry.property === key || entry.name === key)?.content;
}

const pages = [
  ["/", IndexRoute],
  ["/auth", AuthRoute],
  ["/leads", LeadsRoute],
  ["/admin", AdminRoute],
] as const;

describe("Shared-link branding", () => {
  it("sends the TEAM SHAHIN share card on every page, so a shared link never falls back to a platform default", () => {
    for (const [path, route] of pages) {
      const meta = headMeta(route);
      expect(contentOf(meta, "og:image"), path).toBe(SHARE_IMAGE);
      expect(contentOf(meta, "twitter:image"), path).toBe(SHARE_IMAGE);
      expect(contentOf(meta, "og:title"), path).toContain("TEAM SHAHIN");
    }
  });

  it("keeps the builder's name out of page metadata on every page", () => {
    for (const [path, route] of pages) {
      expect(JSON.stringify(headMeta(route)).toLowerCase().includes("lovable"), path).toBe(false);
    }
  });

  it("uses absolute https URLs, because crawlers cannot resolve relative paths", () => {
    expect(SITE_ORIGIN).toMatch(/^https:\/\/[^/]+$/);
    expect(SHARE_IMAGE).toBe(`${SITE_ORIGIN}/share-card.png`);
    for (const [path, route] of pages) {
      expect(contentOf(headMeta(route), "og:url"), path).toMatch(/^https:\/\//);
    }
  });

  it("ships the share card the metadata points at", () => {
    const bytes = readFileSync(resolve("public/share-card.png"));
    expect(bytes.length).toBeGreaterThan(1000);
    expect(bytes.subarray(1, 4).toString()).toBe("PNG");
  });
});
