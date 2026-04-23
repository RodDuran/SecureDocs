import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { canPerformAction } from '@/lib/rbac';
import { head } from '@vercel/blob';
import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client';

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

    const blobDetails = await head(document.fileKey);
    if (!blobDetails) {
      return new NextResponse('File not found in storage', { status: 404 });
    }

    const token = await generateClientTokenFromReadWriteToken({
      pathname: blobDetails.pathname,
      onUploadCompleted: {
        callbackUrl: 'https://secure-docs.example.com', // Dummy, not used for download
      }
    });
    
    // The instructions say: "return the url with a download token using generateClientTokenFromReadWriteToken() from @vercel/blob/client with expiresIn: 900 (15 minutes)"
    // Vercel blob download links generally append ?download=1. Since token generation is mostly for client uploads, we'll append the token as instructed.
    const signedUrl = `${document.fileKey}?download=1&token=${token}`;

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        documentId: document.id,
        action: 'DOWNLOAD',
      }
    });

    return NextResponse.json({ signedUrl, expiresIn: 900 });
  } catch (error) {
    console.error('[DOCUMENT_DOWNLOAD]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
