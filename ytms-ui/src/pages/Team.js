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
  Trash2,
  UserCheck,
  UserX,
  Clock,
  Ban,
  Archive,
  Grid,
  List,
  Filter,
  Search,
  X,
  ChevronDown,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { usersAPI, teamAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import InviteMemberModal from '../components/InviteMemberModal';
import ChatWidget from '../components/chat/ChatWidget';


// A modal component for editing user roles and status
const EditUserModal = ({ member, onClose, onSave }) => {
  const [role, setRole] = useState(member.role);
  const [userStatus, setStatus] = useState(member.userStatus || 'ACTIVE');
  const [showAdminConfirmation, setShowAdminConfirmation] = useState(false);

  const handleRoleChange = (newRole) => {
    if (newRole === 'ADMIN' && member.role !== 'ADMIN') {
      setShowAdminConfirmation(true);
    } else {
      setRole(newRole);
    }
  };

  const handleSave = () => {
    onSave(member.id, { role, userStatus });
  };

  const confirmAdminRole = () => {
    setRole('ADMIN');
    setShowAdminConfirmation(false);
  };

  const cancelAdminRole = () => {
    setShowAdminConfirmation(false);
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
        <h3 className="text-lg font-medium text-gray-900 mb-4">Edit User: {member.username}</h3>
        
        {/* Role Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
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

        {/* Status Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select 
            value={userStatus} 
            onChange={(e) => setStatus(e.target.value)} 
            className="input-field w-full"
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="PENDING">Pending</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
          <div className="mt-1 text-xs text-gray-500">
            {userStatus === 'ACTIVE' && 'User can access the system normally'}
            {userStatus === 'INACTIVE' && 'User account is temporarily disabled'}
            {userStatus === 'PENDING' && 'User account is awaiting activation'}
            {userStatus === 'SUSPENDED' && 'User account is suspended due to violations'}
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} className="btn-primary">Save Changes</button>
        </div>
      </div>
    </div>
  );
};

// A simple confirmation modal for deleting a user (soft delete)
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

// Permanent delete confirmation modal for suspended users (super admin only)
const ConfirmPermanentDeleteModal = ({ member, onClose, onConfirm }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0 w-10 h-10 mx-auto bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
        </div>
        <h3 className="text-lg font-medium text-gray-900 text-center mb-2">
          Permanently Delete User
        </h3>
        <p className="text-sm text-gray-600 text-center mb-4">
          Are you sure you want to permanently delete <strong>{member.username}</strong>? 
          This action is irreversible and will transfer all their content to the super admin.
        </p>
        
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">
                <strong>Critical Warning:</strong> This will permanently delete the user account and reassign all their content to the super admin. This action cannot be undone.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                The following will be transferred to the super admin:
              </p>
              <ul className="text-xs text-yellow-700 mt-1 list-disc list-inside">
                <li>All video tasks created by this user</li>
                <li>All video tasks assigned to this user</li>
                <li>All comments and revisions</li>
                <li>All audio instructions</li>
                <li>All YouTube channels added by this user</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button 
            onClick={() => onConfirm(member.id)} 
            className="bg-red-700 text-white px-4 py-2 rounded-md hover:bg-red-800 transition-colors font-medium"
          >
            Yes, Permanently Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// Filter Component
const FilterPanel = ({ filters, onFiltersChange, isAdmin, onClose }) => {
  const handleFilterChange = (key, value) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      role: '',
      status: '',
      sortBy: 'name',
      sortOrder: 'asc'
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 space-y-4 absolute top-full right-0 mt-2 w-80 z-30">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Filters</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={clearFilters}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear all
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Role Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
        <select
          value={filters.role}
          onChange={(e) => handleFilterChange('role', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="EDITOR">Editor</option>
          <option value="VIEWER">Viewer</option>
        </select>
      </div>

      {/* Status Filter - Only for admins */}
      {isAdmin && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="PENDING">Pending</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="DELETED">Deleted</option>
          </select>
        </div>
      )}

      {/* Sort Options */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={filters.sortBy}
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="name">Name</option>
            <option value="email">Email</option>
            <option value="role">Role</option>
            <option value="createdAt">Date Added</option>
          </select>
          <select
            value={filters.sortOrder}
            onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="asc">A-Z</option>
            <option value="desc">Z-A</option>
          </select>
        </div>
      </div>
    </div>
  );
};

const Team = () => {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'list'
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: '',
    sortBy: 'name',
    sortOrder: 'asc'
  });
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeTasks: 0,
    completedTasks: 0,
    totalTasks: 0,
  });
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [deletingMember, setDeletingMember] = useState(null);
  const [permanentlyDeletingMember, setPermanentlyDeletingMember] = useState(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const menuRef = useRef(null);
  const filterRef = useRef(null);

  // Check if current user is super admin
  const isSuperAdmin = user?.role === 'ADMIN' && user?.superAdmin;

  useEffect(() => {
    fetchTeamMembers();
    fetchTasksCount();
  }, []);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilters(false);
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
      
      let userData;
      if (Array.isArray(response)) {
        userData = response;
      } else if (response && Array.isArray(response.data)) {
        userData = response.data;
      } else if (response && response.data && Array.isArray(response.data.data)) {
        userData = response.data.data;
      } else {
        console.warn('Unexpected response structure:', response);
        userData = [];
      }
      
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
      setTeamMembers([]);
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdateUser = async (userId, updates) => {
    try {
        const memberToUpdate = teamMembers.find(m => m.id === userId);
        if (!memberToUpdate) {
          toast.error("Member not found.");
          return;
        }
        
        await usersAPI.updateUser(userId, { ...memberToUpdate, ...updates });
        toast.success("User updated successfully!");
        setEditingMember(null);
        fetchTeamMembers();
    } catch (error) {
        toast.error("Failed to update user.");
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

  // New function for permanent delete
  const handlePermanentDeleteUser = async (userId) => {
    try {
        await usersAPI.permanentlyDeleteUser(userId);
        toast.success("User permanently deleted successfully!");
        setPermanentlyDeletingMember(null);
        fetchTeamMembers();
    } catch (error) {
        toast.error("Failed to permanently delete user.");
        console.error(error);
    }
  };

  // Filter and sort users
  const getFilteredAndSortedUsers = (users) => {
    let filtered = users.filter(member => {
      const matchesSearch = !filters.search || 
        (member.fistName && member.fistName.toLowerCase().includes(filters.search.toLowerCase())) ||
        (member.lastName && member.lastName.toLowerCase().includes(filters.search.toLowerCase())) ||
        (member.username && member.username.toLowerCase().includes(filters.search.toLowerCase())) ||
        (member.email && member.email.toLowerCase().includes(filters.search.toLowerCase()));
      
      const matchesRole = !filters.role || member.role === filters.role;
      const matchesStatus = !filters.status || (member.userStatus || 'ACTIVE') === filters.status;
      
      return matchesSearch && matchesRole && matchesStatus;
    });

    // Sort users
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (filters.sortBy) {
        case 'name':
          aValue = a.fistName && a.lastName ? `${a.fistName} ${a.lastName}` : a.username || '';
          bValue = b.fistName && b.lastName ? `${b.fistName} ${b.lastName}` : b.username || '';
          break;
        case 'email':
          aValue = a.email || '';
          bValue = b.email || '';
          break;
        case 'role':
          aValue = a.role || '';
          bValue = b.role || '';
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt || 0);
          bValue = new Date(b.createdAt || 0);
          break;
        default:
          aValue = a.username || '';
          bValue = b.username || '';
      }

      if (filters.sortBy === 'createdAt') {
        return filters.sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      const comparison = aValue.toString().toLowerCase().localeCompare(bValue.toString().toLowerCase());
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  };

  // Group users by status (only for admins in card view)
  const groupUsersByStatus = (users) => {
    if (user?.role !== 'ADMIN' || viewMode === 'list') {
      return { ACTIVE: users };
    }

    const grouped = users.reduce((acc, member) => {
      const status = member.userStatus || 'ACTIVE';
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(member);
      return acc;
    }, {});

    return grouped;
  };

  // Get status display info
  const getStatusInfo = (status) => {
    switch (status) {
      case 'ACTIVE':
        return { 
          label: 'Active Users', 
          icon: UserCheck, 
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'INACTIVE':
        return { 
          label: 'Inactive Users', 
          icon: UserX, 
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
      case 'PENDING':
        return { 
          label: 'Pending Users', 
          icon: Clock, 
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200'
        };
      case 'SUSPENDED':
        return { 
          label: 'Suspended Users', 
          icon: Ban, 
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      case 'DELETED':
        return { 
          label: 'Deleted Users', 
          icon: Archive, 
          color: 'text-gray-500',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
      default:
        return { 
          label: status, 
          icon: Users, 
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
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

    if (!member) return null;

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-primary-600 rounded-full flex items-center justify-center text-white font-medium text-lg shrink-0">
              {getInitials(member.fistName, member.lastName, member.username)}
            </div>
            <div className='min-w-0'>
              <h3 className="font-semibold text-gray-900 truncate">
                {member.fistName && member.lastName 
                  ? `${member.fistName} ${member.lastName}` 
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
                            Edit User
                        </button>
                        {/* Logic for delete options based on user status and admin type */}
                        {member.userStatus === 'SUSPENDED' ? (
                          // For suspended users: only super admin can permanently delete
                          isSuperAdmin && !member.isSuperAdmin && (
                            <button 
                              onClick={() => { setPermanentlyDeletingMember(member); setOpenMenuId(null); }} 
                              className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-100 border-t border-gray-100"
                            >
                                <AlertTriangle className="h-4 w-4 mr-2" />
                                Permanently Delete
                            </button>
                          )
                        ) : (
                          // For non-suspended users: regular delete (if allowed)
                          (member.role !== 'ADMIN' || member.id !== user?.id) && (
                            <button 
                              onClick={() => { setDeletingMember(member); setOpenMenuId(null); }} 
                              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove User
                            </button>
                          )
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
            <p className="text-xl md:text-2xl font-bold text-gray-900">{member.videoTaskCounts?.totalTask || 0}</p>
            <p className="text-xs md:text-sm text-gray-600">Total</p>
          </div>
          <div className="text-center">
            <p className="text-xl md:text-2xl font-bold text-orange-600">{member.videoTaskCounts?.activeTask || 0}</p>
            <p className="text-xs md:text-sm text-gray-600">Active</p>
          </div>
          <div className="text-center">
            <p className="text-xl md:text-2xl font-bold text-green-600">{member.videoTaskCounts?.completedTask || 0}</p>
            <p className="text-xs md:text-sm text-gray-600">Done</p>
          </div>
        </div>
      </div>
    );
  };

  const TeamMemberListItem = ({ member }) => {
    const getRoleColor = (role) => {
      switch (role) {
        case 'ADMIN': return 'bg-purple-100 text-purple-800';
        case 'EDITOR': return 'bg-blue-100 text-blue-800';
        case 'VIEWER': return 'bg-gray-100 text-gray-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };

    const getStatusColor = (status) => {
      switch (status) {
        case 'ACTIVE': return 'bg-green-100 text-green-800';
        case 'INACTIVE': return 'bg-gray-100 text-gray-800';
        case 'PENDING': return 'bg-orange-100 text-orange-800';
        case 'SUSPENDED': return 'bg-red-100 text-red-800';
        case 'DELETED': return 'bg-gray-100 text-gray-600';
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
    };

    if (!member) return null;

    return (
      <tr className="hover:bg-gray-50">
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
              {getInitials(member.fistName, member.lastName, member.username)}
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-900">
                {member.fistName && member.lastName 
                  ? `${member.fistName} ${member.lastName}` 
                  : member.username || 'Unknown User'}
              </div>
              <div className="text-sm text-gray-500">{member.username}</div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm text-gray-900">{member.email || 'No email'}</div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
            {member.role ? member.role.toLowerCase() : 'unknown'}
          </span>
        </td>
        {user?.role === 'ADMIN' && (
          <td className="px-6 py-4 whitespace-nowrap">
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(member.userStatus || 'ACTIVE')}`}>
              {(member.userStatus || 'ACTIVE').toLowerCase()}
            </span>
          </td>
        )}
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : 'N/A'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-center">
          <div className="flex items-center justify-center space-x-4 text-sm">
            <div className="text-center">
              <div className="font-medium text-gray-900">{member.videoTaskCounts?.totalTask || 0}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-orange-600">{member.videoTaskCounts?.activeTask || 0}</div>
              <div className="text-xs text-gray-500">Active</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-green-600">{member.videoTaskCounts?.completedTask || 0}</div>
              <div className="text-xs text-gray-500">Done</div>
            </div>
          </div>
        </td>
        {user?.role === 'ADMIN' && (
          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
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
                            Edit User
                        </button>
                        {/* Logic for delete options based on user status and admin type */}
                        {member.userStatus === 'SUSPENDED' ? (
                          // For suspended users: only super admin can permanently delete
                          isSuperAdmin && !member.isSuperAdmin && (
                            <button 
                              onClick={() => { setPermanentlyDeletingMember(member); setOpenMenuId(null); }} 
                              className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-100 border-t border-gray-100"
                            >
                                <AlertTriangle className="h-4 w-4 mr-2" />
                                Permanently Delete
                            </button>
                          )
                        ) : (
                          // For non-suspended users: regular delete (if allowed)
                          (member.role !== 'ADMIN' || member.id !== user?.id) && (
                            <button 
                              onClick={() => { setDeletingMember(member); setOpenMenuId(null); }} 
                              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove User
                            </button>
                          )
                        )}
                    </div>
                 </div>
              )}
            </div>
          </td>
        )}
      </tr>
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

  const membersToDisplay = Array.isArray(teamMembers) ? teamMembers : [];
  const filteredUsers = getFilteredAndSortedUsers(membersToDisplay);
  const groupedUsers = groupUsersByStatus(filteredUsers);

  return (
    <div className="space-y-6 animate-fadeIn p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-gray-600 mt-1">
            {stats.totalMembers} team member{stats.totalMembers !== 1 ? 's' : ''}
            {user?.role !== 'ADMIN' && ' (Active users only)'}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('card')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'card' 
                  ? 'bg-white text-primary-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list' 
                  ? 'bg-white text-primary-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Filter Toggle */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-3 py-2 border rounded-lg transition-colors ${
                showFilters || Object.values(filters).some(v => v && v !== 'name' && v !== 'asc')
                  ? 'border-primary-300 bg-primary-50 text-primary-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="h-4 w-4" />
              <span>Filter</span>
              {Object.values(filters).some(v => v && v !== 'name' && v !== 'asc') && (
                <span className="bg-primary-600 text-white text-xs rounded-full px-2 py-0.5">
                  {Object.values(filters).filter(v => v && v !== 'name' && v !== 'asc').length}
                </span>
              )}
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            
            {showFilters && (
              <FilterPanel
                filters={filters}
                onFiltersChange={setFilters}
                isAdmin={user?.role === 'ADMIN'}
                onClose={() => setShowFilters(false)}
              />
            )}
          </div>

          {user?.role === 'ADMIN' && (
            <button 
              onClick={() => setIsInviteModalOpen(true)} 
              className="btn-primary flex items-center space-x-2"
            >
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Invite Member</span>
            </button>
          )}
        </div>
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

      {/* Results count */}
      {filteredUsers.length !== membersToDisplay.length && (
        <div className="text-sm text-gray-600">
          Showing {filteredUsers.length} of {membersToDisplay.length} members
        </div>
      )}

      {/* Team Members - Card View */}
      {viewMode === 'card' && (
        <>
          {Object.keys(groupedUsers).length > 0 ? (
            Object.entries(groupedUsers).map(([status, members]) => {
              if (!members || members.length === 0) return null;
              
              const statusInfo = getStatusInfo(status);
              const StatusIcon = statusInfo.icon;
              
              return (
                <div key={status} className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className={`px-4 md:px-6 py-4 border-b ${statusInfo.borderColor} ${statusInfo.bgColor}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
                        <h2 className={`text-lg font-semibold ${statusInfo.color}`}>
                          {statusInfo.label}
                        </h2>
                        <span className={`text-sm ${statusInfo.color} bg-white px-2 py-1 rounded-full`}>
                          {members.length}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 md:p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                      {members.map((member) => (
                        <TeamMemberCard key={member.id || Math.random()} member={member} />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
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
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {membersToDisplay.length === 0 ? 'No team members found' : 'No members match your filters'}
                  </p>
                  {user?.role === 'ADMIN' && membersToDisplay.length === 0 && (
                    <button 
                      onClick={() => setIsInviteModalOpen(true)} 
                      className="btn-primary mt-4 flex items-center space-x-2 mx-auto"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>Invite First Member</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Team Members - List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <List className="h-5 w-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
              {filteredUsers.length > 0 && (
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {filteredUsers.length}
                </span>
              )}
            </div>
          </div>
          
          {filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    {user?.role === 'ADMIN' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>Joined</span>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tasks
                    </th>
                    {user?.role === 'ADMIN' && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((member) => (
                    <TeamMemberListItem key={member.id || Math.random()} member={member} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 md:p-6">
              <div className="text-center py-8">
                <List className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  {membersToDisplay.length === 0 ? 'No team members found' : 'No members match your filters'}
                </p>
                {user?.role === 'ADMIN' && membersToDisplay.length === 0 && (
                  <button 
                    onClick={() => setIsInviteModalOpen(true)} 
                    className="btn-primary mt-4 flex items-center space-x-2 mx-auto"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Invite First Member</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      
      {editingMember && (
        <EditUserModal 
            member={editingMember}
            onClose={() => setEditingMember(null)}
            onSave={handleUpdateUser}
        />
      )}

      {deletingMember && (
        <ConfirmDeleteModal
            member={deletingMember}
            onClose={() => setDeletingMember(null)}
            onConfirm={handleDeleteUser}
        />
      )}

      {permanentlyDeletingMember && (
        <ConfirmPermanentDeleteModal
            member={permanentlyDeletingMember}
            onClose={() => setPermanentlyDeletingMember(null)}
            onConfirm={handlePermanentDeleteUser}
        />
      )}

      {isInviteModalOpen && (
        <InviteMemberModal
          onClose={() => setIsInviteModalOpen(false)}
          onInviteSent={fetchTeamMembers}
        />
      )}
       {/* Chat Widget */}
      <ChatWidget />
    </div>
  );
};

export default Team;