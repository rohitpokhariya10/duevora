import styles from "./StepFields.module.css";

const ROWS = [
  { label: "Organization", key: "name" },
  { label: "Code", key: "code" },
  { label: "Address", key: "address" },
  { label: "Logo", key: "logo" },
  { label: "First Name", key: "firstName" },
  { label: "Last Name", key: "lastName" },
  { label: "Business Type", key: "businessType" },
  { label: "Industry", key: "industry" },
  { label: "Phone", key: "phone" },
];

export default function StepReview({ formData }) {
  return (
    <div className={styles.summaryGrid}>
      {ROWS.map(({ label, key }) => {
        const val = formData[key];
        return (
          <div key={key} className={styles.summaryItem}>
            <span className={styles.summaryLabel}>{label}</span>
            <span className={`${styles.summaryValue} ${!val ? styles.summaryValueEmpty : ""}`}>
              {val || "Not provided"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
