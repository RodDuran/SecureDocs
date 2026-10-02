import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCurrentDbUser } from '@/lib/currentUser';

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Also links a pending invite to this login on first sign-in.
    const user = await getCurrentDbUser();

    if (!user) {
      return new NextResponse('No access: this account has not been invited', { status: 403 });
    }

    return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (error) {
    console.error('[USERS_ME_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
