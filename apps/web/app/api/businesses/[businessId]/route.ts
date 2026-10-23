import { NextResponse } from 'next/server';
import { authenticate, getPublicClient, getUserClient } from '../../../lib/server-auth';

export async function GET(request: Request, context: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await context.params;
  let client = getPublicClient();
  const authorization = request.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (token) {
    try {
      const userClient = getUserClient(token);
      const { data } = await userClient.auth.getUser(token);
      if (data.user) client = userClient;
    } catch {
      // Invalid optional credentials fall back to the public policy.
    }
  }
  const { data, error } = await client.from('businesses').select('*').eq('id', businessId).single();
  if (error) return NextResponse.json({ error: 'Business not found.' }, { status: 404 });
  return NextResponse.json({ business: data });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ businessId: string }> },
) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const { businessId } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const allowed = [
    'name',
    'category',
    'description',
    'contact_email',
    'contact_phone',
    'contact_preferences',
    'address_line1',
    'address_line2',
    'city',
    'region',
    'country',
    'postcode',
    'opening_hours',
    'is_published',
  ] as const;
  const update = Object.fromEntries(
    Object.entries(body).filter(([key]) => allowed.includes(key as (typeof allowed)[number])),
  );
  if (!Object.keys(update).length)
    return NextResponse.json(
      { error: 'No editable business fields were provided.' },
      { status: 400 },
    );
  const { data, error } = await result.client
    .from('businesses')
    .update(update)
    .eq('id', businessId)
    .select('*')
    .single();
  if (error)
    return NextResponse.json(
      { error: 'Only the business owner can update this listing.' },
      { status: 403 },
    );
  return NextResponse.json({ business: data });
}
