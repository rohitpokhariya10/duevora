import styles from "../css/AuthSwitch.module.css";

export default function AuthSwitch({ mode, onSwitch }) {
  return (
    <div className={styles.switch} role="tablist" aria-label="Authentication mode">
      <button
        type="button"
        role="tab"
        aria-selected={mode === "login"}
        className={`${styles.option} ${mode === "login" ? styles.optionActive : ""}`}
        onClick={() => onSwitch("login")}
      >
        LOGIN
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "signup"}
        className={`${styles.option} ${mode === "signup" ? styles.optionActive : ""}`}
        onClick={() => onSwitch("signup")}
      >
        SIGNUP
      </button>
    </div>
  );
}
