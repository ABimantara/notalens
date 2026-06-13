// ============================================================
// POST /api/auth/login
// Body: { email, password }
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase';
import { signToken } from '@/lib/jwt';
import { LoginRequest, AuthResponse, ApiError } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body: LoginRequest = await req.json();
    const { email, password } = body;

    // --- Validasi input ---
    if (!email || !password) {
      return NextResponse.json<ApiError>(
        { error: 'Email dan password wajib diisi' },
        { status: 400 }
      );
    }

    // --- Cari user by email ---
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('user_id, name, email, password, created_at')
      .eq('email', email)
      .single();

    if (error || !user) {
      return NextResponse.json<ApiError>(
        { error: 'Email atau password salah' },
        { status: 401 }
      );
    }

    // --- Verifikasi password ---
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json<ApiError>(
        { error: 'Email atau password salah' },
        { status: 401 }
      );
    }

    // --- Buat JWT token ---
    const token = await signToken({ user_id: user.user_id, email: user.email });

    // Hapus password dari response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pwd, ...userWithoutPassword } = user;

    return NextResponse.json<AuthResponse>({
      message: 'Login berhasil',
      token,
      user: userWithoutPassword,
    });
  } catch (err) {
    console.error('Login unexpected error:', err);
    return NextResponse.json<ApiError>(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
