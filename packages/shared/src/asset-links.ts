import type { AssetLinks } from "./types.ts";

export type AssetLinkKind = keyof AssetLinks;

const SOCIAL_HOSTS = {
  x: ["x.com", "twitter.com"],
  telegram: ["t.me"],
} as const;

function canonicalHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

function parseHttpUrl(raw: string): URL | null {
  const value = raw.trim();
  if (value === "") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

export function normalizeAssetLink(
  kind: AssetLinkKind,
  raw: string,
): string | null {
  const url = parseHttpUrl(raw);
  if (!url) return null;

  const host = canonicalHost(url.hostname);
  if (kind === "x" && !SOCIAL_HOSTS.x.includes(host as "x.com" | "twitter.com")) {
    return null;
  }
  if (kind === "telegram" && !SOCIAL_HOSTS.telegram.includes(host as "t.me")) {
    return null;
  }

  return url.href;
}

export function isOptionalAssetLinkValid(
  kind: AssetLinkKind,
  raw: string,
): boolean {
  return raw.trim() === "" || normalizeAssetLink(kind, raw) !== null;
}

export function normalizeAssetLinks(links: AssetLinks): AssetLinks | undefined {
  const normalized: AssetLinks = {};
  const website = links.website
    ? normalizeAssetLink("website", links.website)
    : null;
  const x = links.x ? normalizeAssetLink("x", links.x) : null;
  const telegram = links.telegram
    ? normalizeAssetLink("telegram", links.telegram)
    : null;

  if (website) normalized.website = website;
  if (x) normalized.x = x;
  if (telegram) normalized.telegram = telegram;

  return normalized.website || normalized.x || normalized.telegram
    ? normalized
    : undefined;
}
