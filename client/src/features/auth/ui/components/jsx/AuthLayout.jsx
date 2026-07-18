import { useState } from "react";
import BackgroundGrid from "./BackgroundGrid";
import BlueprintDecorations from "./BlueprintDecorations";
import InvoiceHeader from "./InvoiceHeader";
import Divider from "./Divider";
import WelcomeSection from "./WelcomeSection";
import BarcodeSection from "./BarcodeSection";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";
import AuthSwitch from "./AuthSwitch";
import FooterSection from "./FooterSection";
import ReceiptEdge from "./ReceiptEdge";
import useAuth from "../../../hooks/useAuth";
import styles from "../css/AuthLayout.module.css";

export default function AuthLayout({ initialMode = "login" }) {
  const [mode, setMode] = useState(initialMode);
  const { login, signup, loginWithGoogle, isLoading } = useAuth();

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
            <WelcomeSection mode={mode} />
            <BarcodeSection />
          </div>

          <Divider />

          <AuthSwitch mode={mode} onSwitch={setMode} />

          {mode === "login" ? (
            <LoginForm
              onLogin={login}
              onGoogleLogin={loginWithGoogle}
              isLoading={isLoading}
            />
          ) : (
            <SignupForm
              onSignup={signup}
              onGoogleLogin={loginWithGoogle}
              isLoading={isLoading}
            />
          )}

          <Divider />

          <FooterSection />

          <ReceiptEdge position="bottom" />
        </div>
      </div>
    </>
  );
}
