import { NextResponse } from 'next/server';
import { authenticate } from '../../lib/server-auth';

export async function POST(request: Request) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  let body: { communityId?: string; body?: string; isAnnouncement?: boolean };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }
  if (!body.communityId || !body.body?.trim()) return NextResponse.json({ error: 'A community and post body are required.' }, { status: 400 });
  const { data, error } = await result.client.from('posts').insert({ community_id: body.communityId, author_id: result.user.id, body: body.body.trim(), is_announcement: body.isAnnouncement === true, is_sample: false }).select('*').single();
  if (error) return NextResponse.json({ error: body.isAnnouncement ? 'Only community administrators can publish announcements.' : 'You must be an active member to post.' }, { status: 403 });
  return NextResponse.json({ post: data }, { status: 201 });
}
