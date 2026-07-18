import { useState } from "react";
import styles from "../css/SignupForm.module.css";
import InputField from "./InputField";
import PasswordField from "./PasswordField";
import LoginButton from "./LoginButton";
import Separator from "./Separator";
import GoogleButton from "./GoogleButton";
import SwitchText from "./SwitchText";

export default function SignupForm({ onSignup, onGoogleLogin, isLoading, onSwitch }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSignup(name, email, password);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <InputField
        label="NAME"
        type="text"
        name="name"
        placeholder="Enter your full name"
        icon="person"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

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

      <LoginButton isLoading={isLoading} text="SIGNUP" />

      <SwitchText
        text="Already have an account?"
        actionText="Login"
        onSwitch={onSwitch}
      />

      <Separator text="OR" />

      <GoogleButton onClick={onGoogleLogin} />
    </form>
  );
}
