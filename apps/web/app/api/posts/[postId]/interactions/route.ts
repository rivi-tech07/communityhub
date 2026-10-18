import { NextResponse } from 'next/server';
import { authenticate } from '../../../../lib/server-auth';

export async function POST(request: Request, context: { params: Promise<{ postId: string }> }) {
  const result = await authenticate(request); if (result instanceof NextResponse) return result;
  const { postId } = await context.params;
  let body: { action?: 'like' | 'unlike' | 'save' | 'unsave' };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }
  if (!body.action) return NextResponse.json({ error: 'Interaction action is required.' }, { status: 400 });
  const isLike = body.action === 'like' || body.action === 'unlike';
  const shouldInsert = body.action === 'like' || body.action === 'save';
  const { error } = isLike
    ? (shouldInsert ? await result.client.from('post_likes').insert({ post_id: postId, user_id: result.user.id }) : await result.client.from('post_likes').delete().eq('post_id', postId).eq('user_id', result.user.id))
    : (shouldInsert ? await result.client.from('saved_posts').insert({ post_id: postId, user_id: result.user.id }) : await result.client.from('saved_posts').delete().eq('post_id', postId).eq('user_id', result.user.id));
  if (error) return NextResponse.json({ error: 'Post is unavailable or interaction was rejected.' }, { status: 403 });
  return NextResponse.json({ ok: true });
}
