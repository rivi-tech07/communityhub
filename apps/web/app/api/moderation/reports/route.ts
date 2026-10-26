import { NextResponse } from 'next/server';
import { authenticate } from '../../../lib/server-auth';
import { pageParams, paginationError } from '../../../lib/pagination';

export async function GET(request: Request) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const pagination = pageParams(request.url);
  if ('error' in pagination) return paginationError(pagination);
  const { limit } = pagination;
  const { data, error } = await result.client
    .from('reports')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error)
    return NextResponse.json(
      { error: 'You do not have access to moderation reports.' },
      { status: 403 },
    );
  return NextResponse.json({ reports: data ?? [] });
}

export async function PATCH(request: Request) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  let body: { reportId?: string; status?: 'reviewing' | 'resolved' | 'dismissed' };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  if (!body.reportId || !body.status)
    return NextResponse.json({ error: 'reportId and status are required.' }, { status: 400 });
  const { data, error } = await result.client
    .from('reports')
    .update({
      status: body.status,
      resolved_at:
        body.status === 'resolved' || body.status === 'dismissed' ? new Date().toISOString() : null,
      resolved_by:
        body.status === 'resolved' || body.status === 'dismissed' ? result.user.id : null,
    })
    .eq('id', body.reportId)
    .select('*')
    .single();
  if (error)
    return NextResponse.json(
      { error: 'You do not have permission to update this report.' },
      { status: 403 },
    );
  return NextResponse.json({ report: data });
}
