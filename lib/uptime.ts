export function formatUptime(seconds: number): string {
  if (!seconds || seconds < 0) return '0s'
  const years = Math.floor(seconds / (365.25 * 24 * 3600))
  let rem = seconds % Math.floor(365.25 * 24 * 3600)
  const months = Math.floor(rem / (30.44 * 24 * 3600))
  rem = rem % Math.floor(30.44 * 24 * 3600)
  const days = Math.floor(rem / (24 * 3600))
  rem = rem % (24 * 3600)
  const hours = Math.floor(rem / 3600)
  rem = rem % 3600
  const minutes = Math.floor(rem / 60)
  const secs = Math.floor(rem % 60)

  const parts: string[] = []
  if (years > 0) parts.push(`${years}y`)
  if (months > 0) parts.push(`${months}m`)
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  parts.push(`${secs}s`)
  return parts.join(' ')
}
