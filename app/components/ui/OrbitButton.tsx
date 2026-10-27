import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./OrbitButton.module.css";

type OrbitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
};

export default function OrbitButton({
  variant="secondary", size="md", loading=false, disabled=false,
  icon, children, className="", type="button", ...rest
}: OrbitButtonProps) {
  return (
    <button
      {...rest}
      data-orbit-button="true"
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${styles.button} ${styles[variant]} ${styles[size]} ${className}`.trim()}
    >
      {icon && <span className={styles.icon}>{icon}</span>}
      <span>{children}</span>
    </button>
  );
}
