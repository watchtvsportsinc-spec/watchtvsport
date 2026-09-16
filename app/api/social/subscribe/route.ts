import { safeEqualSecret, socialRest } from "@/lib/social-operator";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!safeEqualSecret(request.headers.get("x-watchtvsport-operator-token"), process.env.SOCIAL_OPERATOR_TOKEN)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
  const p256dh = typeof body?.keys?.p256dh === "string" ? body.keys.p256dh : "";
  const auth = typeof body?.keys?.auth === "string" ? body.keys.auth : "";
  if (!endpoint.startsWith("https://") || !p256dh || !auth) return Response.json({ error: "Invalid push subscription" }, { status: 400 });

  const response = await socialRest("social_push_subscriptions?on_conflict=endpoint", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ endpoint, p256dh, auth, user_agent: request.headers.get("user-agent"), enabled: true, last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  });
  if (!response.ok) return Response.json({ error: "Unable to save subscription" }, { status: 500 });
  return Response.json({ ok: true });
}
