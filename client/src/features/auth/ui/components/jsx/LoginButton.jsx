import { MdArrowForward } from "react-icons/md";
import styles from "../css/LoginButton.module.css";

export default function LoginButton({ isLoading, text = "LOGIN" }) {
  return (
    <button
      type="submit"
      className={styles.button}
      disabled={isLoading}
    >
      <span>{isLoading ? "LOADING..." : text}</span>
      {!isLoading && (
        <span className={styles.buttonIcon}>
          <MdArrowForward />
        </span>
      )}
    </button>
  );
}
