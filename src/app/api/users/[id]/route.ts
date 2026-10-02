import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentDbUser, isPendingUser } from '@/lib/currentUser';

// Cancel an invitation that hasn't been accepted yet.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await getCurrentDbUser();
    if (!admin) return new NextResponse('Unauthorized', { status: 401 });
    if (admin.role !== 'ADMIN') return new NextResponse('Forbidden', { status: 403 });

    const user = await prisma.user.findUnique({ where: { id: params.id } });
    if (!user) return new NextResponse('User not found', { status: 404 });
    if (!isPendingUser(user)) {
      return new NextResponse('Only pending invitations can be cancelled', { status: 400 });
    }

    await prisma.$transaction([
      prisma.documentAccess.deleteMany({ where: { userId: user.id } }),
      prisma.user.delete({ where: { id: user.id } }),
      prisma.auditLog.create({
        data: { userId: admin.id, action: 'INVITE_CANCELLED', metadata: { email: user.email } },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[USERS_DELETE]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
