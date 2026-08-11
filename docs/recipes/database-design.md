# Database design

Before creating a table, identify its entity, primary identity, relationships, uniqueness, nullability, query patterns, indexes, delete behavior, lifecycle/recovery, historical snapshots, transaction needs, money representation, stable statuses, and likely N+1 paths.

Use foreign keys for real dependencies. Enforce critical uniqueness in validation and the database. Index actual filters, joins, sorts, and uniqueness—not every column. Choose cascade, restrict, set null, soft delete, or hard delete intentionally. Use fixed monetary representations, transactions for one logical multi-write operation, and snapshot values that must retain historical meaning. Eager load only serialized relations.
