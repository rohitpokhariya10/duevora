import { useRef, useState } from "react";
import styles from "../css/VerificationCode.module.css";

const LENGTH = 6;

export default function VerificationCode({ value, onChange }) {
  const [digits, setDigits] = useState(Array(LENGTH).fill(""));
  const inputsRef = useRef([]);

  const handleChange = (index, val) => {
    if (val.length > 1) val = val.slice(-1);
    if (val && !/^\d$/.test(val)) return;

    const next = [...digits];
    next[index] = val;
    setDigits(next);
    onChange(next.join(""));

    if (val && index < LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    if (!pasted) return;

    const next = Array(LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    onChange(next.join(""));

    const focusIdx = Math.min(pasted.length, LENGTH - 1);
    inputsRef.current[focusIdx]?.focus();
  };

  return (
    <div className={styles.codeGroup}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          className={`${styles.input} ${digit ? styles.inputFilled : ""}`}
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
}
