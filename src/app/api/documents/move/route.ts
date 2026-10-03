import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentDbUser } from '@/lib/currentUser';

// Admin-only: reassign documents that were uploaded to the wrong employee.
// The file itself stays where it is in storage; only which employee it
// belongs to changes, so access follows the new employee immediately.
export async function POST(req: Request) {
  try {
    const admin = await getCurrentDbUser();
    if (!admin) return new NextResponse('Unauthorized', { status: 401 });
    if (admin.role !== 'ADMIN') return new NextResponse('Forbidden: Only admins can move documents', { status: 403 });

    const body = await req.json().catch(() => ({}));
    const targetEmployeeId = typeof body.targetEmployeeId === 'string' ? body.targetEmployeeId : '';
    const documentIds: string[] = Array.isArray(body.documentIds)
      ? Array.from(new Set(body.documentIds.filter((x: unknown): x is string => typeof x === 'string')))
      : [];

    if (!targetEmployeeId || documentIds.length === 0) {
      return new NextResponse('Choose at least one document and an employee', { status: 400 });
    }
    if (documentIds.length > 500) {
      return new NextResponse('Too many documents in one move (max 500)', { status: 400 });
    }

    const target = await prisma.employee.findUnique({ where: { id: targetEmployeeId }, select: { id: true, name: true } });
    if (!target) return new NextResponse('Employee not found', { status: 404 });

    const docs = await prisma.document.findMany({
      where: { id: { in: documentIds } },
      select: { id: true, fileName: true, employeeId: true, employee: { select: { name: true } } },
    });
    if (docs.length !== documentIds.length) {
      return new NextResponse('Some documents were not found. Refresh and try again.', { status: 404 });
    }

    const toMove = docs.filter(d => d.employeeId !== target.id);

    await prisma.$transaction([
      prisma.document.updateMany({
        where: { id: { in: toMove.map(d => d.id) } },
        data: { employeeId: target.id },
      }),
      prisma.auditLog.createMany({
        data: toMove.map(d => ({
          userId: admin.id,
          documentId: d.id,
          action: 'MOVE',
          metadata: {
            fileName: d.fileName,
            fromEmployeeId: d.employeeId,
            fromEmployeeName: d.employee.name,
            toEmployeeId: target.id,
            toEmployeeName: target.name,
          },
        })),
      }),
    ]);

    return NextResponse.json({ success: true, moved: toMove.length, targetEmployeeName: target.name });
  } catch (error) {
    console.error('[DOCUMENTS_MOVE]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
