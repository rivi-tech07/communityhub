import { NextResponse } from 'next/server';
import { authenticate } from '../../../lib/server-auth';

export async function GET(request: Request) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const { data, error } = await result.client
    .from('job_applications')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Unable to load applications.' }, { status: 503 });
  return NextResponse.json({ applications: data ?? [] });
}
export async function POST(request: Request) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.jobId !== 'string')
    return NextResponse.json({ error: 'Job is required.' }, { status: 400 });
  const { data, error } = await result.client
    .from('job_applications')
    .insert({
      job_id: body.jobId,
      applicant_id: result.user.id,
      cv_document_id: typeof body.cvDocumentId === 'string' ? body.cvDocumentId : null,
      cover_note: typeof body.coverNote === 'string' ? body.coverNote : null,
    })
    .select('*')
    .single();
  if (error)
    return NextResponse.json(
      {
        error:
          error.code === '23505'
            ? 'You have already applied to this job.'
            : 'Application failed. The job may be expired or closed.',
      },
      { status: 400 },
    );
  return NextResponse.json({ application: data }, { status: 201 });
}
