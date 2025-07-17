import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api, { usersAPI, L } from "../services/api";
import toast from "react-hot-toast";
import { User, Lock, Bell, Camera, Shield, AlertCircle } from "lucide-react";

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
      await api.post("/auth/mfa/verify", { userId, token: otp });
      toast.success("MFA enabled successfully!");
      onMfaEnabled();
      onClose();
    } catch (error) {
      toast.error("Invalid OTP. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md relative">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Enable MFA</h2>
        <p className="text-gray-600 mb-6">
          Scan this QR code with your authenticator app.
        </p>
        <div className="flex justify-center mb-6 bg-white p-4 rounded-lg">
          {qrCodeImageUri ? (
            <img 
              src={qrCodeImageUri} 
              alt="MFA QR Code" 
              className="w-48 h-48"
            />
          ) : (
            <div className="w-48 h-48 bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
              <p className="text-gray-500">Loading QR Code...</p>
            </div>
          )}
        </div>
        <form onSubmit={handleVerify} className="space-y-4">
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="input-field w-full"
            placeholder="Enter 6-digit code"
            required
            maxLength="6"
          />
          <div className="flex justify-end space-x-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isVerifying || !otp}
            >
              {isVerifying ? "Verifying..." : "Verify & Enable"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Settings = () => {
  const { user, fetchCurrentUser } = useAuth();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    firstName: "",
    lastName: "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [notifications, setNotifications] = useState({
    taskAssignments: true,
    statusUpdates: true,
    newComments: false,
  });
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [isMfaModalOpen, setIsMfaModalOpen] = useState(false);
  const [qrCodeImageUri, setQrCodeImageUri] = useState("");
  const [isEnablingMfa, setIsEnablingMfa] = useState(false);
  const [isDisablingMfa, setIsDisablingMfa] = useState(false);
  const [mfaStatus, setMfaStatus] = useState({
    enabled: false,
    loading: true,
    error: null
  });

  useEffect(() => {
  }, []);

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || "",
        email: user.email || "",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
      });
      checkMfaStatus();
    }
  }, [user]);

  const checkMfaStatus = async () => {
    if (!user?.id) return;
    
    setMfaStatus(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await api.get(`/auth/mfa/status/${user.id}`);
      setMfaStatus({
        enabled: response.data.mfaEnabled,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error("Error checking MFA status:", error);
      setMfaStatus({
        enabled: user?.mfaEnabled || false,
        loading: false,
        error: null
      });
    }
  };

  const handleMfaToggle = async (enabled) => {
    if (enabled) {
      // Enable MFA
      setIsEnablingMfa(true);
      try {
        const response = await api.post("/auth/mfa/enable", { 
          userId: user.id 
        });
        
        if (response.data.qrCodeImageUri) {
          setQrCodeImageUri(response.data.qrCodeImageUri);
          setIsMfaModalOpen(true);
        } else {
          toast.error("Failed to generate QR code");
        }
      } catch (error) {
        console.error("Error enabling MFA:", error);
        toast.error(error.response?.data?.message || "Failed to enable MFA");
      } finally {
        setIsEnablingMfa(false);
      }
    } else {
      // Disable MFA
      if (!window.confirm("Are you sure you want to disable MFA? This will make your account less secure.")) {
        return;
      }
      
      setIsDisablingMfa(true);
      try {
        await api.post("/auth/mfa/disable", { userId: user.id });
        await fetchCurrentUser();
        await checkMfaStatus();
        toast.success("MFA disabled successfully!");
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to disable MFA");
      } finally {
        setIsDisablingMfa(false);
      }
    }
  };

  const handleMfaEnabled = async () => {
    await fetchCurrentUser();
    await checkMfaStatus();
    setQrCodeImageUri("");
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNotificationChange = (e) => {
    const { name, checked } = e.target;
    setNotifications((prev) => ({ ...prev, [name]: checked }));
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsProfileSubmitting(true);
    try {
      await usersAPI.updateUserProfile(user.id, formData);
      await fetchCurrentUser();
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.message || "Failed to update profile.");
    } finally {
      setIsProfileSubmitting(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    setIsPasswordSubmitting(true);
    try {
      await usersAPI.changePassword(user.id, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success("Password changed successfully!");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to change password."
      );
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  const handleNotificationSave = (e) => {
    e.preventDefault();
    toast.success("Notification settings saved!");
  };

  const renderMfaSection = () => {
    if (mfaStatus.loading) {
      return (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-gray-800 font-medium">Multi-Factor Authentication</p>
              <p className="text-sm text-gray-500">Checking status...</p>
            </div>
          </div>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
        </div>
      );
    }

    if (mfaStatus.error) {
      return (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-gray-800 font-medium">Multi-Factor Authentication</p>
              <p className="text-sm text-red-500">{mfaStatus.error}</p>
            </div>
          </div>
          <button 
            onClick={checkMfaStatus}
            className="text-sm text-primary-600 hover:text-primary-800 underline"
          >
            Retry
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Shield className={`h-5 w-5 ${mfaStatus.enabled ? 'text-green-600' : 'text-gray-400'}`} />
          <div>
            <p className="text-gray-800 font-medium">Multi-Factor Authentication</p>
            <p className="text-sm text-gray-500">
              {mfaStatus.enabled ? 'Your account is secured with MFA' : 'Secure your account by enabling MFA'}
            </p>
          </div>
        </div>
        <label className="mfa-switch">
          <input
            type="checkbox"
            checked={mfaStatus.enabled}
            onChange={(e) => handleMfaToggle(e.target.checked)}
            disabled={isEnablingMfa || isDisablingMfa}
          />
          <span className="mfa-slider"></span>
        </label>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">
          Manage your account and notification preferences.
        </p>
      </div>

      {/* User Profile Section */}
      <form
        onSubmit={handleProfileUpdate}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center space-x-4 mb-6">
          <User className="h-6 w-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">User Profile</h2>
        </div>
        <div className="flex items-start space-x-6">
          <div className="relative">
            <div className="w-24 h-24 bg-primary-600 rounded-full flex items-center justify-center text-white text-4xl font-medium">
              {formData.firstName?.charAt(0).toUpperCase() ||
                user?.username?.charAt(0).toUpperCase() ||
                "A"}
            </div>
            <button
              type="button"
              className="absolute bottom-0 right-0 bg-white p-1.5 rounded-full shadow-md hover:bg-gray-100"
              title="Change profile picture"
            >
              <Camera className="h-4 w-4 text-gray-600" />
            </button>
          </div>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleFormChange}
                className="input-field"
                disabled={isProfileSubmitting}
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleFormChange}
                className="input-field"
                disabled={isProfileSubmitting}
              />
            </div>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleFormChange}
                className="input-field"
                disabled={isProfileSubmitting}
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleFormChange}
                className="input-field"
                disabled={isProfileSubmitting}
              />
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            className="btn-primary"
            disabled={isProfileSubmitting}
          >
            {isProfileSubmitting ? "Updating..." : "Update Profile"}
          </button>
        </div>
      </form>

      {/* Security Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-4 mb-6">
          <Lock className="h-6 w-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">Security</h2>
        </div>

        {/* Change Password Form */}
        <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md mb-8">
          <h3 className="text-md font-medium text-gray-800">Change Password</h3>
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Current Password
            </label>
            <input
              type="password"
              id="currentPassword"
              name="currentPassword"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              className="input-field"
              disabled={isPasswordSubmitting}
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              className="input-field"
              disabled={isPasswordSubmitting}
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              className="input-field"
              disabled={isPasswordSubmitting}
            />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={isPasswordSubmitting}>
              {isPasswordSubmitting ? "Changing..." : "Change Password"}
            </button>
          </div>
        </form>

        <hr className="my-6" />

        {/* MFA Section with Switch */}
        <div className="py-4">
          {renderMfaSection()}
        </div>
      </div>

      {/* Notifications Section */}
      <form onSubmit={handleNotificationSave} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-4 mb-6">
          <Bell className="h-6 w-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">Task Assignments</p>
              <p className="text-sm text-gray-500">
                Notify me when a task is assigned to me.
              </p>
            </div>
            <label className="mfa-switch">
              <input
                type="checkbox"
                name="taskAssignments"
                checked={notifications.taskAssignments}
                onChange={handleNotificationChange}
              />
              <span className="mfa-slider"></span>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">Status Updates</p>
              <p className="text-sm text-gray-500">
                Notify me when a task's status changes.
              </p>
            </div>
            <label className="mfa-switch">
              <input
                type="checkbox"
                name="statusUpdates"
                checked={notifications.statusUpdates}
                onChange={handleNotificationChange}
              />
              <span className="mfa-slider"></span>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">New Comments</p>
              <p className="text-sm text-gray-500">
                Notify me when someone comments on my tasks.
              </p>
            </div>
            <label className="mfa-switch">
              <input
                type="checkbox"
                name="newComments"
                checked={notifications.newComments}
                onChange={handleNotificationChange}
              />
              <span className="mfa-slider"></span>
            </label>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button type="submit" className="btn-primary">
            Save Notifications
          </button>
        </div>
      </form>

      <MfaSetupModal
        isOpen={isMfaModalOpen}
        onClose={() => setIsMfaModalOpen(false)}
        qrCodeImageUri={qrCodeImageUri}
        userId={user?.id}
        onMfaEnabled={handleMfaEnabled}
      />
    </div>
  );
};

export default Settings;