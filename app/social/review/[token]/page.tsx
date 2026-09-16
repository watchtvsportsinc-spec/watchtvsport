import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { socialRest, xIntentUrl } from "@/lib/social-operator";
import ReviewActions from "./ReviewActions";

export const metadata: Metadata = { title: "Review social post", robots: { index: false, follow: false } };

export default async function SocialReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound();
  const response = await socialRest(`social_posts?approval_token=eq.${encodeURIComponent(token)}&select=id,event_title,competition_name,event_date,text,event_url,status,token_expires_at&limit=1`);
  if (!response.ok) notFound();
  const rows = await response.json();
  const post = rows?.[0];
  if (!post || new Date(post.token_expires_at).getTime() < Date.now()) notFound();

  return <main style={{maxWidth:680,margin:"0 auto",padding:"38px 18px 80px"}}>
    <p style={{color:"#60a5fa",fontWeight:800,marginBottom:8}}>{post.competition_name}</p>
    <h1 style={{fontSize:"clamp(27px,8vw,42px)",margin:"0 0 8px"}}>{post.event_title}</h1>
    <p style={{color:"#94a3b8"}}>{new Date(post.event_date).toISOString().replace("T", " ").slice(0,16)} UTC</p>
    <section style={{margin:"24px 0",padding:18,border:"1px solid #273449",borderRadius:14,background:"#0b1220"}}>
      <div style={{whiteSpace:"pre-wrap",fontSize:17,lineHeight:1.6}}>{post.text}</div>
      <div style={{marginTop:14,color:"#60a5fa",overflowWrap:"anywhere"}}>{post.event_url}</div>
    </section>
    {post.status === "skipped" ? <p>This post was skipped.</p> : <ReviewActions token={token} intentUrl={xIntentUrl(post.text, post.event_url)}/>} 
    <p style={{marginTop:22,color:"#94a3b8",fontSize:13,lineHeight:1.6}}>Opening X is only a handoff. WatchTVSport cannot confirm that the tweet was actually published without X API access.</p>
  </main>;
}
