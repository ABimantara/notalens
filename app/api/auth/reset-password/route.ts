// ============================================================
// POST /api/auth/reset-password
// Body: { email, newPassword }
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase';
import { ResetPasswordRequest, ApiError } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body: ResetPasswordRequest = await req.json();
    const { email, newPassword } = body;

    if (!email || !newPassword) {
      return NextResponse.json<ApiError>(
        { error: 'Email dan password wajib diisi' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json<ApiError>(
        { error: 'Password minimal 8 karakter' },
        { status: 400 }
      );
    }

    const { data: user, error: findError } = await supabaseAdmin
      .from('users')
      .select('user_id')
      .eq('email', email)
      .single();

    if (findError || !user) {
      return NextResponse.json<ApiError>(
        { error: 'Email tidak ditemukan' },
        { status: 404 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ password: hashedPassword })
      .eq('user_id', user.user_id);

    if (updateError) {
      console.error('Reset password error:', updateError);
      return NextResponse.json<ApiError>(
        { error: 'Gagal memperbarui password, coba lagi' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Password berhasil direset' },
      { status: 200 }
    );
  } catch (err) {
    console.error('Reset password unexpected error:', err);
    return NextResponse.json<ApiError>(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
