-- Recipes now carry step-by-step instructions (about 2 KB each), and the whole recipe book syncs as ONE record. The
-- old 256 KB limit would have been reached after roughly 120 recipes, and syncing would then fail. This raises the
-- limit to 2 MB. The app itself keeps the recipe book to 300 recipes, which fits comfortably under that.
--
-- Safe to run more than once. Existing rows are small, so adding the new check is instant.

alter table public.sync_units drop constraint if exists sync_units_value_check;
alter table public.sync_units
  add constraint sync_units_value_check check (octet_length(value::text) <= 2097152);
