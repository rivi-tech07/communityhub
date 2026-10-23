import { NextResponse } from 'next/server';
import { authenticate } from '../../../../../lib/server-auth';

export async function GET(request: Request, context: { params: Promise<{ businessId: string }> }) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const { businessId } = await context.params;
  const [ordersResult, productsResult] = await Promise.all([
    result.client.from('orders').select('id,total,status,created_at').eq('business_id', businessId).order('created_at', { ascending: false }),
    result.client.from('products').select('id,name,stock_quantity,availability,price').eq('business_id', businessId).order('stock_quantity', { ascending: true }),
  ]);
  if (ordersResult.error || productsResult.error) return NextResponse.json({ error: 'Unable to load shop reports.' }, { status: 503 });
  const orders = ordersResult.data ?? [];
  const completed = orders.filter((order) => order.status === 'paid');
  const sales = completed.reduce((sum, order) => sum + Number(order.total), 0);
  return NextResponse.json({
    report: { todaySales: sales, completedOrders: completed.length, totalOrders: orders.length, products: productsResult.data ?? [], recentOrders: orders.slice(0, 20) },
  });
}
