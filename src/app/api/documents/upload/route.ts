import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  getMimeType,
  isJunkFile,
  sanitizeRelativePath,
} from '@/lib/fileTypes';
import { requireUploader, UploadAuthError } from '@/lib/uploadAuth';

// Step 1 of an upload: the browser asks for a short-lived, single-file
// token, then sends the file directly to Vercel Blob. The file never passes
// through this function, so large files and folders work.
// Step 2 is /api/documents/upload/complete, which records the document.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as HandleUploadBody;

    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let payload: { employeeId?: string } = {};
        try {
          payload = JSON.parse(clientPayload || '{}');
        } catch {
          throw new UploadAuthError('Invalid upload payload', 400);
        }

        const { user, employeeId } = await requireUploader(payload.employeeId);

        // The blob must live under this employee's folder and match our rules.
        const prefix = `documents/${employeeId}/`;
        const relative = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : '';
        if (!relative || sanitizeRelativePath(relative) !== relative) {
          throw new UploadAuthError('Invalid upload path', 400);
        }
        if (isJunkFile(relative) || !getMimeType(relative)) {
          throw new UploadAuthError('File type not allowed', 400);
        }

        return {
          allowedContentTypes: ALLOWED_MIME_TYPES,
          maximumSizeInBytes: MAX_FILE_SIZE,
          addRandomSuffix: true,
          validUntil: Date.now() + 60 * 60 * 1000, // 1h, enough for very large files
          tokenPayload: JSON.stringify({ userId: user.id, employeeId }),
        };
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof UploadAuthError) {
      return new NextResponse(error.message, { status: error.status });
    }
    console.error('[DOCUMENT_UPLOAD_TOKEN]', error);
    return new NextResponse('Could not start upload', { status: 400 });
  }
}
