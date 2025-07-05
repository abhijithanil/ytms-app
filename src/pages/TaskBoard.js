import React, { useState, useEffect } from 'react';
import { 
  Video, 
  Calendar, 
  User, 
  AlertCircle,
  ChevronDown,
  Search,
  Filter,
  Eye
} from 'lucide-react';
import { tasksAPI } from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const TaskBoard = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    priority: 'All Priorities',
    assignee: 'All Assignees',
    search: ''
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await tasksAPI.getAllTasks();
      setTasks(response.data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTasksByStatus = (status) => {
    return tasks.filter(task => {
      const matchesStatus = task.status === status;
      const matchesSearch = filters.search === '' || 
        task.title.toLowerCase().includes(filters.search.toLowerCase());
      const matchesPriority = filters.priority === 'All Priorities' || 
        task.priority?.toLowerCase() === filters.priority.toLowerCase();
      const matchesAssignee = filters.assignee === 'All Assignees' || 
        task.assignedEditor?.username === filters.assignee;
      
      return matchesStatus && matchesSearch && matchesPriority && matchesAssignee;
    });
  };

  const getStatusConfig = (status) => {
    const configs = {
      DRAFT: { title: 'Draft', color: 'border-gray-300', bgColor: 'bg-gray-50' },
      ASSIGNED: { title: 'Assigned', color: 'border-blue-300', bgColor: 'bg-blue-50' },
      IN_PROGRESS: { title: 'In Progress', color: 'border-orange-300', bgColor: 'bg-orange-50' },
      REVIEW: { title: 'Review', color: 'border-purple-300', bgColor: 'bg-purple-50' },
      READY: { title: 'Ready', color: 'border-green-300', bgColor: 'bg-green-50' },
      SCHEDULED: { title: 'Scheduled', color: 'border-indigo-300', bgColor: 'bg-indigo-50' },
      UPLOADED: { title: 'Uploaded', color: 'border-emerald-300', bgColor: 'bg-emerald-50' }
    };
    return configs[status] || configs.DRAFT;
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const TaskCard = ({ task }) => {
    const isOverdue = task.deadline && new Date(task.deadline) < new Date();
    
    return (
      <div 
        className="task-card bg-white rounded-lg p-4 mb-3 border hover:shadow-md transition-all cursor-pointer"
        onClick={() => navigate(`/tasks/${task.id}`)}
      >
        <div className="mb-3">
          <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
            {task.title}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-3">
            {task.description}
          </p>
        </div>
        
        <div className="flex items-center justify-between mb-3">
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
            {task.priority?.toLowerCase() || 'medium'}
          </span>
          
          {task.deadline && (
            <div className={`flex items-center text-xs ${isOverdue ? 'text-red-500' : 'text-gray-500'}`}>
              <AlertCircle className={`h-3 w-3 mr-1 ${isOverdue ? 'text-red-500' : 'text-gray-400'}`} />
              <span>{new Date(task.deadline).toLocaleDateString()}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs font-medium">
              {task.assignedEditor?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <span className="text-sm text-gray-600">
              {task.assignedEditor?.username || 'Unassigned'}
            </span>
          </div>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/tasks/${task.id}`);
            }}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <Eye className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </div>
    );
  };

  const StatusColumn = ({ status, title, tasks }) => {
    const config = getStatusConfig(status);
    
    return (
      <div className={`flex-1 ${config.bgColor} rounded-xl p-4 border-2 ${config.color} min-w-[280px]`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">{title}</h3>
          <span className="bg-white px-2 py-1 rounded-full text-sm font-medium text-gray-600">
            {tasks.length}
          </span>
        </div>
        
        <div className="space-y-3 min-h-[400px]">
          {tasks.length > 0 ? (
            tasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <Video className="h-8 w-8 mb-2" />
              <span className="text-sm">No tasks</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="flex space-x-4 mb-6">
          <div className="h-10 bg-gray-200 rounded w-64"></div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="grid grid-cols-7 gap-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-xl h-96"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative">
            <select
              value={filters.priority}
              onChange={(e) => setFilters({...filters, priority: e.target.value})}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option>All Priorities</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          
          <div className="relative">
            <select
              value={filters.assignee}
              onChange={(e) => setFilters({...filters, assignee: e.target.value})}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option>All Assignees</option>
              {[...new Set(tasks.map(task => task.assignedEditor?.username).filter(Boolean))].map(username => (
                <option key={username}>{username}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Task Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        <StatusColumn 
          status="DRAFT" 
          title="Draft" 
          tasks={getTasksByStatus('DRAFT')} 
        />
        <StatusColumn 
          status="ASSIGNED" 
          title="Assigned" 
          tasks={getTasksByStatus('ASSIGNED')} 
        />
        <StatusColumn 
          status="IN_PROGRESS" 
          title="In Progress" 
          tasks={getTasksByStatus('IN_PROGRESS')} 
        />
        <StatusColumn 
          status="REVIEW" 
          title="Review" 
          tasks={getTasksByStatus('REVIEW')} 
        />
        <StatusColumn 
          status="READY" 
          title="Ready" 
          tasks={getTasksByStatus('READY')} 
        />
        <StatusColumn 
          status="SCHEDULED" 
          title="Scheduled" 
          tasks={getTasksByStatus('SCHEDULED')} 
        />
        <StatusColumn 
          status="UPLOADED" 
          title="Uploaded" 
          tasks={getTasksByStatus('UPLOADED')} 
        />
      </div>
    </div>
  );
};

export default TaskBoard;