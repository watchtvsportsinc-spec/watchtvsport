import { createClient } from "npm:@supabase/supabase-js@2";
import { send } from "jsr:@daaku/webpush@0.2.0";

function compact(value: string, max = 238) {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

function tagFor(slug: string) {
  const tags: Record<string,string> = {
    "champions-league": "#UCL", "premier-league": "#PremierLeague", "ligue-1": "#Ligue1",
    nba: "#NBA", nhl: "#NHL", "formula-1": "#F1", motogp: "#MotoGP", ufc: "#UFC",
  };
  return tags[slug] || "#WatchTVSport";
}

function postText(event: any) {
  const title = event.participant1_name && event.participant2_name
    ? `${event.participant1_name} 🆚 ${event.participant2_name}`
    : event.event_title;
  const session = event.session_label && !title.includes(event.session_label) ? ` · ${event.session_label}` : "";
  return compact(`${event.competition_name}${session}\n${title}\n\nWhere can you watch it? Compare official broadcasters worldwide on WatchTVSport.\n\n${tagFor(event.competition_slug)}`);
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const expectedSecret = Deno.env.get("SOCIAL_CRON_SECRET");
  if (!expectedSecret || req.headers.get("x-watchtvsport-cron-secret") !== expectedSecret) return Response.json({ error: "unauthorized" }, { status: 401 });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const vapidPrivate = Deno.env.get("SOCIAL_VAPID_PRIVATE_JWK");
  const subscriber = Deno.env.get("SOCIAL_VAPID_SUBJECT") || "mailto:admin@watchtvsport.com";
  if (!supabaseUrl || !serviceRole || !vapidPrivate) return Response.json({ error: "server configuration incomplete" }, { status: 503 });

  const db = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: settings, error: settingsError } = await db.from("social_automation_settings").select("*").eq("id", true).single();
  if (settingsError) return Response.json({ error: settingsError.message }, { status: 500 });
  if (!settings.enabled) return Response.json({ ok: true, disabled: true, queued: 0, notified: 0 });

  const now = Date.now();
  const lead = Number(settings.lead_minutes) || 180;
  const catchup = Number(settings.catchup_minutes) || 30;
  const windowMinutes = Number(settings.queue_window_minutes) || 10;
  const from = new Date(now + (lead - catchup) * 60_000).toISOString();
  const to = new Date(now + (lead + windowMinutes) * 60_000).toISOString();
  const { data: events, error: eventsError } = await db.rpc("get_social_due_events", { p_from: from, p_to: to });
  if (eventsError) return Response.json({ error: eventsError.message }, { status: 500 });
  const { data: subscriptions, error: subscriptionsError } = await db.from("social_push_subscriptions").select("id,endpoint,p256dh,auth").eq("enabled", true);
  if (subscriptionsError) return Response.json({ error: subscriptionsError.message }, { status: 500 });

  let queued = 0, notified = 0;
  const vapid = JSON.parse(vapidPrivate);
  for (const event of (events || []).slice(0, settings.max_posts_per_run || 20)) {
    const cadenceKey = `pre_event_${lead}m`;
    const eventDate = new Date(event.event_date);
    const scheduledAt = new Date(eventDate.getTime() - lead * 60_000).toISOString();
    const eventUrl = `${String(settings.site_base_url).replace(/\/$/, "")}${event.detail_path}`;
    const { data: existing } = await db.from("social_posts").select("*").eq("event_id", event.event_id).eq("platform", "x").eq("cadence_key", cadenceKey).maybeSingle();
    let post = existing;
    if (!post) {
      const { data: inserted, error } = await db.from("social_posts").insert({
        event_id: event.event_id, platform: "x", cadence_key: cadenceKey, scheduled_at: scheduledAt,
        event_date: event.event_date, event_title: event.event_title, competition_name: event.competition_name,
        text: postText(event), event_url: eventUrl, status: "ready",
        token_expires_at: new Date(eventDate.getTime() + 2 * 60 * 60_000).toISOString(),
      }).select("*").single();
      if (error) continue;
      post = inserted; queued++;
    }
    if (!post || post.notified_at || post.status === "skipped" || post.status === "handed_off" || Number(post.notification_attempts) >= 3) continue;

    let delivered = 0;
    for (const sub of subscriptions || []) {
      try {
        await send({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify({
          title: "Tweet ready · WatchTVSport",
          body: `${post.event_title} — tap to review and post`,
          url: `/social/review/${post.approval_token}`,
          tag: `social-${post.id}`,
        }), { vapid, subscriber, ttl: 3600 });
        delivered++;
      } catch (error: any) {
        if (error?.permanent || error?.statusCode === 404 || error?.statusCode === 410) {
          await db.from("social_push_subscriptions").update({ enabled: false, updated_at: new Date().toISOString() }).eq("id", sub.id);
        }
      }
    }
    const stamp = new Date().toISOString();
    await db.from("social_posts").update({
      status: delivered > 0 ? "notified" : "notification_failed",
      notified_at: delivered > 0 ? stamp : null,
      notification_attempts: Number(post.notification_attempts || 0) + 1,
      last_error: delivered > 0 ? null : "No active push subscription accepted the notification",
      updated_at: stamp,
    }).eq("id", post.id);
    if (delivered > 0) notified++;
  }
  return Response.json({ ok: true, queued, notified, checked: events?.length || 0, at: new Date().toISOString() });
});
