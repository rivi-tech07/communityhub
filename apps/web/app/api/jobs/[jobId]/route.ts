import { NextResponse } from 'next/server';
import { authenticate, getPublicClient } from '../../../lib/server-auth';

type Context = { params: Promise<{ jobId: string }> };

export async function GET(request: Request, context: Context) {
  const { jobId } = await context.params;
  const { data, error } = await getPublicClient().from('job_listings').select('*').eq('id', jobId).single();
  if (error || !data) return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
  return NextResponse.json({ job: data });
}

export async function PATCH(request: Request, context: Context) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const { jobId } = await context.params;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  const update: { title?: string; description?: string; location?: string | null; workplace_type?: 'remote' | 'hybrid' | 'on_site'; status?: 'draft' | 'published' | 'removed' | 'expired'; salary_min?: number | null; salary_max?: number | null } = {};
  if (typeof body.title === 'string' && body.title.trim().length >= 2) update.title = body.title.trim();
  if (typeof body.description === 'string' && body.description.trim().length >= 10) update.description = body.description.trim();
  if (typeof body.location === 'string' || body.location === null) update.location = body.location as string | null;
  if (['remote', 'hybrid', 'on_site'].includes(String(body.workplaceType))) update.workplace_type = body.workplaceType as 'remote' | 'hybrid' | 'on_site';
  if (['draft', 'published', 'removed', 'expired'].includes(String(body.status))) update.status = body.status as 'draft' | 'published' | 'removed' | 'expired';
  if (typeof body.salaryMin === 'number' || body.salaryMin === null) update.salary_min = body.salaryMin as number | null;
  if (typeof body.salaryMax === 'number' || body.salaryMax === null) update.salary_max = body.salaryMax as number | null;
  if (!Object.keys(update).length) return NextResponse.json({ error: 'No valid job changes were supplied.' }, { status: 400 });
  const { data, error } = await result.client.from('job_listings').update(update).eq('id', jobId).select('*').single();
  if (error || !data) return NextResponse.json({ error: 'Job could not be updated or you do not own it.' }, { status: 403 });
  return NextResponse.json({ job: data });
}

export async function DELETE(request: Request, context: Context) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const { jobId } = await context.params;
  const { error } = await result.client.from('job_listings').delete().eq('id', jobId);
  if (error) return NextResponse.json({ error: 'Job could not be deleted or you do not own it.' }, { status: 403 });
  return NextResponse.json({ ok: true });
}
