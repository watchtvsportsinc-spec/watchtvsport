import "server-only";

import { cache } from "react";
import type { PublicMediaAsset } from "./public-media";

const DEFAULT_SUPABASE_URL = "https://jywqhiiwsmudthaujhmi.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_30SkJ3gyUbPvH5sGFXpyHg_a4Qlzdi-";
const REQUEST_TIMEOUT_MS = 4_000;

export type PublicUfcFighter = { slug: string; name: string; countryCode?: string; photo?: PublicMediaAsset | null };
export type PublicUfcBout = { id: string; segment: string; order: number; weightClass?: string; titleBout?: boolean; fighter1: PublicUfcFighter; fighter2: PublicUfcFighter; sourceName?: string; sourceUrl?: string; verifiedAt?: string };
export type PublicUfcVenue = { id: string; slug: string; name: string; city?: string; countryCode?: string; capacity?: number; image?: PublicMediaAsset | null; sourceName?: string; sourceUrl?: string; verifiedAt?: string };
export type PublicUfcCard = { bouts: PublicUfcBout[]; venue?: PublicUfcVenue | null };

function cfg(){const url=(process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||DEFAULT_SUPABASE_URL).replace(/\/$/,"");const key=process.env.SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_ANON_KEY||DEFAULT_SUPABASE_PUBLISHABLE_KEY;return{url,key};}

async function loadUfcCard(slug:string):Promise<PublicUfcCard>{
 try{
  const {url,key}=cfg();
  const response=await fetch(`${url}/rest/v1/rpc/get_public_ufc_card_v2`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({p_event_slug:slug}),signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS),next:{revalidate:3600,tags:[`ufc-card:${slug}`]}});
  if(!response.ok)return{bouts:[]};
  const value=await response.json();
  if(!value||typeof value!=="object"||Array.isArray(value))return{bouts:[]};
  const row=value as Record<string,unknown>;
  return { bouts:Array.isArray(row.bouts)?row.bouts as PublicUfcBout[]:[], venue:row.venue&&typeof row.venue==="object"&&!Array.isArray(row.venue)?row.venue as PublicUfcVenue:null };
 }catch{return{bouts:[]};}
}

export const getPublicUfcCard=cache(loadUfcCard);
