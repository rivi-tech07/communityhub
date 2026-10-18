import { NextResponse } from 'next/server';
import { requireRole, getAdminClient } from '../../../../../lib/server-auth';
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ promotionId: string }> },
) {
  const result = await requireRole(request, ['administrator', 'moderator']);
  if (result instanceof NextResponse) return result;
  const { promotionId } = await params;
  const body = (await request.json().catch(() => null)) as {
    approvalStatus?: 'approved' | 'rejected';
  } | null;
  if (body?.approvalStatus !== 'approved' && body?.approvalStatus !== 'rejected')
    return NextResponse.json({ error: 'Approval status is required.' }, { status: 400 });
  const client = getAdminClient();
  const { data, error } = await client
    .from('promotions')
    .update({
      approval_status: body.approvalStatus,
      entitlement_status: body.approvalStatus === 'rejected' ? 'rejected' : 'pending_payment',
    })
    .eq('id', promotionId)
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: 'Promotion approval failed.' }, { status: 400 });
  if (body.approvalStatus === 'approved' && data.transaction_id) {
    const { data: transaction } = await client
      .from('payment_transactions')
      .select('status')
      .eq('id', data.transaction_id)
      .single();
    if (transaction?.status === 'succeeded' && new Date(data.expires_at) > new Date())
      await client
        .from('promotions')
        .update({ entitlement_status: 'active' })
        .eq('id', promotionId);
  }
  return NextResponse.json({ promotion: data });
}
