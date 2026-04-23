import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { canPerformAction } from '@/lib/rbac';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId: clerkId } = auth();
    if (!clerkId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    if (!canPerformAction(user.role, 'download')) {
      return new NextResponse('Forbidden: Insufficient permissions', { status: 403 });
    }

    const document = await prisma.document.findUnique({
      where: { id: params.id }
    });

    if (!document) {
      return new NextResponse('Document not found', { status: 404 });
    }

    const response = await fetch(document.fileKey, {
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`
      }
    });

    if (!response.ok) {
      return new NextResponse('Error fetching file from storage', { status: response.status });
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        documentId: document.id,
        action: 'DOWNLOAD',
      }
    });

    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="${document.fileName}"`);
    headers.set('Content-Type', document.mimeType);

    return new Response(response.body, { headers });
  } catch (error) {
    console.error('[DOCUMENT_DOWNLOAD]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
