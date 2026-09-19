import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_FILE = path.join(ROOT,"data","team-logo-sources.json");
const OUTPUT_DIR = path.join(ROOT,"public","team-logos");
const OUTPUT_MANIFEST = path.join(ROOT,"data","team-logos.json");
const SUPABASE_URL = "https://jywqhiiwsmudthaujhmi.supabase.co";
const SUPABASE_KEY = "sb_publishable_30SkJ3gyUbPvH5sGFXpyHg_a4Qlzdi-";

const candidates = JSON.parse(await fs.readFile(SOURCE_FILE,"utf8"));
await fs.mkdir(OUTPUT_DIR,{recursive:true});

async function existingApprovedSources(){
  const url = new URL("/rest/v1/media_assets",SUPABASE_URL);
  url.searchParams.set("entity_type","eq.participant");
  url.searchParams.set("asset_kind","eq.team_logo");
  url.searchParams.set("verification_status","eq.approved");
  url.searchParams.set("is_current","eq.true");
  url.searchParams.set("storage_url","not.is.null");
  url.searchParams.set("select","entity_key,source_name,source_url,source_type,storage_url,alt_text,license_note");
  const res=await fetch(url,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`}});
  if(!res.ok) throw new Error(`Supabase logo-source query failed: ${res.status}`);
  return await res.json();
}

function extFor(url, contentType){
  const pathname = new URL(url).pathname.toLowerCase();
  if(pathname.endsWith(".svg") || contentType.includes("image/svg")) return "svg";
  if(pathname.endsWith(".png") || contentType.includes("image/png")) return "png";
  if(pathname.endsWith(".webp") || contentType.includes("image/webp")) return "webp";
  if(pathname.endsWith(".jpg") || pathname.endsWith(".jpeg") || contentType.includes("image/jpeg")) return "jpg";
  if(contentType.includes("image/avif")) return "avif";
  throw new Error(`Unsupported logo format: ${url} (${contentType})`);
}

function pngSize(buf){
  if(buf.length<24 || buf.toString("ascii",1,4)!=="PNG") return null;
  return {width:buf.readUInt32BE(16),height:buf.readUInt32BE(20)};
}
function svgSize(buf){
  const text=buf.toString("utf8");
  const view=text.match(/viewBox\s*=\s*["']\s*([\d.+-]+)[ ,]+([\d.+-]+)[ ,]+([\d.+-]+)[ ,]+([\d.+-]+)\s*["']/i);
  if(view) return {width:Number(view[3]),height:Number(view[4])};
  const w=text.match(/\bwidth\s*=\s*["']([\d.]+)(?:px)?["']/i);
  const h=text.match(/\bheight\s*=\s*["']([\d.]+)(?:px)?["']/i);
  return w&&h?{width:Number(w[1]),height:Number(h[1])}:null;
}
function jpgSize(){ return null; }
function normalizeApproved(row){
  return {
    entityKey:row.entity_key,
    displayName:(row.alt_text||row.entity_key).replace(/\s+logo$/i,""),
    sport:null,
    sourceName:row.source_name,
    sourcePageUrl:row.source_url,
    assetUrl:row.storage_url,
    sourceType:row.source_type,
    licenseNote:row.license_note || "Official trademark/logo asset used for identification; no free-content license claimed."
  };
}

const merged=new Map();
for(const row of await existingApprovedSources()) merged.set(row.entity_key,normalizeApproved(row));
for(const entry of candidates.entries) merged.set(entry.entityKey,entry);
const entries=[...merged.values()].sort((a,b)=>a.entityKey.localeCompare(b.entityKey));

const successes=[];
const failures=[];
for(const entry of entries){
  try{
    const res=await fetch(entry.assetUrl,{headers:{"user-agent":"Mozilla/5.0 WatchTVSport/1.0"}});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const contentType=(res.headers.get("content-type")||"").toLowerCase();
    const bytes=Buffer.from(await res.arrayBuffer());
    if(bytes.length<100) throw new Error("downloaded file is unexpectedly small");
    const ext=extFor(entry.assetUrl,contentType);
    const size=ext==="png"?pngSize(bytes):ext==="svg"?svgSize(bytes):ext==="jpg"?jpgSize(bytes):null;
    if(size && (!Number.isFinite(size.width)||!Number.isFinite(size.height)||size.width<=0||size.height<=0)){
      throw new Error("invalid intrinsic dimensions");
    }
    const filename=`${entry.entityKey}.${ext}`;
    await fs.writeFile(path.join(OUTPUT_DIR,filename),bytes);
    successes.push({
      entityKey:entry.entityKey,
      displayName:entry.displayName,
      sport:entry.sport??null,
      sourceName:entry.sourceName,
      sourcePageUrl:entry.sourcePageUrl,
      originalAssetUrl:entry.assetUrl,
      sourceType:entry.sourceType,
      licenseNote:entry.licenseNote,
      localUrl:`/team-logos/${filename}`,
      mimeType:contentType.split(";")[0]||null,
      width:size?.width??null,
      height:size?.height??null,
      aspectRatio:size?Number((size.width/size.height).toFixed(6)):null,
      bytes:bytes.length
    });
    console.log(`OK ${entry.entityKey} -> ${filename}${size?` (${size.width}x${size.height})`:""}`);
  }catch(error){
    failures.push({entityKey:entry.entityKey,assetUrl:entry.assetUrl,error:error instanceof Error?error.message:String(error)});
    console.error(`FAIL ${entry.entityKey}: ${failures.at(-1).error}`);
  }
}
await fs.writeFile(OUTPUT_MANIFEST,JSON.stringify({
  version:2,
  generatedAt:new Date().toISOString(),
  expected:entries.length,
  downloaded:successes.length,
  failed:failures.length,
  rule:"Original bytes are stored locally. Rendering must use object-fit: contain and must never independently scale width and height.",
  entries:successes,
  failures
},null,2)+"\n");
console.log(`Downloaded ${successes.length}/${entries.length} logos; ${failures.length} failures recorded.`);
if(successes.length<150) process.exitCode=1;
