import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { Role } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getCurrentDbUser, pendingClerkId } from '@/lib/currentUser';

// Admin adds a user (someone who views employee documents):
// 1. creates a pending SecureDocs user with the chosen role
// 2. optionally grants access to specific employees right away
// 3. emails a Clerk invitation so they can create their login
export async function POST(req: Request) {
  try {
    const admin = await getCurrentDbUser();
    if (!admin) return new NextResponse('Unauthorized', { status: 401 });
    if (admin.role !== 'ADMIN') return new NextResponse('Forbidden', { status: 403 });

    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const role = body.role as Role;
    const employeeIds: string[] = Array.isArray(body.employeeIds)
      ? body.employeeIds.filter((x: unknown): x is string => typeof x === 'string')
      : [];

    if (!name || !email || !role) return new NextResponse('Name, email and role are required', { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return new NextResponse('Invalid email address', { status: 400 });
    if (!Object.values(Role).includes(role)) return new NextResponse('Invalid role', { status: 400 });

    const existing = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
    if (existing) return new NextResponse('A user with this email already exists', { status: 400 });

    const validEmployees = employeeIds.length
      ? await prisma.employee.findMany({ where: { id: { in: employeeIds } }, select: { id: true } })
      : [];

    const user = await prisma.$transaction(async tx => {
      const created = await tx.user.create({
        data: { email, name, role, clerkId: pendingClerkId(email) },
      });
      if (validEmployees.length) {
        await tx.documentAccess.createMany({
          data: validEmployees.map(e => ({ userId: created.id, employeeId: e.id, grantedBy: admin.id })),
          skipDuplicates: true,
        });
      }
      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: 'USER_INVITED',
          metadata: { email, role, employeeCount: validEmployees.length },
        },
      });
      return created;
    });

    // Send the invitation email. If it fails (e.g. they already have a
    // login), the invite still works: they just sign in with this email.
    let emailSent = false;
    let emailNote: string | null = null;
    try {
      const origin = new URL(req.url).origin;
      await clerkClient.invitations.createInvitation({
        emailAddress: email,
        redirectUrl: `${origin}/sign-up`,
        ignoreExisting: true,
        notify: true,
      });
      emailSent = true;
    } catch (err) {
      console.error('[USERS_INVITE_EMAIL]', err);
      emailNote = 'Invitation email could not be sent (they may already have a login). Ask them to sign in with this email address.';
    }

    return NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      accessGranted: validEmployees.length,
      emailSent,
      emailNote,
    });
  } catch (error) {
    console.error('[USERS_INVITE]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
