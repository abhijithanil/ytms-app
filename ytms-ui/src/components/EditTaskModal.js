import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Calendar, Flag, ChevronDown, Search } from 'lucide-react';
import { usersAPI } from "../services/api";

const EditTaskModal = ({ isOpen, onClose, onSubmit, task }) => {
  const [formData, setFormData] = useState({
    description: '',
    deadline: '',
    priority: 'MEDIUM'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editor, setEditor] = useState('');
  const [editors, setEditors] = useState([]);

  // Searchable select states
  const [isEditorDropdownOpen, setIsEditorDropdownOpen] = useState(false);
  const [editorSearchTerm, setEditorSearchTerm] = useState('');
  const [selectedEditor, setSelectedEditor] = useState(null);
  
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const priorities = [
    { value: 'LOW', label: 'Low', color: 'text-green-600' },
    { value: 'MEDIUM', label: 'Medium', color: 'text-yellow-600' },
    { value: 'HIGH', label: 'High', color: 'text-red-600' }
  ];

  // Filter editors based on search term
  const filteredEditors = editors.filter(editor => {
    const searchLower = editorSearchTerm.toLowerCase();
    const name = editor.name || editor.label || editor.username || editor.email || '';
    return name.toLowerCase().includes(searchLower);
  });

  useEffect(() => {
    const fetchEditors = async () => {
      try {
        const response = await usersAPI.getEditors();
        setEditors(response.data || []);
      } catch (error) {
        console.error('Failed to fetch editors:', error);
      }
    };
    fetchEditors();
  }, []);

  useEffect(() => {
    if (task && isOpen) {
      const editorName = task?.assignedEditor?.username || task?.assignedEditor?.name || '';
      setEditor(editorName);
      
      // Find and set the selected editor object
      const assignedEditor = editors.find(e => 
        (e.id || e.value) === (task.assignedEditor?.id || task.assignedEditor)
      );
      setSelectedEditor(assignedEditor || null);
      
      setFormData({
        description: task.description || '',
        deadline: task.deadline ? task.deadline.split('T')[0] : '',
        priority: task.priority || 'MEDIUM',
        assignedEditorId: task.assignedEditor?.id || task.assignedEditor || null
      });
    }
  }, [task, isOpen, editors]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsEditorDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isEditorDropdownOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isEditorDropdownOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const submitData = {
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
        description: formData.description ? formData.description : null,
        priority: formData.priority,
        assignedEditorId: formData.assignedEditorId
      };
      await onSubmit(submitData);
    } catch (error) {
      console.error('Failed to update task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditorSelect = (selectedEditor) => {
    setSelectedEditor(selectedEditor);
    setFormData(prev => ({
      ...prev,
      assignedEditorId: selectedEditor.id || selectedEditor.value
    }));
    setIsEditorDropdownOpen(false);
    setEditorSearchTerm('');
  };

  const handleClearEditor = () => {
    setSelectedEditor(null);
    setFormData(prev => ({ ...prev, assignedEditorId: null }));
    setEditorSearchTerm('');
  };

  const getEditorDisplayName = (editor) => {
    return editor.name || editor.label || editor.username || editor.email || 'Unknown Editor';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Edit Task</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="Enter task description..."
            />
          </div>

          {/* Searchable Editor Assignment */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Flag className="inline h-4 w-4 mr-1" />
              Assigned Editor {editor && `: ${editor}`}
            </label>
            
            {/* Custom searchable select */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsEditorDropdownOpen(!isEditorDropdownOpen)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white flex items-center justify-between hover:bg-gray-50"
              >
                <span className={selectedEditor ? 'text-gray-900' : 'text-gray-500'}>
                  {selectedEditor ? getEditorDisplayName(selectedEditor) : 'Select editor...'}
                </span>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isEditorDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown */}
              {isEditorDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
                  {/* Search input */}
                  <div className="p-2 border-b border-gray-200">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search editors..."
                        value={editorSearchTerm}
                        onChange={(e) => setEditorSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Options list */}
                  <div className="max-h-48 overflow-y-auto">
                    {/* Clear selection option */}
                    <button
                      type="button"
                      onClick={handleClearEditor}
                      className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-100 border-b border-gray-100"
                    >
                      <em>No editor assigned</em>
                    </button>

                    {/* Filtered editors */}
                    {filteredEditors.length > 0 ? (
                      filteredEditors.map((editor) => (
                        <button
                          key={editor.id || editor.value}
                          type="button"
                          onClick={() => handleEditorSelect(editor)}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors ${
                            selectedEditor && (selectedEditor.id || selectedEditor.value) === (editor.id || editor.value)
                              ? 'bg-blue-100 text-blue-900'
                              : 'text-gray-900'
                          }`}
                        >
                          {getEditorDisplayName(editor)}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500 italic">
                        No editors found matching "{editorSearchTerm}"
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <p className="text-xs text-gray-500 mt-1">
              Assign an editor to this task
            </p>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Flag className="inline h-4 w-4 mr-1" />
              Priority
            </label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              {priorities.map((priority) => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Set the task priority level
            </p>
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              Deadline (Optional)
            </label>
            <input
              type="date"
              name="deadline"
              value={formData.deadline}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              min={new Date().toISOString().slice(0, 10)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Set a deadline for this task
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTaskModal;