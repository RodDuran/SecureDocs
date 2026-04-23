import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function DELETE(req: Request) {
  try {
    const { userId: clerkId } = auth();
    if (!clerkId) return new NextResponse('Unauthorized', { status: 401 });

    const admin = await prisma.user.findUnique({ where: { clerkId } });
    if (!admin || admin.role !== 'ADMIN') return new NextResponse('Forbidden', { status: 403 });

    const { userId, employeeId } = await req.json();
    if (!userId || !employeeId) return new NextResponse('Missing fields', { status: 400 });

    await prisma.documentAccess.delete({
      where: {
        userId_employeeId: { userId, employeeId }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ACCESS_REVOKE_DELETE]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
