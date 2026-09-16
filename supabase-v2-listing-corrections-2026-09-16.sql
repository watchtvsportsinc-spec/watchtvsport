begin;

create table if not exists public.listing_corrections (
  id uuid primary key default gen_random_uuid(),
  page_url text not null check (char_length(page_url) between 1 and 1000),
  message text not null check (char_length(message) between 10 and 4000),
  reporter_email text null check (reporter_email is null or char_length(reporter_email) <= 320),
  status text not null default 'pending' check (status in ('pending','reviewing','resolved','rejected')),
  created_at timestamptz not null default now()
);

alter table public.listing_corrections enable row level security;

-- Visitors may submit corrections, but public roles cannot read, update or delete them.
drop policy if exists listing_corrections_public_insert on public.listing_corrections;
create policy listing_corrections_public_insert
on public.listing_corrections
for insert
to anon, authenticated
with check (status = 'pending');

revoke all on public.listing_corrections from public;
grant insert (page_url, message, reporter_email, status) on public.listing_corrections to anon, authenticated;

commit;
