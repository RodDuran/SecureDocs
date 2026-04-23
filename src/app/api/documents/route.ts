import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function GET(req: Request) {
  try {
    const { userId: clerkId } = auth();
    if (!clerkId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    const url = new URL(req.url);
    const employeeIdFilter = url.searchParams.get('employeeId');

    let whereClause: any = {};

    if (user.role === 'EMPLOYEE') {
      whereClause.uploadedById = clerkId;
    } else if (employeeIdFilter) {
      whereClause.employeeId = employeeIdFilter;
    }

    const documents = await prisma.document.findMany({
      where: whereClause,
      include: {
        employee: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (documents.length > 0) {
      await prisma.auditLog.createMany({
        data: documents.map(doc => ({
          userId: user.id,
          documentId: doc.id,
          action: 'VIEW'
        }))
      });
    }

    const mappedDocs = documents.map(doc => ({
      id: doc.id,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      createdAt: doc.createdAt,
      employeeName: doc.employee.name,
    }));

    return NextResponse.json(mappedDocs);
  } catch (error) {
    console.error('[DOCUMENTS_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
