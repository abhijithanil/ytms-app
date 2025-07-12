import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, AlertCircle } from 'lucide-react';

const VideoMetadataModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  initialData, 
  isRequired = false, 
  pendingStatus 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: [],
    thumbnail_url: '',
    category: 'Entertainment',
    language: 'en',
    privacy_status: 'public',
    age_restriction: false,
    made_for_kids: false,
    recording_details: {
      location_description: '',
      recording_date: '',
    },
    license: 'YouTube Standard License',
    video_chapters: [],
  });

  const [newTag, setNewTag] = useState('');
  const [newChapter, setNewChapter] = useState({ title: '', timestamp: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    'Film & Animation',
    'Autos & Vehicles',
    'Music',
    'Pets & Animals',
    'Sports',
    'Short Movies',
    'Travel & Events',
    'Gaming',
    'Videoblogging',
    'People & Blogs',
    'Comedy',
    'Entertainment',
    'News & Politics',
    'Howto & Style',
    'Education',
    'Science & Technology',
    'Nonprofits & Activism',
  ];

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh', name: 'Chinese' },
    { code: 'hi', name: 'Hindi' },
    { code: 'ar', name: 'Arabic' },
  ];

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          ...initialData,
          recording_details: initialData.recording_details || {
            location_description: '',
            recording_date: '',
          },
          video_chapters: initialData.video_chapters || [],
          tags: initialData.tags || [],
        });
      } else {
        // Reset to default values
        setFormData({
          title: '',
          description: '',
          tags: [],
          thumbnail_url: '',
          category: 'Entertainment',
          language: 'en',
          privacy_status: 'public',
          age_restriction: false,
          made_for_kids: false,
          recording_details: {
            location_description: '',
            recording_date: '',
          },
          license: 'YouTube Standard License',
          video_chapters: [],
        });
      }
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title.trim()) {
      alert('Title is required');
      return;
    }
    
    if (!formData.description.trim()) {
      alert('Description is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = {
        ...formData,
        tags: formData.tags.filter(tag => tag.trim() !== ''),
        video_chapters: formData.video_chapters.filter(chapter => 
          chapter.title.trim() !== '' && chapter.timestamp.trim() !== ''
        ),
      };
      await onSubmit(submitData);
    } catch (error) {
      console.error('Failed to save video metadata:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addChapter = () => {
    if (newChapter.title.trim() && newChapter.timestamp.trim()) {
      setFormData(prev => ({
        ...prev,
        video_chapters: [...prev.video_chapters, { ...newChapter }]
      }));
      setNewChapter({ title: '', timestamp: '' });
    }
  };

  const removeChapter = (index) => {
    setFormData(prev => ({
      ...prev,
      video_chapters: prev.video_chapters.filter((_, i) => i !== index)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Video Metadata</h2>
            {isRequired && pendingStatus && (
              <p className="text-sm text-orange-600 mt-1 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                Required to move task to {pendingStatus.toLowerCase()}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-md font-medium text-gray-900">Basic Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter video title..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter video description... Include timestamps, links, etc."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Language
                </label>
                <select
                  name="language"
                  value={formData.language}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <h3 className="text-md font-medium text-gray-900">Tags</h3>
            
            <div className="flex space-x-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add tag..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, index) => (
                <span
                  key={index}
                  className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-2 hover:text-blue-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Privacy and Settings */}
          <div className="space-y-4">
            <h3 className="text-md font-medium text-gray-900">Privacy & Settings</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Privacy Status
              </label>
              <select
                name="privacy_status"
                value={formData.privacy_status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="public">Public</option>
                <option value="unlisted">Unlisted</option>
                <option value="private">Private</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="made_for_kids"
                  checked={formData.made_for_kids}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Made for kids</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="age_restriction"
                  checked={formData.age_restriction}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Age restriction (18+)</span>
              </label>
            </div>
          </div>

          {/* Recording Details */}
          <div className="space-y-4">
            <h3 className="text-md font-medium text-gray-900">Recording Details</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location Description
                </label>
                <input
                  type="text"
                  name="recording_details.location_description"
                  value={formData.recording_details.location_description}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Rome, Italy"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recording Date
                </label>
                <input
                  type="date"
                  name="recording_details.recording_date"
                  value={formData.recording_details.recording_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Video Chapters */}
          <div className="space-y-4">
            <h3 className="text-md font-medium text-gray-900">Video Chapters</h3>
            
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={newChapter.title}
                onChange={(e) => setNewChapter(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Chapter title..."
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newChapter.timestamp}
                  onChange={(e) => setNewChapter(prev => ({ ...prev, timestamp: e.target.value }))}
                  placeholder="00:00"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={addChapter}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {formData.video_chapters.map((chapter, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md">
                  <span className="text-sm">
                    <strong>{chapter.timestamp}</strong> - {chapter.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeChapter(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Settings */}
          <div className="space-y-4">
            <h3 className="text-md font-medium text-gray-900">Additional Settings</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Thumbnail URL (Optional)
              </label>
              <input
                type="url"
                name="thumbnail_url"
                value={formData.thumbnail_url}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com/thumbnail.jpg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                License
              </label>
              <select
                name="license"
                value={formData.license}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="YouTube Standard License">YouTube Standard License</option>
                <option value="Creative Commons">Creative Commons</option>
              </select>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex space-x-3 pt-6 border-t">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Saving...' : 'Save Metadata'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isRequired && !initialData}
              className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRequired && !initialData ? 'Metadata Required' : 'Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VideoMetadataModal;