// ============================================================
// GET  /api/workspace   → semua workspace user (owned + joined) + stats
// POST /api/workspace   → buat workspace baru
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ApiError } from '@/types';

function generateJoinCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

async function enrichWorkspaces(workspaces: { workspace_id: number; name: string; join_code: string; creator_id: number; budget: number | null; created_at: string }[]) {
  if (!workspaces.length) return [];

  const ids = workspaces.map(w => w.workspace_id);

  // Member counts
  const { data: memberRows } = await supabaseAdmin
    .from('workspace_members')
    .select('workspace_id')
    .in('workspace_id', ids);

  const memberCount: Record<number, number> = {};
  for (const r of memberRows ?? []) {
    memberCount[r.workspace_id] = (memberCount[r.workspace_id] ?? 0) + 1;
  }

  // Total expenses per workspace
  const { data: txRows } = await supabaseAdmin
    .from('transactions')
    .select('workspace_id, total_amount')
    .in('workspace_id', ids);

  const expenses: Record<number, number> = {};
  for (const r of txRows ?? []) {
    if (r.workspace_id) {
      expenses[r.workspace_id] = (expenses[r.workspace_id] ?? 0) + Number(r.total_amount);
    }
  }

  return workspaces.map(w => ({
    ...w,
    member_count: memberCount[w.workspace_id] ?? 0,
    total_expenses: expenses[w.workspace_id] ?? 0,
  }));
}

// ── GET ──────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const userId = Number(req.headers.get('x-user-id'));
  if (!userId) return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 });

  const { data: owned, error: ownedError } = await supabaseAdmin
    .from('workspaces')
    .select('workspace_id, name, join_code, creator_id, budget, created_at')
    .eq('creator_id', userId)
    .order('created_at', { ascending: false });

  if (ownedError) return NextResponse.json<ApiError>({ error: 'Gagal mengambil data workspace' }, { status: 500 });

  const { data: memberOf } = await supabaseAdmin
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId);

  let joined: typeof owned = [];
  if (memberOf?.length) {
    const joinedIds = memberOf.map(m => m.workspace_id);
    const { data: joinedData } = await supabaseAdmin
      .from('workspaces')
      .select('workspace_id, name, join_code, creator_id, budget, created_at')
      .in('workspace_id', joinedIds)
      .neq('creator_id', userId)
      .order('created_at', { ascending: false });
    joined = joinedData ?? [];
  }

  const all = [...(owned ?? []), ...joined];
  const enriched = await enrichWorkspaces(all);

  const ownedEnriched = enriched.filter(w => w.creator_id === userId);
  const joinedEnriched = enriched.filter(w => w.creator_id !== userId);
  const totalExpenses = enriched.reduce((s, w) => s + w.total_expenses, 0);

  return NextResponse.json({ owned: ownedEnriched, joined: joinedEnriched, total_expenses: totalExpenses });
}

// ── POST ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const userId = Number(req.headers.get('x-user-id'));
  if (!userId) return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 });

  let body: { name?: string; budget?: number };
  try { body = await req.json(); } catch {
    return NextResponse.json<ApiError>({ error: 'Request body tidak valid' }, { status: 400 });
  }

  const { name, budget } = body;
  if (!name?.trim()) return NextResponse.json<ApiError>({ error: 'Nama workspace tidak boleh kosong' }, { status: 400 });

  // Generate unique join code
  let joinCode = '';
  for (let i = 0; i < 10; i++) {
    const candidate = generateJoinCode();
    const { data: existing } = await supabaseAdmin
      .from('workspaces').select('workspace_id').eq('join_code', candidate).single();
    if (!existing) { joinCode = candidate; break; }
  }
  if (!joinCode) return NextResponse.json<ApiError>({ error: 'Gagal generate kode unik, coba lagi' }, { status: 500 });

  const { data: workspace, error } = await supabaseAdmin
    .from('workspaces')
    .insert({ name: name.trim(), join_code: joinCode, creator_id: userId, budget: budget ?? null })
    .select('workspace_id, name, join_code, creator_id, budget, created_at')
    .single();

  if (error || !workspace) return NextResponse.json<ApiError>({ error: 'Gagal membuat workspace' }, { status: 500 });

  // Creator auto-joined
  await supabaseAdmin.from('workspace_members').insert({ workspace_id: workspace.workspace_id, user_id: userId });

  return NextResponse.json({ message: 'Workspace berhasil dibuat', workspace }, { status: 201 });
}
