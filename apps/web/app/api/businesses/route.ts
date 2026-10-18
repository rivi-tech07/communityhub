import { NextResponse } from 'next/server';
import { authenticate, getPublicClient } from '../../lib/server-auth';
import { pageParams } from '../../lib/pagination';

export async function GET(request: Request) {
  const { limit, cursor, query } = pageParams(request.url);
  const params = new URL(request.url).searchParams;
  const client = getPublicClient();
  let builder = client
    .from('businesses')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit + 1);
  if (query)
    builder = builder.or(
      `name.ilike.%${query.replace(/[%_,]/g, '')}%,description.ilike.%${query.replace(/[%_,]/g, '')}%`,
    );
  if (params.get('category')) builder = builder.eq('category', params.get('category')!);
  if (params.get('city')) builder = builder.ilike('city', params.get('city')!);
  if (cursor) builder = builder.lt('created_at', cursor);
  const { data, error } = await builder;
  if (error)
    return NextResponse.json({ error: 'Unable to load the business directory.' }, { status: 503 });
  const rows = data ?? [];
  return NextResponse.json({
    businesses: rows.slice(0, limit),
    nextCursor: rows.length > limit ? (rows[limit - 1]?.created_at ?? null) : null,
  });
}

export async function POST(request: Request) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  if (
    typeof body.name !== 'string' ||
    typeof body.slug !== 'string' ||
    typeof body.category !== 'string'
  )
    return NextResponse.json({ error: 'Name, slug, and category are required.' }, { status: 400 });
  const { data, error } = await result.client
    .from('businesses')
    .insert({
      owner_id: result.user.id,
      name: body.name.trim(),
      slug: body.slug.trim().toLowerCase(),
      category: body.category.trim(),
      description: typeof body.description === 'string' ? body.description : null,
      country: typeof body.country === 'string' ? body.country : null,
      city: typeof body.city === 'string' ? body.city : null,
      postcode: typeof body.postcode === 'string' ? body.postcode : null,
      contact_email: typeof body.contactEmail === 'string' ? body.contactEmail : null,
      contact_phone: typeof body.contactPhone === 'string' ? body.contactPhone : null,
      contact_preferences: body.contactPreferences ?? { email: true, phone: false },
      opening_hours: body.openingHours ?? {},
      is_published: false,
      verification_status: 'pending',
      is_sample: false,
    })
    .select('*')
    .single();
  if (error)
    return NextResponse.json(
      {
        error:
          error.code === '23505'
            ? 'That business slug is already in use.'
            : 'Business registration failed.',
      },
      { status: 400 },
    );
  return NextResponse.json({ business: data }, { status: 201 });
}
