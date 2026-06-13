// ============================================================
// GET  /api/profile  → ambil profil user (termasuk avatar_url)
// PUT  /api/profile  → update nama dan/atau avatar
//
// Header: Authorization: Bearer <token>
// Body PUT: multipart/form-data
//   - name: string (opsional)
//   - avatar: File (opsional, image/*)
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ApiError, User } from '@/types';

const AVATAR_BUCKET = 'avatars';

// ── GET /api/profile ──────────────────────────────────────────
export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('user_id, name, email, avatar_url, created_at')
    .eq('user_id', Number(userId))
    .single();

  if (error || !user) {
    return NextResponse.json<ApiError>({ error: 'User tidak ditemukan' }, { status: 404 });
  }

  return NextResponse.json({ ...user });
}

// ── PUT /api/profile ──────────────────────────────────────────
export async function PUT(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 });
  }

  let name: string | undefined;
  let avatarFile: File | null = null;

  const contentType = req.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    name = (formData.get('name') as string | null) ?? undefined;
    avatarFile = formData.get('avatar') as File | null;
  } else {
    // JSON body (name-only update, backward compat)
    try {
      const body = await req.json();
      name = body.name;
    } catch {
      return NextResponse.json<ApiError>({ error: 'Request body tidak valid' }, { status: 400 });
    }
  }

  const updates: Record<string, unknown> = {};

  // Update name if provided
  if (name !== undefined) {
    if (!name.trim()) {
      return NextResponse.json<ApiError>({ error: 'Nama tidak boleh kosong' }, { status: 400 });
    }
    updates.name = name.trim();
  }

  // Upload avatar if provided
  if (avatarFile && avatarFile.size > 0) {
    const mime = avatarFile.type || 'image/jpeg';
    const ext = mime.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
    const path = `${userId}/avatar.${ext}`;

    const arrayBuffer = await avatarFile.arrayBuffer();

    const { error: uploadError } = await supabaseAdmin.storage
      .from(AVATAR_BUCKET)
      .upload(path, arrayBuffer, {
        contentType: mime,
        upsert: true, // overwrite previous avatar
      });

    if (uploadError) {
      console.error('Avatar upload error:', uploadError.message);
      return NextResponse.json<ApiError>(
        { error: 'Gagal upload foto profil' },
        { status: 500 }
      );
    }

    const { data: urlData } = supabaseAdmin.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(path);

    // Append cache-busting so browser picks up the new image even with same path
    updates.avatar_url = `${urlData.publicUrl}?t=${Date.now()}`;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json<ApiError>({ error: 'Tidak ada data yang diubah' }, { status: 400 });
  }

  const { data: updatedUser, error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('user_id', Number(userId))
    .select('user_id, name, email, avatar_url, created_at')
    .single();

  if (error || !updatedUser) {
    console.error('Update profile error:', error);
    return NextResponse.json<ApiError>({ error: 'Gagal update profil, coba lagi' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Profil berhasil diupdate', user: updatedUser });
}
