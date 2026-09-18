import type { CSSProperties } from "react";
import styles from "./sport-hero.module.css";

type SportHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  backdrop: string;
  titleId?: string;
  backgroundPosition?: string;
};

export default function SportHero({
  eyebrow,
  title,
  description,
  backdrop,
  titleId,
  backgroundPosition = "center center",
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
    </section>
  );
}
