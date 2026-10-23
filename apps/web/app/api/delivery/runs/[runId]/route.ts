import { NextResponse } from 'next/server';
import { authenticate } from '../../../../lib/server-auth';

export async function PATCH(request: Request, context: { params: Promise<{ runId: string }> }) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const { runId } = await context.params;
  const body = (await request.json().catch(() => null)) as { deliveryAddress?: Record<string, unknown> } | null;
  if (!body?.deliveryAddress || typeof body.deliveryAddress !== 'object')
    return NextResponse.json({ error: 'A delivery address is required.' }, { status: 400 });
  const { data, error } = await result.client
    .from('delivery_runs')
    .update({ delivery_address: body.deliveryAddress })
    .eq('id', runId)
    .select('id,status,delivery_address,updated_at')
    .single();
  if (error || !data) return NextResponse.json({ error: 'Only the customer can update this address before delivery.' }, { status: 403 });
  return NextResponse.json({ run: data });
}
