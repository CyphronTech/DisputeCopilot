create table policy_document (
  id uuid primary key,
  title varchar(255) not null,
  filename varchar(255) not null,
  version varchar(32) not null,
  status varchar(32) not null,
  effective_from date not null,
  effective_to date,
  content text not null
);

insert into policy_document (id, title, filename, version, status, effective_from, effective_to, content) values
('11111111-1111-1111-1111-111111111101', 'Amazon.com Return Policy', 'amazon-com-return-policy.txt', '1.0', 'ACTIVE', '2026-01-01', null, $$Most items can be returned for a refund or replacement/exchange within 30 days of delivery as long as they are in original or unused condition. A refund will be provided if Amazon (or the third-party seller) has received the item, and determined that you are eligible for a refund. It can take up to 30 days for us to receive and process your return.

Return Window: Most items sold on Amazon.com can be returned within 30 days of delivery. Some exceptions: 7 days for digital books/textbooks and Alexa music purchases; 15 days for Apple/Boost Infinite brand products and Amazon Haul items over $3; 90 days for select Amazon Renewed products, most nonperishable baby products, and mattresses; 180 days for wedding registry gifts; 365 days for Amazon Renewed Premium and baby registry gifts.

Items That Cannot Be Returned: perishables, products that may pose health and safety risks if returned, products with shipping restrictions, customized products made specifically for the customer, redeemable products, Amazon Pharmacy products, pet medication products, certain digital products, and automobiles. Products listed as "Final Sale" are non-returnable and non-refundable. In the unlikely event that a non-returnable/Final Sale item arrives damaged, defective, or materially different from what was ordered, the customer should contact Customer Service for a resolution.

Third-Party Seller Returns: When an order is fulfilled and shipped by a third-party seller, the return is sent back to the seller instead of Amazon. Sellers must offer one of: a return address within the United States, a prepaid return label, or a full refund without requesting the item be returned.

Return Fees: A late fee applies when the customer does not drop off or complete a carrier pickup on or before the "return by date" — 20% of the item price for the first 30 days after the return-by date, 100% afterward. A damage fee of up to 50% of the item price applies when a returned item is damaged, missing parts, not in original condition, or has obvious signs of use for reasons not due to an Amazon.com or seller error.$$),

('11111111-1111-1111-1111-111111111102', 'Amazon.com Refund Timelines', 'amazon-com-refund-timelines.txt', '1.0', 'ACTIVE', '2026-01-01', null, $$After Amazon receives and processes a return, a refund is issued according to the return policy. Refunds can take up to 30 days depending on order type, return shipping speed, processing time, and refund payment method.

Refund types: Advanced refunds are issued when a carrier first scans the return, rather than when Amazon receives and processes it. Declined refunds occur when the original payment method cannot be used (such as an expired card), in which case the refund goes to the Amazon account balance instead. Partial refunds apply to returns that are used, damaged, or missing parts.

Possible charges following an advanced refund or replacement order: if the item is not returned by the date shown in the return confirmation email, Amazon will first send a reminder, then charge the customer's account for the advanced refund or replacement amount if the return is not received within the return window. Once the return is received and processed, any such charges are reversed.

Partial refunds: all returns are inspected against the expected item, and refunds are reduced for signs of customer use, damage, or missing parts, accessories, or manuals.$$),

('11111111-1111-1111-1111-111111111103', 'Amazon.com Non-returnable Items', 'amazon-com-nonreturnable-items.txt', '1.0', 'ACTIVE', '2026-01-01', null, $$According to Amazon's return policy, some items purchased on amazon.com cannot be returned, including digital items, cards, and products that are unsafe for return. Devices are also non-returnable more than 30 days after delivery.

Examples of nonreturnable items: hazardous materials such as flammable liquids or gases; computer laptops, desktops, and Kindles more than 30 days after delivery; downloadable software products, opened software, and online subscriptions after being accessed; gift cards and prepaid game cards; items purchased through the Amazon Bulk Liquidations Store; discounted items marked "Final Sale"; collectibles such as trading card games and Funko Pop figures; any product with the serial number or UPC removed; Amazon Fresh and grocery products; live insects; some jewelry and health/personal care orders; customized products; and automobiles.

However, if a non-returnable item arrives damaged, defective, unusable, or materially different from what was ordered, the customer should contact Customer Service — a damaged or materially-different delivery is handled as an exception even for otherwise non-returnable categories.$$),

('11111111-1111-1111-1111-111111111104', 'Amazon.com Returns to Third-Party Sellers', 'amazon-com-third-party-seller-returns.txt', '1.0', 'ACTIVE', '2026-01-01', null, $$When an order is fulfilled and shipped by a third-party seller, the return is sent back to the seller instead of Amazon. The seller must provide one of: a return address in the United States, a prepaid return label, or a full refund without returning the item.

The seller processes the refund after receiving the return, usually within two business days. Refunds can be delayed if the return is in transit longer than expected, an untrackable shipping method was used, the seller receives a different item than ordered, or an item sold as new is returned with signs of use or damage.

If the seller does not respond within 48 hours of a return request, or does not offer an approved return method within 48 hours for a damaged, defective, or not-as-described item, the customer can request an A-to-z Guarantee refund directly from Amazon.$$),

('11111111-1111-1111-1111-111111111105', 'Amazon.in Returns Policy', 'amazon-in-returns-policy.txt', '1.0', 'ACTIVE', '2026-01-01', null, $$Most items purchased from sellers listed on Amazon.in are returnable within the return window, except those explicitly identified as not returnable. Applicable products are returnable within the applicable return window if received in a condition that is physically damaged, has missing parts or accessories, is defective, or is different from the description on the product detail page.

Returns will be processed only if verification confirms: the product was not damaged while in the customer's possession; the product is not different from what was shipped; and the product is returned in original condition with the brand's/manufacturer's box, MRP tag intact, user manual, warranty card, and all accessories.

Products marked "non-returnable" on the product detail page cannot be returned. However, in the event of a damaged, defective, or wrong item delivered, Amazon will provide a full refund or replacement, as applicable, after ascertaining the damage or defect.

10/30 Days Returnable policy: an item under this policy is eligible for free return or replacement within 10/30 days of delivery in the event of a damaged, defective, or different item delivered, and can also be returned within that window for a full refund, provided it is kept in original condition with brand outer box, MRP tags, user manual, warranty cards, and original accessories.$$);
