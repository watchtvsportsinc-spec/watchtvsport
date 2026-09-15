import assert from 'node:assert/strict';
import test from 'node:test';
import {routeBroadcastWithTrust} from './broadcast-routing-with-trust.mjs';
const id=n=>`${String(n).padStart(8,'0')}-0000-4000-8000-000000000001`;
function input(){return {eventId:id(1),competitionId:id(9),competition:'Test League',competitionKey:'test-league',territoryCode:'CA',provider:'test-provider',eventStart:'2026-09-20T18:00:00Z',sourceObservedAt:'2026-09-15T12:00:00Z',sourceId:id(2),importItemId:id(3),sourcePolicy:{is_enabled:true,automatic_collection_enabled:true,reuse_status:'approved',commercial_use_allowed:true},candidate:{broadcaster_id:id(4),territory_id:id(5),access_type:'Paid',broadcast_type:'live',evidence_scope:'event',source_url:'https://example.ca/schedule/match',official_url:'https://example.ca/watch'}};}
const NOW=new Date('2026-09-15T13:00:00Z');
test('missing trust profile defaults to probation review',async()=>{const r=await routeBroadcastWithTrust(input(),{lookupTrust:async()=>null,now:NOW});assert.equal(r.providerTrust.level,'probation');assert.equal(r.assessment.route,'review');});
test('trusted profile can flow automatically when audit rate is zero',async()=>{const r=await routeBroadcastWithTrust(input(),{lookupTrust:async()=>({level:'trusted',auditRate:0,profileFound:true}),now:NOW});assert.equal(r.assessment.route,'automatic');assert.equal(r.reviewException,null);});
test('watch profile routes to review exception',async()=>{const r=await routeBroadcastWithTrust(input(),{lookupTrust:async()=>({level:'watch',auditRate:.5,profileFound:true}),now:NOW});assert.equal(r.assessment.route,'review');assert.ok(r.reviewException);});
test('suspended profile blocks without creating human review case',async()=>{const r=await routeBroadcastWithTrust(input(),{lookupTrust:async()=>({level:'suspended',auditRate:1,profileFound:true}),now:NOW});assert.equal(r.assessment.route,'blocked');assert.equal(r.reviewException,null);});
