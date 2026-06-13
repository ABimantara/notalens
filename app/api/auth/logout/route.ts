// ============================================================
// POST /api/auth/logout
// Header: Authorization: Bearer <token>
// Note: JWT stateless — logout dilakukan di sisi client dengan
//       menghapus token. Endpoint ini hanya konfirmasi.
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromHeader, verifyToken } from '@/lib/jwt';

export async function POST(req: NextRequest) {
  const token = getTokenFromHeader(req.headers.get('authorization'));

  if (!token || !(await verifyToken(token))) {
    return NextResponse.json(
      { error: 'Token tidak valid atau sudah expired' },
      { status: 401 }
    );
  }

  // Client wajib hapus token dari localStorage/cookie setelah ini
  return NextResponse.json({ message: 'Logout berhasil' });
}
