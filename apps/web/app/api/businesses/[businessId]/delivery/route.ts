import { NextResponse } from 'next/server';
import { authenticate, getPublicClient } from '../../../../lib/server-auth';

export async function GET(request: Request, context: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await context.params;
  const client = getPublicClient();
  const [configResult, areasResult] = await Promise.all([
    client.from('delivery_configs').select('*').eq('business_id', businessId).maybeSingle(),
    client
      .from('delivery_areas')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('name'),
  ]);
  if (configResult.error || areasResult.error)
    return NextResponse.json({ error: 'Unable to load delivery configuration.' }, { status: 503 });
  return NextResponse.json({ config: configResult.data, areas: areasResult.data ?? [] });
}
export async function PUT(request: Request, context: { params: Promise<{ businessId: string }> }) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const { businessId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const config = {
    business_id: businessId,
    delivery_enabled: body.deliveryEnabled === true,
    collection_available: body.collectionAvailable === true,
    delivery_charge: typeof body.deliveryCharge === 'number' ? body.deliveryCharge : 0,
    minimum_order_value: typeof body.minimumOrderValue === 'number' ? body.minimumOrderValue : 0,
    currency: typeof body.currency === 'string' ? body.currency.toUpperCase() : 'GBP',
    estimated_min_minutes:
      typeof body.estimatedMinMinutes === 'number' ? body.estimatedMinMinutes : 30,
    estimated_max_minutes:
      typeof body.estimatedMaxMinutes === 'number' ? body.estimatedMaxMinutes : 60,
    opening_hours: body.openingHours ?? {},
  };
  const { data, error } = await result.client
    .from('delivery_configs')
    .upsert(config, { onConflict: 'business_id' })
    .select('*')
    .single();
  if (error)
    return NextResponse.json(
      { error: 'Only the business owner can update delivery settings.' },
      { status: 403 },
    );
  return NextResponse.json({ config: data });
}
