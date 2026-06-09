// ============================================================
// GET  /api/profile        → ambil profil user yang sedang login
// PUT  /api/profile        → update nama user
//
// Header: Authorization: Bearer <token>
// Middleware akan inject x-user-id & x-user-email secara otomatis
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ApiError, User } from '@/types';

// ── GET /api/profile ──────────────────────────────────────────
export async function GET(req: NextRequest) {
  // user_id sudah di-inject oleh middleware ke header x-user-id
  const userId = req.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json<ApiError>(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('user_id, name, email, created_at')
    .eq('user_id', Number(userId))
    .single();

  if (error || !user) {
    return NextResponse.json<ApiError>(
      { error: 'User tidak ditemukan' },
      { status: 404 }
    );
  }

  return NextResponse.json<Omit<User, 'password'>>({ ...user });
}

// ── PUT /api/profile ──────────────────────────────────────────
// Body: { name: string }
// Untuk sekarang hanya nama yang bisa diupdate.
// Tambahkan field lain di sini jika skema users di Supabase bertambah.
export async function PUT(req: NextRequest) {
  const userId = req.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json<ApiError>(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<ApiError>(
      { error: 'Request body tidak valid' },
      { status: 400 }
    );
  }

  const { name } = body;

  if (!name || name.trim().length === 0) {
    return NextResponse.json<ApiError>(
      { error: 'Nama tidak boleh kosong' },
      { status: 400 }
    );
  }

  const { data: updatedUser, error } = await supabaseAdmin
    .from('users')
    .update({ name: name.trim() })
    .eq('user_id', Number(userId))
    .select('user_id, name, email, created_at')
    .single();

  if (error || !updatedUser) {
    console.error('Update profile error:', error);
    return NextResponse.json<ApiError>(
      { error: 'Gagal update profil, coba lagi' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: 'Profil berhasil diupdate',
    user: updatedUser,
  });
}
