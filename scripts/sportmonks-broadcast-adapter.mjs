import {BROADCAST_PROVIDER_CONTRACT_VERSION,validateProviderObservation} from './broadcast-provider-contract.mjs';

export const SPORTMONKS_PROVIDER='sportmonks';
export const SPORTMONKS_SOURCE_CLASS='specialist_provider';

function text(v){return typeof v==='string'&&v.trim()?v.trim():null;}
function numberId(v){return Number.isInteger(Number(v))&&Number(v)>0?String(v):null;}
function isoObservedAt(value){const d=value?new Date(value):new Date();return Number.isFinite(d.getTime())?d.toISOString():new Date().toISOString();}
function fixtureRows(payload){
  const data=payload?.data;
  if(Array.isArray(data)) return data;
  if(data&&typeof data==='object') return [data];
  return [];
}
function tvRows(fixture){
  const value=fixture?.tvstations??fixture?.tvStations??fixture?.tv_stations;
  return Array.isArray(value)?value:[];
}
function stationFrom(row){return row?.tvstation??row?.tvStation??row?.station??row;}
function countryFrom(row){return row?.country??row?.territory??null;}

export function sportmonksRequestPlan({fixtureId,startDate,endDate,leagueId,countryId}={}){
  if(fixtureId){
    return {
      method:'GET',
      path:`/v3/football/fixtures/${encodeURIComponent(String(fixtureId))}`,
      query:{include:'tvstations.tvstation;tvstations.country'},
      authentication:'bearer_or_api_token_server_side',
    };
  }
  if(startDate&&endDate){
    const filters=[];
    if(leagueId) filters.push(`fixtureLeagues:${leagueId}`);
    if(countryId) filters.push(`fixturetvstationcountries:${countryId}`);
    return {
      method:'GET',
      path:`/v3/football/fixtures/between/${encodeURIComponent(startDate)}/${encodeURIComponent(endDate)}`,
      query:{include:'tvstations.tvstation;tvstations.country',...(filters.length?{filters:filters.join(';')}:{})},
      authentication:'bearer_or_api_token_server_side',
    };
  }
  throw new TypeError('fixtureId or startDate/endDate required');
}

export async function adaptSportmonksFixtureBroadcasts(payload,{
  observedAt,
  resolveTerritoryCode,
  classifyAccess,
  resolveBroadcasterUrl,
  providerConfidence,
}={}){
  if(typeof resolveTerritoryCode!=='function') throw new TypeError('resolveTerritoryCode function required');
  const observations=[];
  const rejected=[];

  for(const fixture of fixtureRows(payload)){
    const fixtureId=numberId(fixture?.id);
    if(!fixtureId){rejected.push({reason:'fixture_id_missing',raw:fixture});continue;}
    for(const relation of tvRows(fixture)){
      const station=stationFrom(relation);
      const country=countryFrom(relation);
      const stationId=numberId(station?.id??relation?.tvstation_id??relation?.tv_station_id);
      const stationName=text(station?.name??relation?.name);
      const countryId=numberId(country?.id??relation?.country_id);
      const countryName=text(country?.name);
      if(!stationId||!stationName||!countryId){
        rejected.push({reason:'broadcast_relation_incomplete',fixtureId,raw:relation});
        continue;
      }
      const territoryCode=await resolveTerritoryCode({provider:SPORTMONKS_PROVIDER,countryId,countryName,rawCountry:country});
      if(!text(territoryCode)){
        rejected.push({reason:'territory_unresolved',fixtureId,stationId,countryId,countryName});
        continue;
      }
      const broadcasterUrl=typeof resolveBroadcasterUrl==='function'
        ? await resolveBroadcasterUrl({provider:SPORTMONKS_PROVIDER,stationId,stationName,rawStation:station})
        : text(station?.url);
      const access=typeof classifyAccess==='function'
        ? await classifyAccess({provider:SPORTMONKS_PROVIDER,stationId,stationName,territoryCode:String(territoryCode).toUpperCase(),rawStation:station})
        : null;
      const accessType=['Free','Paid','Unknown'].includes(access?.accessType)?access.accessType:'Unknown';
      const observation={
        contractVersion:BROADCAST_PROVIDER_CONTRACT_VERSION,
        provider:SPORTMONKS_PROVIDER,
        providerRecordId:`fixture:${fixtureId}:station:${stationId}:country:${countryId}`,
        eventExternalKey:`sportmonks:fixture:${fixtureId}`,
        observedAt:isoObservedAt(observedAt),
        territoryCode:String(territoryCode).toUpperCase(),
        broadcasterName:stationName,
        broadcasterUrl:broadcasterUrl||null,
        evidenceUrl:broadcasterUrl||null,
        accessType,
        broadcastType:'live',
        evidenceScope:'event',
        sourceClass:SPORTMONKS_SOURCE_CLASS,
        languageCodes:Array.isArray(access?.languageCodes)?access.languageCodes:[],
        requiresAccount:access?.requiresAccount===true,
        isFreeTrial:access?.isFreeTrial===true,
        providerConfidence:typeof providerConfidence==='number'?providerConfidence:null,
        rawFingerprint:`sportmonks:${fixtureId}:${stationId}:${countryId}`,
      };
      const checked=validateProviderObservation(observation);
      if(!checked.ok){rejected.push({reason:'contract_invalid',issues:checked.issues,fixtureId,stationId,countryId});continue;}
      observations.push({
        observation,
        sourceMeta:{fixtureId,leagueId:numberId(fixture?.league_id),seasonId:numberId(fixture?.season_id),stationId,countryId,countryName,stationImage:text(station?.image_path)},
      });
    }
  }
  return {provider:SPORTMONKS_PROVIDER,observations,rejected};
}
