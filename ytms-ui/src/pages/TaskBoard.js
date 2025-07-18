import React, { useState, useEffect } from 'react';
import { 
  Video, 
  Calendar, 
  User, 
  AlertCircle,
  ChevronDown,
  Search,
  Filter,
  Eye,
  Plus,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { tasksAPI } from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const TaskBoard = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('board'); // 'board' or 'list'
  const [activeColumn, setActiveColumn] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    priority: 'All Priorities',
    assignee: 'All Assignees',
    search: ''
  });

  const statusColumns = [
    { key: 'DRAFT', title: 'Draft', color: 'border-gray-300', bgColor: 'bg-gray-50' },
    { key: 'ASSIGNED', title: 'Assigned', color: 'border-blue-300', bgColor: 'bg-blue-50' },
    { key: 'IN_PROGRESS', title: 'In Progress', color: 'border-orange-300', bgColor: 'bg-orange-50' },
    { key: 'REVIEW', title: 'Review', color: 'border-purple-300', bgColor: 'bg-purple-50' },
    { key: 'READY', title: 'Ready', color: 'border-green-300', bgColor: 'bg-green-50' },
    { key: 'SCHEDULED', title: 'Scheduled', color: 'border-indigo-300', bgColor: 'bg-indigo-50' },
    { key: 'UPLOADED', title: 'Uploaded', color: 'border-emerald-300', bgColor: 'bg-emerald-50' }
  ];

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

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const TaskCard = ({ task, isCompact = false }) => {
    const isOverdue = task.deadline && new Date(task.deadline) < new Date();
    
    return (
      <div 
        className={`bg-white rounded-lg p-3 sm:p-4 mb-3 border hover:shadow-md transition-all cursor-pointer ${
          isCompact ? 'border-l-4 border-l-blue-500' : ''
        }`}
        onClick={() => navigate(`/tasks/${task.id}`)}
      >
        <div className="mb-3">
          <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 text-sm sm:text-base">
            {task.title}
          </h3>
          {!isCompact && (
            <p className="text-sm text-gray-600 line-clamp-3">
              {task.description}
            </p>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 space-y-2 sm:space-y-0">
          <span className={`px-2 py-1 rounded-full text-xs font-medium border self-start ${getPriorityColor(task.priority)}`}>
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
            <span className="text-sm text-gray-600 truncate">
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

  const StatusColumn = ({ status, title, tasks, isActive = false }) => {
    const config = statusColumns.find(col => col.key === status);
    
    return (
      <div className={`
        flex-shrink-0 w-80 sm:w-72 ${config.bgColor} rounded-xl p-4 border-2 ${config.color}
        ${isActive ? 'block' : 'hidden sm:block'}
      `}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">{title}</h3>
          <span className="bg-white px-2 py-1 rounded-full text-sm font-medium text-gray-600">
            {tasks.length}
          </span>
        </div>
        
        <div className="space-y-3 min-h-[400px] max-h-[70vh] overflow-y-auto">
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

  const ListView = () => (
    <div className="space-y-4">
      {statusColumns.map(column => {
        const columnTasks = getTasksByStatus(column.key);
        if (columnTasks.length === 0) return null;
        
        return (
          <div key={column.key} className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">{column.title}</h3>
                <span className="bg-gray-100 px-2 py-1 rounded-full text-sm font-medium text-gray-600">
                  {columnTasks.length}
                </span>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {columnTasks.map(task => (
                <TaskCard key={task.id} task={task} isCompact={true} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  const BoardNavigation = () => (
    <div className="flex items-center justify-between sm:hidden mb-4">
      <button
        onClick={() => setActiveColumn(Math.max(0, activeColumn - 1))}
        disabled={activeColumn === 0}
        className="p-2 rounded-lg bg-white border border-gray-200 disabled:opacity-50"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      
      <div className="flex-1 text-center">
        <h3 className="font-medium text-gray-900">
          {statusColumns[activeColumn]?.title}
        </h3>
        <p className="text-sm text-gray-500">
          {activeColumn + 1} of {statusColumns.length}
        </p>
      </div>
      
      <button
        onClick={() => setActiveColumn(Math.min(statusColumns.length - 1, activeColumn + 1))}
        disabled={activeColumn === statusColumns.length - 1}
        className="p-2 rounded-lg bg-white border border-gray-200 disabled:opacity-50"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mb-6">
          <div className="h-10 bg-gray-200 rounded flex-1"></div>
          <div className="h-10 bg-gray-200 rounded w-full sm:w-32"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-7 gap-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-xl h-96"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header with View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">          
          {/* View Mode Toggle - Mobile */}
          <div className="sm:hidden">
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="board">Board View</option>
              <option value="list">List View</option>
            </select>
          </div>
        </div>
        
        <button
          onClick={() => navigate('/upload')}
          className="btn-primary flex items-center space-x-2 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
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
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="ml-4 p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Filter className="h-5 w-5 text-gray-400" />
          </button>
        </div>
        
        {showFilters && (
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <select
                value={filters.priority}
                onChange={(e) => setFilters({...filters, priority: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option>All Priorities</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
            
            <div className="flex-1">
              <select
                value={filters.assignee}
                onChange={(e) => setFilters({...filters, assignee: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option>All Assignees</option>
                {[...new Set(tasks.map(task => task.assignedEditor?.username).filter(Boolean))].map(username => (
                  <option key={username}>{username}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Task Board */}
      {viewMode === 'list' ? (
        <ListView />
      ) : (
        <>
          <BoardNavigation />
          <div className="flex gap-4 overflow-x-auto pb-4">
            {statusColumns.map((column, index) => (
              <StatusColumn
                key={column.key}
                status={column.key}
                title={column.title}
                tasks={getTasksByStatus(column.key)}
                isActive={index === activeColumn}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default TaskBoard;