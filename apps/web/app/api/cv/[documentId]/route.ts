import { NextResponse } from 'next/server';
import { authenticate } from '../../../lib/server-auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const { documentId } = await params;
  const { data, error } = await result.client
    .from('cv_documents')
    .select('storage_path')
    .eq('id', documentId)
    .single();
  if (error || !data)
    return NextResponse.json({ error: 'Document not found or not authorized.' }, { status: 404 });
  const { data: signed, error: signedError } = await result.client.storage
    .from('private-documents')
    .createSignedUrl(data.storage_path, 300);
  if (signedError || !signed)
    return NextResponse.json({ error: 'Unable to sign document.' }, { status: 503 });
  return NextResponse.json({ url: signed.signedUrl, expiresIn: 300 });
}
