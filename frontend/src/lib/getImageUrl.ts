export function getImageUrl(src: string): string {
  if (!src) return '';

  const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

  // Absolute URL: normalize localhost:4003 -> base if needed
  if (/^https?:\/\//i.test(src)) {
    try {
      const u = new URL(src);
      if (base && u.hostname === 'localhost' && u.port === '4003') {
        const b = new URL(base);
        u.protocol = b.protocol;
        u.host = b.host; // hostname:port
        return u.toString();
      }
    } catch {}
    return src;
  }

  // Relative path: ensure leading slash and prefix with base when available
  const path = src.startsWith('/') ? src : `/${src}`;
  return base ? `${base}${path}` : path;
}
