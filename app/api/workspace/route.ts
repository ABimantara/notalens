// ============================================================
// GET  /api/workspace   → ambil semua workspace milik user
// POST /api/workspace   → buat workspace baru
//
// Header: Authorization: Bearer <token>
// Middleware otomatis inject x-user-id ke header
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ApiError } from '@/types';

// Generate kode unik 6 karakter (huruf besar + angka)
function generateJoinCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ── GET /api/workspace ────────────────────────────────────────
// Ambil semua workspace di mana user adalah creator ATAU member
export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 });
  }

  // Ambil workspace yang di-create user
  const { data: ownedWorkspaces, error: ownedError } = await supabaseAdmin
    .from('workspaces')
    .select('workspace_id, name, join_code, creator_id, created_at')
    .eq('creator_id', Number(userId));

  if (ownedError) {
    console.error('Get workspaces error:', ownedError);
    return NextResponse.json<ApiError>({ error: 'Gagal mengambil data workspace' }, { status: 500 });
  }

  // Ambil workspace yang di-join user (sebagai member)
  const { data: memberOf, error: memberError } = await supabaseAdmin
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', Number(userId));

  if (memberError) {
    console.error('Get member workspaces error:', memberError);
    return NextResponse.json<ApiError>({ error: 'Gagal mengambil data workspace' }, { status: 500 });
  }

  // Ambil detail workspace yang di-join (kalau ada)
  let joinedWorkspaces: object[] = [];
  if (memberOf && memberOf.length > 0) {
    const joinedIds = memberOf.map((m) => m.workspace_id);
    const { data: joined, error: joinedError } = await supabaseAdmin
      .from('workspaces')
      .select('workspace_id, name, join_code, creator_id, created_at')
      .in('workspace_id', joinedIds)
      .neq('creator_id', Number(userId)); // hindari duplikat kalau creator juga member

    if (!joinedError && joined) joinedWorkspaces = joined;
  }

  return NextResponse.json({
    owned: ownedWorkspaces,
    joined: joinedWorkspaces,
  });
}

// ── POST /api/workspace ───────────────────────────────────────
// Body: { name: string }
export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<ApiError>({ error: 'Request body tidak valid' }, { status: 400 });
  }

  const { name } = body;
  if (!name || name.trim().length === 0) {
    return NextResponse.json<ApiError>({ error: 'Nama workspace tidak boleh kosong' }, { status: 400 });
  }

  // Generate join_code unik — coba sampai dapat yang belum dipakai
  let joinCode = '';
  let isUnique = false;
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateJoinCode();
    const { data: existing } = await supabaseAdmin
      .from('workspaces')
      .select('workspace_id')
      .eq('join_code', candidate)
      .single();
    if (!existing) {
      joinCode = candidate;
      isUnique = true;
      break;
    }
  }

  if (!isUnique) {
    return NextResponse.json<ApiError>({ error: 'Gagal generate kode unik, coba lagi' }, { status: 500 });
  }

  // Insert workspace baru
  const { data: workspace, error } = await supabaseAdmin
    .from('workspaces')
    .insert({
      name: name.trim(),
      join_code: joinCode,
      creator_id: Number(userId),
    })
    .select('workspace_id, name, join_code, creator_id, created_at')
    .single();

  if (error || !workspace) {
    console.error('Create workspace error:', error);
    return NextResponse.json<ApiError>({ error: 'Gagal membuat workspace' }, { status: 500 });
  }

  // Otomatis tambahkan creator sebagai member
  await supabaseAdmin.from('workspace_members').insert({
    workspace_id: workspace.workspace_id,
    user_id: Number(userId),
  });

  return NextResponse.json(
    { message: 'Workspace berhasil dibuat', workspace },
    { status: 201 }
  );
}
