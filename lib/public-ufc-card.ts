import "server-only";

import { cache } from "react";
import {
  isParticipantPatternStyle,
  isParticipantRenderFamily,
  safeVisualColor,
  type ParticipantVisualProfile,
} from "./participant-visuals";

const DEFAULT_SUPABASE_URL = "https://jywqhiiwsmudthaujhmi.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_30SkJ3gyUbPvH5sGFXpyHg_a4Qlzdi-";
const REQUEST_TIMEOUT_MS = 4_000;

type Row = Record<string, unknown>;

export type PublicUfcFighter = {
  slug: string;
  name: string;
  countryCode?: string;
  visual?: ParticipantVisualProfile;
};

export type PublicUfcBout = {
  id: string;
  segment: string;
  order: number;
  weightClass?: string;
  titleBout: boolean;
  fighter1: PublicUfcFighter;
  fighter2: PublicUfcFighter;
};

function configs() {
  const configuredUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, "");
  const configuredKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
  const values = [{ url: configuredUrl, key: configuredKey }, { url: DEFAULT_SUPABASE_URL, key: DEFAULT_SUPABASE_PUBLISHABLE_KEY }];
  return values.filter((value,index,all)=>all.findIndex(other=>other.url===value.url&&other.key===value.key)===index);
}

function isRecord(value: unknown): value is Row {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function visual(value: unknown): ParticipantVisualProfile | undefined {
  if (!isRecord(value) || !isParticipantRenderFamily(value.renderFamily) || !isParticipantPatternStyle(value.patternStyle)) return undefined;
  const status = text(value.visualStatus);
  return {
    renderFamily: value.renderFamily,
    primaryColor: safeVisualColor(value.primaryColor,"#111827"),
    secondaryColor: safeVisualColor(value.secondaryColor,"#F8FAFC"),
    accentColor: safeVisualColor(value.accentColor,"#2F9CFF"),
    patternStyle: value.patternStyle,
    visualStatus: status === "verified" || status === "reviewed" || status === "needs_review" ? status : "generated",
    seasonLabel: text(value.seasonLabel) || undefined,
    sourceName: text(value.sourceName) || undefined,
    sourceUrl: text(value.sourceUrl) || undefined,
    observedAt: text(value.observedAt) || undefined,
  };
}

function fighter(value: unknown): PublicUfcFighter | null {
  if (!isRecord(value)) return null;
  const slug = text(value.slug);
  const name = text(value.name);
  if (!slug || !name) return null;
  return { slug, name, countryCode: text(value.countryCode) || undefined, visual: visual(value.visualProfile) };
}

function parsePayload(value: unknown): PublicUfcBout[] {
  if (!isRecord(value) || !Array.isArray(value.bouts)) return [];
  return value.bouts.flatMap((item) => {
    if (!isRecord(item)) return [];
    const id = text(item.id);
    const segment = text(item.segment);
    const order = typeof item.order === "number" && Number.isInteger(item.order) ? item.order : 999;
    const fighter1 = fighter(item.fighter1);
    const fighter2 = fighter(item.fighter2);
    if (!id || !segment || !fighter1 || !fighter2) return [];
    return [{ id, segment, order, weightClass: text(item.weightClass) || undefined, titleBout: item.titleBout === true, fighter1, fighter2 }];
  });
}

async function loadPublicUfcCard(eventSlug: string): Promise<PublicUfcBout[]> {
  for (const {url,key} of configs()) {
    for (const rpc of ["get_public_ufc_card_v3","get_public_ufc_card_v2"]) {
      try {
        const response = await fetch(`${url}/rest/v1/rpc/${rpc}`, {
          method:"POST",
          headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json"},
          body:JSON.stringify({p_event_slug:eventSlug}),
          signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          next:{revalidate:1800,tags:[`ufc-card:${eventSlug}`]},
        });
        if (!response.ok) continue;
        const bouts = parsePayload(await response.json());
        if (bouts.length || rpc === "get_public_ufc_card_v2") return bouts;
      } catch {
        continue;
      }
    }
  }
  return [];
}

export const getPublicUfcCard = cache(loadPublicUfcCard);
