import { useState, useCallback } from "react";

export default function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      // TODO: Integrate with auth API
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return { success: true };
    } catch (err) {
      setError(err.message || "Login failed");
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // TODO: Integrate with Google OAuth
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return { success: true };
    } catch (err) {
      setError(err.message || "Google login failed");
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(async (name, email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      // TODO: Integrate with auth API
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return { success: true };
    } catch (err) {
      setError(err.message || "Signup failed");
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { login, signup, loginWithGoogle, isLoading, error };
}
