create table table_role_mapping (
  role varchar(32) primary key,
  table_name varchar(128) not null,
  order_id_column varchar(128) not null
);
