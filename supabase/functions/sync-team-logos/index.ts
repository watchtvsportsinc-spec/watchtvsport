import { createClient } from "npm:@supabase/supabase-js@2";

type MediaRow = {
  id: string;
  entity_key: string;
  storage_url: string;
  verification_status: string;
};

function extFor(url: string, contentType: string) {
  const pathname = new URL(url).pathname.toLowerCase();
  if (pathname.endsWith(".svg") || contentType.includes("image/svg")) return "svg";
  if (pathname.endsWith(".png") || contentType.includes("image/png")) return "png";
  if (pathname.endsWith(".webp") || contentType.includes("image/webp")) return "webp";
  if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg") || contentType.includes("image/jpeg")) return "jpg";
  if (contentType.includes("image/avif")) return "avif";
  throw new Error(`unsupported content type ${contentType || "unknown"}`);
}

Deno.serve(async (req: Request) => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(url, service, { auth: { persistSession: false } });

  const { data: auth } = await db.from("schedule_sync_auth").select("secret").eq("id", true).single();
  if (!auth?.secret || req.headers.get("x-sync-secret") !== auth.secret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch {}
  const requestedLimit = Number(body.limit) || 25;
  const limit = Math.min(40, Math.max(1, requestedLimit));
  const localMarker = "/storage/v1/object/public/team-logos/";
  const bucket = "team-logos";

  const { data: buckets } = await db.storage.listBuckets();
  if (!(buckets || []).some((item: { name: string }) => item.name === bucket)) {
    const { error } = await db.storage.createBucket(bucket, { public: true, fileSizeLimit: 2 * 1024 * 1024 });
    if (error) {
      return new Response(JSON.stringify({ error: "bucket", detail: error.message }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }
  }

  const { data: rows, error: rowsError } = await db.from("media_assets")
    .select("id,entity_key,storage_url,verification_status")
    .eq("entity_type", "participant")
    .eq("asset_kind", "team_logo")
    .eq("is_current", true)
    .in("verification_status", ["approved", "pending"])
    .not("storage_url", "is", null)
    .not("storage_url", "like", `%${localMarker}%`)
    .order("entity_key", { ascending: true })
    .limit(limit);

  if (rowsError) {
    return new Response(JSON.stringify({ error: "query", detail: rowsError.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const ok: unknown[] = [];
  const failed: unknown[] = [];

  for (const row of (rows || []) as MediaRow[]) {
    try {
      const response = await fetch(row.storage_url, {
        headers: {
          "user-agent": "Mozilla/5.0 WatchTVSport/1.0",
          accept: "image/avif,image/webp,image/svg+xml,image/png,image/*,*/*;q=0.8",
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const contentType = (response.headers.get("content-type") || "").toLowerCase();
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength < 100) throw new Error("asset too small");
      if (bytes.byteLength > 2 * 1024 * 1024) throw new Error("asset too large");

      const ext = extFor(row.storage_url, contentType);
      const objectPath = `${row.entity_key}.${ext}`;
      const { error: uploadError } = await db.storage.from(bucket).upload(objectPath, bytes, {
        contentType: contentType.split(";")[0] || undefined,
        cacheControl: "31536000",
        upsert: true,
      });
      if (uploadError) throw uploadError;

      const publicUrl = db.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl;
      const now = new Date().toISOString();

      const { error: updateError } = await db.from("media_assets").update({
        storage_url: publicUrl,
        mime_type: contentType.split(";")[0] || null,
        verification_status: "approved",
        verified_at: now,
        updated_at: now,
      }).eq("id", row.id);
      if (updateError) throw updateError;

      const { data: participant } = await db.from("participants").select("id").eq("slug", row.entity_key).maybeSingle();
      if (participant?.id) {
        await db.from("participant_profiles").update({ logo_url: publicUrl, updated_at: now }).eq("participant_id", participant.id);
      }

      await db.from("enrichment_tasks").update({
        status: "verified",
        verified_at: now,
        updated_at: now,
      }).eq("entity_type", "participant").eq("entity_key", row.entity_key).eq("task_kind", "team_logo");

      ok.push({ entityKey: row.entity_key, status: "stored", bytes: bytes.byteLength, url: publicUrl });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const now = new Date().toISOString();

      await db.from("media_assets").update({
        verification_status: "needs_review",
        updated_at: now,
      }).eq("id", row.id);

      await db.from("enrichment_tasks").update({
        status: "blocked",
        last_attempted_at: now,
        updated_at: now,
        notes: `Logo download failed: ${message}`,
      }).eq("entity_type", "participant").eq("entity_key", row.entity_key).eq("task_kind", "team_logo");

      failed.push({ entityKey: row.entity_key, source: row.storage_url, error: message });
    }
  }

  return new Response(JSON.stringify({ selected: (rows || []).length, ok, failed }), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
});
