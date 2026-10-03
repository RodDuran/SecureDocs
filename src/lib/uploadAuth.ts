import { auth } from '@clerk/nextjs/server';
import type { User } from '@prisma/client';
import prisma from '@/lib/prisma';
import { canPerformAction } from '@/lib/rbac';
import { getCurrentDbUser } from '@/lib/currentUser';

export class UploadAuthError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

// Shared checks for every upload step: signed in, known user,
// allowed to upload, and the target employee exists.
export async function requireUploader(employeeId: unknown): Promise<{ user: User; clerkId: string; employeeId: string }> {
  const { userId: clerkId } = auth();
  if (!clerkId) throw new UploadAuthError('Unauthorized', 401);

  const user = await getCurrentDbUser();
  if (!user) throw new UploadAuthError('User not found in database', 401);

  if (!canPerformAction(user.role, 'upload')) {
    throw new UploadAuthError('Forbidden: Insufficient permissions', 403);
  }

  if (typeof employeeId !== 'string' || !employeeId) {
    throw new UploadAuthError('Missing employeeId', 400);
  }

  const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true } });
  if (!employee) throw new UploadAuthError('Employee not found', 404);

  if (user.role !== 'ADMIN') {
    const access = await prisma.documentAccess.findUnique({
      where: { userId_employeeId: { userId: user.id, employeeId } },
    });
    if (!access) throw new UploadAuthError('Forbidden: No access to this employee', 403);
  }

  return { user, clerkId, employeeId };
}
