-- ================================================================
-- SimLab Inventory System — Full Supabase Schema
-- Paste this entire file into your Supabase SQL Editor and run it
-- ================================================================

create extension if not exists "uuid-ossp";

-- PROFILES
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null default 'New User',
  role text not null default 'lab_staff' check (role in ('admin','manager','lab_staff')),
  active boolean not null default true,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "All authenticated users can read profiles" on public.profiles for select using (auth.role() = 'authenticated');
create policy "Admins/managers can update profiles" on public.profiles for update using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','manager'))
);
create policy "Users can update own profile" on public.profiles for update using (id = auth.uid());

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'lab_staff')
  );
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- LOCATIONS
create table public.locations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  code text not null unique,
  is_main boolean not null default false,
  notes text default '',
  active boolean not null default true,
  created_at timestamptz default now()
);
alter table public.locations enable row level security;
create policy "Auth read" on public.locations for select using (auth.role() = 'authenticated');
create policy "Manager write" on public.locations for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','manager'))
);

-- VENDORS
create table public.vendors (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text default '',
  phone text default '',
  contact text default '',
  address text default '',
  website text default '',
  notes text default '',
  active boolean not null default true,
  created_at timestamptz default now()
);
alter table public.vendors enable row level security;
create policy "Auth read" on public.vendors for select using (auth.role() = 'authenticated');
create policy "Manager write" on public.vendors for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','manager'))
);

-- ITEMS
create table public.items (
  id uuid primary key default uuid_generate_v4(),
  sku text not null unique,
  name text not null,
  category text not null default 'Supplies',
  unit text not null default 'Each',
  price numeric(10,2) not null default 0,
  min_qty integer not null default 0,
  max_qty integer not null default 100,
  vendor_id uuid references public.vendors(id) on delete set null,
  notes text default '',
  active boolean not null default true,
  created_at timestamptz default now()
);
alter table public.items enable row level security;
create policy "Auth read" on public.items for select using (auth.role() = 'authenticated');
create policy "Manager write" on public.items for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','manager'))
);

-- INVENTORY
create table public.inventory (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid not null references public.items(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  qty integer not null default 0,
  updated_at timestamptz default now(),
  unique(item_id, location_id)
);
alter table public.inventory enable row level security;
create policy "Auth read" on public.inventory for select using (auth.role() = 'authenticated');
create policy "Auth write" on public.inventory for all using (auth.role() = 'authenticated');

-- PURCHASE ORDERS
create table public.purchase_orders (
  id uuid primary key default uuid_generate_v4(),
  number text not null unique,
  vendor_id uuid references public.vendors(id) on delete set null,
  location_id uuid not null references public.locations(id),
  status text not null default 'open' check (status in ('draft','open','partial','received','cancelled')),
  date date not null default current_date,
  expected_date date,
  received_date date,
  notes text default '',
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
alter table public.purchase_orders enable row level security;
create policy "Auth read" on public.purchase_orders for select using (auth.role() = 'authenticated');
create policy "Manager write" on public.purchase_orders for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','manager'))
);

-- PO LINES
create table public.po_lines (
  id uuid primary key default uuid_generate_v4(),
  po_id uuid not null references public.purchase_orders(id) on delete cascade,
  item_id uuid not null references public.items(id),
  qty integer not null default 0,
  unit_price numeric(10,2) not null default 0,
  received integer not null default 0,
  note text default ''
);
alter table public.po_lines enable row level security;
create policy "Auth read" on public.po_lines for select using (auth.role() = 'authenticated');
create policy "Manager write" on public.po_lines for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','manager'))
);

-- TRANSACTIONS
create table public.transactions (
  id uuid primary key default uuid_generate_v4(),
  type text not null check (type in ('receiving','adjustment','transfer')),
  date date not null default current_date,
  item_id uuid not null references public.items(id),
  location_id uuid not null references public.locations(id),
  to_location_id uuid references public.locations(id),
  qty integer not null,
  ref_id uuid,
  adj_category text,
  note text default '',
  user_id uuid references public.profiles(id),
  created_at timestamptz default now()
);
alter table public.transactions enable row level security;
create policy "Auth read" on public.transactions for select using (auth.role() = 'authenticated');
create policy "Auth insert" on public.transactions for insert with check (auth.role() = 'authenticated');

-- SETTINGS (PO counter, etc.)
create table public.settings (
  key text primary key,
  value text not null
);
alter table public.settings enable row level security;
create policy "Auth read"  on public.settings for select using (auth.role() = 'authenticated');
create policy "Auth write" on public.settings for all   using (auth.role() = 'authenticated');
insert into public.settings (key, value) values ('po_counter', '1') on conflict do nothing;

-- ================================================================
-- STORED PROCEDURES
-- ================================================================

-- Upsert inventory qty (add/subtract)
create or replace function public.adjust_inventory(
  p_item_id uuid, p_location_id uuid, p_delta integer
) returns void language plpgsql security definer as $$
begin
  insert into public.inventory (item_id, location_id, qty, updated_at)
  values (p_item_id, p_location_id, greatest(0, p_delta), now())
  on conflict (item_id, location_id)
  do update set
    qty = greatest(0, public.inventory.qty + p_delta),
    updated_at = now();
end;
$$;

-- Get next PO number atomically
create or replace function public.next_po_number()
returns text language plpgsql security definer as $$
declare
  counter integer;
  yr text;
begin
  update public.settings
  set value = (value::integer + 1)::text
  where key = 'po_counter'
  returning (value::integer - 1) into counter;
  yr := to_char(now(), 'YYYY');
  return 'PO-' || yr || '-' || lpad(counter::text, 3, '0');
end;
$$;

-- ================================================================
-- SEED DATA
-- ================================================================

insert into public.locations (name, code, is_main, notes) values
  ('Main Storage', 'MAIN', true,  'Primary receiving location'),
  ('Lab Room A',   'LABA', false, 'Simulation lab A'),
  ('Lab Room B',   'LABB', false, 'Simulation lab B'),
  ('Cold Storage', 'COLD', false, 'Temperature-controlled');

insert into public.vendors (name, email, phone, contact, address, notes) values
  ('BioSupply Co.',     'orders@biosupply.com', '(617) 555-0101', 'Mark Torres', '123 Science Blvd, Boston MA',   'Net 30'),
  ('MedTech Solutions', 'sales@medtech.com',    '(617) 555-0202', 'Lisa Park',   '456 Research Dr, Cambridge MA', 'Net 15'),
  ('LabFirst Inc.',     'info@labfirst.com',    '(617) 555-0303', 'Tom Bradley', '789 Lab Lane, Somerville MA',   'Preferred vendor');

insert into public.items (sku, name, category, unit, price, min_qty, max_qty) values
  ('GLV-NIT-M',   'Nitrile Gloves (Medium)', 'PPE',         'Box',      12.50, 10, 100),
  ('GLV-NIT-L',   'Nitrile Gloves (Large)',  'PPE',         'Box',      12.50, 10, 100),
  ('SYR-10ML',    'Syringes 10mL',           'Consumables', 'Pack/100', 28.00,  5,  50),
  ('ETH-70-500',  'Ethanol 70% 500mL',       'Chemicals',   'Bottle',   45.00,  4,  30),
  ('PCR-TUBE-02', 'PCR Tubes 0.2mL',         'Consumables', 'Pack/500', 18.00,  8,  80),
  ('PBS-1L',      'PBS Buffer 1L',           'Reagents',    'Bottle',   32.00,  4,  40),
  ('MASK-N95',    'N95 Respirator Masks',    'PPE',         'Box/20',   38.00,  5,  50),
  ('PIPETTE-1ML', 'Serological Pipette 1mL', 'Glassware',   'Pack/100', 22.00,  6,  60);

insert into public.inventory (item_id, location_id, qty)
select i.id, l.id, v.qty from (values
  ('GLV-NIT-M',   'MAIN', 45), ('GLV-NIT-M',   'LABA', 8),
  ('GLV-NIT-L',   'MAIN', 30), ('GLV-NIT-L',   'LABA', 5),
  ('SYR-10ML',    'MAIN',  3), ('ETH-70-500',  'MAIN', 3),
  ('ETH-70-500',  'COLD',  2), ('PCR-TUBE-02', 'LABB', 25),
  ('PBS-1L',      'MAIN',  6), ('PBS-1L',      'COLD', 4),
  ('MASK-N95',    'MAIN',  3), ('PIPETTE-1ML', 'MAIN', 18),
  ('PIPETTE-1ML', 'LABA',  6)
) as v(sku, code, qty)
join public.items     i on i.sku  = v.sku
join public.locations l on l.code = v.code;

-- ================================================================
-- NOTE: Create your first admin user in Supabase Dashboard:
-- Authentication > Users > Add User
-- Email: admin@simlab.edu  Password: admin123
-- Then run: UPDATE profiles SET name='Dr. Sarah Mitchell', role='admin' WHERE id='<paste-user-id>';
-- Repeat for manager and staff accounts.
-- ================================================================
