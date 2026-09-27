-- The single admin login, set by the merchant on first run (replaces the shared built-in
-- admin@disputecopilot.local / changeme every install used to ship with). One row at most.
create table admin_account (
  id boolean primary key default true check (id),
  email text not null,
  password_hash text not null,
  updated_at timestamptz not null default now()
);
