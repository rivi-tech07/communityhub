import { NextResponse } from 'next/server';
import { requireRole, getAdminClient } from '../../../../lib/server-auth';
import { refundProviderPayment } from '../../../../lib/payments';
export async function POST(
  request: Request,
  { params }: { params: Promise<{ transactionId: string }> },
) {
  const result = await requireRole(request, ['administrator']);
  if (result instanceof NextResponse) return result;
  const { transactionId } = await params;
  const client = getAdminClient();
  const { data: transaction, error } = await client
    .from('payment_transactions')
    .select('*')
    .eq('id', transactionId)
    .single();
  if (
    error ||
    !transaction ||
    !transaction.provider_payment_id ||
    transaction.status !== 'succeeded'
  )
    return NextResponse.json(
      { error: 'Only successful provider payments can be refunded.' },
      { status: 400 },
    );
  const body = (await request.json().catch(() => ({}))) as { amountMinor?: number };
  try {
    await refundProviderPayment({
      provider: transaction.provider,
      providerPaymentId: transaction.provider_payment_id,
      amountMinor: body.amountMinor,
    });
  } catch (refundError) {
    return NextResponse.json(
      { error: refundError instanceof Error ? refundError.message : 'Refund failed.' },
      { status: 502 },
    );
  }
  const amount = body.amountMinor ?? transaction.amount_minor;
  await client
    .from('payment_transactions')
    .update({
      status: amount >= transaction.amount_minor ? 'refunded' : 'partially_refunded',
      refund_amount_minor: amount,
    })
    .eq('id', transaction.id);
  if (transaction.purpose === 'physical_order')
    await client.from('orders').update({ status: 'cancelled' }).eq('id', transaction.reference_id);
  if (transaction.purpose === 'promotion')
    await client
      .from('promotions')
      .update({ entitlement_status: 'cancelled' })
      .eq('id', transaction.reference_id);
  return NextResponse.json({ refunded: true, amountMinor: amount });
}
