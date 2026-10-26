import { NextResponse } from 'next/server';
import { authenticate, getAdminClient } from '../../../lib/server-auth';
import { requireFeature } from '../../../lib/feature-flags';
export async function GET(request: Request) {
  const disabled = await requireFeature(request, 'promotions');
  if (disabled) return disabled;
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  try {
    const admin = getAdminClient();
    await admin
      .from('promotions')
      .update({ entitlement_status: 'expired' })
      .eq('entitlement_status', 'active')
      .lte('expires_at', new Date().toISOString());
  } catch {}
  const { data, error } = await result.client
    .from('promotions')
    .select('*')
    .eq('purchaser_id', result.user.id)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Unable to load promotions.' }, { status: 503 });
  return NextResponse.json({ promotions: data ?? [] });
}
export async function POST(request: Request) {
  const disabled = await requireFeature(request, 'promotions');
  if (disabled) return disabled;
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (
    !body ||
    typeof body.packageId !== 'string' ||
    typeof body.targetType !== 'string' ||
    typeof body.targetId !== 'string'
  )
    return NextResponse.json({ error: 'Package and target are required.' }, { status: 400 });
  const { data: pack, error: packError } = await result.client
    .from('promotion_packages')
    .select('*')
    .eq('id', body.packageId)
    .eq('is_active', true)
    .single();
  if (packError || !pack)
    return NextResponse.json({ error: 'Promotion package is unavailable.' }, { status: 404 });
  const { data, error } = await result.client
    .from('promotions')
    .insert({
      purchaser_id: result.user.id,
      package_id: pack.id,
      target_type: body.targetType as never,
      target_id: body.targetId,
      price_minor: pack.price_minor,
      currency: pack.currency,
      starts_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + pack.duration_days * 86400000).toISOString(),
      approval_status: 'pending',
      entitlement_status: 'pending_payment',
    })
    .select('*')
    .single();
  if (error)
    return NextResponse.json(
      { error: 'You cannot promote this target or the request is invalid.' },
      { status: 403 },
    );
  return NextResponse.json({ promotion: data }, { status: 201 });
}
