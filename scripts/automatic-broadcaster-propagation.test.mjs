import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const root=process.cwd();
const sql=fs.readFileSync(path.join(root,'supabase-v2-automatic-broadcaster-propagation.sql'),'utf8');
const dataPolicy=fs.readFileSync(path.join(root,'docs/data-sources.md'),'utf8');
const publicEvents=fs.readFileSync(path.join(root,'lib/public-events.ts'),'utf8');

test('broadcast rights default to manual propagation',()=>{
  assert.match(sql,/propagation_mode text not null default 'manual'/);
  assert.match(sql,/propagation_mode in \('manual','auto_full','paused','blocked'\)/);
});

test('auto propagation is restricted to approved confirmed full coverage',()=>{
  assert.match(sql,/coverage_type = 'full'/);
  assert.match(sql,/verification_status = 'confirmed'/);
  assert.match(sql,/propagation_approved_at is not null/);
  assert.match(sql,/propagation_approved_by/);
  assert.match(sql,/access_type in \('Free','Paid'\)/);
});

test('partial and unknown rights cannot be fanned out by auto_full',()=>{
  assert.match(sql,/broadcast_rights_auto_full_requires_approval/);
  assert.match(dataPolicy,/competition-level broadcast right does not prove that\s+every event or session is carried/i);
});

test('manual event corrections can lock out future propagation',()=>{
  assert.match(sql,/propagation_locked boolean not null default false/);
  assert.match(sql,/propagation_locked=false/g);
  assert.match(sql,/legacy_linked_right/);
});

test('new and changed events resync eligible rights automatically',()=>{
  assert.match(sql,/trg_event_auto_broadcast_rights_v1/);
  assert.match(sql,/sync_event_broadcast_rights_v1/);
  assert.match(sql,/after insert or update of competition_id,season_id,event_date,scheduled_date,status,verification_status,is_published/i);
});

test('right changes can propagate or withdraw generated offers',()=>{
  assert.match(sql,/trg_broadcast_right_auto_propagation_v1/);
  assert.match(sql,/sync_broadcast_right_v1/);
  assert.match(sql,/verification_status='to_update'/);
  assert.match(sql,/is_published=false/);
});

test('automation uses idempotent event offer upsert',()=>{
  assert.match(sql,/on conflict on constraint uq_event_broadcasts_offer do update/i);
  assert.match(sql,/propagation_origin='auto_right'/);
});

test('public pages keep reading confirmed published event offers',()=>{
  assert.match(publicEvents,/get_public_events_filtered_v1/);
  assert.match(sql,/event_broadcasts/);
});

test('propagation controls are service-role only',()=>{
  assert.match(sql,/revoke all on function public\.set_broadcast_right_propagation_v1\(uuid,text,text\) from public,anon,authenticated/);
  assert.match(sql,/grant execute on function public\.set_broadcast_right_propagation_v1\(uuid,text,text\) to service_role/);
});
