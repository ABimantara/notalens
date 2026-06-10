// ============================================================
// GET    /api/workspace/[id]  → detail satu workspace
// PUT    /api/workspace/[id]  → update nama workspace (creator only)
// DELETE /api/workspace/[id]  → hapus workspace (creator only)
//
// Header: Authorization: Bearer <token>
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ApiError } from '@/types';

type Params = { params: Promise<{ id: string }> };

// ── GET /api/workspace/[id] ───────────────────────────────────
export async function GET(req: NextRequest, { params }: Params) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const workspaceId = Number(id);

  const { data: workspace, error } = await supabaseAdmin
    .from('workspaces')
    .select('workspace_id, name, join_code, creator_id, created_at')
    .eq('workspace_id', workspaceId)
    .single();

  if (error || !workspace) {
    return NextResponse.json<ApiError>({ error: 'Workspace tidak ditemukan' }, { status: 404 });
  }

  // Cek apakah user adalah member atau creator
  const isMember = workspace.creator_id === Number(userId);
  if (!isMember) {
    const { data: member } = await supabaseAdmin
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', Number(userId))
      .single();

    if (!member) {
      return NextResponse.json<ApiError>({ error: 'Akses ditolak' }, { status: 403 });
    }
  }

  // Ambil daftar members
  const { data: members } = await supabaseAdmin
    .from('workspace_members')
    .select('user_id, joined_at, users(name, email)')
    .eq('workspace_id', workspaceId);

  return NextResponse.json({ workspace, members: members ?? [] });
}

// ── PUT /api/workspace/[id] ───────────────────────────────────
// Body: { name: string }
// Hanya creator yang boleh edit
export async function PUT(req: NextRequest, { params }: Params) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const workspaceId = Number(id);

  // Cek workspace ada & user adalah creator
  const { data: workspace, error: findError } = await supabaseAdmin
    .from('workspaces')
    .select('workspace_id, creator_id')
    .eq('workspace_id', workspaceId)
    .single();

  if (findError || !workspace) {
    return NextResponse.json<ApiError>({ error: 'Workspace tidak ditemukan' }, { status: 404 });
  }

  if (workspace.creator_id !== Number(userId)) {
    return NextResponse.json<ApiError>(
      { error: 'Hanya creator yang bisa mengubah workspace' },
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
    return NextResponse.json<ApiError>({ error: 'Nama workspace tidak boleh kosong' }, { status: 400 });
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('workspaces')
    .update({ name: name.trim() })
    .eq('workspace_id', workspaceId)
    .select('workspace_id, name, join_code, creator_id, created_at')
    .single();

  if (updateError || !updated) {
    console.error('Update workspace error:', updateError);
    return NextResponse.json<ApiError>({ error: 'Gagal update workspace' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Workspace berhasil diupdate', workspace: updated });
}

// ── DELETE /api/workspace/[id] ────────────────────────────────
// Hanya creator yang boleh hapus
export async function DELETE(req: NextRequest, { params }: Params) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const workspaceId = Number(id);

  // Cek workspace ada & user adalah creator
  const { data: workspace, error: findError } = await supabaseAdmin
    .from('workspaces')
    .select('workspace_id, creator_id')
    .eq('workspace_id', workspaceId)
    .single();

  if (findError || !workspace) {
    return NextResponse.json<ApiError>({ error: 'Workspace tidak ditemukan' }, { status: 404 });
  }

  if (workspace.creator_id !== Number(userId)) {
    return NextResponse.json<ApiError>(
      { error: 'Hanya creator yang bisa menghapus workspace' },
      { status: 403 }
    );
  }

  // Hapus members dulu, baru workspace
  await supabaseAdmin.from('workspace_members').delete().eq('workspace_id', workspaceId);

  const { error: deleteError } = await supabaseAdmin
    .from('workspaces')
    .delete()
    .eq('workspace_id', workspaceId);

  if (deleteError) {
    console.error('Delete workspace error:', deleteError);
    return NextResponse.json<ApiError>({ error: 'Gagal menghapus workspace' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Workspace berhasil dihapus' });
}
