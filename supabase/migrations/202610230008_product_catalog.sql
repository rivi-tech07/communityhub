create table if not exists public.product_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category text not null check (category in ('grocery', 'fruit', 'vegetable', 'dairy', 'bakery', 'household', 'personal_care')),
  default_unit text not null default 'each',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.products add column if not exists catalog_product_id uuid references public.product_catalog(id) on delete set null;
alter table public.product_catalog enable row level security;
create policy "Active product catalog is public" on public.product_catalog for select to anon, authenticated using (is_active = true or public.has_role('administrator'));
create policy "Administrators manage product catalog" on public.product_catalog for all to authenticated using (public.has_role('administrator')) with check (public.has_role('administrator'));

insert into public.product_catalog (name, slug, category, default_unit) values
  ('Milk 1L', 'milk-1l', 'dairy', 'bottle'), ('Bread', 'bread', 'bakery', 'loaf'), ('Eggs 6 pack', 'eggs-6-pack', 'dairy', 'pack'), ('Butter 250g', 'butter-250g', 'dairy', 'pack'),
  ('Yogurt', 'yogurt', 'dairy', 'pot'), ('Cheddar cheese', 'cheddar-cheese', 'dairy', 'pack'), ('Rice 1kg', 'rice-1kg', 'grocery', 'bag'), ('Pasta 500g', 'pasta-500g', 'grocery', 'pack'),
  ('Cooking oil 1L', 'cooking-oil-1l', 'grocery', 'bottle'), ('Sugar 1kg', 'sugar-1kg', 'grocery', 'bag'), ('Tea bags', 'tea-bags', 'grocery', 'box'), ('Coffee', 'coffee', 'grocery', 'jar'),
  ('Apples', 'apples', 'fruit', 'kg'), ('Bananas', 'bananas', 'fruit', 'kg'), ('Oranges', 'oranges', 'fruit', 'kg'), ('Grapes', 'grapes', 'fruit', 'box'),
  ('Tomatoes', 'tomatoes', 'vegetable', 'kg'), ('Potatoes', 'potatoes', 'vegetable', 'kg'), ('Onions', 'onions', 'vegetable', 'kg'), ('Spinach', 'spinach', 'vegetable', 'bag'),
  ('Carrots', 'carrots', 'vegetable', 'kg'), ('Cucumber', 'cucumber', 'vegetable', 'each'), ('Dish soap', 'dish-soap', 'household', 'bottle'), ('Laundry detergent', 'laundry-detergent', 'household', 'bottle'),
  ('Toilet paper', 'toilet-paper', 'household', 'pack'), ('Bin bags', 'bin-bags', 'household', 'roll'), ('Shampoo', 'shampoo', 'personal_care', 'bottle'), ('Toothpaste', 'toothpaste', 'personal_care', 'tube')
on conflict (slug) do nothing;

create index if not exists products_catalog_idx on public.products (catalog_product_id);
create index if not exists product_catalog_category_idx on public.product_catalog (category, is_active, name);
