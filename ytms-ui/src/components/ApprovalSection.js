import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

const ApprovalSection = ({ task, user, onStatusUpdate }) => {
  if (task.status !== 'REVIEW' || user.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Approval</h3>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <p className="text-yellow-800 text-sm">
          This task is ready for your review. Please approve or reject the work.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => onStatusUpdate('READY')}
          className="flex-1 bg-green-600 text-white px-4 py-3 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors flex items-center justify-center space-x-2"
        >
          <CheckCircle className="h-5 w-5" />
          <span>Approve Task</span>
        </button>
        
        <button
          onClick={() => onStatusUpdate('IN_PROGRESS')}
          className="flex-1 bg-red-600 text-white px-4 py-3 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors flex items-center justify-center space-x-2"
        >
          <XCircle className="h-5 w-5" />
          <span>Request Changes</span>
        </button>
      </div>
      
      <p className="text-xs text-gray-500 mt-3 text-center">
        Approving will move the task to "Ready" status. Requesting changes will return it to "In Progress".
      </p>
    </div>
  );
};

export default ApprovalSection;