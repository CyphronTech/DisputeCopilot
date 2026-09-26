alter table case_record add column recommendation varchar(32);
alter table case_record add column confidence double precision;
alter table case_record add column caveat text;

-- Single-row table: one model provider configuration per deployment.
create table model_config (
  id boolean primary key default true check (id),
  provider varchar(16) not null,
  base_url varchar(255) not null,
  api_key varchar(512),
  model varchar(128) not null,
  last_tested_at timestamptz
);
