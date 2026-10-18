import { NextResponse } from 'next/server';
import { authenticate, getPublicClient } from '../../lib/server-auth';
import { pageParams } from '../../lib/pagination';
export async function GET(request: Request) {
  const { limit, cursor, query } = pageParams(request.url);
  const params = new URL(request.url).searchParams;
  let builder = getPublicClient()
    .from('services')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit + 1);
  if (query) builder = builder.ilike('name', `%${query.replace(/[%_]/g, '')}%`);
  if (params.get('category')) builder = builder.eq('category', params.get('category')!);
  if (cursor) builder = builder.lt('created_at', cursor);
  const { data, error } = await builder;
  if (error) return NextResponse.json({ error: 'Unable to load services.' }, { status: 503 });
  const rows = data ?? [];
  return NextResponse.json({
    services: rows.slice(0, limit),
    nextCursor: rows.length > limit ? rows[limit - 1]?.created_at : null,
  });
}
export async function POST(request: Request) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (
    !body ||
    typeof body.name !== 'string' ||
    typeof body.category !== 'string' ||
    typeof body.description !== 'string'
  )
    return NextResponse.json(
      { error: 'Name, category, and description are required.' },
      { status: 400 },
    );
  const { data, error } = await result.client
    .from('services')
    .insert({
      owner_id: result.user.id,
      name: body.name.trim(),
      category: body.category.trim(),
      description: body.description.trim(),
      pricing: typeof body.pricing === 'string' ? body.pricing : null,
      service_areas: Array.isArray(body.serviceAreas)
        ? body.serviceAreas.filter((item): item is string => typeof item === 'string')
        : [],
      availability:
        body.availability && typeof body.availability === 'object'
          ? (body.availability as Record<string, unknown>)
          : {},
      status: 'draft',
    })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: 'Service could not be created.' }, { status: 400 });
  return NextResponse.json({ service: data }, { status: 201 });
}
