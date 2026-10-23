import { NextResponse } from 'next/server';
import { authenticate, getPublicClient } from '../../lib/server-auth';
import { pageParams } from '../../lib/pagination';

export async function GET(request: Request) {
  const { limit, cursor, query } = pageParams(request.url);
  const params = new URL(request.url).searchParams;
  let builder = getPublicClient()
    .from('job_listings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit + 1);
  if (query) builder = builder.ilike('title', `%${query.replace(/[%_]/g, '')}%`);
  if (params.get('sponsorshipStatus'))
    builder = builder.eq('sponsorship_status', params.get('sponsorshipStatus')! as never);
  if (params.get('jobType')) builder = builder.eq('job_type', params.get('jobType')! as never);
  if (params.get('location'))
    builder = builder.ilike('location', `%${params.get('location')!.replace(/[%_]/g, '')}%`);
  if (cursor) builder = builder.lt('created_at', cursor);
  const { data, error } = await builder;
  if (error) return NextResponse.json({ error: 'Unable to load jobs.' }, { status: 503 });
  const rows = data ?? [];
  return NextResponse.json({
    jobs: rows.slice(0, limit),
    nextCursor: rows.length > limit ? rows[limit - 1]?.created_at : null,
  });
}

export async function POST(request: Request) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (
    !body ||
    typeof body.employerId !== 'string' ||
    typeof body.title !== 'string' ||
    typeof body.description !== 'string' ||
    typeof body.jobType !== 'string'
  )
    return NextResponse.json(
      { error: 'Employer, title, description, and job type are required.' },
      { status: 400 },
    );
  const { data, error } = await result.client
    .from('job_listings')
    .insert({
      employer_id: body.employerId,
      title: body.title.trim(),
      description: body.description.trim(),
      job_type: body.jobType as never,
      salary_min: typeof body.salaryMin === 'number' ? body.salaryMin : null,
      salary_max: typeof body.salaryMax === 'number' ? body.salaryMax : null,
      salary_currency:
        typeof body.salaryCurrency === 'string' ? body.salaryCurrency.toUpperCase() : 'GBP',
      location: typeof body.location === 'string' ? body.location : null,
      is_remote: body.isRemote === true,
      workplace_type: ['remote', 'hybrid', 'on_site'].includes(String(body.workplaceType)) ? (body.workplaceType as 'remote' | 'hybrid' | 'on_site') : 'on_site',
      application_deadline:
        typeof body.applicationDeadline === 'string' ? body.applicationDeadline : null,
      sponsorship_status:
        typeof body.sponsorshipStatus === 'string' ? (body.sponsorshipStatus as never) : 'unknown',
      sponsorship_source:
        typeof body.sponsorshipSource === 'string' ? body.sponsorshipSource : null,
      sponsorship_checked_at:
        typeof body.sponsorshipCheckedAt === 'string' ? body.sponsorshipCheckedAt : null,
      status: 'draft',
    })
    .select('*')
    .single();
  if (error)
    return NextResponse.json(
      { error: 'Job creation failed or you do not own this employer profile.' },
      { status: 403 },
    );
  return NextResponse.json({ job: data }, { status: 201 });
}
