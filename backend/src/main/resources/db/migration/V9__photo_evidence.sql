alter table communications add column attachment_url varchar(500);
alter table fulfillment add column proof_of_delivery_url varchar(500);
alter table evidence_item add column attachment_url varchar(500);

-- Customer-submitted photo of a damaged/leaked product (ORD-2026-3005: "package leaked and damaged the product").
update communications set attachment_url = 'https://picsum.photos/seed/ord2026-3005-damage/480/360'
  where order_id = 'ORD-2026-3005';

-- Customer photo of an empty box (ORD-2026-3003: "box arrived empty, missing all books").
update communications set attachment_url = 'https://picsum.photos/seed/ord2026-3003-emptybox/480/360'
  where order_id = 'ORD-2026-3003';

-- Carrier-provided proof-of-delivery photo (ORD-2026-3002: clean contest case).
update fulfillment set proof_of_delivery_url = 'https://picsum.photos/seed/ord2026-3002-pod/480/360'
  where order_id = 'ORD-2026-3002';
