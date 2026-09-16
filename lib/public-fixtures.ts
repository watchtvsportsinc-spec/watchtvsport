import "server-only";

import { cache } from "react";

const REQUEST_TIMEOUT_MS = 8_000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
type Row = Record<string, unknown>;

export type FixtureParticipant = { id:string; slug:string; name:string; shortName?:string; type:"club"; countryCode?:string };
export type PublicFixture = {
  pageId:string; pageSlug:string; detailPath:string; title:string; sport:string; competition:string; competitionSlug:string;
  seasonLabel?:string; matchweek?:number; windowStart?:string; windowEnd?:string;
  scheduleStatus:"schedule_pending"|"schedule_confirmed"; status?:string; eventId?:string; eventSlug?:string; exactDate?:string; venue?:string;
  participant1:FixtureParticipant; participant2:FixtureParticipant;
};

function config(){
  const url=(process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||"").replace(/\/$/,"");
  const key=process.env.SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_ANON_KEY||"";
  if(!url||!key)throw new Error("Supabase public fixture configuration is missing");
  return{url,key};
}
function text(value:unknown){return typeof value==="string"&&value.trim()?value.trim():undefined;}
function integer(value:unknown){return typeof value==="number"&&Number.isInteger(value)&&value>0?value:undefined;}
function participant(value:unknown):FixtureParticipant|null{if(!value||typeof value!=="object"||Array.isArray(value))return null;const row=value as Row;const id=text(row.id),slug=text(row.slug),name=text(row.name);if(!id||!slug||!name)return null;return{id,slug,name,type:"club",shortName:text(row.shortName),countryCode:text(row.countryCode)};}
function fixture(value:unknown):PublicFixture|null{if(!value||typeof value!=="object"||Array.isArray(value))return null;const row=value as Row;const pageId=text(row.pageId),pageSlug=text(row.pageSlug),detailPath=text(row.detailPath),title=text(row.title),sport=text(row.sport),competition=text(row.competition),competitionSlug=text(row.competitionSlug),participant1=participant(row.participant1),participant2=participant(row.participant2);if(!pageId||!pageSlug||!detailPath||!title||!sport||!competition||!competitionSlug||!participant1||!participant2)return null;return{pageId,pageSlug,detailPath,title,sport,competition,competitionSlug,participant1,participant2,scheduleStatus:row.scheduleStatus==="schedule_confirmed"?"schedule_confirmed":"schedule_pending",seasonLabel:text(row.seasonLabel),matchweek:integer(row.matchweek),windowStart:text(row.windowStart),windowEnd:text(row.windowEnd),status:text(row.status),eventId:text(row.eventId),eventSlug:text(row.eventSlug),exactDate:text(row.exactDate),venue:text(row.venue)};}
async function rpc(name:string,body:Record<string,unknown>):Promise<unknown>{const{url,key}=config();const response=await fetch(`${url}/rest/v1/rpc/${name}`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify(body),signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS),next:{revalidate:300,tags:["public-fixtures"]}});if(!response.ok)throw new Error(`Fixture RPC ${name} failed with ${response.status}`);const raw=await response.text();if(Buffer.byteLength(raw,"utf8")>MAX_RESPONSE_BYTES)throw new Error(`Fixture RPC ${name} response too large`);return JSON.parse(raw);}
async function loadFixturePage(slug:string){try{return fixture(await rpc("get_public_fixture_page_v1",{p_slug:slug}));}catch(error){console.error("Permanent fixture page could not be loaded",error instanceof Error?error.message:"unknown error");return null;}}
async function loadCompetitionFixtures(sport:string,competition:string){try{const payload=await rpc("get_public_competition_fixtures_v1",{p_sport_slug:sport,p_competition_slug:competition});if(!payload||typeof payload!=="object"||Array.isArray(payload))return[];const list=(payload as Row).fixtures;return Array.isArray(list)?list.map(fixture).filter((item):item is PublicFixture=>Boolean(item)):[];}catch(error){console.error("Competition fixtures could not be loaded",error instanceof Error?error.message:"unknown error");return[];}}
async function loadParticipantFixtures(participantId:string){try{const payload=await rpc("get_public_participant_fixtures_v1",{p_participant_id:participantId});if(!payload||typeof payload!=="object"||Array.isArray(payload))return[];const list=(payload as Row).fixtures;return Array.isArray(list)?list.map(fixture).filter((item):item is PublicFixture=>Boolean(item)):[];}catch(error){console.error("Participant fixtures could not be loaded",error instanceof Error?error.message:"unknown error");return[];}}
export const getPublicFixturePage=cache(loadFixturePage);
export const getPublicCompetitionFixtures=cache(loadCompetitionFixtures);
export const getPublicParticipantFixtures=cache(loadParticipantFixtures);
export function fixtureWindowLabel(item:PublicFixture,locale="en"){if(item.scheduleStatus==="schedule_confirmed"&&item.exactDate)return null;if(!item.windowStart&&!item.windowEnd)return"Schedule pending";const start=new Date(`${item.windowStart??item.windowEnd}T12:00:00Z`),end=new Date(`${item.windowEnd??item.windowStart}T12:00:00Z`);if(start.toISOString().slice(0,10)===end.toISOString().slice(0,10))return new Intl.DateTimeFormat(locale,{month:"short",day:"numeric"}).format(start);if(start.getUTCMonth()===end.getUTCMonth())return`${start.getUTCDate()}–${end.getUTCDate()} ${new Intl.DateTimeFormat(locale,{month:"short"}).format(end)}`;return`${new Intl.DateTimeFormat(locale,{month:"short",day:"numeric"}).format(start)}–${new Intl.DateTimeFormat(locale,{month:"short",day:"numeric"}).format(end)}`;}
