import { NextResponse } from 'next/server';
import { authenticate } from '../../../../../../lib/server-auth';

export async function POST(request: Request, context: { params: Promise<{ businessId: string }> }) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const { businessId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof body.name !== 'string' || !Array.isArray(body.supportedPostcodes))
    return NextResponse.json(
      { error: 'Area name and supported postcodes are required.' },
      { status: 400 },
    );
  const { data, error } = await result.client
    .from('delivery_areas')
    .insert({
      business_id: businessId,
      name: body.name.trim(),
      supported_postcodes: body.supportedPostcodes
        .filter((postcode): postcode is string => typeof postcode === 'string')
        .map((postcode) => postcode.trim().toUpperCase()),
      delivery_charge: typeof body.deliveryCharge === 'number' ? body.deliveryCharge : 0,
      minimum_order_value: typeof body.minimumOrderValue === 'number' ? body.minimumOrderValue : 0,
      available_time_slots: Array.isArray(body.availableTimeSlots) ? body.availableTimeSlots : [],
      is_active: body.isActive !== false,
    })
    .select('*')
    .single();
  if (error)
    return NextResponse.json(
      { error: 'Only the business owner can add delivery areas.' },
      { status: 403 },
    );
  return NextResponse.json({ area: data }, { status: 201 });
}
