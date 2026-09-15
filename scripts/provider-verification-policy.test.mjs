import assert from 'node:assert/strict';
import test from 'node:test';
import {providerVerificationLevel,mustDoubleCheck} from './provider-verification-policy.mjs';

test('trusted provider can avoid routine second check',()=>{
 const r=providerVerificationLevel({audits:150,accuracy:.99,freshness:.97,reuseAllowed:true});
 assert.equal(r.level,'trusted');
 assert.equal(mustDoubleCheck({level:r.level}),false);
});

test('conflict still requires second check',()=>{
 assert.equal(mustDoubleCheck({level:'trusted',hasConflict:true}),true);
});
