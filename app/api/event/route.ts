// ============================================================
// GET  /api/event   → ambil semua event di workspace tertentu
// POST /api/event   → buat event baru di dalam workspace
//
// Header: Authorization: Bearer <token>
// Query params untuk GET: ?workspace_id=123
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ApiError } from '@/types';

// Generate kode unik 8 karakter untuk event
function generateEventCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ── GET /api/event?workspace_id=123 ──────────────────────────
export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id');

  if (!workspaceId) {
    return NextResponse.json<ApiError>(
      { error: 'workspace_id wajib disertakan sebagai query parameter' },
      { status: 400 }
    );
  }

  // Pastikan user adalah member workspace ini
  const { data: member } = await supabaseAdmin
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', Number(workspaceId))
    .eq('user_id', Number(userId))
    .single();

  if (!member) {
    return NextResponse.json<ApiError>(
      { error: 'Kamu bukan member workspace ini' },
      { status: 403 }
    );
  }

  const { data: events, error } = await supabaseAdmin
    .from('events')
    .select('event_id, name, join_code, creator_id, created_at, workspace_id')
    .eq('workspace_id', Number(workspaceId))
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Get events error:', error);
    return NextResponse.json<ApiError>({ error: 'Gagal mengambil data event' }, { status: 500 });
  }

  return NextResponse.json({ events });
}

// ── POST /api/event ───────────────────────────────────────────
// Body: { name: string, workspace_id: number }
export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { name?: string; workspace_id?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<ApiError>({ error: 'Request body tidak valid' }, { status: 400 });
  }

  const { name, workspace_id } = body;

  if (!name || name.trim().length === 0) {
    return NextResponse.json<ApiError>({ error: 'Nama event tidak boleh kosong' }, { status: 400 });
  }

  if (!workspace_id) {
    return NextResponse.json<ApiError>({ error: 'workspace_id wajib diisi' }, { status: 400 });
  }

  // Pastikan user adalah member workspace
  const { data: member } = await supabaseAdmin
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspace_id)
    .eq('user_id', Number(userId))
    .single();

  if (!member) {
    return NextResponse.json<ApiError>(
      { error: 'Kamu bukan member workspace ini' },
      { status: 403 }
    );
  }

  // Generate join_code unik untuk event
  let joinCode = '';
  let isUnique = false;
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateEventCode();
    const { data: existing } = await supabaseAdmin
      .from('events')
      .select('event_id')
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

  // Insert event baru
  const { data: event, error } = await supabaseAdmin
    .from('events')
    .insert({
      name: name.trim(),
      workspace_id,
      join_code: joinCode,
      creator_id: Number(userId),
    })
    .select('event_id, name, join_code, creator_id, workspace_id, created_at')
    .single();

  if (error || !event) {
    console.error('Create event error:', error);
    return NextResponse.json<ApiError>({ error: 'Gagal membuat event' }, { status: 500 });
  }

  // Otomatis tambahkan creator sebagai participant
  await supabaseAdmin.from('event_participants').insert({
    event_id: event.event_id,
    user_id: Number(userId),
  });

  return NextResponse.json(
    { message: 'Event berhasil dibuat', event },
    { status: 201 }
  );
}
