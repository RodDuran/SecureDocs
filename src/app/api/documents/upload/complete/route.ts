import { NextResponse } from 'next/server';
import { head } from '@vercel/blob';
import prisma from '@/lib/prisma';
import { getMimeType, sanitizeRelativePath } from '@/lib/fileTypes';
import { requireUploader, UploadAuthError } from '@/lib/uploadAuth';

// Step 2 of an upload: after the browser finishes sending a file to Blob,
// we confirm it really exists in our store, then create the Document
// record and the audit-log entry.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { url, relativePath, batchId } = body as {
      employeeId?: string;
      url?: string;
      relativePath?: string;
      batchId?: string;
    };

    const { user, clerkId, employeeId } = await requireUploader(body.employeeId);

    if (typeof url !== 'string' || typeof relativePath !== 'string') {
      return new NextResponse('Missing url or relativePath', { status: 400 });
    }

    // Verify against storage instead of trusting the browser.
    let blob;
    try {
      blob = await head(url);
    } catch {
      return new NextResponse('Uploaded file not found in storage', { status: 404 });
    }

    if (!blob.pathname.startsWith(`documents/${employeeId}/`)) {
      return new NextResponse('File does not belong to this employee', { status: 400 });
    }

    // Safe to call twice (e.g. a retry): return the existing record.
    const existing = await prisma.document.findUnique({ where: { fileKey: blob.url } });
    if (existing) {
      return NextResponse.json({ success: true, documentId: existing.id });
    }

    const fileName = sanitizeRelativePath(relativePath) || blob.pathname.split('/').pop() || 'file';

    const document = await prisma.document.create({
      data: {
        employeeId,
        fileName,
        fileKey: blob.url,
        fileSize: blob.size,
        mimeType: getMimeType(fileName) || blob.contentType || 'application/octet-stream',
        uploadedById: clerkId,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        documentId: document.id,
        action: 'UPLOAD',
        metadata: {
          relativePath: fileName,
          ...(typeof batchId === 'string' ? { batchId } : {}),
        },
      },
    });

    return NextResponse.json({ success: true, documentId: document.id });
  } catch (error) {
    if (error instanceof UploadAuthError) {
      return new NextResponse(error.message, { status: error.status });
    }
    console.error('[DOCUMENT_UPLOAD_COMPLETE]', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
