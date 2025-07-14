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
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Invite New Member
        </h2>
        <p className="text-gray-600 mb-6">
          They will receive an email with a link to join your team.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
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
              className="input-field"
              placeholder="Enter member's email"
              required
            />
          </div>

          <div>
            <label
              htmlFor="role"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              <Shield className="inline-block h-4 w-4 mr-2" />
              Role
            </label>
            <select
              id="role"
              name="role"
              value={userRole}
              onChange={(e) => setUserRole(e.target.value)}
              className="input-field"
            >
              <option value="EDITOR">Editor</option>
              <option value="VIEWER">Viewer</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary w-32"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>
              ) : (
                "Send Invite"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InviteMemberModal;
