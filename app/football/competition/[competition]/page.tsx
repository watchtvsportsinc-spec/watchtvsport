import type { Metadata } from "next";
import LeagueCompetitionPage from "@/components/LeagueCompetitionPage";
import UniversalCompetitionPage, { buildCompetitionMetadata } from "@/components/UniversalCompetitionPage";

type PageProps={params:Promise<{competition:string}>};
const PERMANENT_LEAGUES=new Set(["ligue-1","premier-league"]);

export async function generateMetadata({params}:PageProps):Promise<Metadata>{const {competition}=await params;return buildCompetitionMetadata("football",competition);}

export default async function FootballCompetitionPage({params}:PageProps){const {competition}=await params;return PERMANENT_LEAGUES.has(competition)?<LeagueCompetitionPage competition={competition}/>:<UniversalCompetitionPage sport="football" competition={competition}/>;}
