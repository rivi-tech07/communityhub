import { NextResponse } from 'next/server';
import { authenticate } from '../../../lib/server-auth';

export async function PATCH(request: Request) {
  const result = await authenticate(request); if (result instanceof NextResponse) return result;
  let body: { postId?: string; commentId?: string; reason?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }
  if ((!body.postId && !body.commentId) || (body.postId && body.commentId)) return NextResponse.json({ error: 'Provide exactly one postId or commentId.' }, { status: 400 });
  const removed = { removed_at: new Date().toISOString(), removed_by: result.user.id, removed_reason: body.reason?.trim() || 'Removed by a community or platform moderator.' };
  if (body.postId) {
    const { data, error } = await result.client.from('posts').update(removed).eq('id', body.postId).select('id').single();
    if (error) return NextResponse.json({ error: 'You do not have permission to remove this post.' }, { status: 403 });
    await result.client.from('moderation_audit_log').insert({ actor_id: result.user.id, action: 'remove_post', post_id: body.postId, reason: removed.removed_reason });
    return NextResponse.json({ content: data });
  }
  const { data, error } = await result.client.from('comments').update(removed).eq('id', body.commentId!).select('id, post_id').single();
  if (error) return NextResponse.json({ error: 'You do not have permission to remove this comment.' }, { status: 403 });
  await result.client.from('moderation_audit_log').insert({ actor_id: result.user.id, action: 'remove_comment', comment_id: body.commentId, post_id: data.post_id, reason: removed.removed_reason });
  return NextResponse.json({ content: data });
}
