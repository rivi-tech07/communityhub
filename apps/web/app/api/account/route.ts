import { NextResponse } from 'next/server';
import { authenticate, getAdminClient } from '../../lib/server-auth';

export async function DELETE(request: Request) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  try {
    const admin = getAdminClient();
    const existing = await admin
      .from('deletion_requests')
      .select('id,status')
      .eq('user_id', result.user.id)
      .in('status', ['queued', 'processing'])
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data)
      return NextResponse.json(
        { requestId: existing.data.id, status: existing.data.status },
        { status: 202 },
      );

    const { data: deletion, error: queueError } = await admin
      .from('deletion_requests')
      .insert({ user_id: result.user.id })
      .select('id,status,requested_at')
      .single();
    if (queueError || !deletion) {
      return NextResponse.json(
        { error: 'Account deletion is already queued or unavailable.' },
        { status: 409 },
      );
    }
    const { error: banError } = await admin.auth.admin.updateUserById(result.user.id, {
      ban_duration: '876000h',
    });
    if (banError) {
      await admin
        .from('deletion_requests')
        .update({ status: 'failed', last_error: banError.message })
        .eq('id', deletion.id);
      return NextResponse.json(
        { error: 'Account deletion could not be queued safely.' },
        { status: 502 },
      );
    }
    return NextResponse.json({ requestId: deletion.id, status: deletion.status }, { status: 202 });
  } catch {
    return NextResponse.json(
      { error: 'Account deletion is not configured on this server.' },
      { status: 503 },
    );
  }
}
