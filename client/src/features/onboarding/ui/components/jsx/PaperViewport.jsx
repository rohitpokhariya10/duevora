import { forwardRef } from "react";
import styles from "../css/PaperViewport.module.css";

const PaperViewport = forwardRef(function PaperViewport({ children, style }, ref) {
  return (
    <div className={styles.viewport} ref={ref} style={style}>
      <div className={styles.strip}>
        {children}
      </div>
    </div>
  );
});

export default PaperViewport;
