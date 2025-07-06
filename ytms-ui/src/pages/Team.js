import React, { useState, useEffect } from 'react';
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
import { usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Team = () => {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMembers: 1,
    activeTasks: 2,
    completedTasks: 0
  });

  // Mock data for demonstration
  const mockTeamMembers = [
    {
      id: 1,
      username: 'Abhijith Anil',
      email: 'abhijith.anjana@gmail.com',
      role: 'ADMIN',
      avatar: 'AA',
      stats: {
        total: 0,
        active: 0,
        done: 0
      },
      lastActive: new Date()
    }
  ];

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      // For demo, use mock data
      setTeamMembers(mockTeamMembers);
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
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

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center text-white font-medium text-lg">
              {member.avatar}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{member.username}</h3>
              <div className="flex items-center space-x-2 mt-1">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">{member.email}</span>
              </div>
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 ${getRoleColor(member.role)}`}>
                {member.role.toLowerCase()}
              </span>
            </div>
          </div>
          
          {user?.role === 'ADMIN' && (
            <div className="relative">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          )}
        </div>

        {/* Member Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{member.stats.total}</p>
            <p className="text-sm text-gray-600">Total</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">{member.stats.active}</p>
            <p className="text-sm text-gray-600">Active</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{member.stats.done}</p>
            <p className="text-sm text-gray-600">Done</p>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl h-32"></div>
          ))}
        </div>
        <div className="bg-white rounded-xl h-64"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-gray-600">
            {stats.totalMembers} team member{stats.totalMembers !== 1 ? 's' : ''} • {stats.activeTasks} active task{stats.activeTasks !== 1 ? 's' : ''}
          </p>
        </div>
        
        {user?.role === 'ADMIN' && (
          <button className="btn-primary flex items-center space-x-2">
            <UserPlus className="h-4 w-4" />
            <span>Invite Member</span>
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Team Members"
          value={stats.totalMembers}
          icon={Users}
          color="bg-blue-500"
        />
        
        <StatCard
          title="Total Tasks"
          value="3"
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
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {teamMembers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teamMembers.map((member) => (
                <TeamMemberCard key={member.id} member={member} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No team members found</p>
              {user?.role === 'ADMIN' && (
                <button className="btn-primary mt-4 flex items-center space-x-2 mx-auto">
                  <UserPlus className="h-4 w-4" />
                  <span>Invite First Member</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Team;