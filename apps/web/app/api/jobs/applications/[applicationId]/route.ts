import { NextResponse } from 'next/server';
import { authenticate } from '../../../../lib/server-auth';

export async function PATCH(request: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const { applicationId } = await params;
  const body = await request.json().catch(() => null) as { status?: string; coverNote?: string } | null;
  if (!body || (body.status === undefined && body.coverNote === undefined)) return NextResponse.json({ error: 'No application changes were supplied.' }, { status: 400 });
  const update: { status?: 'submitted' | 'reviewing' | 'shortlisted' | 'rejected' | 'withdrawn' | 'hired'; cover_note?: string } = {};
  if (body.status && ['submitted', 'reviewing', 'shortlisted', 'rejected', 'withdrawn', 'hired'].includes(body.status)) update.status = body.status as typeof update.status;
  if (typeof body.coverNote === 'string' && body.coverNote.length <= 5000) update.cover_note = body.coverNote;
  if (!Object.keys(update).length) return NextResponse.json({ error: 'Invalid application changes.' }, { status: 400 });
  const { data, error } = await result.client.from('job_applications').update(update).eq('id', applicationId).select('*').single();
  if (error || !data) return NextResponse.json({ error: 'Application could not be updated or you are not authorized.' }, { status: 403 });
  return NextResponse.json({ application: data });
}
