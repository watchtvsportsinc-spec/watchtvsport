import assert from 'node:assert/strict';
import test from 'node:test';
import {adaptSportmonksFixtureBroadcasts,sportmonksRequestPlan} from './sportmonks-broadcast-adapter.mjs';

const payload={data:{id:19134527,league_id:8,season_id:23614,tvstations:[
 {tvstation:{id:101,name:'Canal+ Foot',url:'https://www.canalplus.com/'},country:{id:17,name:'France'}},
 {tvstation:{id:202,name:'Sky Sports Premier League'},country:{id:462,name:'England'}},
]}};

test('builds a fixture request with TV station and country includes',()=>{
 const plan=sportmonksRequestPlan({fixtureId:19134527});
 assert.equal(plan.path,'/v3/football/fixtures/19134527');
 assert.match(plan.query.include,/tvstations\.tvstation/);
 assert.match(plan.query.include,/tvstations\.country/);
 assert.equal(plan.authentication,'bearer_or_api_token_server_side');
});

test('normalizes Sportmonks fixture broadcaster relations into provider contract',async()=>{
 const out=await adaptSportmonksFixtureBroadcasts(payload,{
  observedAt:'2026-09-15T18:00:00Z',
  resolveTerritoryCode:async({countryName})=>countryName==='France'?'FR':'GB',
  classifyAccess:async({territoryCode})=>territoryCode==='FR'?{accessType:'Paid',requiresAccount:true}:{accessType:'Paid'},
 });
 assert.equal(out.rejected.length,0);
 assert.equal(out.observations.length,2);
 const fr=out.observations[0].observation;
 assert.equal(fr.provider,'sportmonks');
 assert.equal(fr.eventExternalKey,'sportmonks:fixture:19134527');
 assert.equal(fr.territoryCode,'FR');
 assert.equal(fr.broadcasterName,'Canal+ Foot');
 assert.equal(fr.accessType,'Paid');
 assert.equal(fr.evidenceScope,'event');
 assert.equal(fr.sourceClass,'specialist_provider');
});

test('does not invent free or paid access when Sportmonks does not provide it',async()=>{
 const out=await adaptSportmonksFixtureBroadcasts(payload,{
  observedAt:'2026-09-15T18:00:00Z',
  resolveTerritoryCode:async({countryName})=>countryName==='France'?'FR':'GB',
 });
 assert.equal(out.observations[0].observation.accessType,'Unknown');
 assert.equal(out.observations[1].observation.accessType,'Unknown');
});

test('unresolved countries are rejected before entering the common pipeline',async()=>{
 const out=await adaptSportmonksFixtureBroadcasts(payload,{
  resolveTerritoryCode:async()=>null,
 });
 assert.equal(out.observations.length,0);
 assert.equal(out.rejected.length,2);
 assert.equal(out.rejected[0].reason,'territory_unresolved');
});

test('date-range request can filter league and broadcaster country',()=>{
 const plan=sportmonksRequestPlan({startDate:'2026-09-15',endDate:'2026-09-22',leagueId:8,countryId:462});
 assert.equal(plan.path,'/v3/football/fixtures/between/2026-09-15/2026-09-22');
 assert.match(plan.query.filters,/fixtureLeagues:8/);
 assert.match(plan.query.filters,/fixturetvstationcountries:462/);
});
