import styles from "../css/BarcodeSection.module.css";

const BAR_WIDTHS = [2, 1, 3, 1, 2, 1, 3, 2, 1, 3, 1, 2, 3, 1, 2, 1, 3, 1, 2, 3, 1, 2, 1, 3, 2, 1, 3, 1, 2, 1, 3, 2];

export default function BarcodeSection() {
  return (
    <div className={styles.barcode}>
      <div className={styles.bars} aria-hidden="true">
        {BAR_WIDTHS.map((width, i) => (
          <div
            key={i}
            className={styles.bar}
            style={{ width: `${width}px` }}
          />
        ))}
      </div>
      <div className={styles.invoiceId}>DUEV {new Date().getFullYear()} 001</div>
    </div>
  );
}
