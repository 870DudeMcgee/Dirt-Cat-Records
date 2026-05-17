create extension if not exists pgcrypto;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now(),
  constraint customers_email_format_check
    check (email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  paypal_txn_id text not null unique,
  status text not null,
  total_amount numeric(10, 2) not null,
  created_at timestamptz not null default now(),
  constraint orders_status_check
    check (status in ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  constraint orders_total_amount_check
    check (total_amount >= 0)
);

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  upload_link text not null,
  version integer not null default 1,
  status text not null default 'submitted',
  created_at timestamptz not null default now(),
  constraint project_files_version_check
    check (version >= 1),
  constraint project_files_upload_link_check
    check (upload_link ~* '^https?://'),
  constraint project_files_status_check
    check (status in ('submitted', 'reviewing', 'approved', 'rejected', 'archived'))
);

create index if not exists orders_customer_id_idx on public.orders(customer_id);
create index if not exists project_files_order_id_idx on public.project_files(order_id);

alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.project_files enable row level security;

revoke all on table public.customers from anon, authenticated;
revoke all on table public.orders from anon, authenticated;
revoke all on table public.project_files from anon, authenticated;

grant usage on schema public to service_role;
grant select, insert, update, delete on table public.customers to service_role;
grant select, insert, update, delete on table public.orders to service_role;
grant select, insert, update, delete on table public.project_files to service_role;
