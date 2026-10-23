import { NextResponse } from 'next/server';
import { authenticate } from '../../lib/server-auth';

const allowed = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
export async function POST(request: Request) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (
    !body ||
    typeof body.fileName !== 'string' ||
    typeof body.mimeType !== 'string' ||
    typeof body.sizeBytes !== 'number' ||
    !allowed.has(body.mimeType) ||
    body.sizeBytes < 1 ||
    body.sizeBytes > 10485760
  )
    return NextResponse.json(
      { error: 'CV must be PDF, DOC, or DOCX and no larger than 10 MB.' },
      { status: 400 },
    );
  const id = crypto.randomUUID();
  const path = `${result.user.id}/${id}`;
  const { data: upload, error: uploadError } = await result.client.storage
    .from('private-documents')
    .createSignedUploadUrl(path);
  if (uploadError || !upload)
    return NextResponse.json({ error: 'Unable to create a secure CV upload.' }, { status: 503 });
  const { data, error } = await result.client
    .from('cv_documents')
    .insert({
      id,
      user_id: result.user.id,
      storage_path: path,
      file_name: body.fileName,
      mime_type: body.mimeType,
      size_bytes: body.sizeBytes,
    })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: 'Unable to register CV.' }, { status: 400 });
  return NextResponse.json({ document: data, upload });
}

export async function GET(request: Request) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const { data, error } = await result.client.from('cv_documents').select('id, file_name, mime_type, size_bytes, created_at').order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Unable to load CV documents.' }, { status: 503 });
  return NextResponse.json({ documents: data ?? [] });
}
