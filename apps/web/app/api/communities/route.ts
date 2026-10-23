import { NextResponse } from 'next/server';
import { authenticate, getPublicClient } from '../../lib/server-auth';
import { pageParams } from '../../lib/pagination';
import { type CommunityType, type CommunityVisibility } from '@communityhub/shared';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const publicOnly = params.get('public') === 'true';
  const result = publicOnly ? null : await authenticate(request);
  if (result instanceof NextResponse) return result;
  const { limit, cursor, query } = pageParams(request.url);
  let builder = (result?.client ?? getPublicClient()).from('communities').select('*').order('created_at', { ascending: false }).limit(limit + 1);
  if (publicOnly) builder = builder.eq('visibility', 'public');
  if (query) builder = builder.ilike('name', `%${query.replace(/[%_]/g, '')}%`);
  if (cursor) builder = builder.lt('created_at', cursor);
  const { data, error } = await builder;
  if (error) return NextResponse.json({ error: 'Unable to load communities.' }, { status: 503 });
  const rows = data ?? [];
  return NextResponse.json({ communities: rows.slice(0, limit), nextCursor: rows.length > limit ? rows[limit - 1]?.created_at ?? null : null });
}

export async function POST(request: Request) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }
  const required = ['name', 'slug', 'community_type', 'visibility'];
  if (required.some((field) => typeof body[field] !== 'string')) return NextResponse.json({ error: 'Name, slug, community type, and visibility are required.' }, { status: 400 });
  const communityType = body.community_type as CommunityType;
  const visibility = body.visibility as CommunityVisibility;
  if (!['language', 'culture', 'location', 'interest', 'profession'].includes(communityType) || !['public', 'private'].includes(visibility)) return NextResponse.json({ error: 'Invalid community type or visibility.' }, { status: 400 });
  const { data, error } = await result.client.from('communities').insert({ name: body.name as string, slug: body.slug as string, community_type: communityType, visibility, description: typeof body.description === 'string' ? body.description : null, country: typeof body.country === 'string' ? body.country : null, city: typeof body.city === 'string' ? body.city : null, language_code: typeof body.language_code === 'string' ? body.language_code : null, created_by: result.user.id, is_sample: false }).select('*').single();
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'That community slug is already in use.' : 'Community creation failed.' }, { status: 400 });
  return NextResponse.json({ community: data }, { status: 201 });
}
