// ============================================================
// NotaLens - Auth Middleware
// Melindungi semua route /api/* kecuali auth endpoints
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeader } from '@/lib/jwt';

// Route yang tidak perlu auth
const PUBLIC_ROUTES = [
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/reset-password',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Lewatkan public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Hanya protect /api/* routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Cek token (jose — compatible with Edge runtime)
  const token = getTokenFromHeader(req.headers.get('authorization'));
  const payload = token ? await verifyToken(token) : null;

  if (!payload) {
    return NextResponse.json(
      { error: 'Unauthorized - token tidak valid atau expired' },
      { status: 401 }
    );
  }

  // Inject user_id ke header agar bisa dibaca di route handler
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-user-id', String(payload.user_id));
  requestHeaders.set('x-user-email', payload.email);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: '/api/:path*',
};
