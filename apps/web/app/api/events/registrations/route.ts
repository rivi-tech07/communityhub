import { NextResponse } from 'next/server';
import { authenticate } from '../../../lib/server-auth';
export async function POST(request: Request) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.eventId !== 'string')
    return NextResponse.json({ error: 'Event is required.' }, { status: 400 });
  const { data, error } = await result.client
    .from('event_registrations')
    .insert({ event_id: body.eventId, user_id: result.user.id })
    .select('*')
    .single();
  if (error)
    return NextResponse.json(
      {
        error:
          error.code === '23505'
            ? 'You are already registered.'
            : 'Registration failed. The event may be full or closed.',
      },
      { status: 400 },
    );
  return NextResponse.json({ registration: data }, { status: 201 });
}
