import api from "../../../lib/api";

export const onboardingApi = {
  onboard: (data) => api.post("/organization", data),
  getOrganization: () => api.get("/organization"),
};
