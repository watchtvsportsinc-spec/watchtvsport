import type { Metadata } from "next";
import UniversalEventPage from "@/components/UniversalEventPage";
import { getPublicEventsSnapshot } from "@/lib/public-events";

type PageProps={params:Promise<{slug:string}>};

export async function generateMetadata({params}:PageProps):Promise<Metadata>{const {slug}=await params;const snapshot=await getPublicEventsSnapshot();const event=snapshot.events.find(e=>e.slug===slug);if(!event)return{title:"Event not found",robots:{index:false,follow:false}};return{title:`${event.title} – where to watch`,description:`Find official TV channels and streaming platforms for ${event.title} by country.`,alternates:{canonical:`/event/${slug}`}};}

export default async function EventPage({params}:PageProps){const {slug}=await params;return <UniversalEventPage slug={slug}/>;}
