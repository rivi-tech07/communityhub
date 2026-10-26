drop policy if exists "Buyers can add checkout items" on public.order_items;

revoke insert on public.order_items from public, anon, authenticated;
