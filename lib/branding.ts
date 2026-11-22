/** Default public logo path used when `site_branding.logo_url` is empty. */
export const DEFAULT_LOGO_PATH = "/logo.png";

/**
 * Normalize a stored logo URL.
 * Empty, `/logo.png`, and known legacy brand markers → null (use default asset).
 */
export function sanitizeLogoUrl(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (raw === DEFAULT_LOGO_PATH || raw.endsWith("/logo.png")) return null;
  // Legacy منظومتي / old default markers — never treat as custom brand.
  if (/منظومتي|manzomati|manzomaty|old[-_]?logo|legacy[-_]?logo/i.test(raw)) {
    return null;
  }
  return raw;
}
