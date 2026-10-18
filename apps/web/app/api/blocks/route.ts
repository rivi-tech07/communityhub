import { NextResponse } from 'next/server';
import { authenticate } from '../../lib/server-auth';

export async function POST(request: Request) {
  const result = await authenticate(request); if (result instanceof NextResponse) return result;
  const body = await request.json().catch(() => ({})) as { userId?: string };
  if (!body.userId || body.userId === result.user.id) return NextResponse.json({ error: 'A different user is required.' }, { status: 400 });
  const { error } = await result.client.from('blocks').insert({ blocker_id: result.user.id, blocked_id: body.userId });
  if (error) return NextResponse.json({ error: 'Unable to block this user.' }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const result = await authenticate(request); if (result instanceof NextResponse) return result;
  const userId = new URL(request.url).searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId is required.' }, { status: 400 });
  const { error } = await result.client.from('blocks').delete().eq('blocker_id', result.user.id).eq('blocked_id', userId);
  if (error) return NextResponse.json({ error: 'Unable to unblock this user.' }, { status: 400 });
  return NextResponse.json({ ok: true });
}
