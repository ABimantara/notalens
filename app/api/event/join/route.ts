// ============================================================
// POST /api/event/join
// Body: { join_code: string }
// Header: Authorization: Bearer <token>
//
// User memasukkan kode unik untuk bergabung ke event sebagai panitia
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ApiError } from '@/types';

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { join_code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<ApiError>({ error: 'Request body tidak valid' }, { status: 400 });
  }

  const { join_code } = body;
  if (!join_code || join_code.trim().length === 0) {
    return NextResponse.json<ApiError>({ error: 'Kode event wajib diisi' }, { status: 400 });
  }

  // Cari event berdasarkan join_code
  const { data: event, error: findError } = await supabaseAdmin
    .from('events')
    .select('event_id, name, workspace_id')
    .eq('join_code', join_code.trim().toUpperCase())
    .single();

  if (findError || !event) {
    return NextResponse.json<ApiError>({ error: 'Kode event tidak valid' }, { status: 404 });
  }

  // Pastikan user adalah member workspace yang menaungi event ini
  const { data: workspaceMember } = await supabaseAdmin
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', event.workspace_id)
    .eq('user_id', Number(userId))
    .single();

  if (!workspaceMember) {
    return NextResponse.json<ApiError>(
      { error: 'Kamu harus menjadi member workspace terlebih dahulu' },
      { status: 403 }
    );
  }

  // Cek apakah user sudah menjadi participant
  const { data: existingParticipant } = await supabaseAdmin
    .from('event_participants')
    .select('id')
    .eq('event_id', event.event_id)
    .eq('user_id', Number(userId))
    .single();

  if (existingParticipant) {
    return NextResponse.json<ApiError>(
      { error: 'Kamu sudah menjadi participant event ini' },
      { status: 409 }
    );
  }

  // Tambahkan user sebagai participant
  const { error: insertError } = await supabaseAdmin
    .from('event_participants')
    .insert({
      event_id: event.event_id,
      user_id: Number(userId),
    });

  if (insertError) {
    console.error('Join event error:', insertError);
    return NextResponse.json<ApiError>({ error: 'Gagal bergabung ke event' }, { status: 500 });
  }

  return NextResponse.json({
    message: `Berhasil bergabung ke event "${event.name}"`,
    event_id: event.event_id,
    event_name: event.name,
  });
}
