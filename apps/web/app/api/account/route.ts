import { NextResponse } from 'next/server';
import { authenticate, getAdminClient } from '../../lib/server-auth';

export async function DELETE(request: Request) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  try {
    const admin = getAdminClient();
    const { error } = await admin.auth.admin.deleteUser(result.user.id);
    if (error) return NextResponse.json({ error: 'Account deletion failed. Please try again.' }, { status: 502 });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Account deletion is not configured on this server.' }, { status: 503 });
  }
}
