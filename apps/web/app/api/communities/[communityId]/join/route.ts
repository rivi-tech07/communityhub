import { NextResponse } from 'next/server';
import { authenticate } from '../../../../lib/server-auth';

export async function POST(request: Request, context: { params: Promise<{ communityId: string }> }) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const { communityId } = await context.params;
  const { data: community, error: communityError } = await result.client.from('communities').select('visibility').eq('id', communityId).single();
  if (communityError || !community) return NextResponse.json({ error: 'Community not found.' }, { status: 404 });
  const { data, error } = await result.client.from('community_memberships').insert({ community_id: communityId, user_id: result.user.id, role: 'member', status: community.visibility === 'private' ? 'pending' : 'active' }).select('*').single();
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'You already have a membership request.' : 'Unable to join this community.' }, { status: 400 });
  return NextResponse.json({ membership: data }, { status: 201 });
}
