'use server';

import { Role } from '@prisma/client';
import { getCurrentDbUser } from '@/lib/currentUser';

export async function getUserRole(): Promise<Role | null> {
  const user = await getCurrentDbUser();
  return user?.role || null;
}
