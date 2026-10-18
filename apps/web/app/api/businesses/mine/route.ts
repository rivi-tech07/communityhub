import { NextResponse } from 'next/server';
import { authenticate } from '../../../lib/server-auth';

export async function GET(request: Request) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const { data, error } = await result.client
    .from('businesses')
    .select('*')
    .eq('owner_id', result.user.id)
    .order('created_at', { ascending: false });
  if (error)
    return NextResponse.json({ error: 'Unable to load your businesses.' }, { status: 503 });
  return NextResponse.json({ businesses: data ?? [] });
}
