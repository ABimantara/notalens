// DELETE /api/workspace/[id]/leave
// Anggota (non-creator) keluar dari workspace sendiri
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ApiError } from '@/types';

type Params = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, { params }: Params) {
  const userId = Number(req.headers.get('x-user-id'));
  if (!userId) return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const workspaceId = Number(id);

  // Creator tidak bisa keluar dari workspace-nya sendiri
  const { data: ws } = await supabaseAdmin
    .from('workspaces')
    .select('creator_id')
    .eq('workspace_id', workspaceId)
    .single();

  if (!ws) return NextResponse.json<ApiError>({ error: 'Workspace tidak ditemukan' }, { status: 404 });
  if (ws.creator_id === userId) {
    return NextResponse.json<ApiError>({ error: 'Creator tidak bisa keluar dari workspace. Hapus workspace jika tidak diperlukan.' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('workspace_members')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId);

  if (error) return NextResponse.json<ApiError>({ error: 'Gagal keluar dari workspace' }, { status: 500 });
  return NextResponse.json({ message: 'Berhasil keluar dari workspace' });
}
