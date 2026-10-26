import { NextResponse } from 'next/server';
import { authenticate, getPublicClient } from '../../lib/server-auth';
import { pageParams, paginationError } from '../../lib/pagination';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const publicOnly = params.get('public') === 'true';
  const result = publicOnly ? null : await authenticate(request);
  if (result instanceof NextResponse) return result;
  const pagination = pageParams(request.url);
  if ('error' in pagination) return paginationError(pagination);
  const { limit, cursor } = pagination;
  const communityId = params.get('communityId');
  let builder = (result?.client ?? getPublicClient())
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit + 1);
  if (communityId) builder = builder.eq('community_id', communityId);
  if (cursor) builder = builder.lt('created_at', cursor);
  const { data, error } = await builder;
  if (error) return NextResponse.json({ error: 'Unable to load feed.' }, { status: 503 });
  const rows = data ?? [];
  return NextResponse.json({
    posts: rows.slice(0, limit),
    nextCursor: rows.length > limit ? (rows[limit - 1]?.created_at ?? null) : null,
  });
}
