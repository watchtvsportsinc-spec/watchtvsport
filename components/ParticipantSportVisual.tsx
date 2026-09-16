import type { ParticipantPatternStyle, ParticipantVisualProfile } from "@/lib/participant-visuals";
import { defaultParticipantVisual } from "@/lib/participant-visuals";

type Props = {
  sport: string;
  label: string;
  countryCode?: string;
  visual?: ParticipantVisualProfile | null;
  size?: "sm" | "md" | "lg" | "hero";
};

const SIZES = { sm: 42, md: 58, lg: 82, hero: 118 } as const;

function patternElements(pattern: ParticipantPatternStyle, secondary: string, accent: string) {
  if (pattern === "center_stripe") return <><rect x="49" y="20" width="22" height="78" fill={secondary}/><rect x="55" y="20" width="10" height="78" fill={accent}/></>;
  if (pattern === "vertical_stripes") return <>{[24,40,56,72,88].map((x,i)=><rect key={x} x={x} y="18" width="9" height="82" fill={i%2===0?secondary:accent} opacity=".95"/>)}</>;
  if (pattern === "horizontal_hoops") return <>{[34,52,70,88].map((y,i)=><rect key={y} x="16" y={y} width="88" height="10" fill={i%2===0?secondary:accent}/>)}</>;
  if (pattern === "half_and_half") return <><rect x="60" y="16" width="60" height="90" fill={secondary}/><rect x="57" y="16" width="6" height="90" fill={accent}/></>;
  if (pattern === "sash") return <polygon points="22,25 38,18 98,96 82,103" fill={secondary}/>;
  if (pattern === "sleeves_contrast") return <><rect x="8" y="18" width="28" height="44" rx="8" fill={secondary}/><rect x="84" y="18" width="28" height="44" rx="8" fill={secondary}/><rect x="16" y="52" width="20" height="5" fill={accent}/><rect x="84" y="52" width="20" height="5" fill={accent}/></>;
  if (pattern === "side_panels") return <><path d="M24 28L38 23V98H25Z" fill={secondary}/><path d="M96 28L82 23V98H95Z" fill={secondary}/><path d="M31 29H36V96H31ZM84 29H89V96H84Z" fill={accent}/></>;
  if (pattern === "pinstripes") return <>{[31,43,55,67,79,91].map(x=><rect key={x} x={x} y="20" width="2" height="80" fill={secondary} opacity=".9"/>)}</>;
  if (pattern === "checker") return <>{[0,1,2,3].flatMap(r=>[0,1,2,3].map(c=><rect key={`${r}-${c}`} x={30+c*15} y={28+r*16} width="15" height="16" fill={(r+c)%2===0?secondary:accent} opacity=".9"/>))}</>;
  if (pattern === "gradient") return <rect x="18" y="52" width="84" height="48" fill={secondary} opacity=".45"/>;
  if (pattern === "flag_split") return <><rect x="18" y="20" width="42" height="82" fill={secondary}/><rect x="60" y="20" width="42" height="82" fill={accent}/></>;
  return null;
}

function Garment({ family, primary, secondary, accent, pattern, clipId }: { family:string;primary:string;secondary:string;accent:string;pattern:ParticipantPatternStyle;clipId:string }) {
  const patternGroup = <g clipPath={`url(#${clipId})`}>{patternElements(pattern,secondary,accent)}</g>;

  if (family === "basketball_jersey") {
    const d="M38 18L50 12H70L82 18L93 38L82 46V103H38V46L27 38Z";
    return <><defs><clipPath id={clipId}><path d={d}/></clipPath></defs><path d={d} fill={primary}/>{patternGroup}<path d="M51 13Q60 28 69 13" fill="#07111d" opacity=".9"/><path d={d} fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="2"/></>;
  }
  if (family === "hockey_sweater") {
    const d="M34 19L50 12H70L86 19L111 36L100 57L88 49V104H32V49L20 57L9 36Z";
    return <><defs><clipPath id={clipId}><path d={d}/></clipPath></defs><path d={d} fill={primary}/>{patternGroup}<path d="M47 14Q60 29 73 14" fill="#07111d" opacity=".65"/><rect x="31" y="84" width="58" height="7" fill={accent} opacity=".9"/><path d={d} fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="2"/></>;
  }
  if (family === "gridiron_jersey") {
    const d="M29 24L43 13H77L91 24L108 38L97 58L88 51V104H32V51L23 58L12 38Z";
    return <><defs><clipPath id={clipId}><path d={d}/></clipPath></defs><path d={d} fill={primary}/>{patternGroup}<path d="M34 21L47 15H73L86 21L80 36H40Z" fill={secondary} opacity=".95"/><path d="M46 15Q60 27 74 15" fill="#07111d" opacity=".65"/><path d={d} fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="2"/></>;
  }
  if (family === "tennis_kit") {
    const shirt="M35 14L49 9H71L85 14L104 29L94 46L84 40V67H36V40L26 46L16 29Z";
    const shorts="M39 70H81L86 105H64L60 83L56 105H34Z";
    return <><defs><clipPath id={clipId}><path d={shirt}/><path d={shorts}/></clipPath></defs><path d={shirt} fill={primary}/><path d={shorts} fill={secondary}/>{patternGroup}<path d="M49 10Q60 23 71 10" fill="#07111d" opacity=".55"/><path d={shirt} fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="2"/><path d={shorts} fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="2"/></>;
  }
  if (family === "rugby_shirt") {
    const d="M32 18L47 11H73L88 18L107 34L96 54L87 47V104H33V47L24 54L13 34Z";
    return <><defs><clipPath id={clipId}><path d={d}/></clipPath></defs><path d={d} fill={primary}/>{patternGroup}<path d="M48 12L60 26L72 12L68 29H52Z" fill={secondary}/><path d={d} fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="2"/></>;
  }
  if (family === "baseball_jersey") {
    const d="M34 17L48 10H72L86 17L105 32L95 50L85 44V104H35V44L25 50L15 32Z";
    return <><defs><clipPath id={clipId}><path d={d}/></clipPath></defs><path d={d} fill={primary}/>{patternGroup}<path d="M60 15V103" stroke={secondary} strokeWidth="3"/><circle cx="60" cy="37" r="1.8" fill={accent}/><circle cx="60" cy="54" r="1.8" fill={accent}/><circle cx="60" cy="71" r="1.8" fill={accent}/><path d="M48 11Q60 25 72 11" fill="#07111d" opacity=".55"/><path d={d} fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="2"/></>;
  }
  if (family === "racing_helmet") {
    return <><path d="M24 67C24 35 41 17 68 17C91 17 104 34 104 56V78H89L80 99H42C31 99 24 91 24 80Z" fill={primary}/><path d="M39 35C52 24 75 24 90 36L96 52H45Z" fill="#07111d"/><path d="M45 52H99V65H53Z" fill={secondary} opacity=".95"/><path d="M62 18L71 18L82 54H72Z" fill={accent}/><path d="M24 67C24 35 41 17 68 17C91 17 104 34 104 56V78H89L80 99H42C31 99 24 91 24 80Z" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2"/></>;
  }
  if (family === "mma_gloves") {
    return <><g transform="translate(5 5)"><path d="M18 65C15 50 22 35 36 29C48 24 59 31 62 42L66 55L57 72L31 80C24 79 20 74 18 65Z" fill={primary}/><path d="M27 69L58 58L62 72L33 84Z" fill={secondary}/><path d="M26 35L48 29L54 42L32 49Z" fill={accent}/></g><g transform="translate(110 5) scale(-1 1)"><path d="M18 65C15 50 22 35 36 29C48 24 59 31 62 42L66 55L57 72L31 80C24 79 20 74 18 65Z" fill={primary}/><path d="M27 69L58 58L62 72L33 84Z" fill={secondary}/><path d="M26 35L48 29L54 42L32 49Z" fill={accent}/></g></>;
  }

  const d="M34 18L49 11H71L86 18L106 34L96 54L86 47V104H34V47L24 54L14 34Z";
  return <><defs><clipPath id={clipId}><path d={d}/></clipPath></defs><path d={d} fill={primary}/>{patternGroup}<path d="M49 12Q60 26 71 12" fill="#07111d" opacity=".6"/><path d={d} fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="2"/></>;
}

export default function ParticipantSportVisual({ sport, label, countryCode, visual, size="md" }: Props) {
  const resolved = visual ?? defaultParticipantVisual(sport,countryCode);
  const px = SIZES[size];
  const fluidHero = size === "hero";
  const clipId = `pv-${label.toLowerCase().replace(/[^a-z0-9]+/g,"-").slice(0,28)}-${resolved.renderFamily}`;
  return (
    <span role="img" aria-label={`${label} visual`} title={resolved.visualStatus === "verified" ? `${label} verified visual palette` : `${label} WatchTVSport visual`} style={{display:"inline-grid",placeItems:"center",width:fluidHero?"100%":px,height:fluidHero?"100%":px,flex:"0 0 auto"}}>
      <svg viewBox="0 0 120 120" width={fluidHero?"84%":px} height={fluidHero?"84%":px} aria-hidden="true" focusable="false" style={{maxWidth:"100%",maxHeight:"100%",filter:"drop-shadow(0 8px 12px rgba(0,0,0,.28))"}}>
        <Garment family={resolved.renderFamily} primary={resolved.primaryColor} secondary={resolved.secondaryColor} accent={resolved.accentColor} pattern={resolved.patternStyle} clipId={clipId}/>
      </svg>
    </span>
  );
}
