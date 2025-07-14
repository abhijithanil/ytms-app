import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { usersAPI } from "../services/api";
import toast from "react-hot-toast";
import { User, Lock, Bell, Camera } from "lucide-react";

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

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || "",
        email: user.email || "",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
      });
    }
  }, [user]);

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
    alert("Notification settings save functionality not yet implemented.");
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
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
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
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
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
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
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
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
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
      <form
        onSubmit={handlePasswordUpdate}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center space-x-4 mb-6">
          <Lock className="h-6 w-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">Security</h2>
        </div>
        <div className="space-y-4 max-w-md">
          <div>
            <label
              htmlFor="currentPassword"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
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
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
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
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
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
        </div>
        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            className="btn-primary"
            disabled={isPasswordSubmitting}
          >
            {isPasswordSubmitting ? "Changing..." : "Change Password"}
          </button>
        </div>
      </form>

      {/* Notifications Section */}
      <form
        onSubmit={handleNotificationSave}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center space-x-4 mb-6">
          <Bell className="h-6 w-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Notifications
          </h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">Task Assignments</p>
              <p className="text-sm text-gray-500">
                Notify me when a task is assigned to me.
              </p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                name="taskAssignments"
                checked={notifications.taskAssignments}
                onChange={handleNotificationChange}
              />
              <span className="slider round"></span>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">Status Updates</p>
              <p className="text-sm text-gray-500">
                Notify me when a task's status changes.
              </p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                name="statusUpdates"
                checked={notifications.statusUpdates}
                onChange={handleNotificationChange}
              />
              <span className="slider round"></span>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">New Comments</p>
              <p className="text-sm text-gray-500">
                Notify me when someone comments on my tasks.
              </p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                name="newComments"
                checked={notifications.newComments}
                onChange={handleNotificationChange}
              />
              <span className="slider round"></span>
            </label>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button type="submit" className="btn-primary">
            Save Notifications
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;