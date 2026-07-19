import styles from "../css/InvoiceMeta.module.css";

const now = new Date();
const formattedDate = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();

export default function InvoiceMeta() {
  return (
    <div className={styles.meta}>
      <div className={styles.row}>
        <span className={styles.label}>INVOICE #</span>
        <span className={styles.value}>DUEV-{now.getFullYear()}-001</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>DATE</span>
        <span className={styles.value}>{formattedDate}</span>
      </div>
    </div>
  );
}
