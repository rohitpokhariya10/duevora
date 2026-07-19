import { FormField, TextInput, TextArea } from "../jsx/FormField.jsx";
import styles from "./StepFields.module.css";

export default function StepOptional({ formData, errors, onChange }) {
  return (
    <div className={styles.fields}>
      <FormField label="Address" optional error={errors.address}>
        <TextArea
          name="address"
          placeholder="Enter your business address"
          value={formData.address}
          onChange={onChange}
          rows={2}
        />
      </FormField>

      <FormField label="Logo URL" optional error={errors.logo}>
        <TextInput
          name="logo"
          placeholder="https://example.com/logo.png"
          value={formData.logo}
          onChange={onChange}
        />
      </FormField>
    </div>
  );
}
