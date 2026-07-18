import BackgroundGrid from "./BackgroundGrid";
import BlueprintDecorations from "./BlueprintDecorations";
import InvoiceHeader from "./InvoiceHeader";
import Divider from "./Divider";
import BarcodeSection from "./BarcodeSection";
import ForgotPasswordForm from "./ForgotPasswordForm";
import FooterSection from "./FooterSection";
import ReceiptEdge from "./ReceiptEdge";
import styles from "../css/AuthLayout.module.css";

export default function ForgotPasswordLayout({ onSubmit, onBack, isLoading }) {
  return (
    <>
      <BackgroundGrid />
      <BlueprintDecorations />

      <div className={styles.layout}>
        <div className={styles.card}>
          <ReceiptEdge position="top" />

          <InvoiceHeader />
          <Divider />

          <div className={styles.welcomeRow}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "var(--color-accent)", marginBottom: 6 }}>
                BILL TO:
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text)", margin: "0 0 6px" }}>
                Forgot Password?
              </h2>
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.5 }}>
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>
            </div>
            <BarcodeSection />
          </div>

          <Divider />

          <ForgotPasswordForm onSubmit={onSubmit} onBack={onBack} isLoading={isLoading} />

          <Divider />

          <FooterSection />

          <ReceiptEdge position="bottom" />
        </div>
      </div>
    </>
  );
}
