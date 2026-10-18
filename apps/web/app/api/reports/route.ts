import { NextResponse } from 'next/server';
import { authenticate } from '../../lib/server-auth';

export async function POST(request: Request) {
  const result = await authenticate(request); if (result instanceof NextResponse) return result;
  let body: { postId?: string; commentId?: string; reportedUserId?: string; reason?: string; details?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }
  if (!body.postId && !body.commentId && !body.reportedUserId) return NextResponse.json({ error: 'A post, comment, or user is required.' }, { status: 400 });
  const { data, error } = await result.client.from('reports').insert({ reporter_id: result.user.id, post_id: body.postId ?? null, comment_id: body.commentId ?? null, reported_user_id: body.reportedUserId ?? null, reason: body.reason ?? 'other', details: body.details ?? null }).select('id, status, created_at').single();
  if (error) return NextResponse.json({ error: 'Report could not be submitted.' }, { status: 400 });
  return NextResponse.json({ report: data }, { status: 201 });
}
