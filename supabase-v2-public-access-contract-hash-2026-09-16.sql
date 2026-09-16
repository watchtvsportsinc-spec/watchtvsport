begin;

create or replace function public.get_public_access_contract_hash_v1()
returns text
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  with relation_surface as (
    select format(
      'relation|%s|select=%s|insert=%s|update=%s|delete=%s',
      c.relname,
      has_any_column_privilege(current_user, c.oid, 'SELECT'),
      has_any_column_privilege(current_user, c.oid, 'INSERT'),
      has_any_column_privilege(current_user, c.oid, 'UPDATE'),
      has_table_privilege(current_user, c.oid, 'DELETE')
    ) as item
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r','v','m','p')
      and (
        has_any_column_privilege(current_user, c.oid, 'SELECT')
        or has_any_column_privilege(current_user, c.oid, 'INSERT')
        or has_any_column_privilege(current_user, c.oid, 'UPDATE')
        or has_table_privilege(current_user, c.oid, 'DELETE')
      )
  ), function_surface as (
    select format(
      'function|%s|%s',
      p.proname,
      pg_get_function_identity_arguments(p.oid)
    ) as item
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prorettype <> 'trigger'::regtype
      and has_function_privilege(current_user, p.oid, 'EXECUTE')
  ), surface as (
    select item from relation_surface
    union all
    select item from function_surface
  )
  select md5(coalesce(string_agg(item, E'\n' order by item), ''))
  from surface;
$$;

revoke all on function public.get_public_access_contract_hash_v1() from public;
grant execute on function public.get_public_access_contract_hash_v1() to anon, authenticated;

comment on function public.get_public_access_contract_hash_v1() is
  'Returns a non-sensitive fingerprint of the caller public-schema privilege surface for CI regression detection.';

commit;
