import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { Role } from '@prisma/client';

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = auth();
    if (!clerkId) return new NextResponse('Unauthorized', { status: 401 });

    const admin = await prisma.user.findUnique({ where: { clerkId } });
    if (!admin || admin.role !== 'ADMIN') return new NextResponse('Forbidden', { status: 403 });

    const { name, email, role } = await req.json();
    if (!name || !email || !role) return new NextResponse('Missing fields', { status: 400 });

    if (!Object.values(Role).includes(role)) {
      return new NextResponse('Invalid role', { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return new NextResponse('User with this email already exists', { status: 400 });
    }

    const user = await prisma.user.create({
      data: {
        email,
        name,
        role,
        clerkId: `pending_${email}`
      }
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('[USERS_INVITE]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
