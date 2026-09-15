import { clubSlug, getClubSearchNames } from "./club-aliases";
import { entitySlug } from "./entity-pages";
import type { EventData, Participant } from "./events";
import { getSportBySlug, getSportLabel, sportAllowsParticipantPages } from "./sports-registry";

export type SearchSuggestion = {
  id: string;
  label: string;
  value: string;
  kind: "Sport" | "Club" | "Nation" | "Competition" | "Grand Prix" | "UFC Event";
  href: string;
  searchTerms: string[];
};

function unique(values: string[]): string[] { return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))); }
function participantSearchTerms(participant: Participant): string[] { return participant.type === "club" ? getClubSearchNames(participant.name) : unique([participant.name, participant.shortName ?? ""]); }

function participantHref(participant: Participant, sport: string): string {
  if (sport === "football") {
    if (participant.type === "club") return `/football/club/${clubSlug(participant.name)}`;
    if (participant.type === "national_team") return `/football/nation/${entitySlug(participant.name)}`;
  }
  const slug = participant.id.startsWith("club:") ? participant.id.split(":").slice(2).join(":") : clubSlug(participant.name);
  return `/sports/${sport}/club/${slug}`;
}

function sportHref(sport: string): string {
  if (sport === "formula-1") return "/formula-1";
  if (sport === "ufc") return "/ufc";
  if (sport === "football") return "/football";
  return `/sports/${sport}`;
}

export function buildSearchSuggestions(events: EventData[]): SearchSuggestion[] {
  const sports = new Map<string, SearchSuggestion>();
  const participants = new Map<string, SearchSuggestion>();
  const competitions = new Map<string, SearchSuggestion>();
  const raceWeekends = new Map<string, SearchSuggestion>();
  const fightCards = new Map<string, SearchSuggestion>();

  for (const event of events) {
    const sport = getSportBySlug(event.sport);
    const sportLabel = getSportLabel(event.sport);
    if (sport && !sports.has(event.sport)) sports.set(event.sport,{id:`sport:${event.sport}`,label:sportLabel,value:sportLabel,kind:"Sport",href:sportHref(event.sport),searchTerms:unique([event.sport,sportLabel,...sport.aliases])});

    if (sportAllowsParticipantPages(event.sport)) {
      for (const participant of [event.participant1,event.participant2]) {
        if (!participant || (participant.type!=="club"&&participant.type!=="national_team")) continue;
        const key=`${event.sport}:${participant.id}`; if(participants.has(key)) continue;
        participants.set(key,{id:`participant:${key}`,label:`${participant.name} (${sportLabel})`,value:participant.name,kind:participant.type==="club"?"Club":"Nation",href:participantHref(participant,event.sport),searchTerms:unique([...participantSearchTerms(participant),event.sport,sportLabel,...(sport?.aliases??[])])});
      }
    }

    if (sport?.eventModel === "race_session" && event.eventGroupId && event.eventGroupName && event.eventGroupSlug) {
      const key=`${event.sport}:${event.eventGroupId}`; if(!raceWeekends.has(key)) raceWeekends.set(key,{id:`race:${key}`,label:`${event.eventGroupName} (${sportLabel})`,value:event.eventGroupName,kind:"Grand Prix",href:`/${event.sport}/grand-prix/${event.eventGroupSlug}`,searchTerms:unique([event.eventGroupName,event.eventGroupSlug.replaceAll("-"," "),event.country??"",event.venue??"",event.sport,sportLabel,...sport.aliases])});
    }

    if (sport?.eventModel === "fight_card" && event.eventGroupId && event.eventGroupName && event.eventGroupSlug) {
      const key=`${event.sport}:${event.eventGroupId}`; if(!fightCards.has(key)) fightCards.set(key,{id:`fight-card:${key}`,label:`${event.eventGroupName} (${sportLabel})`,value:event.eventGroupName,kind:"UFC Event",href:`/ufc/event/${event.eventGroupSlug}`,searchTerms:unique([event.eventGroupName,event.eventGroupSlug.replaceAll("-"," "),event.country??"",event.venue??"",event.sport,event.competition,sportLabel,...sport.aliases])});
    }

    const competitionKey=`${event.sport}:${event.competitionSlug}`;
    if(!competitions.has(competitionKey)){
      const href=event.sport==="football"?`/football/competition/${event.competitionSlug}`:event.sport==="formula-1"?"/formula-1":event.sport==="ufc"?"/ufc":`/sports/${event.sport}/competition/${event.competitionSlug}`;
      competitions.set(competitionKey,{id:`competition:${competitionKey}`,label:`${event.competition} (${sportLabel})`,value:event.competition,kind:"Competition",href,searchTerms:unique([event.competition,event.competitionSlug.replaceAll("-"," "),event.sport,sportLabel,...(sport?.aliases??[])])});
    }
  }

  return [...Array.from(sports.values()).sort((a,b)=>a.label.localeCompare(b.label)),...Array.from(participants.values()).sort((a,b)=>a.label.localeCompare(b.label)),...Array.from(raceWeekends.values()).sort((a,b)=>a.label.localeCompare(b.label)),...Array.from(fightCards.values()).sort((a,b)=>a.label.localeCompare(b.label)),...Array.from(competitions.values()).sort((a,b)=>a.label.localeCompare(b.label))];
}
