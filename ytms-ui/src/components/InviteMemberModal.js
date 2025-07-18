import React, { useState } from "react";
import { Mail, Shield, X } from "lucide-react";
import toast from "react-hot-toast";
import { teamAPI } from "../services/api";
import { useAuth } from '../context/AuthContext';

const InviteMemberModal = ({ onClose, onInviteSent }) => {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [userRole, setUserRole] = useState("EDITOR");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("Email address is required.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await teamAPI.inviteUser({ email:email, userRole:userRole,  invitedBy:user.id});
      toast.success(`Invitation sent to ${email}`);
      onInviteSent();
      onClose();
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || "Failed to send invitation.";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("Invitation error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 relative">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Invite New Member
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              Send an email invitation
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm text-center">{error}</p>
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-3"
            >
              <Mail className="inline-block h-4 w-4 mr-2" />
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base"
              placeholder="Enter member's email"
              required
            />
          </div>

          <div>
            <label
              htmlFor="role"
              className="block text-sm font-medium text-gray-700 mb-3"
            >
              <Shield className="inline-block h-4 w-4 mr-2" />
              Role
            </label>
            <select
              id="role"
              name="role"
              value={userRole}
              onChange={(e) => setUserRole(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base appearance-none bg-white"
            >
              <option value="EDITOR">Editor</option>
              <option value="VIEWER">Viewer</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col space-y-3 pt-4">
            <button
              type="submit"
              className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors text-base font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                "Send Invite"
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors text-base font-medium"
              disabled={isLoading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InviteMemberModal;