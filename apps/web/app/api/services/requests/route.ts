import { NextResponse } from 'next/server';
import { authenticate } from '../../../../lib/server-auth';
import { requireFeature } from '../../../../lib/feature-flags';
export async function POST(request: Request) {
  const disabled = await requireFeature(request, 'service_enquiries');
  if (disabled) return disabled;
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.serviceId !== 'string' || typeof body.message !== 'string')
    return NextResponse.json(
      { error: 'Service and enquiry message are required.' },
      { status: 400 },
    );
  const { data, error } = await result.client
    .from('service_requests')
    .insert({
      service_id: body.serviceId,
      requester_id: result.user.id,
      message: body.message.trim(),
      requested_at: typeof body.requestedAt === 'string' ? body.requestedAt : null,
    })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: 'Enquiry could not be sent.' }, { status: 400 });
  return NextResponse.json({ request: data }, { status: 201 });
}
