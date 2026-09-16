import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(new URL('../supabase-v2-broadcast-channel-resolution.sql', import.meta.url), 'utf8');

test('auto full rights remain rights-holder only', () => {
  assert.match(sql, /channel_resolution_status='holder_only'/);
  assert.match(sql, /platform_id=null/);
  assert.match(sql, /Exact event channel\/feed not yet resolved/);
});

test('exact event channels require event-level evidence', () => {
  assert.match(sql, /channel_resolution_status <> 'event_confirmed'/);
  assert.match(sql, /channel_source_name/);
  assert.match(sql, /channel_source_url/);
  assert.match(sql, /channel_external_id/);
});

test('exact confirmed channel suppresses generic holder fallback', () => {
  assert.match(sql, /channel_resolution_status in \('event_confirmed','manual_confirmed'\)/);
  assert.match(sql, /reconcile_event_channel_resolution_v1/);
  assert.match(sql, /propagation_origin='auto_right'/);
});

test('exact platform must belong to the selected broadcaster', () => {
  assert.match(sql, /Exact channel platform belongs to a different broadcaster/);
});
