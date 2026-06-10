// ============================================================
// POST /api/workspace/join
// Body: { join_code: string }
// Header: Authorization: Bearer <token>
//
// User memasukkan kode unik untuk bergabung ke workspace
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
    return NextResponse.json<ApiError>({ error: 'Kode workspace wajib diisi' }, { status: 400 });
  }

  // Cari workspace berdasarkan join_code
  const { data: workspace, error: findError } = await supabaseAdmin
    .from('workspaces')
    .select('workspace_id, name, creator_id')
    .eq('join_code', join_code.trim().toUpperCase())
    .single();

  if (findError || !workspace) {
    return NextResponse.json<ApiError>({ error: 'Kode workspace tidak valid' }, { status: 404 });
  }

  // Cek apakah user sudah menjadi member
  const { data: existingMember } = await supabaseAdmin
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspace.workspace_id)
    .eq('user_id', Number(userId))
    .single();

  if (existingMember) {
    return NextResponse.json<ApiError>(
      { error: 'Kamu sudah menjadi member workspace ini' },
      { status: 409 }
    );
  }

  // Tambahkan user sebagai member
  const { error: insertError } = await supabaseAdmin
    .from('workspace_members')
    .insert({
      workspace_id: workspace.workspace_id,
      user_id: Number(userId),
    });

  if (insertError) {
    console.error('Join workspace error:', insertError);
    return NextResponse.json<ApiError>({ error: 'Gagal bergabung ke workspace' }, { status: 500 });
  }

  return NextResponse.json({
    message: `Berhasil bergabung ke workspace "${workspace.name}"`,
    workspace_id: workspace.workspace_id,
    workspace_name: workspace.name,
  });
}
