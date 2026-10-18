import { NextResponse } from 'next/server';
import { authenticate } from '../../../lib/server-auth';

export async function GET(request: Request, context: { params: Promise<{ mediaId: string }> }) {
  const result = await authenticate(request); if (result instanceof NextResponse) return result;
  const { mediaId } = await context.params;
  const { data: media, error } = await result.client.from('post_media').select('*').eq('id', mediaId).single();
  if (error || !media) return NextResponse.json({ error: 'Media not found or inaccessible.' }, { status: 404 });
  const { data: signed, error: signedError } = await result.client.storage.from('community-media').createSignedUrl(media.storage_path, 300);
  if (signedError || !signed) return NextResponse.json({ error: 'Media URL could not be created.' }, { status: 503 });
  return NextResponse.json({ url: signed.signedUrl, expiresIn: 300 });
}
