// ============================================================
// NotaLens - JWT Utilities (jose — works in Edge middleware + Node routes)
// ============================================================
import { SignJWT, jwtVerify } from 'jose';
import { JWTPayload } from '@/types';

const JWT_EXPIRES_IN = '7d';

function getSecretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  return new TextEncoder().encode(secret);
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({
    user_id: payload.user_id,
    email: payload.email,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(getSecretKey());
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const user_id = payload.user_id;
    const email = payload.email;
    if (typeof user_id !== 'number' || typeof email !== 'string') {
      return null;
    }
    return { user_id, email };
  } catch {
    return null;
  }
}

export function getTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.split(' ')[1];
}
