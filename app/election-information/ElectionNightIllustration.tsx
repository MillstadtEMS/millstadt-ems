import Image from "next/image";
import styles from "./Results.module.css";

export default function ElectionNightIllustration({ passed }: { passed: boolean }) {
  return (
    <figure className={styles.illustration}>
      <Image
        src={passed ? "/images/election-results/referee-pass.webp" : "/images/election-results/referee-cutout.webp"}
        alt={passed
          ? "Millstadt EMS referendum passed. The referee raises both arms for a touchdown above the word “Pass.”"
          : "Millstadt EMS election-night artwork. A referee crosses his arms above the words “Too close to call.”"}
        width={1254}
        height={1254}
        sizes="(max-width: 599px) 230px, (max-width: 979px) 260px, 410px"
        className={styles.referee}
        loading="eager"
      />
      <figcaption className={styles.artDate}>
        {passed ? "Official result · Referendum passed" : "Election night · Nov. 3, 2026"}
      </figcaption>
    </figure>
  );
}
