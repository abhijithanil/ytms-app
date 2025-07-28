import React, { useState } from "react";
import {
  Video,
  Eye,
  EyeOff,
  User,
  Mail,
  Lock,
  UserSquare,
  Shield,
  Crown,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api, { authAPI } from "../services/api";

// MFA Setup Modal Component (copied from your Signup component)
const MfaSetupModal = ({
  isOpen,
  onClose,
  qrCodeImageUri,
  userId,
  onMfaEnabled,
}) => {
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const handleVerify = async (e) => {
    e.preventDefault();
    setIsVerifying(true);
    try {
      // Use the correct endpoint from your AuthController: /auth/mfa/verify
      await api.post('/auth/mfa/verify', { userId, token: parseInt(otp) });
      toast.success("Admin account created and MFA enabled successfully!");
      onMfaEnabled();
      onClose();
    } catch (error) {
      console.error("MFA verification error:", error);
      toast.error("Invalid OTP. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSkip = () => {
    toast.success(
      "Admin account created successfully! You can enable MFA later in settings."
    );
    onMfaEnabled();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Setup Multi-Factor Authentication
          </h2>
          <p className="text-gray-600">
            Scan this QR code with your authenticator app (Google Authenticator,
            Authy, etc.)
          </p>
        </div>

        <div className="flex justify-center mb-6 bg-gray-50 p-4 rounded-lg">
          {qrCodeImageUri ? (
            <img src={qrCodeImageUri} alt="MFA QR Code" className="w-48 h-48" />
          ) : (
            <div className="w-48 h-48 bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
              <p className="text-gray-500">Loading QR Code...</p>
            </div>
          )}
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label
              htmlFor="otp"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Enter 6-digit verification code
            </label>
            <input
              id="otp"
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="input-field w-full text-center text-lg font-mono tracking-widest"
              placeholder="000000"
              maxLength="6"
              required
            />
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleSkip}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Skip for now
            </button>
            <button
              type="submit"
              disabled={isVerifying || otp.length !== 6}
              className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isVerifying ? "Verifying..." : "Verify & Enable"}
            </button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            Why enable MFA for admin accounts?
          </h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Protects against unauthorized administrative access</li>
            <li>• Secures sensitive system operations</li>
            <li>• Can be enabled later in account settings if skipped</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

const InitialAdminSignup = ({ onAdminCreated }) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [enableMfa, setEnableMfa] = useState(true); // Default to true for admin since you have MFA support

  // MFA Modal state (like in your regular signup)
  const [showMfaModal, setShowMfaModal] = useState(false);
  const [qrCodeImageUri, setQrCodeImageUri] = useState("");
  const [newUserId, setNewUserId] = useState(null);

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    if (errors[name] || errors.general) {
      setErrors((prev) => ({ ...prev, [name]: "", general: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.firstName) newErrors.firstName = "First name is required.";
    if (!formData.lastName) newErrors.lastName = "Last name is required.";
    if (!formData.username) newErrors.username = "Username is required.";
    if (!formData.email) newErrors.email = "Email is required.";
    if (!formData.password) newErrors.password = "Password is required.";
    else if (formData.password.length < 8)
      newErrors.password = "Password must be at least 8 characters.";
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    setIsLoading(true);

    try {
      console.log("Creating initial admin with MFA enabled:", enableMfa);
      
      // Use the special initial-admin endpoint
      const response = await authAPI.createInitialAdmin({
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: "ADMIN", // This will be enforced by the backend
        userStatus: "ACTIVE"
      });

      console.log("Admin creation response:", response);

      if (response) {
        // Get the user ID from response
        const userId = response.id || response.userId;
        console.log("Created admin with userId:", userId);
        setNewUserId(userId);

        if (enableMfa && userId) {
          // Generate MFA QR code using your existing MFA signup endpoint
          try {
            console.log("Setting up MFA for admin user:", userId);
            // Use the correct endpoint from your AuthController: /auth/mfa/signup/enable
            const mfaResponse = await api.post('/auth/mfa/signup/enable', { userId });
            setQrCodeImageUri(mfaResponse.data.qrCodeImageUri);
            setShowMfaModal(true);
          } catch (mfaError) {
            console.error("MFA setup error:", mfaError);
            toast.error(
              "Admin account created but MFA setup failed. You can enable it later in settings."
            );
            if (onAdminCreated) onAdminCreated();
            navigate("/login");
          }
        } else {
          console.log("MFA not enabled, going to login");
          toast.success("Initial admin account created successfully!");
          if (onAdminCreated) onAdminCreated();
          navigate("/login");
        }
      }
    } catch (err) {
      console.error("Initial admin signup error:", err);
      if (err.response?.status === 400) {
        setErrors({ 
          general: "Users already exist in the system. Please use the regular login page." 
        });
        toast.error("Users already exist in the system.");
      } else {
        const errorMessage =
          err.response?.data?.message ||
          "An unexpected error occurred. Please try again.";
        setErrors({ general: errorMessage });
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaEnabled = () => {
    if (onAdminCreated) onAdminCreated();
    navigate("/login");
  };

  const handleMfaModalClose = () => {
    setShowMfaModal(false);
    if (onAdminCreated) onAdminCreated();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl shadow-lg">
              <Crown className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Welcome to YTManager
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Create your administrator account to get started
          </p>
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              <Shield className="inline w-4 h-4 mr-1" />
              This is a one-time setup for the initial administrator account
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {errors.general && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <p className="text-red-600 text-sm">{errors.general}</p>
              </div>
            )}

            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                <UserSquare className="inline-block h-4 w-4 mr-1" />
                First Name
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                autoComplete="given-name"
                required
                value={formData.firstName}
                onChange={handleChange}
                className={`input-field ${
                  errors.firstName ? "border-red-500" : ""
                }`}
                placeholder="Administrator First Name"
              />
              {errors.firstName && (
                <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                <UserSquare className="inline-block h-4 w-4 mr-1" />
                Last Name
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                autoComplete="family-name"
                required
                value={formData.lastName}
                onChange={handleChange}
                className={`input-field ${
                  errors.lastName ? "border-red-500" : ""
                }`}
                placeholder="Administrator Last Name"
              />
              {errors.lastName && (
                <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                <User className="inline-block h-4 w-4 mr-1" />
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
                className={`input-field ${
                  errors.username ? "border-red-500" : ""
                }`}
                placeholder="Choose an admin username"
              />
              {errors.username && (
                <p className="text-red-500 text-xs mt-1">{errors.username}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                <Mail className="inline-block h-4 w-4 mr-1" />
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className={`input-field ${
                  errors.email ? "border-red-500" : ""
                }`}
                placeholder="Administrator email address"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                <Lock className="inline-block h-4 w-4 mr-1" />
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={`input-field pr-10 ${
                    errors.password ? "border-red-500" : ""
                  }`}
                  placeholder="Create a strong password (min. 8 characters)"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                <Lock className="inline-block h-4 w-4 mr-1" />
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`input-field pr-10 ${
                    errors.confirmPassword ? "border-red-500" : ""
                  }`}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* MFA Enable Option - Recommended for Admin */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Shield className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableMfa}
                      onChange={(e) => setEnableMfa(e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-900">
                      Enable Multi-Factor Authentication (Highly Recommended for Admin)
                    </span>
                  </label>
                  <p className="text-xs text-gray-600 mt-1">
                    Protect your administrator account with an extra layer of security
                  </p>
                </div>
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
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Creating Admin Account...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Crown className="w-5 h-5" />
                    <span>Create Administrator Account</span>
                  </div>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="text-center">
          <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 mb-2">
              <strong>Note:</strong> This setup page will only appear when no users exist in the system.
            </p>
            <p className="text-xs text-gray-400">
              After creating the admin account, other users can be managed through the admin panel.
            </p>
          </div>
        </div>
      </div>

      {/* MFA Setup Modal - Same as in your regular signup */}
      <MfaSetupModal
        isOpen={showMfaModal}
        onClose={handleMfaModalClose}
        qrCodeImageUri={qrCodeImageUri}
        userId={newUserId}
        onMfaEnabled={handleMfaEnabled}
      />
    </div>
  );
};

export default InitialAdminSignup;