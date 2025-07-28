import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  UserPlus, 
  Video, 
  TrendingUp, 
  CheckCircle,
  Mail,
  MoreVertical,
  Edit,
  Trash2
} from 'lucide-react';
import { usersAPI, teamAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import InviteMemberModal from '../components/InviteMemberModal';

// A simple modal component for editing user roles
const EditRoleModal = ({ member, onClose, onSave }) => {
  const [role, setRole] = useState(member.role);
  const [showAdminConfirmation, setShowAdminConfirmation] = useState(false);

  const handleRoleChange = (newRole) => {
    if (newRole === 'ADMIN' && member.role !== 'ADMIN') {
      setShowAdminConfirmation(true);
    } else {
      setRole(newRole);
    }
  };

  const handleSave = () => {
    onSave(member.id, role);
  };

  const confirmAdminRole = () => {
    setRole('ADMIN');
    setShowAdminConfirmation(false);
  };

  const cancelAdminRole = () => {
    setShowAdminConfirmation(false);
    // Reset to previous role if they cancel
    setRole(member.role);
  };

  if (showAdminConfirmation) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0 w-10 h-10 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 text-center mb-2">Grant Admin Privileges?</h3>
          <p className="text-sm text-gray-600 text-center mb-4">
            You are about to grant <strong>{member.username}</strong> admin privileges. 
            This will give them full access to manage users, tasks, and system settings.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> Admin users can modify or delete other users, including other admins.
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-3">
            <button onClick={cancelAdminRole} className="btn-secondary">
              Cancel
            </button>
            <button onClick={confirmAdminRole} className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors">
              Yes, Grant Admin Access
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
        <h3 className="text-lg font-medium text-gray-900">Edit Role for {member.username}</h3>
        <div className="mt-4">
          <select 
            value={role} 
            onChange={(e) => handleRoleChange(e.target.value)} 
            className="input-field w-full"
          >
            <option value="VIEWER">Viewer</option>
            <option value="EDITOR">Editor</option>
            <option value="ADMIN">Admin</option>
          </select>
          {role === 'ADMIN' && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
              <p className="text-xs text-red-600">
                ⚠️ Admin role grants full system access
              </p>
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} className="btn-primary">Save</button>
        </div>
      </div>
    </div>
  );
};

// A simple confirmation modal for deleting a user
const ConfirmDeleteModal = ({ member, onClose, onConfirm }) => {
  const isAdmin = member.role === 'ADMIN';
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0 w-10 h-10 mx-auto bg-red-100 rounded-full flex items-center justify-center">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
        </div>
        <h3 className="text-lg font-medium text-gray-900 text-center mb-2">
          {isAdmin ? 'Remove Admin User' : 'Remove User'}
        </h3>
        <p className="text-sm text-gray-600 text-center mb-4">
          Are you sure you want to remove <strong>{member.username}</strong>? This action cannot be undone.
        </p>
        
        {isAdmin && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">
                  <strong>Warning:</strong> You are removing an admin user. They will lose all administrative privileges.
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex justify-end space-x-3">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button 
            onClick={() => onConfirm(member.id)} 
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
          >
            {isAdmin ? 'Yes, Remove Admin' : 'Yes, Remove User'}
          </button>
        </div>
      </div>
    </div>
  );
};

const Team = () => {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]); // Initialize as empty array
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeTasks: 0,
    completedTasks: 0,
    totalTasks: 0, // Added this since it's referenced in the stats cards
  });
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [deletingMember, setDeletingMember] = useState(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    fetchTeamMembers();
    fetchTasksCount();
  }, []);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchTasksCount = async () => {
    try{
      setLoading(true);
      const response = await teamAPI.getTasksCount();
      setStats(prev => ({
        ...prev, 
        activeTasks: response.activeTask,
        completedTasks: response.completedTask,
        totalTasks: response.totalTask
      }));

    } catch (error) {
      console.error('Failed to fetch tasks status count:', error);
      toast.error("Could not tasks stats.");
    } finally {
      setLoading(false);
    }
  }

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const response = await teamAPI.getAllUsers();
      
      // Handle different response structures
      let userData;
      if (Array.isArray(response)) {
        // Direct array response
        userData = response;
      } else if (response && Array.isArray(response.data)) {
        // Response with data property
        userData = response.data;
      } else if (response && response.data && Array.isArray(response.data.data)) {
        // Nested data structure
        userData = response.data.data;
      } else {
        // Fallback
        console.warn('Unexpected response structure:', response);
        userData = [];
      }
      
      // Ensure userData is an array
      if (!Array.isArray(userData)) {
        console.error('Expected array but got:', typeof userData, userData);
        userData = [];
      }
      
      setTeamMembers(userData);
      setStats(prev => ({
        ...prev, 
        totalMembers: userData.length
      }));
      
    } catch (error) {
      console.error('Failed to fetch team members:', error);
      toast.error("Could not load team members.");
      setTeamMembers([]); // Set to empty array on error
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdateRole = async (userId, newRole) => {
    try {
        const memberToUpdate = teamMembers.find(m => m.id === userId);
        if (!memberToUpdate) {
          toast.error("Member not found.");
          return;
        }
        
        await usersAPI.updateUser(userId, { ...memberToUpdate, role: newRole });
        toast.success("User role updated successfully!");
        setEditingMember(null);
        fetchTeamMembers();
    } catch (error) {
        toast.error("Failed to update user role.");
        console.error(error);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
        await usersAPI.deleteUser(userId);
        toast.success("User removed successfully!");
        setDeletingMember(null);
        fetchTeamMembers();
    } catch (error) {
        toast.error("Failed to remove user.");
        console.error(error);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">{value || 0}</p>
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );

  const TeamMemberCard = ({ member }) => {
    const getRoleColor = (role) => {
      switch (role) {
        case 'ADMIN': return 'bg-purple-100 text-purple-800';
        case 'EDITOR': return 'bg-blue-100 text-blue-800';
        case 'VIEWER': return 'bg-gray-100 text-gray-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };

    const getInitials = (firstName, lastName, username) => {
      if (firstName && lastName) {
        return `${firstName.charAt(0)}${lastName.charAt(0)}`;
      }
      if (username && username.length > 0) {
        return username.charAt(0).toUpperCase();
      }
      return '?';
    }

    // Ensure member exists and has required properties
    if (!member) {
      return null;
    }

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-primary-600 rounded-full flex items-center justify-center text-white font-medium text-lg shrink-0">
              {getInitials(member.firstName, member.lastName, member.username)}
            </div>
            <div className='min-w-0'>
              <h3 className="font-semibold text-gray-900 truncate">
                {member.firstName && member.lastName 
                  ? `${member.firstName} ${member.lastName}` 
                  : member.username || 'Unknown User'}
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="text-sm text-gray-600 truncate">{member.email || 'No email'}</span>
              </div>
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 ${getRoleColor(member.role)}`}>
                {member.role ? member.role.toLowerCase() : 'unknown'}
              </span>
            </div>
          </div>
          
          {user?.role === 'ADMIN' && (
            <div className="relative" ref={openMenuId === member.id ? menuRef : null}>
              <button 
                onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)} 
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <MoreVertical className="h-4 w-4 text-gray-400" />
              </button>
              {openMenuId === member.id && (
                 <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                    <div className="py-1">
                        <button 
                          onClick={() => { setEditingMember(member); setOpenMenuId(null); }} 
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Role
                        </button>
                        {/* Only allow deletion of non-admin users, or if it's not the current user */}
                        {(member.role !== 'ADMIN' || member.id !== user?.id) && (
                          <button 
                            onClick={() => { setDeletingMember(member); setOpenMenuId(null); }} 
                            className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove User
                          </button>
                        )}
                    </div>
                 </div>
              )}
            </div>
          )}
        </div>

        {/* Member Stats */}
        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-100">
          <div className="text-center">
            <p className="text-xl md:text-2xl font-bold text-gray-900">{member.videoTaskCounts.totalTask||0}</p>
            <p className="text-xs md:text-sm text-gray-600">Total</p>
          </div>
          <div className="text-center">
            <p className="text-xl md:text-2xl font-bold text-orange-600">{member.videoTaskCounts.activeTask||0}</p>
            <p className="text-xs md:text-sm text-gray-600">Active</p>
          </div>
          <div className="text-center">
            <p className="text-xl md:text-2xl font-bold text-green-600">{member.videoTaskCounts.completedTask||0}</p>
            <p className="text-xs md:text-sm text-gray-600">Done</p>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6 p-4 md:p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-xl h-28"></div>
          ))}
        </div>
        <div className="bg-gray-200 rounded-xl h-64"></div>
      </div>
    );
  }

  // Ensure teamMembers is always an array before rendering
  const membersToDisplay = Array.isArray(teamMembers) ? teamMembers : [];

  return (
    <div className="space-y-6 animate-fadeIn p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-gray-600 mt-1">
            {stats.totalMembers} team member{stats.totalMembers !== 1 ? 's' : ''}
          </p>
        </div>
        
        {user?.role === 'ADMIN' && (
          <button 
            onClick={() => setIsInviteModalOpen(true)} 
            className="btn-primary flex items-center space-x-2 w-full sm:w-auto"
          >
            <UserPlus className="h-4 w-4" />
            <span>Invite Member</span>
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          title="Team Members"
          value={stats.totalMembers}
          icon={Users}
          color="bg-blue-500"
        />
        <StatCard
          title="Total Tasks"
          value={stats.totalTasks}
          icon={Video}
          color="bg-purple-500"
        />
        <StatCard
          title="Active Tasks"
          value={stats.activeTasks}
          icon={TrendingUp}
          color="bg-orange-500"
        />
        <StatCard
          title="Completed"
          value={stats.completedTasks}
          icon={CheckCircle}
          color="bg-green-500"
        />
      </div>

      {/* Team Members */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-4 md:px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
            </div>
          </div>
        </div>
        
        <div className="p-4 md:p-6">
          {membersToDisplay.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              {membersToDisplay.map((member) => (
                <TeamMemberCard key={member.id || Math.random()} member={member} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No team members found</p>
              {user?.role === 'ADMIN' && (
                <button 
                  onClick={() => setIsInviteModalOpen(true)} 
                  className="btn-primary mt-4 flex items-center space-x-2 mx-auto"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Invite First Member</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {editingMember && (
        <EditRoleModal 
            member={editingMember}
            onClose={() => setEditingMember(null)}
            onSave={handleUpdateRole}
        />
      )}

      {deletingMember && (
        <ConfirmDeleteModal
            member={deletingMember}
            onClose={() => setDeletingMember(null)}
            onConfirm={handleDeleteUser}
        />
      )}

      {isInviteModalOpen && (
        <InviteMemberModal
          onClose={() => setIsInviteModalOpen(false)}
          onInviteSent={fetchTeamMembers}
        />
      )}
    </div>
  );
};

export default Team;