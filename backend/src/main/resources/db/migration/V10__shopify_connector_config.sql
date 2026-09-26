create table shopify_config (
  id boolean primary key default true check (id),
  shop_domain varchar(255) not null,
  access_token varchar(512) not null,
  last_tested_at timestamptz
);
