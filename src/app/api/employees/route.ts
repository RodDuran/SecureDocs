import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { getCurrentDbUser } from '@/lib/currentUser';

export async function GET() {
  try {
    const user = await getCurrentDbUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Admins see everyone; others only the employees they were granted.
    const where = user.role === 'ADMIN'
      ? {}
      : { documentAccess: { some: { userId: user.id } } };

    const employees = await prisma.employee.findMany({
      where,
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

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user || user.role !== 'ADMIN') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const body = await req.json();
    const { name, email, position } = body;

    if (!name || !email) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    const employee = await prisma.employee.create({
      data: {
        name,
        email,
        position
      }
    });

    return NextResponse.json(employee);
  } catch (error) {
    console.error('[EMPLOYEES_POST]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
