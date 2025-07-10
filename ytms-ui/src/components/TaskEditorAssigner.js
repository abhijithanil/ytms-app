import React, { useState, useEffect } from 'react';
import { usersAPI, tasksAPI } from '../services/api'; // Assuming you have these API helpers
import toast from 'react-hot-toast';
import { PlusCircle, MinusCircle, User, ChevronDown, X } from 'lucide-react';

/**
 * A component to manage assigning/unassigning an editor to a task.
 *
 * @param {object} props
 * @param {object} props.task - The full task object.
 * @param {function} props.onTaskUpdate - Callback function to update the task in the parent component's state.
 */
const TaskEditorAssigner = ({ task, onTaskUpdate }) => {
  // State to manage the UI for editor assignment
  const [isAssigning, setIsAssigning] = useState(false);
  const [editors, setEditors] = useState([]);
  const [selectedEditorId, setSelectedEditorId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch the list of available editors when the component mounts
  useEffect(() => {
    const fetchEditors = async () => {
      try {
        const response = await usersAPI.getEditors();
        // Filter out the currently assigned editor from the dropdown list to avoid redundancy
        setEditors(response.data || []);
      } catch (error) {
        console.error('Failed to fetch editors:', error);
        toast.error('Could not load editors.');
      }
    };
    fetchEditors();
  }, []);

  // Handler to start the assignment process
  const handleBeginAssign = () => {
    setSelectedEditorId(''); // Reset selection
    setIsAssigning(true);
  };

  // Handler to cancel the assignment process
  const handleCancelAssign = () => {
    setIsAssigning(false);
  };

  // Handler for when an editor is selected from the dropdown
  const handleSelectEditor = async (e) => {
    const editorId = e.target.value;
    setSelectedEditorId(editorId);

    if (!editorId) return; // Do nothing if the placeholder is selected

    setIsLoading(true);
    const toastId = toast.loading('Assigning editor...');

    try {
      // API call to the new backend endpoint
      const response = await tasksAPI.assignEditor(task.id, editorId);
      toast.success('Editor assigned successfully!', { id: toastId });

      // Update the parent component's state with the new task data
      onTaskUpdate(response.data);
      setIsAssigning(false); // Close the assignment UI
    } catch (error) {
      console.error('Failed to assign editor:', error);
      toast.error(error.response?.data?.message || 'Failed to assign editor.', { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  // Handler to unassign the current editor
  const handleUnassignEditor = async () => {
    if (!task.assignedEditor) return;

    setIsLoading(true);
    const toastId = toast.loading('Unassigning editor...');

    try {
      // API call with null to unassign
      console.log(task.id)
      const response = await tasksAPI.assignEditor(task.id, null);
      toast.success('Editor unassigned.', { id: toastId });
      onTaskUpdate(response.data);
    } catch (error) {
      console.error('Failed to unassign editor:', error);
      toast.error(error.response?.data?.message || 'Failed to unassign editor.', { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <User className="h-4 w-4 text-gray-500" />
      <span className="text-sm font-medium text-gray-600">Assigned to:</span>
      
      {isAssigning ? (
        // Dropdown UI for assigning an editor
        <div className="flex items-center space-x-2">
          <div className="relative">
            <select
              value={selectedEditorId}
              onChange={handleSelectEditor}
              disabled={isLoading}
              className="pl-3 pr-8 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
            >
              <option value="">Select an editor...</option>
              {editors.map((editor) => (
                <option key={editor.id} value={editor.id}>
                  {editor.username}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          <button onClick={handleCancelAssign} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        // Display current editor or "Unassigned"
        <div className="flex items-center space-x-2">
          <span className="text-sm font-semibold text-gray-800">
            {task.assignedEditor ? task.assignedEditor.username : 'Unassigned'}
          </span>
          
          {task.assignedEditor ? (
            <button
              onClick={handleUnassignEditor}
              disabled={isLoading}
              className="text-red-500 hover:text-red-700 disabled:opacity-50"
              title="Unassign editor"
            >
              <MinusCircle className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={handleBeginAssign}
              disabled={isLoading}
              className="text-green-500 hover:text-green-700 disabled:opacity-50"
              title="Assign an editor"
            >
              <PlusCircle className="h-5 w-5" />
            </button>
          )}
          
          {/* Allow changing the editor even if one is assigned */}
          {/* {task.assignedEditor && (
             <button
              onClick={handleBeginAssign}
              disabled={isLoading}
              className="text-blue-500 hover:text-blue-700 disabled:opacity-50"
              title="Change editor"
            >
              <PlusCircle className="h-5 w-5" />
            </button>
          )} */}
        </div>
      )}
    </div>
  );
};

export default TaskEditorAssigner;