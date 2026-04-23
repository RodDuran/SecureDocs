import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const employees = await prisma.employee.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        position: true,
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(employees);
  } catch (error) {
    console.error('[EMPLOYEES_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
