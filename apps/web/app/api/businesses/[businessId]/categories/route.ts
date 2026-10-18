import { NextResponse } from 'next/server';
import { authenticate } from '../../../../lib/server-auth';

export async function GET(request: Request, context: { params: Promise<{ businessId: string }> }) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const { businessId } = await context.params;
  const { data, error } = await result.client
    .from('product_categories')
    .select('*')
    .eq('business_id', businessId)
    .order('sort_order');
  if (error) return NextResponse.json({ error: 'Unable to load categories.' }, { status: 403 });
  return NextResponse.json({ categories: data ?? [] });
}
export async function POST(request: Request, context: { params: Promise<{ businessId: string }> }) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const { businessId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    slug?: string;
    sortOrder?: number;
  };
  if (!body.name || !body.slug)
    return NextResponse.json({ error: 'Category name and slug are required.' }, { status: 400 });
  const { data, error } = await result.client
    .from('product_categories')
    .insert({
      business_id: businessId,
      name: body.name.trim(),
      slug: body.slug.trim().toLowerCase(),
      sort_order: body.sortOrder ?? 0,
    })
    .select('*')
    .single();
  if (error)
    return NextResponse.json(
      { error: 'Only the business owner can add categories.' },
      { status: 403 },
    );
  return NextResponse.json({ category: data }, { status: 201 });
}
