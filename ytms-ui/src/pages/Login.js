import React, { useState } from "react";
import { authAPI } from "../services/api";
import { Video, Eye, EyeOff, Shield, ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [mfaRequired, setMfaRequired] = useState(false);
  const [userForMfa, setUserForMfa] = useState(null);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    otp: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMfaVerifying, setIsMfaVerifying] = useState(false);
  const [errors, setErrors] = useState({});
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      const response = await login(formData);

      if (response.mfaRequired) {
        // If MFA is required, switch to the OTP view
        setMfaRequired(true);
        setUserForMfa(response.user || { username: response.username }); // Store user info for MFA verification
      } else {
        // Otherwise, login is complete
        window.location.reload();
      }
    } catch (error) {
      console.error("Login error:", error);

      // Handle API errors
      if (error.response?.data?.message) {
        setErrors({ general: error.response.data.message });
      } else {
        setErrors({ general: "Login failed. Please try again." });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setIsMfaVerifying(true);
    setErrors({});

    try {
      // Parse OTP to integer as expected by backend
      const token = parseInt(formData.otp);

      if (isNaN(token) || formData.otp.length !== 6) {
        setErrors({ otp: "Please enter a valid 6-digit code" });
        return;
      }

      // const response = await authAPI.loginVerify({
      //   userId: userForMfa.username,
      //   token: token,
      // });
      const response = await authAPI.loginVerify({
        username: userForMfa.username,
        token: token,
      });

      if (response.status == 200) {
        // MFA verification successful, complete login
        localStorage.setItem("token", response.data.accessToken);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        window.location.reload();
      }
    } catch (error) {
      console.error("MFA verification error:", error);

      if (error.response?.data?.message) {
        setErrors({ otp: error.response.data.message });
      } else {
        setErrors({ otp: "Invalid verification code. Please try again." });
      }
    } finally {
      setIsMfaVerifying(false);
    }
  };

  const handleBackToLogin = () => {
    setMfaRequired(false);
    setUserForMfa(null);
    setFormData({ ...formData, otp: "" });
    setErrors({});
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
          callback: handleGoogleCallback,
        });
        window.google.accounts.id.prompt();
      } else {
        console.error("Google Sign-In not loaded");
        setErrors({
          general: "Google Sign-In is not available. Please try again.",
        });
      }
    } catch (error) {
      console.error("Google Sign-In error:", error);
      setErrors({ general: "Google Sign-In failed. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleCallback = async (response) => {
    try {
      const result = await fetch(
        `${
          process.env.REACT_APP_API_URL || "http://localhost:8080/api"
        }/auth/google`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: response.credential,
          }),
        }
      );

      const data = await result.json();

      if (result.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        window.location.reload();
      } else {
        setErrors({ general: data.message || "Google Sign-In failed" });
      }
    } catch (error) {
      console.error("Google callback error:", error);
      setErrors({ general: "Google Sign-In failed. Please try again." });
    }
  };

  const navigateToSignup = () => {
    navigate("/signup");
  };

  // MFA Verification Form
  if (mfaRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Logo and Header */}
          <div className="text-center">
            <div className="flex justify-center">
              <div className="flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl shadow-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              Multi-Factor Authentication
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          {/* MFA Verification Form */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <form className="space-y-6" onSubmit={handleVerifyCode}>
              {/* Error Message */}
              {errors.otp && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600 text-sm">{errors.otp}</p>
                </div>
              )}

              {/* User Info */}
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  Signed in as:{" "}
                  <span className="font-medium text-gray-900">
                    {userForMfa?.username}
                  </span>
                </p>
              </div>

              {/* OTP Input */}
              <div>
                <label
                  htmlFor="otp"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Verification Code
                </label>
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength="6"
                  required
                  value={formData.otp}
                  onChange={handleChange}
                  className="input-field text-center text-lg font-mono tracking-widest"
                  placeholder="000000"
                  autoComplete="one-time-code"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              {/* Buttons */}
              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={isMfaVerifying || formData.otp.length !== 6}
                  className="w-full btn-primary flex justify-center py-3 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isMfaVerifying ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Verifying...</span>
                    </div>
                  ) : (
                    "Verify & Sign in"
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="w-full flex justify-center items-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </button>
              </div>
            </form>

            {/* Help Section */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                Having trouble?
              </h4>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Make sure your device's time is synchronized</li>
                <li>• Try generating a new code in your authenticator app</li>
                <li>• Contact your administrator if you've lost access</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular Login Form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Header */}
        <div className="text-center">
          <div className="flex justify-center">
            <div className="flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl shadow-lg">
              <Video className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Welcome to YTManager
          </h2>
          <p className="mt-2 text-sm text-gray-600">Video Management Studio</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Error Message */}
            {errors.general && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600 text-sm">{errors.general}</p>
              </div>
            )}

            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={formData.username}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="input-field pr-10"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-sm text-gray-900"
                >
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a
                  href="#"
                  className="font-medium text-primary-600 hover:text-primary-500"
                >
                  Forgot your password?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary flex justify-center py-3 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  "Sign in"
                )}
              </button>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Google Sign-In Button */}
            <div>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex justify-center items-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="#4285f4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34a853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#fbbc05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#ea4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </button>
            </div>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2 font-medium">
              Demo Credentials:
            </p>
            <div className="space-y-1 text-xs text-gray-500">
              <p>
                <strong>Admin:</strong> admin / password123
              </p>
              <p>
                <strong>Editor:</strong> editor1 / password123
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>
            Don't have an account?{" "}
            <button
              onClick={navigateToSignup}
              className="font-medium text-primary-600 hover:text-primary-500 underline bg-transparent border-none cursor-pointer"
            >
              Create account
            </button>
          </p>
          <p className="mt-2">
            Or{" "}
            <a
              href="#"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              contact your administrator
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
