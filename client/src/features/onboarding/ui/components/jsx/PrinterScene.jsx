import styles from "../css/PrinterScene.module.css";
import BackgroundGrid from "../../../../auth/ui/components/jsx/BackgroundGrid.jsx";
import logo from "../../../../../assets/logo.png";


export default function PrinterScene({ children }) {
  return (
    <div className={styles.scene}>
      <BackgroundGrid />

      <div className={styles.topBar}>
        <div className={styles.brand}>
          <img src={logo} alt="Duevora" className={styles.brandIcon} />
          <div className={styles.brandText}>
            <span className={styles.brandName}>DUEVORA</span>
            <span className={styles.brandTag}>Smart Finance. Simplified.</span>
          </div>
        </div>
      </div>

      <div className={styles.plusDecoration}>+</div>

      <div className={`${styles.accentLine} ${styles.accentLineLeft}`} />
      <div className={`${styles.accentLine} ${styles.accentLineRight}`} />

      {children}

      <div className={styles.helpText}>
        <p className={styles.helpTitle}>Here to help!</p>
        <p className={styles.helpDesc}>
          Our team is always here if you need any assistance.
        </p>
        <div className={styles.helpLine} />
      </div>
    </div>
  );
}
