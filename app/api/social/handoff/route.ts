import { socialRest } from "@/lib/social-operator";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  const token = typeof body?.token === "string" ? body.token : "";
  const action = body?.action === "skipped" ? "skipped" : body?.action === "handed_off" ? "handed_off" : "";
  if (!/^[0-9a-f-]{36}$/i.test(token) || !action) return Response.json({ error: "Invalid request" }, { status: 400 });
  const now = new Date().toISOString();
  const patch = action === "skipped" ? { status: "skipped", updated_at: now } : { status: "handed_off", handed_off_at: now, updated_at: now };
  const response = await socialRest(`social_posts?approval_token=eq.${encodeURIComponent(token)}&token_expires_at=gt.${encodeURIComponent(now)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) return Response.json({ error: "Unable to update post" }, { status: 500 });
  return Response.json({ ok: true });
}
