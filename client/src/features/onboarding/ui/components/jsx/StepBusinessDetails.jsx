import { FormField, TextInput } from "../jsx/FormField.jsx";
import styles from "./StepFields.module.css";

export default function StepBusinessDetails({ formData, errors, onChange }) {
  return (
    <div className={styles.fields}>
      <FormField label="Organization Name" error={errors.name}>
        <TextInput
          name="name"
          placeholder="Enter your organization name"
          value={formData.name}
          onChange={onChange}
          error={errors.name}
        />
      </FormField>

      <FormField label="Organization Code" error={errors.code}>
        <TextInput
          name="code"
          placeholder="e.g. DVRA"
          value={formData.code}
          onChange={onChange}
          error={errors.code}
          maxLength={10}
        />
      </FormField>
    </div>
  );
}
