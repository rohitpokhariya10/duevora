import { FormField, TextInput } from "../jsx/FormField.jsx";
import styles from "./StepFields.module.css";

export default function StepBusinessSetup({ formData, errors, onChange }) {
  return (
    <div className={styles.fields}>
      <FormField label="Business Type" optional error={errors.businessType}>
        <TextInput
          name="businessType"
          placeholder="e.g. LLC, Corporation, Sole Proprietor"
          value={formData.businessType || ""}
          onChange={onChange}
        />
      </FormField>

      <FormField label="Industry" optional error={errors.industry}>
        <TextInput
          name="industry"
          placeholder="e.g. Technology, Retail, Services"
          value={formData.industry || ""}
          onChange={onChange}
        />
      </FormField>

      <FormField label="Phone Number" optional error={errors.phone}>
        <TextInput
          name="phone"
          placeholder="+1 (555) 000-0000"
          value={formData.phone || ""}
          onChange={onChange}
        />
      </FormField>
    </div>
  );
}
