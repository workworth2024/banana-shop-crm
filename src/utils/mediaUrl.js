/**
 * Same as storefront: DB may store full CDN URLs or legacy /uploads/... paths.
 */
export function resolveMediaUrl(src) {
  if (!src || typeof src !== 'string') return '';
  const trimmed = src.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const rawBase = import.meta.env.VITE_API_URL || '';
  const origin = rawBase.replace(/\/api\/v3\/?$/, '').replace(/\/$/, '');
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${origin}${path}`;
}
