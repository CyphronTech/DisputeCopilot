-- 30 additional synthetic test orders (ORD-2026-4001 to 4210) covering a wider spread of
-- real-world dispute scenarios: clean contest/accept, denied-then-reappealed, pending refunds,
-- never-shipped, partial refunds, stale/old orders, malformed AWBs, international currencies,
-- payment/fulfillment inconsistencies, multi-message threads, and string-escaping edge cases.
-- All names, emails and order data are fictional.

-- ORD-2026-4001: CONTEST - delivered, no complaint on file
INSERT INTO orders (order_id, created_at, currency, amount, customer_name, customer_email, product_name)
VALUES ('ORD-2026-4001', '2026-09-02 10:15:00+05:30', 'INR', 1499.00, 'Ravi Kapoor', 'ravi.kapoor.fake@gmail.com', 'Wireless Mouse M1');
INSERT INTO payments (order_id, status, processor_ref, paid_at)
VALUES ('ORD-2026-4001', 'CAPTURED', 'pay_9f3k2ndemo01', '2026-09-02 10:16:20+05:30');
INSERT INTO fulfillment (order_id, carrier, awb, shipped_at, proof_of_delivery_url)
VALUES ('ORD-2026-4001', 'Bluedart', 'BD778812340IN', '2026-09-03 14:00:00+05:30', 'https://picsum.photos/seed/ord2026-4001-pod/480/360');

-- ORD-2026-4002: CONTEST - delivered, generic "where is my order" message only
INSERT INTO orders (order_id, created_at, currency, amount, customer_name, customer_email, product_name)
VALUES ('ORD-2026-4002', '2026-09-05 09:30:00+05:30', 'INR', 799.00, 'Sneha Iyer', 'sneha.iyer.demo@yahoo.com', 'Cotton Bedsheet Set');
INSERT INTO payments (order_id, status, processor_ref, paid_at)
VALUES ('ORD-2026-4002', 'CAPTURED', 'pay_7a1m9pdemo02', '2026-09-05 09:31:05+05:30');
INSERT INTO fulfillment (order_id, carrier, awb, shipped_at, proof_of_delivery_url)
VALUES ('ORD-2026-4002', 'Delhivery', 'DL556291178IN', '2026-09-06 11:20:00+05:30', NULL);
INSERT INTO communications (id, order_id, occurred_at, body, attachment_url)
VALUES (gen_random_uuid(), 'ORD-2026-4002', '2026-09-10 18:45:00+05:30', 'Hi, where is my order? It has been a few days.', NULL);

-- ORD-2026-4003: CONTEST - delivered with POD, no complaint
INSERT INTO orders (order_id, created_at, currency, amount, customer_name, customer_email, product_name)
VALUES ('ORD-2026-4003', '2026-09-08 16:05:00+05:30', 'INR', 3250.00, 'Arjun Mehta', 'arjun.mehta.fakemail@outlook.com', 'Bluetooth Speaker X2');
INSERT INTO payments (order_id, status, processor_ref, paid_at)
VALUES ('ORD-2026-4003', 'CAPTURED', 'pay_2c8v4ldemo03', '2026-09-08 16:06:40+05:30');
INSERT INTO fulfillment (order_id, carrier, awb, shipped_at, proof_of_delivery_url)
VALUES ('ORD-2026-4003', 'Ecom Express', 'EE334498812IN', '2026-09-09 13:10:00+05:30', 'https://picsum.photos/seed/ord2026-4003-pod/480/360');

-- ORD-2026-4004: CONTEST - delivered, no complaint on file
INSERT INTO orders (order_id, created_at, currency, amount, customer_name, customer_email, product_name)
VALUES ('ORD-2026-4004', '2026-09-11 12:00:00+05:30', 'INR', 5600.00, 'Priya Nair', 'priya.nair.testuser@gmail.com', 'Air Fryer 4L');
INSERT INTO payments (order_id, status, processor_ref, paid_at)
VALUES ('ORD-2026-4004', 'CAPTURED', 'pay_5x0q7zdemo04', '2026-09-11 12:01:15+05:30');
INSERT INTO fulfillment (order_id, carrier, awb, shipped_at, proof_of_delivery_url)
VALUES ('ORD-2026-4004', 'DTDC', 'DT119284773IN', '2026-09-12 10:45:00+05:30', NULL);

-- ORD-2026-4005: CONTEST - delivered, generic "where is my order" message
INSERT INTO orders (order_id, created_at, currency, amount, customer_name, customer_email, product_name)
VALUES ('ORD-2026-4005', '2026-09-14 08:20:00+05:30', 'INR', 349.00, 'Karan Bhatt', 'karan.bhatt.sample@rediffmail.com', 'Phone Case Pack of 2');
INSERT INTO payments (order_id, status, processor_ref, paid_at)
VALUES ('ORD-2026-4005', 'CAPTURED', 'pay_3n6w1jdemo05', '2026-09-14 08:21:30+05:30');
INSERT INTO fulfillment (order_id, carrier, awb, shipped_at, proof_of_delivery_url)
VALUES ('ORD-2026-4005', 'Xpressbees', 'XB667712900IN', '2026-09-15 09:30:00+05:30', NULL);
INSERT INTO communications (id, order_id, occurred_at, body, attachment_url)
VALUES (gen_random_uuid(), 'ORD-2026-4005', '2026-09-19 20:10:00+05:30', 'Where is my order? Please update the status.', NULL);

-- ORD-2026-4006: ACCEPT - item missing from package, refund issued
INSERT INTO orders (order_id, created_at, currency, amount, customer_name, customer_email, product_name)
VALUES ('ORD-2026-4006', '2026-09-03 11:00:00+05:30', 'INR', 2199.00, 'Neha Deshmukh', 'neha.deshmukh.demo@gmail.com', 'Kitchen Knife Set');
INSERT INTO payments (order_id, status, processor_ref, paid_at)
VALUES ('ORD-2026-4006', 'CAPTURED', 'pay_8h4t2fdemo06', '2026-09-03 11:01:10+05:30');
INSERT INTO fulfillment (order_id, carrier, awb, shipped_at, proof_of_delivery_url)
VALUES ('ORD-2026-4006', 'Bluedart', 'BD881237765IN', '2026-09-04 15:30:00+05:30', NULL);
INSERT INTO communications (id, order_id, occurred_at, body, attachment_url)
VALUES (gen_random_uuid(), 'ORD-2026-4006', '2026-09-06 17:20:00+05:30', 'I received the box but the paring knife from the 3-piece set is missing, only 2 knives inside.', 'https://picsum.photos/seed/ord2026-4006-itemmissing/480/360');
INSERT INTO refunds (order_id, status, amount, decided_at)
VALUES ('ORD-2026-4006', 'ISSUED', 2199.00, '2026-09-08 12:00:00+05:30');

-- ORD-2026-4007: ACCEPT - item arrived damaged, refund issued
INSERT INTO orders (order_id, created_at, currency, amount, customer_name, customer_email, product_name)
VALUES ('ORD-2026-4007', '2026-09-06 14:45:00+05:30', 'INR', 4499.00, 'Vikram Singh', 'vikram.singh.testmail@hotmail.com', 'Ceramic Dinner Set 12pc');
INSERT INTO payments (order_id, status, processor_ref, paid_at)
VALUES ('ORD-2026-4007', 'CAPTURED', 'pay_1p9r6kdemo07', '2026-09-06 14:46:25+05:30');
INSERT INTO fulfillment (order_id, carrier, awb, shipped_at, proof_of_delivery_url)
VALUES ('ORD-2026-4007', 'Delhivery', 'DL229481003IN', '2026-09-07 10:15:00+05:30', NULL);
INSERT INTO communications (id, order_id, occurred_at, body, attachment_url)
VALUES (gen_random_uuid(), 'ORD-2026-4007', '2026-09-09 09:05:00+05:30', 'Two plates and a bowl were shattered when I opened the package, packaging was crushed on one side.', 'https://picsum.photos/seed/ord2026-4007-damaged/480/360');
INSERT INTO refunds (order_id, status, amount, decided_at)
VALUES ('ORD-2026-4007', 'ISSUED', 4499.00, '2026-09-11 16:30:00+05:30');

-- ORD-2026-4008: ACCEPT - wrong item shipped, refund issued
INSERT INTO orders (order_id, created_at, currency, amount, customer_name, customer_email, product_name)
VALUES ('ORD-2026-4008', '2026-09-10 09:15:00+05:30', 'INR', 1899.00, 'Ananya Roy', 'ananya.roy.fictional@gmail.com', 'Running Shoes Size 8');
INSERT INTO payments (order_id, status, processor_ref, paid_at)
VALUES ('ORD-2026-4008', 'CAPTURED', 'pay_6d3z8xdemo08', '2026-09-10 09:16:35+05:30');
INSERT INTO fulfillment (order_id, carrier, awb, shipped_at, proof_of_delivery_url)
VALUES ('ORD-2026-4008', 'Ecom Express', 'EE447719228IN', '2026-09-11 12:50:00+05:30', NULL);
INSERT INTO communications (id, order_id, occurred_at, body, attachment_url)
VALUES (gen_random_uuid(), 'ORD-2026-4008', '2026-09-13 19:40:00+05:30', 'I ordered size 8 running shoes but received a size 6 sandal instead, completely wrong item.', NULL);
INSERT INTO refunds (order_id, status, amount, decided_at)
VALUES ('ORD-2026-4008', 'ISSUED', 1899.00, '2026-09-15 10:20:00+05:30');

-- ORD-2026-4009: ACCEPT - item missing, refund issued
INSERT INTO orders (order_id, created_at, currency, amount, customer_name, customer_email, product_name)
VALUES ('ORD-2026-4009', '2026-09-16 13:25:00+05:30', 'INR', 999.00, 'Rohit Verma', 'rohit.verma.demoacct@gmail.com', 'Yoga Mat + Resistance Bands Combo');
INSERT INTO payments (order_id, status, processor_ref, paid_at)
VALUES ('ORD-2026-4009', 'CAPTURED', 'pay_4y7b3sdemo09', '2026-09-16 13:26:10+05:30');
INSERT INTO fulfillment (order_id, carrier, awb, shipped_at, proof_of_delivery_url)
VALUES ('ORD-2026-4009', 'DTDC', 'DT885213467IN', '2026-09-17 11:00:00+05:30', NULL);
INSERT INTO communications (id, order_id, occurred_at, body, attachment_url)
VALUES (gen_random_uuid(), 'ORD-2026-4009', '2026-09-19 08:50:00+05:30', 'The combo pack only had the yoga mat, the resistance bands were not in the box at all.', NULL);
INSERT INTO refunds (order_id, status, amount, decided_at)
VALUES ('ORD-2026-4009', 'ISSUED', 999.00, '2026-09-21 14:00:00+05:30');

-- ORD-2026-4010: ACCEPT - item arrived damaged, refund issued
INSERT INTO orders (order_id, created_at, currency, amount, customer_name, customer_email, product_name)
VALUES ('ORD-2026-4010', '2026-09-20 17:10:00+05:30', 'INR', 7499.00, 'Divya Krishnan', 'divya.krishnan.example@outlook.com', 'Study Table Lamp with Glass Shade');
INSERT INTO payments (order_id, status, processor_ref, paid_at)
VALUES ('ORD-2026-4010', 'CAPTURED', 'pay_0k5g9wdemo10', '2026-09-20 17:11:45+05:30');
INSERT INTO fulfillment (order_id, carrier, awb, shipped_at, proof_of_delivery_url)
VALUES ('ORD-2026-4010', 'Xpressbees', 'XB992384510IN', '2026-09-21 09:40:00+05:30', NULL);
INSERT INTO communications (id, order_id, occurred_at, body, attachment_url)
VALUES (gen_random_uuid(), 'ORD-2026-4010', '2026-09-23 12:15:00+05:30', 'The glass shade of the lamp arrived completely cracked into pieces, unusable as is.', 'https://picsum.photos/seed/ord2026-4010-damaged/480/360');
INSERT INTO refunds (order_id, status, amount, decided_at)
VALUES ('ORD-2026-4010', 'ISSUED', 7499.00, '2026-09-25 15:45:00+05:30');
-- ORD-2026-4101: Refund DENIED, but customer's follow-up complaint after denial insists item never arrived (contradicts merchant's own decision)
INSERT INTO orders (order_id, created_at, currency, amount, customer_name, customer_email, product_name) VALUES
('ORD-2026-4101', '2026-09-10 11:20:00+05:30', 'INR', 2499.00, 'Ritika Bhandari', 'ritika.bhandari.fake@gmail.com', 'Wireless Ergo Mouse');
INSERT INTO payments (order_id, status, processor_ref, paid_at) VALUES
('ORD-2026-4101', 'CAPTURED', 'pay_ref_9f31ac02', '2026-09-10 11:21:15+05:30');
INSERT INTO fulfillment (order_id, carrier, awb, shipped_at, proof_of_delivery_url) VALUES
('ORD-2026-4101', 'Delhivery', 'DLV778812345', '2026-09-11 09:00:00+05:30', 'https://picsum.photos/seed/ord2026-4101-pod/480/360');
INSERT INTO refunds (order_id, status, amount, decided_at) VALUES
('ORD-2026-4101', 'DENIED', 0.00, '2026-09-15 16:40:00+05:30');
INSERT INTO communications (id, order_id, occurred_at, body, attachment_url) VALUES
(gen_random_uuid(), 'ORD-2026-4101', '2026-09-13 10:05:00+05:30', 'Hi, I never received my order, it has been days. Please refund me.', NULL),
(gen_random_uuid(), 'ORD-2026-4101', '2026-09-16 08:30:00+05:30', 'I saw my refund request was denied but I am telling you again, this package NEVER arrived at my address. Your proof of delivery must be for someone else. Please review this again.', NULL);

-- ORD-2026-4102: Refund PENDING (decided_at null) with an active customer complaint, outcome not yet decided internally
INSERT INTO orders (order_id, created_at, currency, amount, customer_name, customer_email, product_name) VALUES
('ORD-2026-4102', '2026-09-18 14:05:00+05:30', 'INR', 3899.00, 'Farhan Qureshi', 'farhan.qureshi.demo@outlook.com', 'Bluetooth Headphones Pro');
INSERT INTO payments (order_id, status, processor_ref, paid_at) VALUES
('ORD-2026-4102', 'CAPTURED', 'pay_ref_44bb210e', '2026-09-18 14:06:40+05:30');
INSERT INTO fulfillment (order_id, carrier, awb, shipped_at, proof_of_delivery_url) VALUES
('ORD-2026-4102', 'Bluedart', 'BD20260918887701', '2026-09-19 10:15:00+05:30', NULL);
INSERT INTO refunds (order_id, status, amount, decided_at) VALUES
('ORD-2026-4102', 'PENDING', 3899.00, NULL);
INSERT INTO communications (id, order_id, occurred_at, body, attachment_url) VALUES
(gen_random_uuid(), 'ORD-2026-4102', '2026-09-22 09:12:00+05:30', 'The tracking shows delivered but I have not received anything. I already requested a refund, please let me know the status.', NULL);

-- ORD-2026-4103: Order paid but NO fulfillment row at all (never shipped) plus a complaint, looks like merchant fault not fraud
INSERT INTO orders (order_id, created_at, currency, amount, customer_name, customer_email, product_name) VALUES
('ORD-2026-4103', '2026-09-05 17:45:00+05:30', 'INR', 1299.00, 'Meenal Kapoor', 'meenal.kapoor.sample@yahoo.com', 'Stainless Steel Water Bottle');
INSERT INTO payments (order_id, status, processor_ref, paid_at) VALUES
('ORD-2026-4103', 'CAPTURED', 'pay_ref_7c02fe19', '2026-09-05 17:46:05+05:30');
INSERT INTO communications (id, order_id, occurred_at, body, attachment_url) VALUES
(gen_random_uuid(), 'ORD-2026-4103', '2026-09-14 12:00:00+05:30', 'It has been over a week and I have not even gotten a shipping confirmation. Where is my order?', NULL);

-- ORD-2026-4104: Shipped, refund ISSUED, but a NEW customer message arrives complaining again after the refund
INSERT INTO orders (order_id, created_at, currency, amount, customer_name, customer_email, product_name) VALUES
('ORD-2026-4104', '2026-09-08 09:30:00+05:30', 'INR', 5499.00, 'Devansh Oberoi', 'devansh.oberoi.test@gmail.com', 'Air Fryer 4L');
INSERT INTO payments (order_id, status, processor_ref, paid_at) VALUES
('ORD-2026-4104', 'CAPTURED', 'pay_ref_31a8dd77', '2026-09-08 09:31:20+05:30');
INSERT INTO fulfillment (order_id, carrier, awb, shipped_at, proof_of_delivery_url) VALUES
('ORD-2026-4104', 'Ecom Express', 'ECX556677889', '2026-09-09 13:00:00+05:30', 'https://picsum.photos/seed/ord2026-4104-pod/480/360');
INSERT INTO refunds (order_id, status, amount, decided_at) VALUES
('ORD-2026-4104', 'ISSUED', 5499.00, '2026-09-12 15:20:00+05:30');
INSERT INTO communications (id, order_id, occurred_at, body, attachment_url) VALUES
(gen_random_uuid(), 'ORD-2026-4104', '2026-09-11 10:00:00+05:30', 'The air fryer arrived damaged, requesting a refund.', NULL),
(gen_random_uuid(), 'ORD-2026-4104', '2026-09-20 18:45:00+05:30', 'I got the refund but I was also charged again on my card statement for the same order. Can someone check this, I think I was double charged.', NULL);

-- ORD-2026-4105: Two communications at different times with conflicting tone (calm then escalated), no refund, no clear resolution
INSERT INTO orders (order_id, created_at, currency, amount, customer_name, customer_email, product_name) VALUES
('ORD-2026-4105', '2026-09-16 12:00:00+05:30', 'INR', 1899.00, 'Simran Chadha', 'simran.chadha.mail@gmail.com', 'Yoga Mat Premium');
INSERT INTO payments (order_id, status, processor_ref, paid_at) VALUES
('ORD-2026-4105', 'CAPTURED', 'pay_ref_88fe0231', '2026-09-16 12:01:10+05:30');
INSERT INTO fulfillment (order_id, carrier, awb, shipped_at, proof_of_delivery_url) VALUES
('ORD-2026-4105', 'Delhivery', 'DLV778899001', '2026-09-17 11:00:00+05:30', NULL);
INSERT INTO communications (id, order_id, occurred_at, body, attachment_url) VALUES
(gen_random_uuid(), 'ORD-2026-4105', '2026-09-19 09:00:00+05:30', 'Hello, just checking in on my order, the tracking hasn''t updated in a couple of days. No rush, just wanted to ask.', NULL),
(gen_random_uuid(), 'ORD-2026-4105', '2026-09-24 20:10:00+05:30', 'This is unacceptable, it has been over a week now and NOBODY has responded to me. I want a refund immediately or I am escalating this to my bank.', NULL);

-- ORD-2026-4106: Shipped, no refund, customer's message says item ARRIVED but wrong item/size/color (mismatched dispute reason)
INSERT INTO orders (order_id, created_at, currency, amount, customer_name, customer_email, product_name) VALUES
('ORD-2026-4106', '2026-09-12 15:40:00+05:30', 'INR', 2199.00, 'Aakash Nair', 'aakash.nair.mailbox@gmail.com', 'Running Shoes Size 9');
INSERT INTO payments (order_id, status, processor_ref, paid_at) VALUES
('ORD-2026-4106', 'CAPTURED', 'pay_ref_6de2af90', '2026-09-12 15:41:35+05:30');
INSERT INTO fulfillment (order_id, carrier, awb, shipped_at, proof_of_delivery_url) VALUES
('ORD-2026-4106', 'Xpressbees', 'XPB334455667', '2026-09-13 10:30:00+05:30', 'https://picsum.photos/seed/ord2026-4106-pod/480/360');
INSERT INTO communications (id, order_id, occurred_at, body, attachment_url) VALUES
(gen_random_uuid(), 'ORD-2026-4106', '2026-09-15 17:20:00+05:30', 'I received the package today but it has the wrong shoes inside, this is a size 7 in a different color, not what I ordered. I need this fixed.', 'https://picsum.photos/seed/ord2026-4106-wrongitem/480/360');

-- ORD-2026-4107: Partial refund, refund status ISSUED but amount less than order amount, complaint about the remainder
INSERT INTO orders (order_id, created_at, currency, amount, customer_name, customer_email, product_name) VALUES
('ORD-2026-4107', '2026-09-03 10:10:00+05:30', 'INR', 4999.00, 'Priyanka Sethi', 'priyanka.sethi.inbox@rediffmail.com', 'Electric Kettle + Toaster Combo');
INSERT INTO payments (order_id, status, processor_ref, paid_at) VALUES
('ORD-2026-4107', 'CAPTURED', 'pay_ref_2211bfa4', '2026-09-03 10:11:25+05:30');
INSERT INTO fulfillment (order_id, carrier, awb, shipped_at, proof_of_delivery_url) VALUES
('ORD-2026-4107', 'Bluedart', 'BD20260903991122', '2026-09-04 09:45:00+05:30', 'https://picsum.photos/seed/ord2026-4107-pod/480/360');
INSERT INTO refunds (order_id, status, amount, decided_at) VALUES
('ORD-2026-4107', 'ISSUED', 2000.00, '2026-09-10 14:00:00+05:30');
INSERT INTO communications (id, order_id, occurred_at, body, attachment_url) VALUES
(gen_random_uuid(), 'ORD-2026-4107', '2026-09-07 11:30:00+05:30', 'The toaster part of the combo was missing from the box, only the kettle arrived.', NULL),
(gen_random_uuid(), 'ORD-2026-4107', '2026-09-12 09:15:00+05:30', 'I only got refunded 2000 rupees but the toaster alone costs more than that. This does not cover what I am owed, please review the amount.', NULL);

-- ORD-2026-4108: Very old order (created_at July 2026, ~2 months old) with a fresh complaint just now, evidence may be stale/out of policy window
INSERT INTO orders (order_id, created_at, currency, amount, customer_name, customer_email, product_name) VALUES
('ORD-2026-4108', '2026-07-14 13:25:00+05:30', 'INR', 1599.00, 'Karan Malhotra', 'karan.malhotra.demoacct@gmail.com', 'Desk Organizer Set');
INSERT INTO payments (order_id, status, processor_ref, paid_at) VALUES
('ORD-2026-4108', 'CAPTURED', 'pay_ref_009cfe22', '2026-07-14 13:26:10+05:30');
INSERT INTO fulfillment (order_id, carrier, awb, shipped_at, proof_of_delivery_url) VALUES
('ORD-2026-4108', 'Ecom Express', 'ECX112233445', '2026-07-15 10:00:00+05:30', 'https://picsum.photos/seed/ord2026-4108-pod/480/360');
INSERT INTO communications (id, order_id, occurred_at, body, attachment_url) VALUES
(gen_random_uuid(), 'ORD-2026-4108', '2026-09-26 19:00:00+05:30', 'I know this order was a while back but I just noticed I was never fully happy with this, half the organizer set was missing pieces. Can I still get a refund?', NULL);

-- ORD-2026-4109: Shipped via carrier but AWB looks malformed/short (data-quality edge case), with a complaint
INSERT INTO orders (order_id, created_at, currency, amount, customer_name, customer_email, product_name) VALUES
('ORD-2026-4109', '2026-09-20 08:50:00+05:30', 'INR', 2799.00, 'Tanvi Deshpande', 'tanvi.deshpande.fakeid@gmail.com', 'Ceramic Cookware Set');
INSERT INTO payments (order_id, status, processor_ref, paid_at) VALUES
('ORD-2026-4109', 'CAPTURED', 'pay_ref_5501ecab', '2026-09-20 08:51:30+05:30');
INSERT INTO fulfillment (order_id, carrier, awb, shipped_at, proof_of_delivery_url) VALUES
('ORD-2026-4109', 'Delhivery', 'DL12', '2026-09-21 12:00:00+05:30', NULL);
INSERT INTO communications (id, order_id, occurred_at, body, attachment_url) VALUES
(gen_random_uuid(), 'ORD-2026-4109', '2026-09-24 15:35:00+05:30', 'The tracking number you gave me does not work on the courier website at all. I have no idea where my package is.', NULL);

-- ORD-2026-4110: High-value order (amount > 15000) shipped, no refund, generic complaint, worth careful human look given the stakes
INSERT INTO orders (order_id, created_at, currency, amount, customer_name, customer_email, product_name) VALUES
('ORD-2026-4110', '2026-09-14 16:00:00+05:30', 'INR', 18999.00, 'Rohan Vaidya', 'rohan.vaidya.testmail@gmail.com', 'Noise Cancelling Headphones Elite');
INSERT INTO payments (order_id, status, processor_ref, paid_at) VALUES
('ORD-2026-4110', 'CAPTURED', 'pay_ref_770ecd41', '2026-09-14 16:01:45+05:30');
INSERT INTO fulfillment (order_id, carrier, awb, shipped_at, proof_of_delivery_url) VALUES
('ORD-2026-4110', 'Bluedart', 'BD20260914556699', '2026-09-15 09:20:00+05:30', 'https://picsum.photos/seed/ord2026-4110-pod/480/360');
INSERT INTO communications (id, order_id, occurred_at, body, attachment_url) VALUES
(gen_random_uuid(), 'ORD-2026-4110', '2026-09-23 11:10:00+05:30', 'I am not satisfied with this order and would like to raise a complaint. This was an expensive purchase and I expect it to be handled properly.', NULL);
-- ORD-2026-4201: International order (USD), shipped via FedEx International, no refund, generic complaint
INSERT INTO orders (order_id, created_at, currency, amount, customer_name, customer_email, product_name) VALUES
('ORD-2026-4201', '2026-08-01T10:15:00+05:30', 'USD', 49.99, 'Marcus Ellenwood', 'marcus.ellenwood@fakemailbox.com', 'Wireless Charging Pad');
INSERT INTO payments (order_id, status, processor_ref, paid_at) VALUES
('ORD-2026-4201', 'CAPTURED', 'PSTRP-88213X', '2026-08-01T10:16:00+05:30');
INSERT INTO fulfillment (order_id, carrier, awb, shipped_at, proof_of_delivery_url) VALUES
('ORD-2026-4201', 'FedEx International', 'FDXI-778201394', '2026-08-02T14:00:00+05:30', NULL);
INSERT INTO communications (id, order_id, occurred_at, body, attachment_url) VALUES
(gen_random_uuid(), 'ORD-2026-4201', '2026-08-10T09:30:00+05:30', 'This order has not arrived and I need an update on where it is.', NULL);

-- ORD-2026-4202: International order (GBP), refund already ISSUED, complaint predates refund
INSERT INTO orders (order_id, created_at, currency, amount, customer_name, customer_email, product_name) VALUES
('ORD-2026-4202', '2026-07-15T11:20:00+05:30', 'GBP', 34.50, 'Portia Wrenfield', 'portia.wrenfield@postbox.co.uk', 'Bluetooth Earbuds');
INSERT INTO payments (order_id, status, processor_ref, paid_at) VALUES
('ORD-2026-4202', 'CAPTURED', 'PSTRP-99024Y', '2026-07-15T11:21:00+05:30');
INSERT INTO fulfillment (order_id, carrier, awb, shipped_at, proof_of_delivery_url) VALUES
('ORD-2026-4202', 'DHL Express', 'DHLX-556201823', '2026-07-16T09:00:00+05:30', 'https://picsum.photos/seed/ord2026-4202-pod/480/360');
INSERT INTO communications (id, order_id, occurred_at, body, attachment_url) VALUES
(gen_random_uuid(), 'ORD-2026-4202', '2026-07-20T08:00:00+05:30', 'The earbuds arrived broken, I would like a refund.', NULL);
INSERT INTO refunds (order_id, status, amount, decided_at) VALUES
('ORD-2026-4202', 'ISSUED', 34.50, '2026-07-22T12:00:00+05:30');

-- ORD-2026-4203: COD-style mismatch, payment PENDING but order shows shipped
INSERT INTO orders (order_id, created_at, currency, amount, customer_name, customer_email, product_name) VALUES
('ORD-2026-4203', '2026-08-05T16:45:00+05:30', 'INR', 1299.00, 'Devansh Pentapalli', 'devansh.pentapalli@mailfly.in', 'Non-Stick Cookware Set');
INSERT INTO payments (order_id, status, processor_ref, paid_at) VALUES
('ORD-2026-4203', 'PENDING', 'PSTRP-COD1123', '2026-08-05T16:45:00+05:30');
INSERT INTO fulfillment (order_id, carrier, awb, shipped_at, proof_of_delivery_url) VALUES
('ORD-2026-4203', 'Delhivery', 'DLV-441209887', '2026-08-06T10:30:00+05:30', NULL);

-- ORD-2026-4204: Data inconsistency, payment FAILED but fulfillment row exists, no refund, no complaint yet
INSERT INTO orders (order_id, created_at, currency, amount, customer_name, customer_email, product_name) VALUES
('ORD-2026-4204', '2026-08-09T13:10:00+05:30', 'INR', 899.00, 'Kavita Ramachandroo', 'kavita.ramachandroo@inboxnest.in', 'Yoga Mat Premium');
INSERT INTO payments (order_id, status, processor_ref, paid_at) VALUES
('ORD-2026-4204', 'FAILED', 'PSTRP-FAIL5591', '2026-08-09T13:10:00+05:30');
INSERT INTO fulfillment (order_id, carrier, awb, shipped_at, proof_of_delivery_url) VALUES
('ORD-2026-4204', 'Bluedart', 'BD-330187654', '2026-08-10T11:00:00+05:30', NULL);

-- ORD-2026-4205: Multiple back-to-back customer communications, increasingly frustrated, no refund, shipped
INSERT INTO orders (order_id, created_at, currency, amount, customer_name, customer_email, product_name) VALUES
('ORD-2026-4205', '2026-07-28T09:00:00+05:30', 'INR', 2499.00, 'Rohan Bhattacharji', 'rohan.bhattacharji@quickmail.in', 'Bluetooth Speaker XL');
INSERT INTO payments (order_id, status, processor_ref, paid_at) VALUES
('ORD-2026-4205', 'CAPTURED', 'PSTRP-77120Z', '2026-07-28T09:01:00+05:30');
INSERT INTO fulfillment (order_id, carrier, awb, shipped_at, proof_of_delivery_url) VALUES
('ORD-2026-4205', 'Ekart', 'EK-902187345', '2026-07-29T10:00:00+05:30', NULL);
INSERT INTO communications (id, order_id, occurred_at, body, attachment_url) VALUES
(gen_random_uuid(), 'ORD-2026-4205', '2026-08-01T10:00:00+05:30', 'Hi, my speaker has not arrived yet, any update?', NULL),
(gen_random_uuid(), 'ORD-2026-4205', '2026-08-04T15:30:00+05:30', 'It has been a week now, still nothing. This is getting frustrating.', NULL),
(gen_random_uuid(), 'ORD-2026-4205', '2026-08-07T18:45:00+05:30', 'I have called three times and no one is helping me. I want this resolved today.', NULL);

-- ORD-2026-4206: Competing photos - proof of delivery vs customer damage photo, no refund on file
INSERT INTO orders (order_id, created_at, currency, amount, customer_name, customer_email, product_name) VALUES
('ORD-2026-4206', '2026-08-12T12:00:00+05:30', 'INR', 3499.00, 'Ishaani Vellanki', 'ishaani.vellanki@mailhaven.in', 'Ceramic Dinner Set');
INSERT INTO payments (order_id, status, processor_ref, paid_at) VALUES
('ORD-2026-4206', 'CAPTURED', 'PSTRP-66330A', '2026-08-12T12:01:00+05:30');
INSERT INTO fulfillment (order_id, carrier, awb, shipped_at, proof_of_delivery_url) VALUES
('ORD-2026-4206', 'Xpressbees', 'XB-114409223', '2026-08-13T09:15:00+05:30', 'https://picsum.photos/seed/ord2026-4206-pod/480/360');
INSERT INTO communications (id, order_id, occurred_at, body, attachment_url) VALUES
(gen_random_uuid(), 'ORD-2026-4206', '2026-08-15T17:00:00+05:30', 'The dinner set arrived shattered, here is a photo of the damage.', 'https://picsum.photos/seed/ord2026-4206-damage/480/360');

-- ORD-2026-4207: Extremely small amount, shipped, no refund, no complaint - clean contest
INSERT INTO orders (order_id, created_at, currency, amount, customer_name, customer_email, product_name) VALUES
('ORD-2026-4207', '2026-08-18T08:30:00+05:30', 'INR', 49.00, 'Tanmay Ghoshroy', 'tanmay.ghoshroy@fastpost.in', 'Keychain Torch Light');
INSERT INTO payments (order_id, status, processor_ref, paid_at) VALUES
('ORD-2026-4207', 'CAPTURED', 'PSTRP-11029B', '2026-08-18T08:31:00+05:30');
INSERT INTO fulfillment (order_id, carrier, awb, shipped_at, proof_of_delivery_url) VALUES
('ORD-2026-4207', 'India Post', 'IP-220987341', '2026-08-19T10:00:00+05:30', 'https://picsum.photos/seed/ord2026-4207-pod/480/360');

-- ORD-2026-4208: High-value order, refund ISSUED matching full amount, one calm complaint predating refund
INSERT INTO orders (order_id, created_at, currency, amount, customer_name, customer_email, product_name) VALUES
('ORD-2026-4208', '2026-07-05T14:00:00+05:30', 'INR', 52999.00, 'Aravindan Krishnamachari', 'aravindan.krishnamachari@zentamail.in', 'Smart LED Television 55-inch');
INSERT INTO payments (order_id, status, processor_ref, paid_at) VALUES
('ORD-2026-4208', 'CAPTURED', 'PSTRP-90441C', '2026-07-05T14:02:00+05:30');
INSERT INTO fulfillment (order_id, carrier, awb, shipped_at, proof_of_delivery_url) VALUES
('ORD-2026-4208', 'Bluedart', 'BD-889213765', '2026-07-06T11:00:00+05:30', 'https://picsum.photos/seed/ord2026-4208-pod/480/360');
INSERT INTO communications (id, order_id, occurred_at, body, attachment_url) VALUES
(gen_random_uuid(), 'ORD-2026-4208', '2026-07-10T10:00:00+05:30', 'The television screen has a manufacturing defect, a dead pixel cluster in the corner. Could you please assist with a refund?', 'https://picsum.photos/seed/ord2026-4208-defect/480/360');
INSERT INTO refunds (order_id, status, amount, decided_at) VALUES
('ORD-2026-4208', 'ISSUED', 52999.00, '2026-07-14T09:00:00+05:30');

-- ORD-2026-4209: Product name with apostrophe/special characters, shipped, no refund
INSERT INTO orders (order_id, created_at, currency, amount, customer_name, customer_email, product_name) VALUES
('ORD-2026-4209', '2026-08-20T09:45:00+05:30', 'INR', 1199.00, 'Sneha Warangkar', 'sneha.warangkar@dakbox.in', 'Women''s Cotton Kurta - Pack of 2');
INSERT INTO payments (order_id, status, processor_ref, paid_at) VALUES
('ORD-2026-4209', 'CAPTURED', 'PSTRP-33218D', '2026-08-20T09:46:00+05:30');
INSERT INTO fulfillment (order_id, carrier, awb, shipped_at, proof_of_delivery_url) VALUES
('ORD-2026-4209', 'Delhivery', 'DLV-778213409', '2026-08-21T12:00:00+05:30', 'https://picsum.photos/seed/ord2026-4209-pod/480/360');

-- ORD-2026-4210: Plus-addressing email, hyphenated surname, shipped, refund DENIED, complaint after denial
INSERT INTO orders (order_id, created_at, currency, amount, customer_name, customer_email, product_name) VALUES
('ORD-2026-4210', '2026-07-25T15:00:00+05:30', 'INR', 1899.00, 'Meera Dixit-Kulkarni', 'meera.dixitkulkarni+orders@gmail.com', 'Stainless Steel Water Bottle Set');
INSERT INTO payments (order_id, status, processor_ref, paid_at) VALUES
('ORD-2026-4210', 'CAPTURED', 'PSTRP-44320E', '2026-07-25T15:01:00+05:30');
INSERT INTO fulfillment (order_id, carrier, awb, shipped_at, proof_of_delivery_url) VALUES
('ORD-2026-4210', 'Ekart', 'EK-556209871', '2026-07-26T09:30:00+05:30', 'https://picsum.photos/seed/ord2026-4210-pod/480/360');
INSERT INTO refunds (order_id, status, amount, decided_at) VALUES
('ORD-2026-4210', 'DENIED', 1899.00, '2026-07-30T11:00:00+05:30');
INSERT INTO communications (id, order_id, occurred_at, body, attachment_url) VALUES
(gen_random_uuid(), 'ORD-2026-4210', '2026-08-01T09:00:00+05:30', 'I am very disappointed that my refund request was denied. The bottles were leaking from day one and I have proof of delivery photos showing the packaging was already damaged.', NULL);
