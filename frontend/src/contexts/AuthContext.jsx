import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../api";

const AuthContext = createContext(null);

const getStoredToken = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token");

const saveToken = (token, rememberMe) => {
  if (rememberMe) {
    localStorage.setItem("token", token);
    sessionStorage.removeItem("token");
    return;
  }
  sessionStorage.setItem("token", token);
  localStorage.removeItem("token");
};

const clearToken = () => {
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      api
        .get("/auth/me")
        .then((r) => setUser(r.data.user))
        .catch(() => clearToken())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (identifier, password, rememberMe = false) => {
    const r = await api.post("/auth/login", {
      identifier,
      password,
      remember_me: rememberMe,
    });
    saveToken(r.data.token, rememberMe);
    setUser(r.data.user);
    return r.data.user;
  };

  const register = async ({ name, email, phone, password, confirmPassword }) => {
    const r = await api.post("/auth/register", {
      name,
      email,
      phone,
      password,
      confirm_password: confirmPassword,
    });
    return r.data;
  };

  const sendVerificationEmail = async (email) => {
    const r = await api.post("/auth/send-verification", { email });
    return r.data;
  };

  const verifyEmailToken = async (token) => {
    const r = await api.get("/auth/verify-email", { params: { token } });
    return r.data;
  };

  const forgotPassword = async (identifier) => {
    const r = await api.post("/auth/forgot-password", { identifier });
    return r.data;
  };

  const verifyOtp = async ({ identifier, otp }) => {
    const r = await api.post("/auth/verify-otp", { identifier, otp });
    return r.data;
  };

  const resetPassword = async ({ identifier, otp, password, confirmPassword }) => {
    const r = await api.post("/auth/reset-password", {
      identifier,
      otp,
      password,
      confirm_password: confirmPassword,
    });
    return r.data;
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        sendVerificationEmail,
        verifyEmailToken,
        forgotPassword,
        verifyOtp,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
