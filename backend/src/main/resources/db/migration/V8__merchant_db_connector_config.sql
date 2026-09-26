create table merchant_db_config (
  id boolean primary key default true check (id),
  host varchar(255) not null,
  port integer not null,
  database_name varchar(255) not null,
  username varchar(255) not null,
  password varchar(512),
  driver varchar(32) not null default 'postgresql',
  last_tested_at timestamptz
);

create table table_allowlist_entry (
  table_name varchar(64) not null,
  column_name varchar(64) not null,
  primary key (table_name, column_name)
);
