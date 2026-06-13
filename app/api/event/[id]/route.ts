// ============================================================
// GET    /api/event/[id]  → detail event + list participants
// PUT    /api/event/[id]  → update nama event (creator only)
// DELETE /api/event/[id]  → hapus event (creator only)
//
// Header: Authorization: Bearer <token>
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ApiError } from '@/types';

type Params = { params: Promise<{ id: string }> };

// ── GET /api/event/[id] ───────────────────────────────────────
export async function GET(req: NextRequest, { params }: Params) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const eventId = Number(id);

  const { data: event, error } = await supabaseAdmin
    .from('events')
    .select('event_id, name, join_code, creator_id, workspace_id, created_at')
    .eq('event_id', eventId)
    .single();

  if (error || !event) {
    return NextResponse.json<ApiError>({ error: 'Event tidak ditemukan' }, { status: 404 });
  }

  // Cek apakah user adalah participant
  const { data: participant } = await supabaseAdmin
    .from('event_participants')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', Number(userId))
    .single();

  if (!participant) {
    return NextResponse.json<ApiError>(
      { error: 'Kamu bukan participant event ini' },
      { status: 403 }
    );
  }

  // Ambil daftar participants
  const { data: participants } = await supabaseAdmin
    .from('event_participants')
    .select('user_id, joined_at, users(name, email)')
    .eq('event_id', eventId);

  return NextResponse.json({ event, participants: participants ?? [] });
}

// ── PUT /api/event/[id] ───────────────────────────────────────
// Body: { name: string }
// Hanya creator yang boleh edit
export async function PUT(req: NextRequest, { params }: Params) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const eventId = Number(id);

  const { data: event, error: findError } = await supabaseAdmin
    .from('events')
    .select('event_id, creator_id')
    .eq('event_id', eventId)
    .single();

  if (findError || !event) {
    return NextResponse.json<ApiError>({ error: 'Event tidak ditemukan' }, { status: 404 });
  }

  if (event.creator_id !== Number(userId)) {
    return NextResponse.json<ApiError>(
      { error: 'Hanya creator yang bisa mengubah event' },
      { status: 403 }
    );
  }

  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<ApiError>({ error: 'Request body tidak valid' }, { status: 400 });
  }

  const { name } = body;
  if (!name || name.trim().length === 0) {
    return NextResponse.json<ApiError>({ error: 'Nama event tidak boleh kosong' }, { status: 400 });
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('events')
    .update({ name: name.trim() })
    .eq('event_id', eventId)
    .select('event_id, name, join_code, creator_id, workspace_id, created_at')
    .single();

  if (updateError || !updated) {
    console.error('Update event error:', updateError);
    return NextResponse.json<ApiError>({ error: 'Gagal update event' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Event berhasil diupdate', event: updated });
}

// ── DELETE /api/event/[id] ────────────────────────────────────
// Hanya creator yang boleh hapus
export async function DELETE(req: NextRequest, { params }: Params) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const eventId = Number(id);

  const { data: event, error: findError } = await supabaseAdmin
    .from('events')
    .select('event_id, creator_id')
    .eq('event_id', eventId)
    .single();

  if (findError || !event) {
    return NextResponse.json<ApiError>({ error: 'Event tidak ditemukan' }, { status: 404 });
  }

  if (event.creator_id !== Number(userId)) {
    return NextResponse.json<ApiError>(
      { error: 'Hanya creator yang bisa menghapus event' },
      { status: 403 }
    );
  }

  // Hapus participants dulu, baru event (cascade harusnya handle ini, tapi explicit lebih aman)
  await supabaseAdmin.from('event_participants').delete().eq('event_id', eventId);

  const { error: deleteError } = await supabaseAdmin
    .from('events')
    .delete()
    .eq('event_id', eventId);

  if (deleteError) {
    console.error('Delete event error:', deleteError);
    return NextResponse.json<ApiError>({ error: 'Gagal menghapus event' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Event berhasil dihapus' });
}
