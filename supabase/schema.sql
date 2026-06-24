-- =============================================================================
-- Cold Spring Liquor — Supabase Database Schema
-- Run this in Supabase → SQL Editor → New Query → Run
-- =============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================================================
-- PROFILES (Customer accounts — linked to Supabase Auth)
-- =============================================================================
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text unique,
  name          text,
  phone         text,
  role          text not null default 'customer' check (role in ('customer','driver','admin')),
  dob           date,
  delivery_address jsonb,   -- { street, city, state, zip }
  billing_address  jsonb,
  rewards_points   integer not null default 0,
  rewards_tier     text not null default 'Bronze',
  referral_code    text unique,
  referred_by      text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- =============================================================================
-- DRIVERS
-- =============================================================================
create table if not exists drivers (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  phone         text,
  username      text unique not null,
  pin_hash      text not null,
  active        boolean not null default true,
  is_online     boolean not null default false,
  current_lat   decimal(10,7),
  current_lng   decimal(10,7),
  location_updated_at timestamptz,
  created_at    timestamptz not null default now()
);

-- =============================================================================
-- PRODUCTS
-- =============================================================================
create table if not exists products (
  id            uuid primary key default uuid_generate_v4(),
  slug          text unique not null,
  name          text not null,
  brand         text not null,
  category      text not null,
  price         decimal(10,2) not null,
  sale_price    decimal(10,2),
  volume        text,
  abv           decimal(5,2),
  country       text,
  description   text,
  image_url     text,
  stock_qty     integer not null default 0,
  in_stock      boolean generated always as (stock_qty > 0) stored,
  featured      boolean not null default false,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- =============================================================================
-- COUPONS
-- =============================================================================
create table if not exists coupons (
  id            uuid primary key default uuid_generate_v4(),
  code          text unique not null,
  type          text not null check (type in ('fixed','percentage','free_delivery')),
  value         decimal(10,2) not null,
  label         text,
  min_order     decimal(10,2) default 0,
  max_usage     integer,
  usage_per_customer integer,
  usage_count   integer not null default 0,
  active        boolean not null default true,
  start_date    timestamptz,
  end_date      timestamptz,
  category_restriction text,
  created_at    timestamptz not null default now()
);

create table if not exists coupon_usages (
  id            uuid primary key default uuid_generate_v4(),
  coupon_id     uuid references coupons(id) on delete cascade,
  customer_id   uuid references profiles(id) on delete cascade,
  order_id      uuid,
  used_at       timestamptz not null default now()
);

-- =============================================================================
-- GIFT CARDS
-- =============================================================================
create table if not exists gift_cards (
  id            uuid primary key default uuid_generate_v4(),
  code          text unique not null,
  initial_value decimal(10,2) not null,
  balance       decimal(10,2) not null,
  purchased_by  uuid references profiles(id),
  redeemed_by   uuid references profiles(id),
  active        boolean not null default true,
  expires_at    timestamptz,
  created_at    timestamptz not null default now()
);

-- =============================================================================
-- ORDERS
-- =============================================================================
create table if not exists orders (
  id              uuid primary key default uuid_generate_v4(),
  order_number    text unique not null,
  customer_id     uuid references profiles(id),
  customer_name   text not null,
  customer_email  text,
  customer_phone  text,
  driver_id       uuid references drivers(id),

  status          text not null default 'pending' check (status in (
    'pending','confirmed','preparing','driver_assigned','driver_at_store',
    'out_for_delivery','driver_arriving','driver_arrived',
    'delivered','failed_delivery','cancelled'
  )),
  status_timestamps jsonb not null default '{}',  -- { "pending": "ISO", "confirmed": "ISO", ... }
  wait_timer_start  timestamptz,

  -- Items (JSON array of { productId, name, price, quantity, imageUrl })
  items           jsonb not null default '[]',

  -- Pricing
  subtotal        decimal(10,2) not null default 0,
  bundle_discount decimal(10,2) not null default 0,
  coupon_code     text,
  coupon_discount decimal(10,2) not null default 0,
  gift_card_code  text,
  gift_card_amount decimal(10,2) not null default 0,
  reward_discount decimal(10,2) not null default 0,
  tax             decimal(10,2) not null default 0,
  delivery_fee    decimal(10,2) not null default 0,
  total           decimal(10,2) not null default 0,

  -- Addresses
  delivery_address jsonb,   -- { street, city, state, zip }
  billing_address  jsonb,

  payment_method  text,
  customer_notes  text,
  delivery_type   text default 'same-day',

  -- Delivery verification
  age_verified    boolean,
  signature_url   text,
  delivery_proof  text,
  delivery_confirmations jsonb,  -- { ageVerified, idChecked, nameMatched, handedToCustomer, customerDob, customerAge }

  -- Failure / cancellation
  fail_reason     text,
  cancel_reason   text,
  refund_type     text,
  refund_amount   decimal(10,2),
  admin_note      text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- =============================================================================
-- NOTIFICATIONS (Customer in-app delivery notifications)
-- =============================================================================
create table if not exists notifications (
  id              uuid primary key default uuid_generate_v4(),
  order_id        uuid references orders(id) on delete cascade,
  customer_id     uuid references profiles(id) on delete cascade,
  order_number    text,
  trigger_status  text,
  message         text,
  read            boolean not null default false,
  created_at      timestamptz not null default now()
);

-- =============================================================================
-- SETTINGS (Single row — app-wide configuration)
-- =============================================================================
create table if not exists settings (
  id              integer primary key default 1 check (id = 1),  -- only 1 row
  store_name      text default 'Cold Spring Liquor',
  store_address   text,
  store_phone     text,
  store_email     text,
  business_hours  jsonb default '{}',
  delivery_radius integer default 15,
  delivery_time_min integer default 10,
  delivery_time_max integer default 30,
  free_delivery_enabled boolean default true,
  no_tip_required boolean default true,
  min_order_amount decimal(10,2) default 20,
  age_verification_required boolean default true,
  sales_tax_percent decimal(5,4) default 0.0825,
  online_payment_enabled boolean default true,
  cash_on_delivery_enabled boolean default true,
  rewards_enabled boolean default true,
  notify_sms_enabled boolean default false,
  notify_email_enabled boolean default false,
  notify_push_enabled boolean default true,
  wait_timer_minutes integer default 5,
  msg_on_the_way text default 'Your Cold Spring Liquor driver is on the way!',
  msg_arriving_soon text default 'Your driver is almost there. Please be ready with your 21+ ID.',
  msg_arrived text default 'Your driver has arrived. Please come to the door with your ID.',
  updated_at      timestamptz not null default now()
);

-- Insert default settings row
insert into settings (id) values (1) on conflict (id) do nothing;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

alter table profiles enable row level security;
alter table orders enable row level security;
alter table notifications enable row level security;
alter table products enable row level security;
alter table coupons enable row level security;
alter table gift_cards enable row level security;
alter table drivers enable row level security;
alter table settings enable row level security;

-- Helper: check if current user is admin
create or replace function is_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Helper: check if current user is driver
create or replace function is_driver()
returns boolean language sql security definer as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'driver'
  );
$$;

-- PROFILES policies
create policy "Users can view own profile"        on profiles for select using (auth.uid() = id);
create policy "Users can update own profile"      on profiles for update using (auth.uid() = id);
create policy "Admins can view all profiles"      on profiles for select using (is_admin());
create policy "Admins can update all profiles"    on profiles for update using (is_admin());

-- PRODUCTS policies (public read, admin write)
create policy "Anyone can view active products"   on products for select using (active = true);
create policy "Admins can manage products"        on products for all using (is_admin());

-- ORDERS policies
create policy "Customers see own orders"          on orders for select using (customer_id = auth.uid());
create policy "Customers can create orders"       on orders for insert with check (customer_id = auth.uid());
create policy "Drivers see assigned orders"       on orders for select using (
  driver_id in (select id from drivers where id::text = auth.uid()::text)
);
create policy "Drivers can update assigned orders" on orders for update using (
  driver_id in (select id from drivers where id::text = auth.uid()::text)
);
create policy "Admins full access to orders"      on orders for all using (is_admin());

-- NOTIFICATIONS policies
create policy "Customers see own notifications"   on notifications for select using (customer_id = auth.uid());
create policy "Customers can mark read"           on notifications for update using (customer_id = auth.uid());
create policy "Admins manage notifications"       on notifications for all using (is_admin());

-- COUPONS policies (public read active ones, admin write)
create policy "Anyone can view active coupons"    on coupons for select using (active = true);
create policy "Admins manage coupons"             on coupons for all using (is_admin());

-- GIFT CARDS policies
create policy "Owner can view gift card"          on gift_cards for select using (
  purchased_by = auth.uid() or redeemed_by = auth.uid()
);
create policy "Admins manage gift cards"          on gift_cards for all using (is_admin());

-- DRIVERS policies
create policy "Admins manage drivers"             on drivers for all using (is_admin());
create policy "Drivers can update own location"   on drivers for update using (
  id::text = auth.uid()::text
);

-- SETTINGS policies (admin only)
create policy "Admins manage settings"            on settings for all using (is_admin());
create policy "Anyone can read settings"          on settings for select using (true);

-- =============================================================================
-- STORAGE BUCKETS (Run separately in Supabase Storage section)
-- =============================================================================
-- Bucket name: "product-images"
-- Public: YES (images need to be publicly viewable)
-- File size limit: 5242880 (5MB)
-- Allowed MIME types: image/jpeg, image/png, image/webp

-- Storage RLS policies (add in Supabase → Storage → product-images → Policies):
-- SELECT: true (public read)
-- INSERT: is_admin()
-- DELETE: is_admin()

-- =============================================================================
-- INDEXES (performance)
-- =============================================================================
create index if not exists orders_customer_id_idx on orders(customer_id);
create index if not exists orders_driver_id_idx on orders(driver_id);
create index if not exists orders_status_idx on orders(status);
create index if not exists orders_created_at_idx on orders(created_at desc);
create index if not exists products_category_idx on products(category);
create index if not exists products_active_idx on products(active);
create index if not exists notifications_customer_id_idx on notifications(customer_id);
create index if not exists coupons_code_idx on coupons(code);
