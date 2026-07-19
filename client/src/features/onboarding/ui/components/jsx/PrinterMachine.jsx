import styles from "../css/PrinterMachine.module.css";
import typewriter from "../../../../../assets/typewriter.png";

export default function PrinterMachine() {
  return (
    <div className={styles.machine}>
      <img
        src={typewriter}
        alt="Duevora Printer"
        className={styles.image}
        draggable={false}
      />
    </div>
  );
}
