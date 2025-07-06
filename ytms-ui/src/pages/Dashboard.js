import React, { useState, useEffect } from 'react';
import { 
  Video, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Calendar,
  User,
  ExternalLink
} from 'lucide-react';
import { dashboardAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalTasks: 0,
    inProgress: 0,
    readyToUpload: 0,
    completed: 0
  });
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsResponse, tasksResponse] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getRecentTasks()
      ]);
      
      setStats(statsResponse.data);
      setRecentTasks(tasksResponse.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, color, trend }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {subtitle && (
            <div className="flex items-center mt-2 text-sm">
              {trend !== undefined && (
                <div className={`flex items-center ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  <TrendingUp className={`h-4 w-4 mr-1 ${trend < 0 ? 'rotate-180' : ''}`} />
                  <span>{Math.abs(trend)}%</span>
                </div>
              )}
              <span className={`${trend !== undefined ? 'ml-2' : ''} text-gray-500`}>{subtitle}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );

  const TaskCard = ({ task }) => {
    const getPriorityColor = (priority) => {
      switch (priority?.toLowerCase()) {
        case 'high': return 'bg-red-100 text-red-800';
        case 'medium': return 'bg-yellow-100 text-yellow-800';
        case 'low': return 'bg-green-100 text-green-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };

    const getStatusColor = (status) => {
      switch (status?.toLowerCase()) {
        case 'assigned': return 'bg-blue-100 text-blue-800';
        case 'in_progress': return 'bg-orange-100 text-orange-800';
        case 'review': return 'bg-purple-100 text-purple-800';
        case 'ready': return 'bg-green-100 text-green-800';
        case 'scheduled': return 'bg-indigo-100 text-indigo-800';
        case 'uploaded': return 'bg-emerald-100 text-emerald-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };

    const formatStatus = (status) => {
      return status?.replace('_', ' ').toLowerCase() || 'draft';
    };

    return (
      <div 
        className="task-card bg-white rounded-xl p-4 cursor-pointer"
        onClick={() => navigate(`/tasks/${task.id}`)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Video className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{task.title}</h3>
              <div className="flex items-center space-x-2 mt-1">
                <Calendar className="h-3 w-3 text-gray-400" />
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
          <ExternalLink className="h-4 w-4 text-gray-400 hover:text-gray-600" />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
              {task.priority?.toLowerCase() || 'medium'}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
              {formatStatus(task.status)}
            </span>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <User className="h-3 w-3" />
            <span>{task.assignedEditor?.username || 'Unassigned'}</span>
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
            <div key={i} className="bg-gray-200 rounded-xl h-32"></div>
          ))}
        </div>
        <div className="bg-gray-200 rounded-xl h-96"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Tasks"
          value={stats.totalTasks}
          subtitle="from last week"
          icon={Video}
          color="bg-blue-500"
          trend={12}
        />
        
        <StatCard
          title="In Progress"
          value={stats.inProgress}
          subtitle="assigned to you"
          icon={Clock}
          color="bg-orange-500"
          trend={0}
        />
        
        <StatCard
          title="Ready to Upload"
          value={stats.readyToUpload}
          subtitle="pending upload"
          icon={CheckCircle}
          color="bg-green-500"
          trend={3}
        />
        
        <StatCard
          title="Completed"
          value={stats.completed}
          subtitle="This month"
          icon={TrendingUp}
          color="bg-purple-500"
          trend={0}
        />
      </div>

      {/* Recent Tasks */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Video className="h-5 w-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">Recent Tasks</h2>
            </div>
            <button 
              onClick={() => navigate('/tasks')}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              View All
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {recentTasks.length > 0 ? (
            <div className="space-y-4">
              {recentTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No recent tasks found</p>
              <button 
                onClick={() => navigate('/upload')}
                className="btn-primary mt-4"
              >
                Create Your First Task
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;