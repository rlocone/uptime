const HOSTNAME_RE = /^[a-z0-9][a-z0-9._-]{0,252}[a-z0-9]$/i

export function normalizeHostname(raw: string): string {
  const hostname = String(raw ?? '').trim().toLowerCase()
  if (!hostname) return ''
  if (!HOSTNAME_RE.test(hostname)) return ''
  return hostname
}
