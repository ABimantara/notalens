// ============================================================
// POST /api/auth/register
// Body: { name, email, password }
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase';
import { signToken } from '@/lib/jwt';
import { RegisterRequest, AuthResponse, ApiError } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body: RegisterRequest = await req.json();
    const { name, email, password } = body;

    // --- Validasi input ---
    if (!name || !email || !password) {
      return NextResponse.json<ApiError>(
        { error: 'name, email, dan password wajib diisi' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json<ApiError>(
        { error: 'Password minimal 8 karakter' },
        { status: 400 }
      );
    }

    // --- Cek email sudah terdaftar ---
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('user_id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json<ApiError>(
        { error: 'Email sudah terdaftar' },
        { status: 409 }
      );
    }

    // --- Hash password ---
    const hashedPassword = await bcrypt.hash(password, 12);

    // --- Insert user baru ---
    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert({ name, email, password: hashedPassword })
      .select('user_id, name, email, created_at')
      .single();

    if (error || !newUser) {
      console.error('Register error:', error);
      return NextResponse.json<ApiError>(
        { error: 'Gagal membuat akun, coba lagi' },
        { status: 500 }
      );
    }

    // --- Buat JWT token ---
    const token = await signToken({ user_id: newUser.user_id, email: newUser.email });

    return NextResponse.json<AuthResponse>(
      {
        message: 'Registrasi berhasil',
        token,
        user: newUser,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Register unexpected error:', err);
    return NextResponse.json<ApiError>(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
