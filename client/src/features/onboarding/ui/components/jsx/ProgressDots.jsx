import styles from "../css/ProgressDots.module.css";

export default function ProgressDots({ currentStep, totalSteps, onDotClick }) {
  return (
    <div className={styles.dots}>
      <p className={styles.totalLabel}>Total</p>
      <p className={styles.stepText}>
        Step {currentStep + 1} of {totalSteps}
      </p>
      <div className={styles.dotRow}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <button
            key={i}
            className={`${styles.dotItem} ${
              i === currentStep
                ? styles.dotItemActive
                : i < currentStep
                ? styles.dotItemCompleted
                : ""
            }`}
            onClick={() => onDotClick(i)}
            aria-label={`Go to step ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
