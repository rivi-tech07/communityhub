import { NextResponse } from 'next/server';
import { authenticate } from '../../../lib/server-auth';

export async function GET(request: Request) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  let query = result.client
    .from('delivery_runs')
    .select('id,customer_id,rider_id,status,delivery_address,assigned_at,delivered_at,created_at,delivery_run_stops(id,business_id,order_id,stop_order,status,picked_up_at)')
    .order('created_at', { ascending: false });
  if (status) query = query.eq('status', status as never);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Unable to load delivery runs.' }, { status: 503 });
  return NextResponse.json({ runs: data ?? [] });
}

export async function POST(request: Request) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const body = (await request.json().catch(() => null)) as { deliveryAddress?: Record<string, unknown> } | null;
  if (!body?.deliveryAddress || typeof body.deliveryAddress !== 'object')
    return NextResponse.json({ error: 'A delivery address is required.' }, { status: 400 });
  const { data, error } = await result.client
    .from('delivery_runs')
    .insert({ customer_id: result.user.id, delivery_address: body.deliveryAddress, status: 'pending' })
    .select('id,customer_id,status,delivery_address,created_at')
    .single();
  if (error || !data) return NextResponse.json({ error: 'Unable to create delivery run.' }, { status: 400 });
  return NextResponse.json({ run: data }, { status: 201 });
}
