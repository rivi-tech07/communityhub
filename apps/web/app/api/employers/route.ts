import { NextResponse } from 'next/server';
import { authenticate } from '../../lib/server-auth';

export async function GET(request: Request) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const { data, error } = await result.client
    .from('employer_profiles')
    .select('*')
    .eq('owner_id', result.user.id)
    .order('created_at', { ascending: false });
  if (error)
    return NextResponse.json({ error: 'Unable to load employer profiles.' }, { status: 503 });
  return NextResponse.json({ employers: data ?? [] });
}
export async function POST(request: Request) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.name !== 'string')
    return NextResponse.json({ error: 'Employer name is required.' }, { status: 400 });
  const { data, error } = await result.client
    .from('employer_profiles')
    .insert({
      owner_id: result.user.id,
      name: body.name.trim(),
      description: typeof body.description === 'string' ? body.description : null,
      website: typeof body.website === 'string' ? body.website : null,
      contact_email: typeof body.contactEmail === 'string' ? body.contactEmail : null,
      city: typeof body.city === 'string' ? body.city : null,
      country: typeof body.country === 'string' ? body.country : null,
    })
    .select('*')
    .single();
  if (error)
    return NextResponse.json({ error: 'Employer profile could not be created.' }, { status: 400 });
  return NextResponse.json({ employer: data }, { status: 201 });
}
