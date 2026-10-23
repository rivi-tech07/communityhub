import { NextResponse } from 'next/server';
import { authenticate } from '../../../lib/server-auth';

export async function GET(request: Request) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const { data, error } = await result.client.from('job_listings').select('*').order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Unable to load managed jobs.' }, { status: 503 });
  return NextResponse.json({ jobs: data ?? [] });
}
