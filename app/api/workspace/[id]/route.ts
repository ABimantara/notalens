// ============================================================
// GET    /api/workspace/[id]  → detail workspace + members + total expenses
// PUT    /api/workspace/[id]  → update nama/budget (creator only)
// DELETE /api/workspace/[id]  → hapus workspace (creator only)
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ApiError } from '@/types';

type Params = { params: Promise<{ id: string }> };

async function assertAccess(workspaceId: number, userId: number) {
  const { data: workspace, error } = await supabaseAdmin
    .from('workspaces')
    .select('workspace_id, name, join_code, creator_id, budget, created_at')
    .eq('workspace_id', workspaceId)
    .single();
  if (error || !workspace) return { workspace: null, error: 'Workspace tidak ditemukan', status: 404 };

  if (workspace.creator_id !== userId) {
    const { data: member } = await supabaseAdmin
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single();
    if (!member) return { workspace: null, error: 'Akses ditolak', status: 403 };
  }
  return { workspace, error: null, status: 200 };
}

// ── GET ──────────────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: Params) {
  const userId = Number(req.headers.get('x-user-id'));
  if (!userId) return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const workspaceId = Number(id);

  const { workspace, error, status } = await assertAccess(workspaceId, userId);
  if (!workspace) return NextResponse.json<ApiError>({ error: error! }, { status });

  // Members
  const { data: members } = await supabaseAdmin
    .from('workspace_members')
    .select('user_id, joined_at, users(name, email, avatar_url)')
    .eq('workspace_id', workspaceId);

  // Total expenses for this workspace
  const { data: expenseData } = await supabaseAdmin
    .from('transactions')
    .select('total_amount')
    .eq('workspace_id', workspaceId);
  const totalExpenses = (expenseData ?? []).reduce((s, t) => s + Number(t.total_amount), 0);

  return NextResponse.json({
    workspace: { ...workspace, total_expenses: totalExpenses },
    members: members ?? [],
  });
}

// ── PUT ──────────────────────────────────────────────────────
export async function PUT(req: NextRequest, { params }: Params) {
  const userId = Number(req.headers.get('x-user-id'));
  if (!userId) return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const workspaceId = Number(id);

  const { data: ws } = await supabaseAdmin
    .from('workspaces')
    .select('creator_id')
    .eq('workspace_id', workspaceId)
    .single();
  if (!ws) return NextResponse.json<ApiError>({ error: 'Workspace tidak ditemukan' }, { status: 404 });
  if (ws.creator_id !== userId) return NextResponse.json<ApiError>({ error: 'Hanya creator yang bisa mengubah workspace' }, { status: 403 });

  let body: { name?: string; budget?: number };
  try { body = await req.json(); } catch {
    return NextResponse.json<ApiError>({ error: 'Request body tidak valid' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.name?.trim()) updates.name = body.name.trim();
  if (body.budget !== undefined) updates.budget = body.budget;

  if (Object.keys(updates).length === 0)
    return NextResponse.json<ApiError>({ error: 'Tidak ada data yang diubah' }, { status: 400 });

  const { data: updated, error } = await supabaseAdmin
    .from('workspaces')
    .update(updates)
    .eq('workspace_id', workspaceId)
    .select('workspace_id, name, join_code, creator_id, budget, created_at')
    .single();

  if (error || !updated) return NextResponse.json<ApiError>({ error: 'Gagal update workspace' }, { status: 500 });
  return NextResponse.json({ message: 'Workspace berhasil diupdate', workspace: updated });
}

// ── DELETE ───────────────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: Params) {
  const userId = Number(req.headers.get('x-user-id'));
  if (!userId) return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const workspaceId = Number(id);

  const { data: ws } = await supabaseAdmin
    .from('workspaces')
    .select('creator_id')
    .eq('workspace_id', workspaceId)
    .single();
  if (!ws) return NextResponse.json<ApiError>({ error: 'Workspace tidak ditemukan' }, { status: 404 });
  if (ws.creator_id !== userId) return NextResponse.json<ApiError>({ error: 'Hanya creator yang bisa menghapus workspace' }, { status: 403 });

  await supabaseAdmin.from('workspace_members').delete().eq('workspace_id', workspaceId);
  const { error } = await supabaseAdmin.from('workspaces').delete().eq('workspace_id', workspaceId);
  if (error) return NextResponse.json<ApiError>({ error: 'Gagal menghapus workspace' }, { status: 500 });
  return NextResponse.json({ message: 'Workspace berhasil dihapus' });
}
