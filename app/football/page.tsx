import type { Metadata } from "next";
import SportHubPage, { buildSportHubMetadata } from "@/components/SportHubPage";

export async function generateMetadata():Promise<Metadata>{return buildSportHubMetadata("football","/football");}
export default function FootballPage(){return <SportHubPage sport="football" canonical="/football"/>;}
