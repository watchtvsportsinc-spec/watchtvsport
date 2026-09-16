import assert from 'node:assert/strict';
import test from 'node:test';
import {f1RacePageUrl,f1RaceSlugFromEventSlug,normalizeF1BroadcasterSnapshot,f1VerificationCadence} from './f1-official-reference.mjs';

test('maps session slugs to the official race page',()=>{
 assert.equal(f1RaceSlugFromEventSlug('singapore-sprint'),'singapore');
 assert.equal(f1RaceSlugFromEventSlug('united-states-qualifying'),'united-states');
 assert.equal(f1RacePageUrl('bahrain-race',2026),'https://www.formula1.com/en/racing/2026/bahrain');
});

test('official broadcaster list stays competition-level unless coverage is proven full',()=>{
 const rows=normalizeF1BroadcasterSnapshot({observedAt:'2026-09-16T16:00:00Z',territories:[{code:'ca',broadcasters:[{name:'TSN'},{name:'RDS',coverageType:'full',accessType:'Paid'}]}]});
 assert.equal(rows.length,2);
 assert.equal(rows[0].evidenceScope,'competition');
 assert.equal(rows[0].requiresSessionVerification,true);
 assert.equal(rows[1].requiresSessionVerification,false);
 assert.equal(rows.every(x=>x.publishable===false),true);
});

test('verification tightens close to an event',()=>{
 assert.deepEqual(f1VerificationCadence({eventStart:'2026-09-17T10:00:00Z',now:'2026-09-16T16:00:00Z'}),{scheduleHours:3,broadcastHours:6});
 assert.deepEqual(f1VerificationCadence({eventStart:'2026-09-20T16:00:00Z',now:'2026-09-16T16:00:00Z'}),{scheduleHours:12,broadcastHours:24});
});
