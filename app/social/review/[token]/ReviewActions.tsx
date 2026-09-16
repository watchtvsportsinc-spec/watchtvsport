"use client";

import { useState } from "react";

export default function ReviewActions({ token, intentUrl }: { token: string; intentUrl: string }) {
  const [state, setState] = useState("");
  async function handoff() {
    setState("Opening X…");
    window.open(intentUrl, "_blank", "noopener,noreferrer");
    await fetch("/api/social/handoff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, action: "handed_off" }) }).catch(() => null);
    setState("X opened. The post is not considered published until you confirm it in X.");
  }
  async function skip() {
    const response = await fetch("/api/social/handoff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, action: "skipped" }) });
    setState(response.ok ? "Post skipped." : "Unable to skip this post.");
  }
  return <div style={{display:"grid",gap:10}}>
    <button onClick={handoff} style={{padding:"14px 16px",border:0,borderRadius:10,fontWeight:900,fontSize:16,cursor:"pointer"}}>Open X and post</button>
    <button onClick={skip} style={{padding:"12px 16px",border:"1px solid #475569",borderRadius:10,background:"transparent",color:"#cbd5e1",fontWeight:700,cursor:"pointer"}}>Skip</button>
    {state ? <p style={{color:"#cbd5e1",lineHeight:1.5}}>{state}</p> : null}
  </div>;
}
