import { auth, currentUser } from '@clerk/nextjs/server';
import type { User } from '@prisma/client';
import prisma from '@/lib/prisma';

export function pendingClerkId(email: string) {
  return `pending_${email.trim().toLowerCase()}`;
}

export function isPendingUser(user: { clerkId: string }) {
  return user.clerkId.startsWith('pending_');
}

/**
 * Returns the signed-in person's SecureDocs user, or null.
 *
 * The first time an invited person signs in, their invite (created by an
 * admin with their email) is linked to their Clerk account. Only verified
 * email addresses can claim an invite, and people who were never invited
 * get no access.
 */
export async function getCurrentDbUser(): Promise<User | null> {
  const { userId: clerkId } = auth();
  if (!clerkId) return null;

  const existing = await prisma.user.findUnique({ where: { clerkId } });
  if (existing) return existing;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const verifiedEmails = clerkUser.emailAddresses
    .filter(e => e.verification?.status === 'verified')
    .map(e => e.emailAddress.toLowerCase());

  for (const email of verifiedEmails) {
    const pending = await prisma.user.findFirst({
      where: { clerkId: { startsWith: 'pending_' }, email: { equals: email, mode: 'insensitive' } },
    });
    if (pending) {
      const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ');
      const linked = await prisma.user.update({
        where: { id: pending.id },
        data: { clerkId, ...(name ? { name } : {}) },
      });
      await prisma.auditLog.create({
        data: { userId: linked.id, action: 'INVITE_ACCEPTED', metadata: { email } },
      });
      return linked;
    }
  }

  return null;
}
