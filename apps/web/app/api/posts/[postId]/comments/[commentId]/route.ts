import { NextResponse } from 'next/server';
import { authenticate } from '../../../../../lib/server-auth';

type Context = { params: Promise<{ postId: string; commentId: string }> };

export async function PATCH(request: Request, context: Context) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const { postId, commentId } = await context.params;
  const body = await request.json().catch(() => ({})) as { body?: string };
  if (!body.body?.trim()) return NextResponse.json({ error: 'Comment body is required.' }, { status: 400 });
  const { data, error } = await result.client.from('comments').update({ body: body.body.trim() }).eq('id', commentId).eq('post_id', postId).select('*').single();
  if (error || !data) return NextResponse.json({ error: 'Comment could not be edited.' }, { status: 403 });
  return NextResponse.json({ comment: data });
}

export async function DELETE(request: Request, context: Context) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const { postId, commentId } = await context.params;
  const { error } = await result.client.from('comments').delete().eq('id', commentId).eq('post_id', postId);
  if (error) return NextResponse.json({ error: 'Comment could not be deleted.' }, { status: 403 });
  return NextResponse.json({ ok: true });
}
