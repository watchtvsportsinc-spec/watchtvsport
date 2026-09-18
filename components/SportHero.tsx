import type { CSSProperties } from "react";
import styles from "./sport-hero.module.css";

export type SportHeroStat = {
  icon: "competition" | "calendar" | "live" | "next" | "event" | "organization" | "future";
  value: string | number;
  label: string;
  detail?: string;
  tone?: "default" | "live" | "next";
};

type SportHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  backdrop: string;
  titleId?: string;
  backgroundPosition?: string;
  stats?: SportHeroStat[];
};

function iconFor(kind: SportHeroStat["icon"]) {
  if (kind === "calendar") return "▦";
  if (kind === "live") return "●";
  if (kind === "next") return "◷";
  if (kind === "event") return "◇";
  if (kind === "organization") return "◆";
  if (kind === "future") return "＋";
  return "♜";
}

export default function SportHero({
  eyebrow,
  title,
  description,
  backdrop,
  titleId,
  backgroundPosition = "center center",
  stats = [],
}: SportHeroProps) {
  const style = {
    "--sport-hero-image": `url('${backdrop}')`,
    "--sport-hero-position": backgroundPosition,
  } as CSSProperties;

  return (
    <section className={styles.hero} aria-labelledby={titleId} style={style}>
      <div className={styles.content}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 id={titleId}>{title}</h1>
        <p className={styles.description}>{description}</p>
      </div>

      {stats.length > 0 ? (
        <div className={styles.stats} aria-label={`${title} overview`}>
          {stats.slice(0, 3).map((stat, index) => (
            <div
              className={`${styles.stat} ${stat.tone === "live" ? styles.live : stat.tone === "next" ? styles.next : ""}`}
              key={`${stat.label}-${index}`}
            >
              <span className={styles.statIcon} aria-hidden="true">{iconFor(stat.icon)}</span>
              <span className={styles.statText}>
                <span className={styles.statTop}>
                  <strong>{stat.value}</strong>
                  <small>{stat.label}</small>
                </span>
                {stat.detail ? <span className={styles.statDetail}>{stat.detail}</span> : null}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
