create table audit_event (
  id uuid primary key,
  title varchar(255) not null,
  detail text not null,
  order_id varchar(64),
  actor_name varchar(255) not null,
  actor_is_system boolean not null,
  icon varchar(32) not null,
  tone varchar(32) not null,
  occurred_at timestamptz not null default now()
);

-- Dummy fixture orders for testing the agent against different evidence shapes.
-- ORD-2026-2001: fulfilled, already refunded -> agent should recommend ACCEPT.
insert into orders (order_id, created_at, currency, amount) values
  ('ORD-2026-2001', '2026-09-10 10:00:00+05:30', 'INR', 1899.00);
insert into payments (order_id, status, processor_ref, paid_at) values
  ('ORD-2026-2001', 'CAPTURED', 'upi_2001', '2026-09-10 10:00:30+05:30');
insert into fulfillment (order_id, carrier, awb, shipped_at) values
  ('ORD-2026-2001', 'Delhivery', '2001AWB', '2026-09-11 12:00:00+05:30');
insert into refunds (order_id, status, amount, decided_at) values
  ('ORD-2026-2001', 'ISSUED', 1899.00, '2026-09-20 09:00:00+05:30');
insert into communications (id, order_id, occurred_at, body) values
  (gen_random_uuid(), 'ORD-2026-2001', '2026-09-19 08:00:00+05:30', 'Requesting refund, item never arrived');

-- ORD-2026-2002: paid but never shipped, no refund -> ambiguous, should land in manual review.
insert into orders (order_id, created_at, currency, amount) values
  ('ORD-2026-2002', '2026-09-15 14:00:00+05:30', 'INR', 3499.00);
insert into payments (order_id, status, processor_ref, paid_at) values
  ('ORD-2026-2002', 'CAPTURED', 'upi_2002', '2026-09-15 14:00:30+05:30');
insert into communications (id, order_id, occurred_at, body) values
  (gen_random_uuid(), 'ORD-2026-2002', '2026-09-23 11:00:00+05:30', 'Where is my order, it has been over a week');

-- ORD-2026-2003: fully clean fulfilled order, no complaint on file, no refund -> CONTEST.
insert into orders (order_id, created_at, currency, amount) values
  ('ORD-2026-2003', '2026-09-05 09:30:00+05:30', 'INR', 999.00);
insert into payments (order_id, status, processor_ref, paid_at) values
  ('ORD-2026-2003', 'CAPTURED', 'upi_2003', '2026-09-05 09:31:00+05:30');
insert into fulfillment (order_id, carrier, awb, shipped_at) values
  ('ORD-2026-2003', 'Bluedart', '2003AWB', '2026-09-06 15:00:00+05:30');
