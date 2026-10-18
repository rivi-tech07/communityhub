import { NextResponse } from 'next/server';
import { authenticate } from '../../lib/server-auth';

const allowedFields = ['display_name', 'biography', 'profile_photo_url', 'country', 'city', 'preferred_language', 'privacy_settings'] as const;

export async function GET(request: Request) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const { data, error } = await result.client.from('profiles').select('*').eq('id', result.user.id).single();
  if (error) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
  return NextResponse.json({ profile: data });
}

export async function PATCH(request: Request) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }
  const update = Object.fromEntries(Object.entries(body).filter(([key]) => allowedFields.includes(key as (typeof allowedFields)[number])));
  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'No supported profile fields were provided.' }, { status: 400 });
  const { data, error } = await result.client.from('profiles').update(update).eq('id', result.user.id).select('*').single();
  if (error) return NextResponse.json({ error: 'Profile update failed.' }, { status: 400 });
  return NextResponse.json({ profile: data });
}
