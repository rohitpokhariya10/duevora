import { useState } from "react";
import styles from "../css/ForgotPasswordForm.module.css";
import InputField from "./InputField";
import LoginButton from "./LoginButton";
import SwitchText from "./SwitchText";

export default function ForgotPasswordForm({ onSubmit, onBack, isLoading }) {
  const [email, setEmail] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(email);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <InputField
        label="EMAIL"
        type="email"
        name="email"
        placeholder="Enter your registered email"
        icon="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <LoginButton isLoading={isLoading} text="SEND RESET LINK" />

      <SwitchText
        text="Remember your password?"
        actionText="Login"
        onSwitch={onBack}
      />
    </form>
  );
}
