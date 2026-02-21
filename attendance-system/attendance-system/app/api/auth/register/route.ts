import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, setupKey } = await req.json();

    // Protect registration with a setup key
    if (setupKey !== process.env.SETUP_KEY) {
      return NextResponse.json({ error: 'Invalid setup key' }, { status: 403 });
    }

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 });
    }

    const existing = await prisma.manager.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);
    const manager = await prisma.manager.create({
      data: { name, email, password: hashed },
    });

    return NextResponse.json({ success: true, id: manager.id });
  } catch (error: any) {
    console.error('Register error:', error.message, error.stack);
    return NextResponse.json({ error: 'Server error', detail: error.message }, { status: 500 });
  }
}
