import { NextResponse } from 'next/server';
import { getPublicClient } from '../../lib/server-auth';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  let query = getPublicClient().from('product_catalog').select('id,name,slug,category,default_unit').eq('is_active', true).order('category').order('name');
  const category = params.get('category');
  const search = params.get('q')?.trim();
  if (category) query = query.eq('category', category);
  if (search) query = query.ilike('name', `%${search.replace(/[%_]/g, '')}%`);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Unable to load the product catalog.' }, { status: 503 });
  return NextResponse.json({ products: data ?? [] });
}
