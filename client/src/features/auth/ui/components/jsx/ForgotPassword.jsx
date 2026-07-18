import { useNavigate } from "react-router";
import styles from "../css/ForgotPassword.module.css";

export default function ForgotPassword() {
  const navigate = useNavigate();
  return (
    <a href="/forgot-password" onClick={(e) => { e.preventDefault(); navigate("/forgot-password"); }} className={styles.link}>
      Forgot password?
    </a>
  );
}
