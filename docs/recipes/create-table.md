# Create a data table

Start from user tasks and expected queries. Define columns, mobile behavior, loading/empty/error states, pagination, search, filters, sort allowlists, row actions, and accessible names before implementation. Default to 10 rows; support 10/25/50/100 and cap at 100.

Use Laravel pagination and return pagination metadata in the envelope. Never accept arbitrary sort columns. Avoid loading all records client-side merely to filter. Confirm destructive row actions and keep routine navigation immediate.
