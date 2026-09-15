import assert from 'node:assert/strict';
import test from 'node:test';
import {ingestProviderObservation} from './broadcast-ingestion-adapter.mjs';

const id=n=>`${String(n).padStart(8,'0')}-0000-4000-8000-000000000001`;
const observation=()=>({
  contractVersion:1,
  provider:'TestProvider',
  providerRecordId:'rec-1',
  eventExternalKey:'match-1',
  observedAt:'2026-09-15T12:00:00Z',
  territoryCode:'CA',
  broadcasterName:'TSN',
  broadcasterUrl:'https://example.com/watch',
  evidenceUrl:'https://example.com/schedule/match-1',
  accessType:'Paid',
  broadcastType:'live',
  evidenceScope:'event',
  sourceClass:'specialist_provider',
  providerConfidence:.99,
});

function deps(level='trusted',auditRate=0){
  return {
    resolveEvent:async()=>({id:id(1),title:'Toronto vs Montreal',startsAt:'2026-09-20T18:00:00Z',competitionId:id(2),competitionKey:'test-league',competitionName:'Test League'}),
    resolveTerritory:async()=>({id:id(3),code:'CA'}),
    resolveBroadcaster:async()=>({id:id(4),name:'TSN'}),
    loadSourcePolicy:async()=>({id:id(5),is_enabled:true,automatic_collection_enabled:true,reuse_status:'approved',commercial_use_allowed:true}),
    lookupTrust:async()=>({level,auditRate,profileFound:true}),
    findPublishedBroadcast:async()=>null,
    enqueueReview:async()=>id(6),
    now:new Date('2026-09-15T13:00:00Z'),
  };
}

test('trusted clean observation follows automatic path without publication side effect',async()=>{
  const r=await ingestProviderObservation(observation(),deps('trusted',0));
  assert.equal(r.disposition,'automatic');
  assert.equal(r.reviewCaseId,null);
  assert.equal(r.candidate.access_type,'Paid');
});

test('probation provider is routed to review',async()=>{
  const r=await ingestProviderObservation(observation(),deps('probation',1));
  assert.equal(r.disposition,'review');
  assert.equal(r.reviewCaseId,id(6));
  assert.ok(r.assessment.reasons.includes('provider_probation'));
});

test('suspended provider is blocked',async()=>{
  const r=await ingestProviderObservation(observation(),deps('suspended',1));
  assert.equal(r.disposition,'blocked');
  assert.ok(r.assessment.reasons.includes('provider_suspended'));
});

test('invalid provider payload never reaches routing',async()=>{
  const bad=observation(); delete bad.territoryCode;
  const r=await ingestProviderObservation(bad,deps());
  assert.equal(r.disposition,'invalid');
  assert.ok(r.issues.includes('territory_code_invalid'));
});

test('unresolved event is blocked, not sent to human queue',async()=>{
  const d=deps(); d.resolveEvent=async()=>null;
  const r=await ingestProviderObservation(observation(),d);
  assert.equal(r.disposition,'blocked');
  assert.ok(r.assessment.reasons.includes('event_unresolved'));
});
