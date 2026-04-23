import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = auth();
    if (!clerkId) return new NextResponse('Unauthorized', { status: 401 });

    const admin = await prisma.user.findUnique({ where: { clerkId } });
    if (!admin || admin.role !== 'ADMIN') return new NextResponse('Forbidden', { status: 403 });

    const { userId, employeeId } = await req.json();
    if (!userId || !employeeId) return new NextResponse('Missing fields', { status: 400 });

    const access = await prisma.documentAccess.upsert({
      where: {
        userId_employeeId: { userId, employeeId }
      },
      update: {},
      create: {
        userId,
        employeeId,
        grantedBy: admin.id
      }
    });

    return NextResponse.json({ success: true, access });
  } catch (error) {
    console.error('[ACCESS_GRANT_POST]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
