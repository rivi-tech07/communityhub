import { NextResponse } from 'next/server';
import { getPublicClient } from '../../../lib/server-auth';

export async function GET(request: Request, context: { params: Promise<{ imageId: string }> }) {
  const { imageId } = await context.params;
  const client = getPublicClient();
  const { data: image, error } = await client
    .from('product_images')
    .select('*')
    .eq('id', imageId)
    .single();
  if (error || !image)
    return NextResponse.json({ error: 'Product image not found.' }, { status: 404 });
  const { data, error: signedError } = await client.storage
    .from('business-media')
    .createSignedUrl(image.storage_path, 300);
  if (signedError || !data)
    return NextResponse.json({ error: 'Product image is unavailable.' }, { status: 503 });
  return NextResponse.json({ url: data.signedUrl, expiresIn: 300 });
}
