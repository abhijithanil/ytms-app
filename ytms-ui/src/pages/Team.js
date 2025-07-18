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

  const handleSave = () => {
    onSave(member.id, role);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
        <h3 className="text-lg font-medium text-gray-900">Edit Role for {member.username}</h3>
        <div className="mt-4">
          <select value={role} onChange={(e) => setRole(e.target.value)} className="input-field w-full">
            <option value="EDITOR">Editor</option>
            <option value="VIEWER">Viewer</option>
          </select>
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
const ConfirmDeleteModal = ({ member, onClose, onConfirm }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
        <h3 className="text-lg font-medium text-gray-900">Delete User</h3>
        <p className="mt-2 text-sm text-gray-600">Are you sure you want to remove {member.username}? This action cannot be undone.</p>
        <div className="mt-6 flex justify-end space-x-3">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={() => onConfirm(member.id)} className="btn-danger">Delete</button>
        </div>
      </div>
    </div>
);


const Team = () => {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeTasks: 0,
    completedTasks: 0,
  });
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [deletingMember, setDeletingMember] = useState(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    fetchTeamMembers();
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

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const response = await teamAPI.getAllUsers();
      setTeamMembers(response.data);
      setStats(prev => ({...prev, totalMembers: response.data.length}));
    } catch (error) {
      console.error('Failed to fetch team members:', error);
      toast.error("Could not load team members.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdateRole = async (userId, newRole) => {
    try {
        const memberToUpdate = teamMembers.find(m => m.id === userId);
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
          <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">{value}</p>
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
        default: return 'bg-gray-100 text-gray-800';
      }
    };

    const getInitials = (firstName, lastName, username) => {
      if (firstName && lastName) {
        return `${firstName.charAt(0)}${lastName.charAt(0)}`;
      }
      return username.charAt(0).toUpperCase();
    }

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-primary-600 rounded-full flex items-center justify-center text-white font-medium text-lg shrink-0">
              {getInitials(member.firstName, member.lastName, member.username)}
            </div>
            <div className='min-w-0'>
              <h3 className="font-semibold text-gray-900 truncate">{member.firstName && member.lastName ? `${member.firstName} ${member.lastName}` : member.username}</h3>
              <div className="flex items-center space-x-2 mt-1">
                <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="text-sm text-gray-600 truncate">{member.email}</span>
              </div>
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 ${getRoleColor(member.role)}`}>
                {member.role.toLowerCase()}
              </span>
            </div>
          </div>
          
          {user?.role === 'ADMIN' && member.role !== 'ADMIN' && (
            <div className="relative" ref={openMenuId === member.id ? menuRef : null}>
              <button onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical className="h-4 w-4 text-gray-400" />
              </button>
              {openMenuId === member.id && (
                 <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                    <div className="py-1">
                        <button onClick={() => { setEditingMember(member); setOpenMenuId(null); }} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Role
                        </button>
                        <button onClick={() => { setDeletingMember(member); setOpenMenuId(null); }} className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove User
                        </button>
                    </div>
                 </div>
              )}
            </div>
          )}
        </div>

        {/* Member Stats */}
        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-100">
          <div className="text-center">
            <p className="text-xl md:text-2xl font-bold text-gray-900">0</p>
            <p className="text-xs md:text-sm text-gray-600">Total</p>
          </div>
          <div className="text-center">
            <p className="text-xl md:text-2xl font-bold text-orange-600">0</p>
            <p className="text-xs md:text-sm text-gray-600">Active</p>
          </div>
          <div className="text-center">
            <p className="text-xl md:text-2xl font-bold text-green-600">0</p>
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
          <button onClick={() => setIsInviteModalOpen(true)} className="btn-primary flex items-center space-x-2 w-full sm:w-auto">
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
          value={stats.totalTasks || 0}
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
          {teamMembers.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              {teamMembers.map((member) => (
                <TeamMemberCard key={member.id} member={member} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No team members found</p>
              {user?.role === 'ADMIN' && (
                <button onClick={() => setIsInviteModalOpen(true)} className="btn-primary mt-4 flex items-center space-x-2 mx-auto">
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