import { NextResponse } from 'next/server';
import { authenticate } from '../../../../lib/server-auth';
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const { requestId } = await params;
  const body = (await request.json().catch(() => null)) as {
    status?: string;
    quotedPriceMinor?: number;
    quotedCurrency?: string;
  } | null;
  const { data, error } = await result.client
    .from('service_requests')
    .update({
      status: body?.status as never,
      quoted_price_minor: body?.quotedPriceMinor,
      quoted_currency: body?.quotedCurrency,
    })
    .eq('id', requestId)
    .select('*')
    .single();
  if (error)
    return NextResponse.json(
      { error: 'Request update failed or you are not authorized.' },
      { status: 403 },
    );
  return NextResponse.json({ request: data });
}
