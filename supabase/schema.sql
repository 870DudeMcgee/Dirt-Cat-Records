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

alter table public.customers
  add column if not exists name text,
  add column if not exists auth_user_id uuid unique;

alter table public.orders
  add column if not exists project_id uuid,
  add column if not exists paypal_order_id text,
  add column if not exists payment_mode text not null default 'full',
  add column if not exists amount_due_now numeric(10, 2),
  add column if not exists remaining_balance numeric(10, 2) not null default 0,
  add column if not exists order_summary jsonb not null default '{}'::jsonb;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  project_code text not null unique,
  customer_id uuid not null references public.customers(id) on delete restrict,
  order_id uuid references public.orders(id) on delete set null,
  lead_id uuid,
  active_quote_id uuid,
  project_type text not null,
  status text not null,
  artist_name text,
  project_title text,
  service_id text,
  song_count integer not null default 1,
  included_revisions integer not null default 1,
  used_revisions integer not null default 0,
  extra_revisions_allowed integer not null default 0,
  total_amount numeric(10, 2) not null default 0,
  amount_paid numeric(10, 2) not null default 0,
  balance_due numeric(10, 2) not null default 0,
  final_delivery_locked boolean not null default true,
  drive_project_folder_id text,
  drive_project_folder_url text,
  drive_upload_folder_id text,
  drive_upload_folder_url text,
  drive_finals_folder_id text,
  drive_finals_folder_url text,
  final_delivery_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_project_type_check
    check (project_type in ('free_review', 'paid')),
  constraint projects_status_check
    check (status in (
      'lead_new',
      'awaiting_files',
      'files_submitted',
      'reviewing',
      'quoted',
      'quote_sent',
      'quote_accepted',
      'paid',
      'mixing',
      'revision_requested',
      'revision_in_progress',
      'finals_ready',
      'balance_due',
      'delivered',
      'approved',
      'completed',
      'closed'
    )),
  constraint projects_song_count_check
    check (song_count >= 1),
  constraint projects_revision_counts_check
    check (
      included_revisions >= 0
      and used_revisions >= 0
      and extra_revisions_allowed >= 0
    ),
  constraint projects_amounts_check
    check (
      total_amount >= 0
      and amount_paid >= 0
      and balance_due >= 0
    )
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  project_id uuid references public.projects(id) on delete set null,
  source text not null default 'free_review',
  status text not null default 'new',
  artist_name text,
  project_title text,
  email text not null,
  message text,
  reference_links jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_status_check
    check (status in ('new', 'awaiting_files', 'reviewed', 'quoted', 'converted', 'closed'))
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  project_id uuid references public.projects(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  quote_id uuid,
  paypal_order_id text,
  paypal_capture_id text not null unique,
  payment_purpose text not null,
  status text not null,
  amount numeric(10, 2) not null,
  currency text not null default 'USD',
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint payments_purpose_check
    check (payment_purpose in ('checkout', 'quote', 'balance')),
  constraint payments_status_check
    check (status in ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  constraint payments_amount_check
    check (amount >= 0)
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  status text not null default 'draft',
  base_service_id text not null,
  song_count integer not null default 1,
  catalog_total_cents integer not null,
  adjustment_cents integer not null default 0,
  final_total_cents integer not null,
  payment_mode text not null default 'full',
  deposit_cents integer not null default 0,
  balance_cents integer not null default 0,
  notes text,
  expires_at timestamptz not null,
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quotes_status_check
    check (status in ('draft', 'sent', 'viewed', 'accepted', 'expired', 'cancelled')),
  constraint quotes_payment_mode_check
    check (payment_mode in ('full', 'deposit')),
  constraint quotes_song_count_check
    check (song_count >= 1)
);

create table if not exists public.quote_line_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  item_type text not null,
  item_id text,
  label text not null,
  quantity integer not null default 1,
  unit_cents integer not null,
  total_cents integer not null,
  created_at timestamptz not null default now(),
  constraint quote_line_items_type_check
    check (item_type in ('service', 'add_on', 'adjustment')),
  constraint quote_line_items_quantity_check
    check (quantity >= 1)
);

create table if not exists public.project_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  event_type text not null,
  actor_type text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint project_events_actor_type_check
    check (actor_type in ('system', 'customer', 'admin', 'paypal', 'drive', 'resend'))
);

create table if not exists public.revision_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  status text not null default 'requested',
  notes text not null,
  reference_links jsonb not null default '[]'::jsonb,
  is_extra_revision boolean not null default false,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint revision_requests_status_check
    check (status in ('requested', 'in_progress', 'resolved', 'cancelled'))
);

create table if not exists public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  email_type text not null,
  recipient text not null,
  status text not null,
  resend_message_id text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint email_events_status_check
    check (status in ('sent', 'failed', 'skipped'))
);

create table if not exists public.followup_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  followup_type text not null,
  status text not null default 'pending',
  scheduled_for timestamptz not null,
  processed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  constraint followup_jobs_status_check
    check (status in ('pending', 'sent', 'skipped', 'failed'))
);

create index if not exists orders_customer_id_idx on public.orders(customer_id);
create index if not exists project_files_order_id_idx on public.project_files(order_id);
create index if not exists customers_auth_user_id_idx on public.customers(auth_user_id);
create index if not exists projects_customer_id_idx on public.projects(customer_id);
create index if not exists projects_status_idx on public.projects(status);
create index if not exists leads_customer_id_idx on public.leads(customer_id);
create index if not exists payments_project_id_idx on public.payments(project_id);
create index if not exists quotes_project_id_idx on public.quotes(project_id);
create index if not exists project_events_project_id_idx on public.project_events(project_id);
create index if not exists email_events_project_id_type_idx on public.email_events(project_id, email_type);
create unique index if not exists followup_jobs_unique_pending_idx
  on public.followup_jobs(project_id, followup_type, status)
  where status = 'pending';

alter table public.orders
  drop constraint if exists orders_project_id_fkey,
  add constraint orders_project_id_fkey
    foreign key (project_id) references public.projects(id) on delete set null;

alter table public.projects
  drop constraint if exists projects_lead_id_fkey,
  add constraint projects_lead_id_fkey
    foreign key (lead_id) references public.leads(id) on delete set null;

alter table public.projects
  drop constraint if exists projects_active_quote_id_fkey,
  add constraint projects_active_quote_id_fkey
    foreign key (active_quote_id) references public.quotes(id) on delete set null;

alter table public.payments
  drop constraint if exists payments_quote_id_fkey,
  add constraint payments_quote_id_fkey
    foreign key (quote_id) references public.quotes(id) on delete set null;

alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.project_files enable row level security;
alter table public.leads enable row level security;
alter table public.projects enable row level security;
alter table public.payments enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_line_items enable row level security;
alter table public.project_events enable row level security;
alter table public.revision_requests enable row level security;
alter table public.admin_notes enable row level security;
alter table public.email_events enable row level security;
alter table public.followup_jobs enable row level security;

revoke all on table public.customers from anon, authenticated;
revoke all on table public.orders from anon, authenticated;
revoke all on table public.project_files from anon, authenticated;
revoke all on table public.leads from anon, authenticated;
revoke all on table public.projects from anon, authenticated;
revoke all on table public.payments from anon, authenticated;
revoke all on table public.quotes from anon, authenticated;
revoke all on table public.quote_line_items from anon, authenticated;
revoke all on table public.project_events from anon, authenticated;
revoke all on table public.revision_requests from anon, authenticated;
revoke all on table public.admin_notes from anon, authenticated;
revoke all on table public.email_events from anon, authenticated;
revoke all on table public.followup_jobs from anon, authenticated;

grant usage on schema public to service_role;
grant select, insert, update, delete on table public.customers to service_role;
grant select, insert, update, delete on table public.orders to service_role;
grant select, insert, update, delete on table public.project_files to service_role;
grant select, insert, update, delete on table public.leads to service_role;
grant select, insert, update, delete on table public.projects to service_role;
grant select, insert, update, delete on table public.payments to service_role;
grant select, insert, update, delete on table public.quotes to service_role;
grant select, insert, update, delete on table public.quote_line_items to service_role;
grant select, insert, update, delete on table public.project_events to service_role;
grant select, insert, update, delete on table public.revision_requests to service_role;
grant select, insert, update, delete on table public.admin_notes to service_role;
grant select, insert, update, delete on table public.email_events to service_role;
grant select, insert, update, delete on table public.followup_jobs to service_role;
