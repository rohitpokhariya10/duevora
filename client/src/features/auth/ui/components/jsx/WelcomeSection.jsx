import styles from "../css/WelcomeSection.module.css";

export default function WelcomeSection({ mode = "login" }) {
  const isLogin = mode === "login";

  return (
    <div className={styles.section}>
      <div className={styles.info}>
        <div className={styles.billTo}>BILL TO:</div>
        <h2 className={styles.heading}>
          {isLogin ? "Welcome Back!" : "Create Account!"}
        </h2>
        <p className={styles.description}>
          {isLogin
            ? "Please sign in to continue"
            : "Fill in the details to get started"}
        </p>
      </div>
    </div>
  );
}
