-- Application's own tables.
create table case_record (
  id uuid primary key,
  order_id varchar(64) not null,
  customer_name varchar(255) not null,
  customer_email varchar(255) not null,
  state varchar(32) not null,
  created_at timestamptz not null default now()
);
create unique index case_record_order_id_open_idx on case_record (order_id) where state not in ('EXPORTED', 'FAILED');

create table evidence_item (
  id uuid primary key,
  case_id uuid not null references case_record(id),
  kind varchar(32) not null,
  title varchar(255) not null,
  description text not null,
  source_ref varchar(255) not null,
  observed_at varchar(64)
);

create table connector_query_audit (
  id uuid primary key,
  case_id uuid not null references case_record(id),
  table_name varchar(64) not null,
  row_count int not null,
  queried_at timestamptz not null default now()
);

-- Fixture merchant database: stands in for a real customer's schema during local dev.
-- The connector reads only the tables/columns listed in application.yml's
-- connector.allowlist, exactly as it would against a real merchant schema.
create table orders (
  order_id varchar(64) primary key,
  created_at timestamptz not null,
  currency varchar(8) not null,
  amount numeric(12,2) not null
);

create table payments (
  order_id varchar(64) primary key references orders(order_id),
  status varchar(32) not null,
  processor_ref varchar(64) not null,
  paid_at timestamptz not null
);

create table fulfillment (
  order_id varchar(64) primary key references orders(order_id),
  carrier varchar(64) not null,
  awb varchar(64) not null,
  shipped_at timestamptz not null
);

create table refunds (
  order_id varchar(64) primary key references orders(order_id),
  status varchar(32) not null,
  amount numeric(12,2) not null,
  decided_at timestamptz
);

create table communications (
  id uuid primary key,
  order_id varchar(64) not null references orders(order_id),
  occurred_at timestamptz not null,
  body text not null
);

insert into orders (order_id, created_at, currency, amount) values
  ('ORD-2026-1042', '2026-09-18 09:14:00+05:30', 'INR', 4299.00);

insert into payments (order_id, status, processor_ref, paid_at) values
  ('ORD-2026-1042', 'CAPTURED', 'upi_8123094', '2026-09-18 09:14:30+05:30');

insert into fulfillment (order_id, carrier, awb, shipped_at) values
  ('ORD-2026-1042', 'Bluedart', '88123094', '2026-09-19 16:40:00+05:30');

insert into communications (id, order_id, occurred_at, body) values
  (gen_random_uuid(), 'ORD-2026-1042', '2026-09-22 10:02:00+05:30', 'Package never arrived, tracking stuck at Delhi hub');
