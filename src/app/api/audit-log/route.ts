import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';

export async function GET(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user || user.role !== 'ADMIN') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const url = new URL(req.url);
    const filterUserId = url.searchParams.get('userId');
    const filterAction = url.searchParams.get('action');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = 20;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.AuditLogWhereInput = {};

    if (filterUserId) whereClause.userId = filterUserId;
    if (filterAction) whereClause.action = filterAction;
    if (from || to) {
      whereClause.createdAt = {};
      if (from) whereClause.createdAt.gte = new Date(from);
      if (to) whereClause.createdAt.lte = new Date(to);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereClause,
        include: {
          user: { select: { name: true, email: true } },
          document: { select: { fileName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where: whereClause })
    ]);

    const mappedLogs = logs.map(log => ({
      id: log.id,
      createdAt: log.createdAt,
      userName: log.user.name,
      userEmail: log.user.email,
      action: log.action,
      documentName: log.document?.fileName || null,
      metadata: log.metadata,
    }));

    return NextResponse.json({
      data: mappedLogs,
      pagination: {
        total,
        page,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('[AUDIT_LOG_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
