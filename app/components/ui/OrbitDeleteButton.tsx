"use client";

import OrbitNavIcon from "../OrbitNavIcon";
import styles from "./OrbitDeleteButton.module.css";

type Props = {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  className?: string;
};

/** Uniform destructive row action: icon only visually, full accessible label. */
export default function OrbitDeleteButton({
  onClick, label, disabled = false, className = "",
}: Props) {
  return (
    <button
      type="button"
      className={`${styles.deleteButton} ${className}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      <OrbitNavIcon name="trash" />
    </button>
  );
}
