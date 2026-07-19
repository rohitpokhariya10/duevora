import { useRef, useEffect } from "react";
import ReceiptEdge from "../../../../auth/ui/components/jsx/ReceiptEdge.jsx";
import styles from "../css/FallingReceipt.module.css";

const STEP_HEADERS = [
  { num: "01", title: "Business Details" },
  { num: "02", title: "Contacts" },
  { num: "03", title: "Optional Details" },
  { num: "04", title: "Review & Finish" },
];

function FieldRow({ label, value }) {
  return (
    <div className={styles.fieldRow}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldValue}>{value || "\u2014"}</span>
    </div>
  );
}

function StepFields({ stepIndex, formData }) {
  switch (stepIndex) {
    case 0:
      return (
        <>
          <FieldRow label="Organization" value={formData.name} />
          <FieldRow label="Code" value={formData.code} />
        </>
      );
    case 1:
      return (
        <>
          <FieldRow label="First Name" value={formData.firstName} />
          <FieldRow label="Last Name" value={formData.lastName} />
        </>
      );
    case 2:
      return (
        <>
          <FieldRow label="Address" value={formData.address || "Not provided"} />
          <FieldRow label="Logo" value={formData.logo || "Not provided"} />
        </>
      );
    case 3:
      return <div className={styles.reviewLine}>Review submitted</div>;
    default:
      return null;
  }
}

export default function FallingReceipt({
  stepIndex,
  formData,
  startX,
  startY,
  width,
  height,
  tearSide,
  onComplete,
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    let cancelled = false;

    import("gsap").then(({ gsap }) => {
      if (cancelled || !ref.current) return;
      const el = ref.current;

      /*
       * Transform-origin: the corner that was still attached.
       * tear from left  → right corner fixed → origin top-right
       * tear from right → left corner fixed  → origin top-left
       */
      const originX = tearSide === "left" ? "100%" : "0%";

      /* Initial state: at the exact position of the old step */
      gsap.set(el, {
        x: startX,
        y: startY,
        rotation: 0,
        opacity: 1,
        transformOrigin: `${originX} 0%`,
      });

      const tl = gsap.timeline({
        onComplete: () => {
          if (!cancelled && onComplete) onComplete();
        },
      });

      /*
       * Phase 5 — Gravity + Phase 6 — Wind
       * Fall almost vertically. rotation 8° → 18°.
       * Max horizontal drift ±4px total.
       * Wind oscillations: +3px, -2px, +1px (decreasing amplitude).
       */
      const detachRot = tearSide === "left" ? 8 : -8;
      const finalRot = tearSide === "left" ? 18 : -18;
      const driftX = tearSide === "left" ? 4 : -4;

      /* Vertical fall with acceleration */
      tl.to(el, {
        y: startY + window.innerHeight * 1.3,
        rotation: finalRot,
        opacity: 0.85,
        duration: 1.4,
        ease: "power2.in",
      }, 0);

      /* Horizontal: subtle wind oscillations, max ±4px */
      tl.to(el, {
        keyframes: [
          { x: startX + 3, duration: 0.4, ease: "none" },
          { x: startX - 2, duration: 0.35, ease: "none" },
          { x: startX + 1, duration: 0.35, ease: "none" },
          { x: startX + driftX, duration: 0.3, ease: "none" },
        ],
      }, 0);
    });

    return () => { cancelled = true; };
  }, [startX, startY, tearSide, onComplete]);

  const meta = STEP_HEADERS[stepIndex] || STEP_HEADERS[0];

  return (
    <div
      ref={ref}
      className={styles.falling}
      style={{ width: width || 480, minHeight: height || 300 }}
    >
      <ReceiptEdge position="top" />
      <div className={styles.fallingContent}>
        <p className={styles.stepLabel}>
          STEP {String(stepIndex + 1).padStart(2, "0")} OF 04
        </p>
        <p className={styles.stepNumber}>{meta.num}</p>
        <p className={styles.stepTitle}>{meta.title}</p>
        <StepFields stepIndex={stepIndex} formData={formData} />
      </div>
      <ReceiptEdge position="bottom" />
    </div>
  );
}
