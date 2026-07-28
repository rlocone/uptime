import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const isProd = process.env.NODE_ENV === 'production'

// Page routes are read-only documents; only GET/HEAD are meaningful.
const allowedPageMethods = new Set(['GET', 'HEAD'])

const cspBase = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
]

function applySecurityHeaders(res: NextResponse, pathname: string) {
  const isSig = pathname.startsWith('/api/sig/')

  if (isSig) {
    // Signature badges are cross-site embeddable images: lock to a minimal CSP
    // but still carry the global transport/privacy headers for consistency.
    res.headers.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'")
    res.headers.set('X-Content-Type-Options', 'nosniff')
    res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.headers.set(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), serial=()'
    )
    res.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
    if (isProd) res.headers.set('X-Frame-Options', 'DENY')
    return res
  }

  // frame-ancestors 'none' only in production so the dev preview iframe still works.
  const csp = isProd ? [...cspBase, "frame-ancestors 'none'"].join('; ') : cspBase.join('; ')

  res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  res.headers.set('Content-Security-Policy', csp)
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), serial=()'
  )
  res.headers.set('Cross-Origin-Opener-Policy', 'same-origin')

  // X-Frame-Options breaks the dev preview iframe, so enforce in production only.
  if (isProd) res.headers.set('X-Frame-Options', 'DENY')

  return res
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isApi = pathname.startsWith('/api/')
  const isAsset =
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/og-image') ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'

  // Block unsupported HTTP methods on page routes (API routes handle their own).
  if (!isApi && !isAsset && !allowedPageMethods.has(req.method)) {
    const res = new NextResponse('Method Not Allowed', {
      status: 405,
      headers: { Allow: 'GET, HEAD' },
    })
    return applySecurityHeaders(res, pathname)
  }

  return applySecurityHeaders(NextResponse.next(), pathname)
}

export const config = {
  // Run on everything except Next internals & static files, so headers apply broadly.
  matcher: ['/((?!_next/static|_next/image).*)'],
}
