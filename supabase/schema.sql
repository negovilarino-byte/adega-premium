-- Adega Império Sul
-- Estrutura inicial do banco. Execute no SQL Editor do projeto Supabase.
-- RLS habilitado por padrão; operações administrativas exigem perfil admin.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text,
  volume text,
  price numeric(10,2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references auth.users(id) on delete set null,
  customer_name text,
  customer_phone text,
  delivery_method text not null default 'pickup'
    check (delivery_method in ('delivery', 'pickup')),
  delivery_address text,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'preparing', 'out_for_delivery', 'completed', 'cancelled')),
  payment_method text,
  notes text,
  subtotal numeric(10,2) not null default 0 check (subtotal >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  line_total numeric(10,2) generated always as (quantity * unit_price) stored
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());

drop policy if exists "Admins manage profiles" on public.profiles;
create policy "Admins manage profiles" on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public read active categories" on public.categories;
create policy "Public read active categories" on public.categories
  for select to anon, authenticated using (active = true or public.is_admin());

drop policy if exists "Admins manage categories" on public.categories;
create policy "Admins manage categories" on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public read active products" on public.products;
create policy "Public read active products" on public.products
  for select to anon, authenticated using (active = true or public.is_admin());

drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins read orders" on public.orders;
create policy "Admins read orders" on public.orders
  for select to authenticated using (public.is_admin());

drop policy if exists "Admins manage orders" on public.orders;
create policy "Admins manage orders" on public.orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins read order items" on public.order_items;
create policy "Admins read order items" on public.order_items
  for select to authenticated using (public.is_admin());

drop policy if exists "Admins manage order items" on public.order_items;
create policy "Admins manage order items" on public.order_items
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Cria automaticamente um perfil básico para cada novo usuário autenticado.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- Checkout público como visitante.
-- A implementação privilegiada fica em schema privado, fora da API REST.
-- A função pública é a única entrada RPC e valida os dados antes de gravar.
create schema if not exists private;

create or replace function private.create_guest_order(
  p_customer_name text,
  p_customer_phone text,
  p_delivery_method text,
  p_delivery_address text,
  p_items jsonb,
  p_payment_method text default 'PIX'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_order_id uuid;
  v_item record;
  v_product public.products%rowtype;
  v_subtotal numeric(10,2) := 0;
  v_phone text;
begin
  if coalesce(pg_catalog.length(pg_catalog.btrim(p_customer_name)), 0) < 2
     or pg_catalog.length(pg_catalog.btrim(p_customer_name)) > 120 then
    raise exception 'Nome inválido.';
  end if;

  v_phone := pg_catalog.regexp_replace(coalesce(p_customer_phone, ''), '[^0-9]', '', 'g');
  if pg_catalog.length(v_phone) < 10 or pg_catalog.length(v_phone) > 13 then
    raise exception 'Informe um telefone válido com DDD.';
  end if;

  if p_delivery_method not in ('delivery', 'pickup') then
    raise exception 'Modalidade de entrega inválida.';
  end if;
  if p_delivery_method = 'delivery'
     and (coalesce(pg_catalog.length(pg_catalog.btrim(p_delivery_address)), 0) < 8
          or pg_catalog.length(pg_catalog.btrim(p_delivery_address)) > 500) then
    raise exception 'Informe um endereço válido para entrega.';
  end if;
  if p_delivery_method = 'pickup' then
    p_delivery_address := null;
  end if;

  if coalesce(p_payment_method, 'PIX') not in ('PIX', 'Dinheiro', 'Cartão') then
    raise exception 'Forma de pagamento inválida.';
  end if;

  if pg_catalog.jsonb_typeof(p_items) <> 'array'
     or pg_catalog.jsonb_array_length(p_items) = 0
     or pg_catalog.jsonb_array_length(p_items) > 50 then
    raise exception 'Carrinho vazio ou quantidade de itens inválida.';
  end if;

  insert into public.orders (
    customer_name, customer_phone, delivery_method, delivery_address,
    payment_method, status, subtotal
  ) values (
    pg_catalog.btrim(p_customer_name), v_phone, p_delivery_method,
    case when p_delivery_method = 'delivery' then pg_catalog.btrim(p_delivery_address) else null end,
    coalesce(nullif(pg_catalog.btrim(p_payment_method), ''), 'PIX'), 'pending', 0
  ) returning id into v_order_id;

  for v_item in
    select product_id, quantity
    from pg_catalog.jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer)
  loop
    if v_item.product_id is null or v_item.quantity is null
       or v_item.quantity < 1 or v_item.quantity > 99 then
      raise exception 'Item ou quantidade inválida.';
    end if;

    select * into v_product
    from public.products
    where id = v_item.product_id and active = true
    for update;

    if not found then
      raise exception 'Um produto não está mais disponível.';
    end if;
    if v_product.stock < v_item.quantity then
      raise exception 'Estoque insuficiente para: %.', v_product.name;
    end if;

    update public.products
    set stock = stock - v_item.quantity, updated_at = pg_catalog.now()
    where id = v_product.id;

    insert into public.order_items (
      order_id, product_id, product_name, quantity, unit_price
    ) values (
      v_order_id, v_product.id, v_product.name, v_item.quantity, v_product.price
    );

    v_subtotal := v_subtotal + (v_product.price * v_item.quantity);
  end loop;

  update public.orders set subtotal = v_subtotal, updated_at = pg_catalog.now()
  where id = v_order_id;

  return v_order_id;
end;
$function$;

-- A implementação não pode ser chamada diretamente por roles da API.
revoke all on function private.create_guest_order(text, text, text, text, jsonb, text) from public, anon, authenticated;
revoke usage on schema private from public, anon, authenticated;

-- Entrada RPC necessária para o checkout de visitantes.
create or replace function public.create_guest_order(
  p_customer_name text,
  p_customer_phone text,
  p_delivery_method text,
  p_delivery_address text,
  p_items jsonb,
  p_payment_method text default 'PIX'
)
returns uuid
language sql
security invoker
set search_path = ''
as $function$
  select private.create_guest_order(
    p_customer_name, p_customer_phone, p_delivery_method,
    p_delivery_address, p_items, p_payment_method
  );
$function$;

revoke all on function public.create_guest_order(text, text, text, text, jsonb, text) from public;
grant execute on function public.create_guest_order(text, text, text, text, jsonb, text) to anon, authenticated;
