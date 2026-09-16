import {classifyOperatorEvidence,operatorSearchHints,shouldEscalate} from './f1-operator-verification.mjs';

const url=(process.env.SUPABASE_URL||'').replace(/\/$/,'');
const key=process.env.SUPABASE_SERVICE_ROLE_KEY||'';
const userAgent='WatchTVSport-F1Verifier/1.0 (+https://watchtvsport.com)';
if(!url||!key){console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');process.exit(2);}

async function rpc(name,args={}){
  const r=await fetch(`${url}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:key,authorization:`Bearer ${key}`,'content-type':'application/json'},body:JSON.stringify(args)});
  if(!r.ok) throw new Error(`${name} ${r.status}: ${await r.text()}`);
  return r.json();
}
async function fetchPage(target){
  if(!target?.startsWith('https://')) return {ok:false,status:0,text:'',url:target||null};
  try{
    const r=await fetch(target,{redirect:'follow',headers:{'user-agent':userAgent,'accept':'text/html,application/xhtml+xml'}});
    const text=(await r.text()).replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').slice(0,1000000);
    return {ok:r.ok,status:r.status,text,url:r.url||target};
  }catch(error){return {ok:false,status:0,text:'',url:target,error:String(error?.message||error)};}
}

await rpc('enqueue_f1_operator_checks',{p_now:new Date().toISOString()});
const maxJobs=Math.max(1,Math.min(50,Number(process.env.F1_VERIFY_MAX_JOBS)||20));
let processed=0;
for(;processed<maxJobs;processed++){
  const rows=await rpc('claim_f1_operator_check',{p_lease_seconds:120});
  const job=Array.isArray(rows)?rows[0]:rows;
  if(!job) break;
  const page=await fetchPage(job.target_url);
  const meta=job.metadata||{};
  const result=page.ok
    ? classifyOperatorEvidence({text:page.text,sessionType:meta.session_type,eventSlug:meta.event_slug,broadcasterName:meta.broadcaster_name,url:page.url})
    : {status:'unclear',confidence:0,reason:`http_${page.status||'error'}`,evidenceUrl:page.url};
  const hints=operatorSearchHints({broadcasterName:meta.broadcaster_name,territoryCode:meta.territory_code,eventSlug:meta.event_slug,sessionType:meta.session_type});
  const excerpt=page.text?String(page.text).slice(0,1500):null;
  await rpc('complete_f1_operator_check',{
    p_id:job.id,p_result_status:result.status,p_evidence_url:result.evidenceUrl||page.url||job.target_url,
    p_evidence_excerpt:excerpt,p_observed_at:new Date().toISOString(),
    p_metadata:{classifier_reason:result.reason,confidence:result.confidence,http_status:page.status,search_hint:hints.query,needs_research:shouldEscalate(result)}
  });
}
console.log(JSON.stringify({processed,maxJobs},null,2));
