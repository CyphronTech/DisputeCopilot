-- Many schemas keep customers in their own table, linked from orders by an id. The orders
-- mapping records that linking column; the lookup-only "customers" mapping says where the
-- name and email live.
alter table table_role_mapping add column customer_id_column varchar(128);
