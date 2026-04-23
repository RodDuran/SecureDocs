'use server';

import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function getUserRole(): Promise<Role | null> {
  const { userId } = auth();
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  return user?.role || null;
}
