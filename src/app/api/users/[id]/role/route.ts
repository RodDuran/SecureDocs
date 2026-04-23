import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { Role } from '@prisma/client';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const requestingUser = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!requestingUser || requestingUser.role !== 'ADMIN') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const body = await req.json();
    const { role } = body;

    if (!Object.values(Role).includes(role)) {
      return new NextResponse('Invalid role', { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: { role },
      select: { id: true, name: true, email: true, role: true }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('[USERS_ROLE_PATCH]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
