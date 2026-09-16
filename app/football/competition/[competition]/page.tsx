import type { Metadata } from "next";
import UniversalCompetitionPage, { buildCompetitionMetadata } from "@/components/UniversalCompetitionPage";

type PageProps={params:Promise<{competition:string}>};

export async function generateMetadata({params}:PageProps):Promise<Metadata>{const {competition}=await params;return buildCompetitionMetadata("football",competition);}

export default async function FootballCompetitionPage({params}:PageProps){const {competition}=await params;return <UniversalCompetitionPage sport="football" competition={competition}/>;}
