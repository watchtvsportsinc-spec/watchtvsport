import assert from 'node:assert/strict';
import test from 'node:test';
import {normalizeProviderObservation,providerCapabilityScore,validateProviderObservation} from './broadcast-provider-contract.mjs';

function sample(){return {
 contractVersion:1,
 provider:'sportmonks',
 providerRecordId:'fixture-123:tv-45:fr',
 eventExternalKey:'fixture-123',
 observedAt:'2026-09-15T16:00:00Z',
 territoryCode:'fr',
 broadcasterName:'Example Sports',
 broadcasterUrl:'https://example.com/watch',
 evidenceUrl:'https://example.com/fixture/123',
 accessType:'Paid',
 broadcastType:'live',
 evidenceScope:'event',
 sourceClass:'specialist_provider',
 languageCodes:['fr','fr'],
 requiresAccount:true,
 isFreeTrial:false,
 providerConfidence:0.95,
};}

test('accepts normalized provider observations',()=>{
 const result=validateProviderObservation(sample());
 assert.equal(result.ok,true);
 assert.deepEqual(result.issues,[]);
});

test('normalizes without leaking provider schema into review candidate',()=>{
 const result=normalizeProviderObservation(sample(),{resolved:{broadcasterId:'11111111-1111-1111-1111-111111111111',territoryId:'22222222-2222-2222-2222-222222222222'}});
 assert.equal(result.ok,true);
 assert.equal(result.observation.territoryCode,'FR');
 assert.deepEqual(result.observation.languageCodes,['fr']);
 assert.equal(result.candidate.source_name,'sportmonks');
 assert.equal(result.candidate.evidence_scope,'event');
 assert.equal(result.candidate.broadcaster_id,'11111111-1111-1111-1111-111111111111');
});

test('unresolved internal ids remain null for review routing',()=>{
 const result=normalizeProviderObservation(sample());
 assert.equal(result.ok,true);
 assert.equal(result.candidate.broadcaster_id,null);
 assert.equal(result.candidate.territory_id,null);
});

test('rejects unsafe evidence URLs and invalid confidence',()=>{
 const value=sample();
 value.evidenceUrl='http://example.com';
 value.providerConfidence=2;
 const result=validateProviderObservation(value);
 assert.equal(result.ok,false);
 assert.ok(result.issues.includes('evidence_url_invalid'));
 assert.ok(result.issues.includes('provider_confidence_invalid'));
});

test('scores suppliers by WatchTVSport-relevant capabilities',()=>{
 assert.equal(providerCapabilityScore({fixtures:true,territories:true,eventBroadcasters:true,officialUrls:true,accessType:true,nearLiveFreshness:true,commercialReuse:true,stableIds:true}),100);
 assert.equal(providerCapabilityScore({fixtures:true,stableIds:true}),20);
});
