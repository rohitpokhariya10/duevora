import styles from "../css/NextButton.module.css";

export default function NextButton({ onClick, disabled, isLast, isLoading }) {
  return (
    <button
      type="button"
      className={isLast ? styles.submitButton : styles.button}
      onClick={onClick}
      disabled={disabled || isLoading}
    >
      <span>{isLast ? (isLoading ? "Creating..." : "Finish") : "Next"}</span>
      {!isLast && <span className={styles.arrow}>&rarr;</span>}
    </button>
  );
}
