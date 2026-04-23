import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId: clerkId } = auth();
    if (!clerkId) return new NextResponse('Unauthorized', { status: 401 });

    const admin = await prisma.user.findUnique({ where: { clerkId } });
    if (!admin || admin.role !== 'ADMIN') return new NextResponse('Forbidden', { status: 403 });

    const accessGrants = await prisma.documentAccess.findMany({
      include: {
        user: { select: { name: true, email: true } },
        employee: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(accessGrants);
  } catch (error) {
    console.error('[ACCESS_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
