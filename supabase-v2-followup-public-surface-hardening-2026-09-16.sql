-- Follow-up hardening after post-audit feature migrations.
-- Keep newly introduced public media data read-only and trigger helpers internal.

revoke insert, update, delete, truncate, references, trigger
on table public.entity_media_assets
from anon, authenticated;

revoke execute on function public.trg_sync_broadcast_right_v1()
from public, anon, authenticated;

revoke execute on function public.trg_sync_event_broadcast_rights_v1()
from public, anon, authenticated;
