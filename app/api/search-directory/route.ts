import { NextResponse } from "next/server";
import { getPublicParticipants } from "@/lib/public-participants";
import { buildSearchSuggestions } from "@/lib/search-suggestions";

export const revalidate = 86400;

export async function GET() {
  const participants = await getPublicParticipants();
  const suggestions = buildSearchSuggestions([], participants);
    
  return NextResponse.json(
    { suggestions },
    {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    }
  );
}
