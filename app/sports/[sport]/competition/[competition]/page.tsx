import type { Metadata } from "next";
import { redirect } from "next/navigation";
import UniversalCompetitionPage, { buildCompetitionMetadata } from "@/components/UniversalCompetitionPage";

type PageProps={params:Promise<{sport:string;competition:string}>};

export async function generateMetadata({params}:PageProps):Promise<Metadata>{const {sport,competition}=await params;if(sport==="football")return{title:"Redirecting | WatchTVSport",robots:{index:false,follow:true},alternates:{canonical:`/football/competition/${competition}`}};if(sport==="formula-1")return{title:"Formula 1 | WatchTVSport",robots:{index:false,follow:true},alternates:{canonical:"/formula-1"}};if(sport==="ufc")return{title:"UFC | WatchTVSport",robots:{index:false,follow:true},alternates:{canonical:"/ufc"}};return buildCompetitionMetadata(sport,competition);}

export default async function CompetitionPage({params}:PageProps){const {sport,competition}=await params;if(sport==="football")redirect(`/football/competition/${competition}`);if(sport==="formula-1")redirect("/formula-1");if(sport==="ufc")redirect("/ufc");return <UniversalCompetitionPage sport={sport} competition={competition}/>;}
