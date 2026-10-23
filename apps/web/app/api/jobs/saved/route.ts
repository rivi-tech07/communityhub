import { NextResponse } from 'next/server';
import { authenticate } from '../../../lib/server-auth';

export async function GET(request: Request) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const { data, error } = await result.client.from('saved_jobs').select('created_at, job:job_listings(*)').order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Unable to load saved jobs.' }, { status: 503 });
  return NextResponse.json({ savedJobs: data ?? [] });
}

export async function POST(request: Request) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const body = await request.json().catch(() => null) as { jobId?: string } | null;
  if (!body?.jobId) return NextResponse.json({ error: 'Job is required.' }, { status: 400 });
  const { data, error } = await result.client.from('saved_jobs').insert({ user_id: result.user.id, job_id: body.jobId }).select('created_at, job:job_listings(*)').single();
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'Job is already saved.' : 'Job could not be saved.' }, { status: 400 });
  return NextResponse.json({ savedJob: data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const jobId = new URL(request.url).searchParams.get('jobId');
  if (!jobId) return NextResponse.json({ error: 'jobId is required.' }, { status: 400 });
  const { error } = await result.client.from('saved_jobs').delete().eq('user_id', result.user.id).eq('job_id', jobId);
  if (error) return NextResponse.json({ error: 'Saved job could not be removed.' }, { status: 400 });
  return NextResponse.json({ ok: true });
}
