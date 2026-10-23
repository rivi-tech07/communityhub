import { NextResponse } from 'next/server';
import { authenticate } from '../../../lib/server-auth';

type Context = { params: Promise<{ postId: string }> };

export async function PATCH(request: Request, context: Context) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const { postId } = await context.params;
  const body = await request.json().catch(() => ({})) as { body?: string; isAnnouncement?: boolean };
  if (!body.body?.trim()) return NextResponse.json({ error: 'Post body is required.' }, { status: 400 });
  const update: { body: string; is_announcement?: boolean } = { body: body.body.trim() };
  if (typeof body.isAnnouncement === 'boolean') update.is_announcement = body.isAnnouncement;
  const { data, error } = await result.client.from('posts').update(update).eq('id', postId).select('*').single();
  if (error || !data) return NextResponse.json({ error: 'Post could not be edited.' }, { status: 403 });
  return NextResponse.json({ post: data });
}

export async function DELETE(request: Request, context: Context) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const { postId } = await context.params;
  const { error } = await result.client.from('posts').delete().eq('id', postId);
  if (error) return NextResponse.json({ error: 'Post could not be deleted.' }, { status: 403 });
  return NextResponse.json({ ok: true });
}
