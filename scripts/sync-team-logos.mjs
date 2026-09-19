import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_FILE = path.join(ROOT,"data","team-logo-sources.json");
const OUTPUT_DIR = path.join(ROOT,"public","team-logos");
const OUTPUT_MANIFEST = path.join(ROOT,"data","team-logos.json");

const input = JSON.parse(await fs.readFile(SOURCE_FILE,"utf8"));
await fs.mkdir(OUTPUT_DIR,{recursive:true});

function extFor(url, contentType){
  const pathname = new URL(url).pathname.toLowerCase();
  if(pathname.endsWith(".svg") || contentType.includes("image/svg")) return "svg";
  if(pathname.endsWith(".png") || contentType.includes("image/png")) return "png";
  if(pathname.endsWith(".webp") || contentType.includes("image/webp")) return "webp";
  if(pathname.endsWith(".jpg") || pathname.endsWith(".jpeg") || contentType.includes("image/jpeg")) return "jpg";
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

const out=[];
for(const entry of input.entries){
  const res=await fetch(entry.assetUrl,{headers:{"user-agent":"WatchTVSport/1.0 team-logo-sync"}});
  if(!res.ok) throw new Error(`${entry.entityKey}: HTTP ${res.status} from ${entry.assetUrl}`);
  const contentType=(res.headers.get("content-type")||"").toLowerCase();
  const bytes=Buffer.from(await res.arrayBuffer());
  if(bytes.length<100) throw new Error(`${entry.entityKey}: downloaded file is unexpectedly small`);
  const ext=extFor(entry.assetUrl,contentType);
  const size=ext==="png"?pngSize(bytes):ext==="svg"?svgSize(bytes):null;
  if(size && (!Number.isFinite(size.width)||!Number.isFinite(size.height)||size.width<=0||size.height<=0)){
    throw new Error(`${entry.entityKey}: invalid intrinsic dimensions`);
  }
  const filename=`${entry.entityKey}.${ext}`;
  await fs.writeFile(path.join(OUTPUT_DIR,filename),bytes);
  out.push({
    entityKey:entry.entityKey,
    displayName:entry.displayName,
    sport:entry.sport,
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
  console.log(`Downloaded ${entry.entityKey} -> ${filename}${size?` (${size.width}x${size.height})`:""}`);
}
await fs.writeFile(OUTPUT_MANIFEST,JSON.stringify({
  version:1,
  generatedAt:new Date().toISOString(),
  rule:"Original bytes are stored locally. Rendering must use object-fit: contain and must never independently scale width and height.",
  entries:out
},null,2)+"\n");
console.log(`Stored ${out.length} logos and wrote data/team-logos.json`);
