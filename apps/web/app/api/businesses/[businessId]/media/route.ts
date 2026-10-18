import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { authenticate } from '../../../../lib/server-auth';

const allowedMime = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxBytes = 10 * 1024 * 1024;
export async function POST(request: Request, context: { params: Promise<{ businessId: string }> }) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const { businessId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    fileName?: string;
    mimeType?: string;
    sizeBytes?: number;
    sortOrder?: number;
  };
  if (
    !body.fileName ||
    !body.mimeType ||
    !body.sizeBytes ||
    !allowedMime.has(body.mimeType) ||
    body.sizeBytes > maxBytes
  )
    return NextResponse.json(
      { error: 'Use JPEG, PNG, or WebP images up to 10 MB.' },
      { status: 400 },
    );
  const safeName = body.fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .slice(-80);
  const path = `business/${businessId}/${randomUUID()}-${safeName}`;
  const { data: upload, error: uploadError } = await result.client.storage
    .from('business-media')
    .createSignedUploadUrl(path);
  if (uploadError || !upload)
    return NextResponse.json({ error: 'Business media upload is unavailable.' }, { status: 503 });
  const { data: image, error } = await result.client
    .from('business_images')
    .insert({
      business_id: businessId,
      uploaded_by: result.user.id,
      storage_path: path,
      mime_type: body.mimeType,
      size_bytes: body.sizeBytes,
      sort_order: body.sortOrder ?? 0,
    })
    .select('*')
    .single();
  if (error)
    return NextResponse.json(
      { error: 'Only the business owner can upload images.' },
      { status: 403 },
    );
  return NextResponse.json({ image, upload }, { status: 201 });
}
