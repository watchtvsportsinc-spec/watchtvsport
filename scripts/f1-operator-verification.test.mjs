import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyOperatorEvidence,operatorSearchHints,shouldEscalate} from './f1-operator-verification.mjs';

test('confirms live operator evidence',()=>{
  const r=classifyOperatorEvidence({text:'Azerbaijan Grand Prix - Practice 1 live on CANAL+SPORT',sessionType:'practice-1',eventSlug:'azerbaijan-practice-1',broadcasterName:'CANAL+',url:'https://example.com'});
  assert.equal(r.status,'confirmed_live');
  assert.equal(shouldEscalate(r),false);
});

test('does not treat absence as confirmed not available',()=>{
  const r=classifyOperatorEvidence({text:'Azerbaijan Grand Prix race live this weekend',sessionType:'practice-1',eventSlug:'azerbaijan-practice-1',broadcasterName:'TSN'});
  assert.equal(r.status,'not_listed');
  assert.equal(shouldEscalate(r),true);
});

test('explicit negative can confirm non availability',()=>{
  const r=classifyOperatorEvidence({text:'Azerbaijan Grand Prix Practice 2 will not be shown live',sessionType:'practice-2',eventSlug:'azerbaijan-practice-2'});
  assert.equal(r.status,'confirmed_not_available');
});

test('builds operator search hint',()=>{
  const h=operatorSearchHints({broadcasterName:'RDS',territoryCode:'CA',eventSlug:'azerbaijan-qualifying',sessionType:'qualifying'});
  assert.match(h.query,/RDS/);
  assert.match(h.query,/azerbaijan/);
  assert.match(h.query,/qualifying/i);
});
