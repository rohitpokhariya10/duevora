import { FormField, TextInput } from "../jsx/FormField.jsx";
import styles from "./StepFields.module.css";

export default function StepContacts({ formData, errors, onChange }) {
  return (
    <div className={styles.fields}>
      <FormField label="First Name" error={errors.firstName}>
        <TextInput
          name="firstName"
          placeholder="Enter your first name"
          value={formData.firstName}
          onChange={onChange}
          error={errors.firstName}
        />
      </FormField>

      <FormField label="Last Name" error={errors.lastName}>
        <TextInput
          name="lastName"
          placeholder="Enter your last name"
          value={formData.lastName}
          onChange={onChange}
          error={errors.lastName}
        />
      </FormField>
    </div>
  );
}
