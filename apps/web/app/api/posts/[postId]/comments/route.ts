import { NextResponse } from 'next/server';
import { authenticate } from '../../../../lib/server-auth';

export async function GET(request: Request, context: { params: Promise<{ postId: string }> }) {
  const result = await authenticate(request); if (result instanceof NextResponse) return result;
  const { postId } = await context.params;
  const { data, error } = await result.client.from('comments').select('*').eq('post_id', postId).order('created_at', { ascending: true }).limit(100);
  if (error) return NextResponse.json({ error: 'Unable to load comments.' }, { status: 403 });
  return NextResponse.json({ comments: data ?? [] });
}

export async function POST(request: Request, context: { params: Promise<{ postId: string }> }) {
  const result = await authenticate(request); if (result instanceof NextResponse) return result;
  const { postId } = await context.params;
  let body: { body?: string; parentId?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }
  if (!body.body?.trim()) return NextResponse.json({ error: 'Comment body is required.' }, { status: 400 });
  const { data, error } = await result.client.from('comments').insert({ post_id: postId, parent_id: body.parentId ?? null, author_id: result.user.id, body: body.body.trim() }).select('*').single();
  if (error) return NextResponse.json({ error: 'You must be an active member to comment.' }, { status: 403 });
  return NextResponse.json({ comment: data }, { status: 201 });
}
