import assert from 'node:assert/strict';
import test from 'node:test';
import {assessSourceConfidence,canSpendResearchBudget,freshnessBand,scoreProviderBenchmark} from './broadcast-source-policy.mjs';

const NOW='2026-09-15T16:00:00Z';

test('official event-level fresh evidence can pass automatically',()=>{
 const r=assessSourceConfidence({sourceClass:'official_broadcaster',evidenceScope:'event',commercialReuseAllowed:true,eventStart:'2026-09-16T16:00:00Z',observedAt:'2026-09-15T12:00:00Z'},{now:NOW});
 assert.equal(r.route,'automatic');
 assert.ok(r.score>=90);
});

test('specialist provider normally goes to review',()=>{
 const r=assessSourceConfidence({sourceClass:'specialist_provider',evidenceScope:'event',commercialReuseAllowed:true,eventStart:'2026-09-18T16:00:00Z',observedAt:'2026-09-15T12:00:00Z'},{now:NOW});
 assert.equal(r.route,'review');
});

test('cross-source conflict never auto-passes',()=>{
 const r=assessSourceConfidence({sourceClass:'official_broadcaster',evidenceScope:'event',commercialReuseAllowed:true,crossSourceConflict:true,eventStart:'2026-09-16T16:00:00Z',observedAt:'2026-09-15T12:00:00Z'},{now:NOW});
 assert.notEqual(r.route,'automatic');
 assert.ok(r.reasons.includes('cross_source_conflict'));
});

test('stale evidence is downgraded',()=>{
 const r=assessSourceConfidence({sourceClass:'official_competition',evidenceScope:'event',commercialReuseAllowed:true,eventStart:'2026-09-16T12:00:00Z',observedAt:'2026-09-10T12:00:00Z'},{now:NOW});
 assert.equal(r.route,'review');
 assert.ok(r.reasons.includes('evidence_stale'));
});

test('freshness bands tighten close to kickoff',()=>{
 assert.equal(freshnessBand('2026-09-16T04:00:00Z',NOW),'imminent');
 assert.equal(freshnessBand('2026-09-20T16:00:00Z',NOW),'near');
 assert.equal(freshnessBand('2026-09-30T16:00:00Z',NOW),'far');
});

test('research budget preserves an imminent-event reserve',()=>{
 const r=canSpendResearchBudget({dailySpentMinor:90,monthlySpentMinor:500,casesToday:10},{estimatedCostMinor:10,band:'near'});
 assert.equal(r.allowed,false);
 assert.equal(r.reason,'imminent_reserve');
});

test('imminent research may use reserved daily budget',()=>{
 const r=canSpendResearchBudget({dailySpentMinor:90,monthlySpentMinor:500,casesToday:10},{estimatedCostMinor:10,band:'imminent'});
 assert.equal(r.allowed,true);
});

test('benchmark score rewards real coverage and correctness',()=>{
 const score=scoreProviderBenchmark({fixtureCoverage:1,broadcastCoverage:.9,territoryCoverage:.8,correctness:.95,accessTypeCoverage:.5,officialUrlCoverage:.8,freshnessReliability:.9,idStability:1});
 assert.ok(score>80&&score<100);
});
