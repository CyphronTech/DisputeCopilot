alter table orders add column customer_name varchar(255);
alter table orders add column customer_email varchar(255);
alter table orders add column product_name varchar(255);

update orders set customer_name = 'Priya Nair', customer_email = 'priya.nair@mail.com', product_name = 'Wireless Earbuds Pro' where order_id = 'ORD-2026-1042';
update orders set customer_name = 'Rohit Sharma', customer_email = 'rohit.sharma82@gmail.com', product_name = 'Non-stick Cookware Set' where order_id = 'ORD-2026-2001';
update orders set customer_name = 'Ananya Iyer', customer_email = 'ananya.iyer@outlook.com', product_name = 'Yoga Mat Premium' where order_id = 'ORD-2026-2002';
update orders set customer_name = 'Karan Mehta', customer_email = 'karan.mehta@yahoo.com', product_name = 'Bluetooth Speaker' where order_id = 'ORD-2026-2003';

alter table orders alter column customer_name set not null;
alter table orders alter column customer_email set not null;
alter table orders alter column product_name set not null;

-- ORD-2026-3001: shipped, refund explicitly denied, customer still complaining -> conflicting evidence, manual review.
insert into orders (order_id, customer_name, customer_email, product_name, created_at, currency, amount) values
  ('ORD-2026-3001', 'Fatima Sheikh', 'fatima.sheikh@hotmail.com', 'Stainless Steel Water Bottle', '2026-09-12 11:20:00+05:30', 'INR', 799.00);
insert into payments (order_id, status, processor_ref, paid_at) values
  ('ORD-2026-3001', 'CAPTURED', 'card_3001', '2026-09-12 11:20:45+05:30');
insert into fulfillment (order_id, carrier, awb, shipped_at) values
  ('ORD-2026-3001', 'Delhivery', '3001AWB', '2026-09-13 10:00:00+05:30');
insert into refunds (order_id, status, amount, decided_at) values
  ('ORD-2026-3001', 'DENIED', 0.00, '2026-09-24 09:00:00+05:30');
insert into communications (id, order_id, occurred_at, body) values
  (gen_random_uuid(), 'ORD-2026-3001', '2026-09-25 14:00:00+05:30', 'I still have not received this item, please refund immediately');

-- ORD-2026-3002: clean shipped order, no complaint on file, no refund -> straightforward contest.
insert into orders (order_id, customer_name, customer_email, product_name, created_at, currency, amount) values
  ('ORD-2026-3002', 'David Thompson', 'd.thompson@icloud.com', 'Gaming Mouse RGB', '2026-09-08 16:45:00+05:30', 'INR', 2199.00);
insert into payments (order_id, status, processor_ref, paid_at) values
  ('ORD-2026-3002', 'CAPTURED', 'upi_3002', '2026-09-08 16:45:30+05:30');
insert into fulfillment (order_id, carrier, awb, shipped_at) values
  ('ORD-2026-3002', 'Bluedart', '3002AWB', '2026-09-09 12:00:00+05:30');

-- ORD-2026-3003: shipped, refund already issued same week -> accept.
insert into orders (order_id, customer_name, customer_email, product_name, created_at, currency, amount) values
  ('ORD-2026-3003', 'Meera Krishnan', 'meera.k@rediffmail.com', 'Kids Story Book Set', '2026-09-14 09:00:00+05:30', 'INR', 549.00);
insert into payments (order_id, status, processor_ref, paid_at) values
  ('ORD-2026-3003', 'CAPTURED', 'card_3003', '2026-09-14 09:00:40+05:30');
insert into fulfillment (order_id, carrier, awb, shipped_at) values
  ('ORD-2026-3003', 'Ecom Express', '3003AWB', '2026-09-15 13:00:00+05:30');
insert into refunds (order_id, status, amount, decided_at) values
  ('ORD-2026-3003', 'ISSUED', 549.00, '2026-09-22 10:30:00+05:30');
insert into communications (id, order_id, occurred_at, body) values
  (gen_random_uuid(), 'ORD-2026-3003', '2026-09-20 08:00:00+05:30', 'Box arrived empty, missing all books, please refund');

-- ORD-2026-3004: paid but never shipped, customer complained, no refund yet -> merchant likely at fault, manual review.
insert into orders (order_id, customer_name, customer_email, product_name, created_at, currency, amount) values
  ('ORD-2026-3004', 'James Wilson', 'jwilson@yahoo.co.uk', 'Air Fryer 4L', '2026-09-16 18:10:00+05:30', 'INR', 5499.00);
insert into payments (order_id, status, processor_ref, paid_at) values
  ('ORD-2026-3004', 'CAPTURED', 'card_3004', '2026-09-16 18:10:50+05:30');
insert into communications (id, order_id, occurred_at, body) values
  (gen_random_uuid(), 'ORD-2026-3004', '2026-09-24 12:00:00+05:30', 'It has been over a week and my order still shows processing, where is it?');

-- ORD-2026-3005: shipped, refund still pending decision -> ambiguous status, manual review.
insert into orders (order_id, customer_name, customer_email, product_name, created_at, currency, amount) values
  ('ORD-2026-3005', 'Sneha Reddy', 'sneha.reddy@gmail.com', 'Face Serum Set', '2026-09-11 10:30:00+05:30', 'INR', 1299.00);
insert into payments (order_id, status, processor_ref, paid_at) values
  ('ORD-2026-3005', 'CAPTURED', 'upi_3005', '2026-09-11 10:30:20+05:30');
insert into fulfillment (order_id, carrier, awb, shipped_at) values
  ('ORD-2026-3005', 'Bluedart', '3005AWB', '2026-09-12 09:00:00+05:30');
insert into refunds (order_id, status, amount, decided_at) values
  ('ORD-2026-3005', 'PENDING', 1299.00, null);
insert into communications (id, order_id, occurred_at, body) values
  (gen_random_uuid(), 'ORD-2026-3005', '2026-09-23 15:00:00+05:30', 'Package leaked and damaged the product, requested refund a week ago');
