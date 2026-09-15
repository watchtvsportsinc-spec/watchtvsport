import assert from 'node:assert/strict';
import test from 'node:test';
import {evaluateTrustState,recordAudit,shouldAudit,summarizeAuditHistory,trustKey} from './provider-trust-learning.mjs';

test('trust is scoped by provider competition and territory',()=>{
 assert.equal(trustKey({provider:'Sportmonks',competitionKey:'EPL',territoryCode:'fr'}),'sportmonks::epl::FR');
});

test('probation is default until enough audits exist',()=>{
 const r=evaluateTrustState({audits:50,accuracy:1,recentAudits:50,recentAccuracy:1,criticalErrors:0});
 assert.equal(r.level,'probation');
 assert.equal(r.auditRate,1);
});

test('trusted requires one hundred strong audits',()=>{
 const r=evaluateTrustState({audits:120,accuracy:.99,recentAudits:50,recentAccuracy:.99,criticalErrors:0});
 assert.equal(r.level,'trusted');
 assert.equal(r.auditRate,.10);
});

test('elite requires deeper history',()=>{
 const r=evaluateTrustState({audits:350,accuracy:.997,recentAudits:50,recentAccuracy:1,criticalErrors:0});
 assert.equal(r.level,'elite');
 assert.equal(r.auditRate,.02);
});

test('critical error immediately downgrades to watch',()=>{
 const r=evaluateTrustState({audits:400,accuracy:.999,recentAudits:50,recentAccuracy:1,criticalErrors:1});
 assert.equal(r.level,'watch');
});

test('commercial reuse block suspends automatic trust',()=>{
 const r=evaluateTrustState({audits:400,accuracy:1,recentAudits:50,recentAccuracy:1,criticalErrors:0},{commercialReuseAllowed:false});
 assert.equal(r.level,'suspended');
});

test('audit history computes global and recent accuracy',()=>{
 const rows=[];
 for(let i=0;i<60;i++) rows.push({correct:i!==0,auditedAt:new Date(Date.UTC(2026,8,15,12,0,i)).toISOString()});
 const s=summarizeAuditHistory(rows,{recentLimit:50});
 assert.equal(s.audits,60);
 assert.equal(s.correct,59);
 assert.equal(s.recentAudits,50);
 assert.equal(s.recentAccuracy,1);
});

test('recording an audit updates counters deterministically',()=>{
 const n=recordAudit({audits:9,correct:9,criticalErrors:0},{correct:false,critical:true});
 assert.equal(n.audits,10);
 assert.equal(n.correct,9);
 assert.equal(n.criticalErrors,1);
 assert.equal(n.accuracy,.9);
});

test('trusted sampling is deterministic for the same candidate',()=>{
 const state={level:'trusted',auditRate:.10};
 assert.equal(shouldAudit(state,'sportmonks:epl:fr:fixture-42'),shouldAudit(state,'sportmonks:epl:fr:fixture-42'));
});

test('watch and probation always audit',()=>{
 assert.equal(shouldAudit({level:'watch',auditRate:.5},'x'),true);
 assert.equal(shouldAudit({level:'probation',auditRate:1},'x'),true);
});
