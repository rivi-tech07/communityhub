import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { authenticate } from '../../../../lib/server-auth';

const mimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export async function POST(request: Request, context: { params: Promise<{ postId: string }> }) {
  const result = await authenticate(request); if (result instanceof NextResponse) return result;
  const { postId } = await context.params;
  let body: { fileName?: string; mimeType?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }
  if (!body.fileName || !body.mimeType || !mimeTypes.has(body.mimeType)) return NextResponse.json({ error: 'Only supported image files can be uploaded.' }, { status: 400 });
  const { data: post, error: postError } = await result.client.from('posts').select('community_id').eq('id', postId).single();
  if (postError || !post) return NextResponse.json({ error: 'Post not found or inaccessible.' }, { status: 404 });
  const safeName = body.fileName.toLowerCase().replace(/[^a-z0-9._-]/g, '-').slice(-80);
  const storagePath = `${post.community_id}/${postId}/${randomUUID()}-${safeName}`;
  const { data: signedUpload, error: uploadError } = await result.client.storage.from('community-media').createSignedUploadUrl(storagePath);
  if (uploadError || !signedUpload) return NextResponse.json({ error: 'Media upload is unavailable.' }, { status: 503 });
  const { data: media, error: mediaError } = await result.client.from('post_media').insert({ post_id: postId, uploader_id: result.user.id, storage_path: storagePath, mime_type: body.mimeType }).select('*').single();
  if (mediaError) return NextResponse.json({ error: 'Media metadata could not be created.' }, { status: 400 });
  return NextResponse.json({ media, upload: signedUpload }, { status: 201 });
}
