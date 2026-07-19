import styles from "../css/FormField.module.css";

export function FormField({ label, optional, error, children }) {
  return (
    <div className={styles.field}>
      {label && (
        <label className={styles.label}>
          {label}
          {optional && <span className={styles.optionalBadge}>Optional</span>}
        </label>
      )}
      {children}
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
}

export function TextInput({ error, ...props }) {
  return (
    <input
      className={`${styles.input} ${error ? styles.inputError : ""}`}
      {...props}
    />
  );
}

export function TextArea({ error, ...props }) {
  return (
    <textarea
      className={`${styles.textarea} ${error ? styles.inputError : ""}`}
      {...props}
    />
  );
}
