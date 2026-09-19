"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { SportCompetitionCard } from "@/components/SportCompetitionGrid";
import styles from "./sport-hub.module.css";

export type SportCompetitionExplorerItem=SportCompetitionCard&{
  filterKey:string;
  filterLabel:string;
  sortPriority?:number;
};

function initials(name:string){
  const words=name.replace(/[^A-Za-z0-9 ]+/g," ").split(/\s+/).filter(Boolean);
  if(words.length===1)return words[0].slice(0,3).toUpperCase();
  return words.slice(0,3).map(word=>word[0]).join("").toUpperCase();
}

export default function SportCompetitionExplorer({items,eventNoun}:{items:SportCompetitionExplorerItem[];eventNoun:string}){
  const filters=useMemo(()=>{
    const map=new Map<string,string>();
    for(const item of items){
      if(!map.has(item.filterKey))map.set(item.filterKey,item.filterLabel);
    }
    return Array.from(map.entries()).map(([key,label])=>({key,label}));
  },[items]);
  const [active,setActive]=useState("all");

  const visible=useMemo(()=>items
    .filter(item=>active==="all"||item.filterKey===active)
    .sort((a,b)=>(a.sortPriority??999)-(b.sortPriority??999)||b.eventCount-a.eventCount||a.name.localeCompare(b.name)),[items,active]);

  return <>
    <div className={styles.competitionFilters} role="group" aria-label="Filter competitions">
      <button type="button" className={active==="all"?styles.filterActive:""} aria-pressed={active==="all"} onClick={()=>setActive("all")}>All</button>
      {filters.map(filter=><button type="button" className={active===filter.key?styles.filterActive:""} aria-pressed={active===filter.key} onClick={()=>setActive(filter.key)} key={filter.key}>{filter.label}</button>)}
    </div>

    <div className={styles.directoryCompetitionGrid}>
      {visible.map(item=><Link className={styles.directoryCompetitionCard} href={item.href} key={item.slug}>
        <span className={styles.competitionMark} aria-hidden="true">{initials(item.name)}</span>
        <span className={styles.competitionCopy}>
          <strong>{item.name}</strong>
          <span>{item.season??item.filterLabel}</span>
          <small>
            {item.eventCount>0?`${item.eventCount} ${eventNoun}`:"Schedule pending"}
            {item.confirmedListings>0?` · ${item.confirmedListings} TV`:""}
          </small>
        </span>
        <b aria-hidden="true">›</b>
      </Link>)}
    </div>
  </>;
}
