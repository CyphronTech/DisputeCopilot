-- V4 seeded 5 real Amazon policy documents as reference/demo content. They were manually
-- deleted from the dev database directly (not as a migration), so any fresh database — like a
-- newly packaged install's embedded Postgres, which runs every migration from scratch — still
-- got them back. This closes that gap the same way V15 did for fake orders/cases.
delete from policy_document;
