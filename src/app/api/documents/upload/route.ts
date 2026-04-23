import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import prisma from '@/lib/prisma';
import { canPerformAction } from '@/lib/rbac';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
  try {
    // 1. Authenticate request via Clerk
    const { userId: clerkId } = auth();
    if (!clerkId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 2. Get the user from the database
    const user = await prisma.user.findUnique({
      where: { clerkId }
    });

    if (!user) {
      return new NextResponse('User not found in database', { status: 401 });
    }

    // 3. Check RBAC
    if (!canPerformAction(user.role, 'upload')) {
      return new NextResponse('Forbidden: Insufficient permissions', { status: 403 });
    }

    // 4. Accept multipart/form-data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const employeeId = formData.get('employeeId') as string | null;

    if (!file || !employeeId) {
      return new NextResponse('Missing file or employeeId', { status: 400 });
    }

    // 5. Validate file size (25MB = 25 * 1024 * 1024 bytes = 26214400 bytes)
    const MAX_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return new NextResponse('File too large. Maximum size is 25MB.', { status: 413 });
    }

    // 6. Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/png',
      'image/jpeg',
    ];
    
    // Check by extension as fallback (since some OS might send generic mimetypes)
    const fileName = file.name;
    const ext = fileName.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg'];

    if (!allowedTypes.includes(file.type) && (!ext || !allowedExtensions.includes(ext))) {
      return new NextResponse('Invalid file type. Allowed: .pdf, .doc, .docx, .png, .jpg, .jpeg', { status: 400 });
    }

    // 7. Upload to Vercel Blob
    const uuid = uuidv4();
    const pathname = `documents/${employeeId}/${uuid}-${fileName}`;
    const blob = await put(pathname, file, {
      access: 'private',
      addRandomSuffix: false,
    });

    // 8. Create a Document record in PostgreSQL via Prisma
    const document = await prisma.document.create({
      data: {
        employeeId,
        fileName: fileName,
        fileKey: blob.url,
        fileSize: file.size,
        mimeType: file.type || ext || 'application/octet-stream',
        uploadedById: clerkId,
      }
    });

    // 9. Create an AuditLog entry
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        documentId: document.id,
        action: 'UPLOAD',
      }
    });

    // 10. Return { success: true, documentId }
    return NextResponse.json({ success: true, documentId: document.id });

  } catch (error) {
    console.error('[DOCUMENT_UPLOAD]', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
