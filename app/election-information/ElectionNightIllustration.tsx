import Image from "next/image";
import pendingArt from "@/public/images/election-results/referee-cutout.webp";
import passArt from "@/public/images/election-results/referee-pass.webp";
import failArt from "@/public/images/election-results/referee-fail.webp";
import styles from "./Results.module.css";

const illustrations = {
  pending: {
    image: pendingArt,
    alt: "Referee with crossed arms above the words “Too close to call.”",
    caption: "Election night · Nov. 3, 2026",
  },
  yes: {
    image: passArt,
    alt: "Referee signaling a touchdown above the word “PASS.”",
    caption: "Certified result · Referendum passed",
  },
  no: {
    image: failArt,
    alt: "Referee signaling a missed field goal above the word “FAIL.”",
    caption: "Certified result · Referendum did not pass",
  },
};

export default function ElectionNightIllustration({ outcome }: { outcome: keyof typeof illustrations | "tie" }) {
  if (outcome === "tie") {
    return <figure className={styles.illustration}>
      <strong className={styles.tieMark}>TIE</strong>
      <figcaption className={styles.artDate}>Certified result · Equal Yes and No votes</figcaption>
    </figure>;
  }
  const { image, alt, caption } = illustrations[outcome];
  return <figure className={styles.illustration}>
    <Image
      src={image}
      alt={alt}
      sizes={outcome === "no"
        ? "(max-width: 599px) 90vw, (max-width: 979px) 40vw, 500px"
        : "(max-width: 599px) 230px, (max-width: 979px) 260px, 410px"}
      className={outcome === "no" ? styles.wideReferee : styles.referee}
      loading="eager"
    />
    <figcaption className={styles.artDate}>{caption}</figcaption>
  </figure>;
}
