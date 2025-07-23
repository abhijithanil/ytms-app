import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Shield, ChevronDown, Info, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { tasksAPI } from '../services/api';
import toast from 'react-hot-toast';

const TaskHeader = ({ task, user, onTaskUpdate }) => {
  const navigate = useNavigate();
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showWorkflowInfo, setShowWorkflowInfo] = useState(false);
  const priorityRef = useRef(null);
  const statusRef = useRef(null);
  const workflowRef = useRef(null);

  const priorities = [
    { value: 'LOW', label: 'Low', color: 'bg-green-100 text-green-800' },
    { value: 'MEDIUM', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'HIGH', label: 'High', color: 'bg-red-100 text-red-800' }
  ];

  const statuses = [
    { value: 'DRAFT', label: 'Draft', color: 'bg-gray-100 text-gray-800' },
    { value: 'ASSIGNED', label: 'Assigned', color: 'bg-blue-100 text-blue-800' },
    { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-orange-100 text-orange-800' },
    { value: 'REVIEW', label: 'Review', color: 'bg-purple-100 text-purple-800' },
    { value: 'READY', label: 'Ready', color: 'bg-green-100 text-green-800' },
    { value: 'SCHEDULED', label: 'Scheduled', color: 'bg-indigo-100 text-indigo-800' },
    { value: 'UPLOADED', label: 'Uploaded', color: 'bg-emerald-100 text-emerald-800' }
  ];

  const workflowSteps = [
    // { from: 'DRAFT', to: ['ASSIGNED'], roles: ['ADMIN'] },
    { from: 'ASSIGNED', to: ['IN_PROGRESS'], roles: ['ADMIN', 'EDITOR'] },
    { from: 'IN_PROGRESS', to: ['ASSIGNED', 'REVIEW'], roles: ['ADMIN', 'EDITOR'] },
    { from: 'REVIEW', to: ['IN_PROGRESS', 'READY'], roles: ['ADMIN', 'EDITOR'] },
    { from: 'READY', to: ['SCHEDULED', 'UPLOADED', 'REVIEW'], roles: ['ADMIN'] },
    // { from: 'UPLOADED', to: ['REVIEW'], roles: ['ADMIN'] },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (priorityRef.current && !priorityRef.current.contains(event.target)) {
        setShowPriorityDropdown(false);
      }
      if (statusRef.current && !statusRef.current.contains(event.target)) {
        setShowStatusDropdown(false);
      }
      if (workflowRef.current && !workflowRef.current.contains(event.target)) {
        setShowWorkflowInfo(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const canUpdatePriority = () => {
    return user.role === 'ADMIN' || task?.createdBy?.id === user.id;
  };

  const canUpdateStatus = () => {
    return user.role === 'ADMIN' || task?.assignedEditor?.id === user.id;
  };

  const getAvailableStatuses = () => {
    if (!task) return [];
    
    const currentWorkflow = workflowSteps.find(step => step.from === task.status);
    if (!currentWorkflow) return [];

    const userRole = user.role;
    const isAssignedEditor = task.assignedEditor?.id === user.id;

    if (userRole === 'ADMIN') {
      return currentWorkflow.to;
    }

    if (userRole === 'EDITOR' && isAssignedEditor) {
      return currentWorkflow.to.filter(() => currentWorkflow.roles.includes('EDITOR'));
    }

    return [];
  };

  const handlePriorityUpdate = async (newPriority) => {
    try {
      const response = await tasksAPI.updateTask(task.id, { priority: newPriority });
      onTaskUpdate(response.data);
      toast.success('Priority updated successfully');
      setShowPriorityDropdown(false);
    } catch (error) {
      console.error('Failed to update priority:', error);
      toast.error('Failed to update priority');
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      await tasksAPI.updateStatus(task.id, newStatus);
      onTaskUpdate({ ...task, status: newStatus });
      toast.success('Status updated successfully');
      setShowStatusDropdown(false);
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
    }
  };

  const getPriorityColor = (priority) => {
    const priorityObj = priorities.find(p => p.value === priority);
    return priorityObj?.color || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status) => {
    const statusObj = statuses.find(s => s.value === status);
    return statusObj?.color || 'bg-gray-100 text-gray-800';
  };

  const formatStatus = (status) => {
    const statusObj = statuses.find(s => s.value === status);
    return statusObj?.label || status?.replace('_', ' ').toLowerCase() || 'draft';
  };

  if (!task) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 mt-1 lg:mt-0"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 break-words">
              {task.title}
            </h1>

            <div className="flex flex-wrap items-center gap-2 lg:gap-4 mt-3">
              {/* Status Dropdown */}
              <div className="relative" ref={statusRef}>
                <button
                  onClick={() => canUpdateStatus() && setShowStatusDropdown(!showStatusDropdown)}
                  disabled={!canUpdateStatus()}
                  className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium transition-colors ${getStatusColor(task.status)} ${
                    canUpdateStatus() ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <span>{formatStatus(task.status)}</span>
                  {canUpdateStatus() && <ChevronDown className="h-3 w-3" />}
                </button>

                {showStatusDropdown && canUpdateStatus() && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                    <div className="py-1">
                      {getAvailableStatuses().map((status) => (
                        <button
                          key={status}
                          onClick={() => handleStatusUpdate(status)}
                          className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <span className={`inline-block w-3 h-3 rounded-full mr-2 ${getStatusColor(status).split(' ')[0]}`} />
                          {formatStatus(status)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Workflow Info Icon */}
              <div className="relative" ref={workflowRef}>
                <button
                  onClick={() => setShowWorkflowInfo(!showWorkflowInfo)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="View workflow"
                >
                  <Info className="h-4 w-4 text-gray-500" />
                </button>

                {showWorkflowInfo && (
                  <div className="absolute top-full left-0 mt-1 w-80 bg-white rounded-md shadow-lg border border-gray-200 z-20 p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Workflow Pattern</h4>
                    <div className="space-y-2">
                      {workflowSteps.map((step, index) => (
                        <div key={index} className="text-sm">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded text-xs ${getStatusColor(step.from)}`}>
                              {formatStatus(step.from)}
                            </span>
                            <span className="text-gray-400">→</span>
                            <div className="flex flex-wrap gap-1">
                              {step.to.map((status, i) => (
                                <span key={i} className={`px-2 py-1 rounded text-xs ${getStatusColor(status)}`}>
                                  {formatStatus(status)}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1 ml-2">
                            Roles: {step.roles.join(', ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Priority Dropdown */}
              <div className="relative" ref={priorityRef}>
                <button
                  onClick={() => canUpdatePriority() && setShowPriorityDropdown(!showPriorityDropdown)}
                  disabled={!canUpdatePriority()}
                  className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium transition-colors ${getPriorityColor(task.priority)} ${
                    canUpdatePriority() ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <span>{task.priority?.toLowerCase()}</span>
                  {canUpdatePriority() && <ChevronDown className="h-3 w-3" />}
                </button>

                {showPriorityDropdown && canUpdatePriority() && (
                  <div className="absolute top-full left-0 mt-1 w-32 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                    <div className="py-1">
                      {priorities.map((priority) => (
                        <button
                          key={priority.value}
                          onClick={() => handlePriorityUpdate(priority.value)}
                          className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <span className={`inline-block w-3 h-3 rounded-full mr-2 ${priority.color.split(' ')[0]}`} />
                          {priority.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {task.privacyLevel === 'SELECTED' && (
                <span className="flex items-center text-sm text-gray-500">
                  <Shield className="h-4 w-4 mr-1" />
                  Private
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskHeader;