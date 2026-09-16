import { NextResponse } from "next/server";

const DEFAULT_SUPABASE_URL = "https://jywqhiiwsmudthaujhmi.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_30SkJ3gyUbPvH5sGFXpyHg_a4Qlzdi-";

function config() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, "");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
  return { url, key };
}

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validPageUrl(value: string) {
  if (value.startsWith("/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "watchtvsport.com" || url.hostname === "www.watchtvsport.com");
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: normal users never fill this hidden field.
  if (text(body.company, 200)) {
    return NextResponse.json({ ok: true });
  }

  const pageUrl = text(body.pageUrl, 1000);
  const message = text(body.message, 4000);
  const email = text(body.email, 320);

  if (!validPageUrl(pageUrl) || message.length < 10) {
    return NextResponse.json(
      { ok: false, error: "Please provide a valid WatchTVSport page and a useful correction." },
      { status: 400 },
    );
  }
  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Email address is not valid." }, { status: 400 });
  }

  const { url, key } = config();
  try {
    const response = await fetch(`${url}/rest/v1/listing_corrections`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        page_url: pageUrl,
        message,
        reporter_email: email || null,
        status: "pending",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, error: "Correction intake is temporarily unavailable." },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Correction intake is temporarily unavailable." },
      { status: 503 },
    );
  }
}
