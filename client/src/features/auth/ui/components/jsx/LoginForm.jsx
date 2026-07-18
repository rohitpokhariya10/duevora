import { useState } from "react";
import styles from "../css/LoginForm.module.css";
import InputField from "./InputField";
import PasswordField from "./PasswordField";
import ForgotPassword from "./ForgotPassword";
import LoginButton from "./LoginButton";
import Separator from "./Separator";
import GoogleButton from "./GoogleButton";
import SwitchText from "./SwitchText";

export default function LoginForm({ onLogin, onGoogleLogin, isLoading, onSwitch }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <InputField
        label="EMAIL"
        type="email"
        name="email"
        placeholder="Enter your email"
        icon="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <PasswordField
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <ForgotPassword />

      <LoginButton isLoading={isLoading} />

      <SwitchText
        text="Don't have an account?"
        actionText="Signup"
        onSwitch={onSwitch}
      />

      <Separator text="OR" />

      <GoogleButton onClick={onGoogleLogin} />
    </form>
  );
}
