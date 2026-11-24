import { Snowflake } from "lucide-react";
import styles from "./SectionDivider.module.css";

export default function SectionDivider({
  variant = "solid",
}: {
  variant?: "solid" | "fadeDown" | "fadeUp";
}) {
  const rail = (
    <span className={styles.rail}>
      <i /><i /><i />
    </span>
  );

  return (
    <div className={styles.divider} data-section-divider={variant} aria-hidden="true">
      <div className={styles.rails}>
        {rail}
        <span className={styles.ornament}>
          <i className={styles.bead} />
          <i className={styles.diamond}><Snowflake strokeWidth={2} /></i>
          <i className={styles.bead} />
        </span>
        {rail}
      </div>
    </div>
  );
}
