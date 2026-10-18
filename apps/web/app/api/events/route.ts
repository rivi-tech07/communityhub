import { NextResponse } from 'next/server';
import { authenticate, getPublicClient } from '../../lib/server-auth';
import { pageParams } from '../../lib/pagination';
export async function GET(request: Request) {
  const { limit, cursor, query } = pageParams(request.url);
  const params = new URL(request.url).searchParams;
  let builder = getPublicClient()
    .from('events')
    .select('*')
    .eq('status', 'published')
    .gte('ends_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(limit + 1);
  if (query) builder = builder.ilike('title', `%${query.replace(/[%_]/g, '')}%`);
  if (params.get('online') === 'true') builder = builder.not('online_url', 'is', null);
  if (cursor) builder = builder.gt('starts_at', cursor);
  const { data, error } = await builder;
  if (error) return NextResponse.json({ error: 'Unable to load events.' }, { status: 503 });
  const rows = data ?? [];
  return NextResponse.json({
    events: rows.slice(0, limit),
    nextCursor: rows.length > limit ? rows[limit - 1]?.starts_at : null,
  });
}
export async function POST(request: Request) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (
    !body ||
    typeof body.title !== 'string' ||
    typeof body.description !== 'string' ||
    typeof body.startsAt !== 'string' ||
    typeof body.endsAt !== 'string'
  )
    return NextResponse.json(
      { error: 'Title, description, start, and end are required.' },
      { status: 400 },
    );
  const { data, error } = await result.client
    .from('events')
    .insert({
      organizer_id: result.user.id,
      title: body.title.trim(),
      description: body.description.trim(),
      venue_name: typeof body.venueName === 'string' ? body.venueName : null,
      venue_address: typeof body.venueAddress === 'string' ? body.venueAddress : null,
      online_url: typeof body.onlineUrl === 'string' ? body.onlineUrl : null,
      starts_at: body.startsAt,
      ends_at: body.endsAt,
      capacity: typeof body.capacity === 'number' ? body.capacity : null,
      is_free: true,
      status: 'draft',
    })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: 'Event could not be created.' }, { status: 400 });
  return NextResponse.json({ event: data }, { status: 201 });
}
