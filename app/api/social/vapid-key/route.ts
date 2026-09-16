export const runtime = "nodejs";

export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_SOCIAL_VAPID_PUBLIC_KEY?.trim();
  if (!publicKey) return Response.json({ error: "Not configured" }, { status: 503 });
  return Response.json({ publicKey }, { headers: { "Cache-Control": "public, max-age=3600" } });
}
