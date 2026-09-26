create table case_citation (
  id uuid primary key,
  case_id uuid not null references case_record(id),
  document_id uuid not null references policy_document(id),
  title varchar(255) not null,
  version varchar(32) not null,
  quote text not null
);
