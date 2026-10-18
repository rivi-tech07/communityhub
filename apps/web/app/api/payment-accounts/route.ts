import { NextResponse } from 'next/server';
import { authenticate } from '../../lib/server-auth';
export async function GET(request: Request) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const { data, error } = await result.client
    .from('payment_accounts')
    .select('id,country,provider,mode,approval_status,is_enabled')
    .eq('owner_id', result.user.id);
  if (error)
    return NextResponse.json({ error: 'Unable to load payment accounts.' }, { status: 503 });
  return NextResponse.json({ accounts: data ?? [] });
}
export async function POST(request: Request) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (
    !body ||
    (body.country !== 'GB' && body.country !== 'IN') ||
    (body.provider !== 'stripe' && body.provider !== 'razorpay')
  )
    return NextResponse.json(
      { error: 'Country and supported provider are required.' },
      { status: 400 },
    );
  const { data, error } = await result.client
    .from('payment_accounts')
    .insert({
      owner_id: result.user.id,
      country: body.country,
      provider: body.provider,
      mode: 'test',
      approval_status: 'pending',
      is_enabled: false,
    })
    .select('id,country,provider,mode,approval_status,is_enabled')
    .single();
  if (error)
    return NextResponse.json(
      { error: 'Payment account request could not be created.' },
      { status: 400 },
    );
  return NextResponse.json({ account: data }, { status: 201 });
}
