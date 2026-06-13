// DELETE /api/workspace/[id]/members/[userId]
// Hanya creator yang bisa menghapus anggota. Creator tidak bisa hapus dirinya sendiri.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ApiError } from '@/types';

type Params = { params: Promise<{ id: string; userId: string }> };

export async function DELETE(req: NextRequest, { params }: Params) {
  const requesterId = Number(req.headers.get('x-user-id'));
  if (!requesterId) return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 });

  const { id, userId } = await params;
  const workspaceId = Number(id);
  const targetUserId = Number(userId);

  // Verify requester is the creator
  const { data: ws } = await supabaseAdmin
    .from('workspaces')
    .select('creator_id')
    .eq('workspace_id', workspaceId)
    .single();

  if (!ws) return NextResponse.json<ApiError>({ error: 'Workspace tidak ditemukan' }, { status: 404 });
  if (ws.creator_id !== requesterId) return NextResponse.json<ApiError>({ error: 'Hanya creator yang bisa menghapus anggota' }, { status: 403 });
  if (ws.creator_id === targetUserId) return NextResponse.json<ApiError>({ error: 'Creator tidak bisa dihapus dari workspace' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('workspace_members')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('user_id', targetUserId);

  if (error) return NextResponse.json<ApiError>({ error: 'Gagal menghapus anggota' }, { status: 500 });
  return NextResponse.json({ message: 'Anggota berhasil dihapus' });
}
