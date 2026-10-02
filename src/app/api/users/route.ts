import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user || user.role !== 'ADMIN') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, email: true, role: true, createdAt: true, clerkId: true,
        _count: { select: { documentAccess: true } },
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(users.map(({ clerkId, _count, ...u }) => ({
      ...u,
      status: clerkId.startsWith('pending_') ? 'INVITED' : 'ACTIVE',
      accessCount: _count.documentAccess,
    })));
  } catch (error) {
    console.error('[USERS_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
