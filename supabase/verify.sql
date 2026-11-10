-- Run this in the Supabase SQL Editor after the migration. Every row should say ok = true.
select 'row-level security is on' as check_name,
       c.relrowsecurity as ok
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relname = 'sync_units'
union all
select 'a policy limits rows to their owner',
       exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sync_units' and roles = '{authenticated}')
union all
select 'signed-out visitors (anon) have no access',
       not (has_table_privilege('anon', 'public.sync_units', 'select')
         or has_table_privilege('anon', 'public.sync_units', 'insert')
         or has_table_privilege('anon', 'public.sync_units', 'update')
         or has_table_privilege('anon', 'public.sync_units', 'delete'))
union all
select 'signed-in users can read and write',
       has_table_privilege('authenticated', 'public.sync_units', 'select')
   and has_table_privilege('authenticated', 'public.sync_units', 'insert')
   and has_table_privilege('authenticated', 'public.sync_units', 'update')
   and has_table_privilege('authenticated', 'public.sync_units', 'delete')
union all
select 'the server sets updated_at',
       exists (select 1 from pg_trigger where tgrelid = 'public.sync_units'::regclass and tgname = 'sync_units_set_updated_at' and not tgisinternal);
