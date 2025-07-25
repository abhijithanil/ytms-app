import React, { createContext, useState, useContext, useEffect } from "react";
import api,  { authAPI } from "../services/api";
import toast from "react-hot-toast";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const response = await api.get("/auth/me");
      setUser(response.data);
    } catch (error) {
      console.error("Failed to fetch current user:", error);
      localStorage.removeItem("token");
      delete api.defaults.headers.common["Authorization"];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    try {
      const response = await api.post("/auth/login", credentials);
      const { accessToken, user: userData, mfaRequired } = response.data;

      if (mfaRequired) {
        return {
          success: true,
          mfaRequired: true,
          username: credentials.username,
        };
      }

      localStorage.setItem("token", accessToken);
      api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
      setUser(userData);

      toast.success(`Welcome back, ${userData.username}!`);
      return { success: true, mfaRequired: false };
    } catch (error) {
      const message = error.response?.data?.message || "Login failed";
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const loginWithMfa = async (verificationData) => {
    try {
      const response = await authAPI.loginVerify(verificationData);
      const { accessToken, user: userData } = response.data;

      localStorage.setItem("token", accessToken);
      api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
      setUser(userData);

      toast.success(`Welcome back, ${userData.username}!`);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || "Verification failed";
      toast.error(message);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      await api.post("/auth/register", userData);
      toast.success("Registration successful! Please login.");
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || "Registration failed";
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    delete api.defaults.headers.common["Authorization"];
    setUser(null);
    toast.success("Logged out successfully");
  };

  const value = {
    user,
    loading,
    login,
    loginWithMfa,
    register,
    logout,
    fetchCurrentUser,
    isAdmin: user?.role === "ADMIN",
    isEditor: user?.role === "EDITOR",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
