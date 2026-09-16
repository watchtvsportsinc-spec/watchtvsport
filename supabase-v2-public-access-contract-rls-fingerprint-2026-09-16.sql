begin;

create or replace function public.get_public_access_contract_hash_v1()
returns text
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  with roles(role_name) as (
    values ('anon'::text), ('authenticated'::text)
  ), relation_surface as (
    select
      roles.role_name,
      c.oid as relation_oid,
      format(
        'role=%s|relation|%s|select=%s|insert=%s|update=%s|delete=%s|rls=%s|force_rls=%s',
        roles.role_name,
        c.relname,
        has_any_column_privilege(roles.role_name, c.oid, 'SELECT'),
        has_any_column_privilege(roles.role_name, c.oid, 'INSERT'),
        has_any_column_privilege(roles.role_name, c.oid, 'UPDATE'),
        has_table_privilege(roles.role_name, c.oid, 'DELETE'),
        c.relrowsecurity,
        c.relforcerowsecurity
      ) as item
    from roles
    cross join pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r','v','m','p')
      and (
        has_any_column_privilege(roles.role_name, c.oid, 'SELECT')
        or has_any_column_privilege(roles.role_name, c.oid, 'INSERT')
        or has_any_column_privilege(roles.role_name, c.oid, 'UPDATE')
        or has_table_privilege(roles.role_name, c.oid, 'DELETE')
      )
  ), policy_surface as (
    select format(
      'role=%s|policy|%s|%s|cmd=%s|roles=%s|qual=%s|check=%s',
      relation_surface.role_name,
      c.relname,
      p.polname,
      p.polcmd,
      coalesce((
        select string_agg(
          case when role_oid = 0 then 'public' else pg_get_userbyid(role_oid) end,
          ',' order by case when role_oid = 0 then 'public' else pg_get_userbyid(role_oid) end
        )
        from unnest(p.polroles) as role_oid
      ), ''),
      coalesce(pg_get_expr(p.polqual, p.polrelid), ''),
      coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '')
    ) as item
    from relation_surface
    join pg_policy p on p.polrelid = relation_surface.relation_oid
    join pg_class c on c.oid = p.polrelid
  ), function_surface as (
    select format(
      'role=%s|function|%s|%s|security_definer=%s|config=%s',
      roles.role_name,
      p.proname,
      pg_get_function_identity_arguments(p.oid),
      p.prosecdef,
      coalesce(array_to_string(p.proconfig, ','), '')
    ) as item
    from roles
    cross join pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prorettype <> 'trigger'::regtype
      and has_function_privilege(roles.role_name, p.oid, 'EXECUTE')
  ), surface as (
    select item from relation_surface
    union all
    select item from policy_surface
    union all
    select item from function_surface
  )
  select md5(coalesce(string_agg(item, E'\n' order by item), ''))
  from surface;
$$;

revoke all on function public.get_public_access_contract_hash_v1() from public;
grant execute on function public.get_public_access_contract_hash_v1() to anon, authenticated;

comment on function public.get_public_access_contract_hash_v1() is
  'Returns a non-sensitive fingerprint of anon/authenticated public-schema privileges, RLS policies, and executable RPC security settings for CI regression detection.';

commit;
