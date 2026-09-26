-- The original fixture demo cases (seeded in V1/V3/V6) were created before the evidence
-- description format was cleaned up (humanized "Key: value" instead of raw "key=value"), and
-- that text is stored once at case-creation time — the code fix doesn't retroactively fix it.
-- Deleting these lets "New investigation" regenerate them with the current, correct format.
delete from case_citation where case_id in (
  select id from case_record where order_id in
  ('ORD-2026-1042','ORD-2026-2001','ORD-2026-2002','ORD-2026-2003',
   'ORD-2026-3001','ORD-2026-3002','ORD-2026-3003','ORD-2026-3004','ORD-2026-3005'));
delete from connector_query_audit where case_id in (
  select id from case_record where order_id in
  ('ORD-2026-1042','ORD-2026-2001','ORD-2026-2002','ORD-2026-2003',
   'ORD-2026-3001','ORD-2026-3002','ORD-2026-3003','ORD-2026-3004','ORD-2026-3005'));
delete from evidence_item where case_id in (
  select id from case_record where order_id in
  ('ORD-2026-1042','ORD-2026-2001','ORD-2026-2002','ORD-2026-2003',
   'ORD-2026-3001','ORD-2026-3002','ORD-2026-3003','ORD-2026-3004','ORD-2026-3005'));
delete from case_record where order_id in
  ('ORD-2026-1042','ORD-2026-2001','ORD-2026-2002','ORD-2026-2003',
   'ORD-2026-3001','ORD-2026-3002','ORD-2026-3003','ORD-2026-3004','ORD-2026-3005');
