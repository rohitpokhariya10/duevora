import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  currentStep: 0,
  totalSteps: 5,
  isCompleted: false,
  isSubmitting: false,
  formData: {
    name: "",
    code: "",
    address: "",
    logo: "",
    businessType: "",
    industry: "",
    phone: "",
    firstName: "",
    lastName: "",
  },
};

const onboardingSlice = createSlice({
  name: "onboarding",
  initialState,
  reducers: {
    setFormField(state, action) {
      const { field, value } = action.payload;
      state.formData[field] = value;
    },
    setAllFormFields(state, action) {
      Object.assign(state.formData, action.payload);
    },
    nextStep(state) {
      if (state.currentStep < state.totalSteps - 1) {
        state.currentStep += 1;
      }
    },
    prevStep(state) {
      if (state.currentStep > 0) {
        state.currentStep -= 1;
      }
    },
    goToStep(state, action) {
      const step = action.payload;
      if (step >= 0 && step < state.totalSteps) {
        state.currentStep = step;
      }
    },
    setSubmitting(state, action) {
      state.isSubmitting = action.payload;
    },
    setCompleted(state) {
      state.isCompleted = true;
    },
    resetOnboarding() {
      return initialState;
    },
  },
});

export const {
  setFormField,
  setAllFormFields,
  nextStep,
  prevStep,
  goToStep,
  setSubmitting,
  setCompleted,
  resetOnboarding,
} = onboardingSlice.actions;

export default onboardingSlice.reducer;
