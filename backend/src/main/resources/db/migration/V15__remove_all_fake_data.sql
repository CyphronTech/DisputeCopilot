-- Wipe every synthetic/demo record inserted by earlier migrations (V1, V3, V6, V11) before
-- this instance goes to production. Real policy documents (policy_document) are kept — those
-- are genuine Amazon policy text, not fake data. Admin config tables are untouched.
delete from case_citation;
delete from connector_query_audit;
delete from evidence_item;
delete from case_record;
delete from audit_event;
delete from communications;
delete from refunds;
delete from fulfillment;
delete from payments;
delete from orders;
