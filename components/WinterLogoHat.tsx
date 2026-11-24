import styles from "./WinterLogoHat.module.css";

type HatProps = {
  variant?: "default" | "small" | "wide" | "icon";
  className?: string;
};

export default function WinterLogoHat({ variant = "default", className }: HatProps) {
  return <span aria-hidden="true" data-variant={variant} className={`${styles.hat} ${className ?? ""}`} />;
}
