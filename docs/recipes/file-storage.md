# File storage

Read `PRODUCTION.md` before choosing local disk, S3-compatible storage, or another provider. Determine durability, public/private access, signed URLs, retention, deletion, backup, and multi-server behavior. Do not add a provider to the generic foundation without a deployment requirement.

Validate MIME, extension, size, and relevant image dimensions. Generate safe filenames, distrust original paths/names, store outside executable locations, and treat SVG as active content. Authorize download/delete operations and test rejected files plus cleanup on failed transactions.
