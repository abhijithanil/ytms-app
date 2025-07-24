import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Save,
  Plus,
  Trash2,
  AlertCircle,
  Upload,
  Image,
  Video,
  Youtube,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { storageAPI } from "../services/api";

const MultiVideoMetadataModal = ({
  isOpen,
  onClose,
  onSubmit,
  selectedRevisions = [],
  existingMetadata = {},
  isRequired = false,
  pendingStatus,
}) => {
  const [videoMetadataList, setVideoMetadataList] = useState([]);
  const [expandedVideo, setExpandedVideo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRefs = useRef({});

  const categories = [
    "Film & Animation",
    "Autos & Vehicles", 
    "Music",
    "Pets & Animals",
    "Sports",
    "Short Movies",
    "Travel & Events",
    "Gaming",
    "Videoblogging",
    "People & Blogs",
    "Comedy",
    "Entertainment",
    "News & Politics",
    "Howto & Style",
    "Education",
    "Science & Technology",
    "Nonprofits & Activism",
  ];

  const languages = [
    { code: "en", name: "English" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "it", name: "Italian" },
    { code: "pt", name: "Portuguese" },
    { code: "ru", name: "Russian" },
    { code: "ja", name: "Japanese" },
    { code: "ko", name: "Korean" },
    { code: "zh", name: "Chinese" },
    { code: "hi", name: "Hindi" },
    { code: "ar", name: "Arabic" },
  ];

  // Initialize metadata for each selected revision
  useEffect(() => {
    if (isOpen && selectedRevisions.length > 0) {
      const initMetadata = selectedRevisions.map((revision, index) => {
        const existingData = existingMetadata[revision.id] || {};
        
        return {
          revisionId: revision.id,
          revisionNumber: revision.revisionNumber,
          title: existingData.title || `Video ${revision.revisionNumber}`,
          description: existingData.description || "",
          tags: existingData.tags || [],
          thumbnail_url: existingData.thumbnail_url || "",
          category: existingData.category || "Entertainment",
          language: existingData.language || "en",
          privacy_status: existingData.privacy_status || "public",
          age_restriction: existingData.age_restriction || false,
          made_for_kids: existingData.made_for_kids || false,
          recording_details: {
            location_description: existingData.recording_details?.location_description || "",
            recording_date: existingData.recording_details?.recording_date || "",
          },
          license: existingData.license || "YouTube Standard License",
          video_chapters: existingData.video_chapters || [],
          newTag: "",
          newChapter: { title: "", timestamp: "" },
          thumbnailFile: null,
          thumbnailPreview: existingData.thumbnail_url || null,
          isUploadingThumbnail: false,
        };
      });
      
      setVideoMetadataList(initMetadata);
      setExpandedVideo(initMetadata.length > 0 ? 0 : null);
      setHasChanges(Object.keys(existingMetadata).length === 0);
    }
  }, [isOpen, selectedRevisions, existingMetadata]);

  const updateVideoMetadata = (index, field, value) => {
    setVideoMetadataList(prev => {
      const updated = [...prev];
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        updated[index] = {
          ...updated[index],
          [parent]: {
            ...updated[index][parent],
            [child]: value
          }
        };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
    setHasChanges(true);
  };

  const handleThumbnailUpload = async (index, file) => {
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      alert("Please upload a valid image file (JPEG, PNG, or WebP)");
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("File size must be less than 5MB");
      return;
    }

    updateVideoMetadata(index, 'isUploadingThumbnail', true);
    const previewUrl = URL.createObjectURL(file);
    updateVideoMetadata(index, 'thumbnailPreview', previewUrl);
    updateVideoMetadata(index, 'thumbnailFile', file);

    try {
      const timestamp = Date.now();
      const extension = file.name.split(".").pop();
      const uniqueFileName = `thumbnail_${timestamp}_${index}.${extension}`;
      const response = await storageAPI.generateSignedUrl(
        uniqueFileName,
        "thumbnails",
        file.type
      );
      const { signedUrl, objectName } = response.data;

      const init = await fetch(signedUrl, {
        method: "POST",
        headers: {
          "x-goog-resumable": "start",
          "Content-Type": file.type,
        },
      });

      if (!init.ok) {
        throw new Error(`Failed to start resumable upload: ${init.status} ${init.statusText}`);
      }

      const sessionUri = init.headers.get("Location");
      if (!sessionUri) throw new Error("Missing resumable session URI");

      const xhr = new XMLHttpRequest();
      xhr.timeout = 30 * 60 * 1000;
      xhr.open("PUT", sessionUri);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);

      const publicUrl = `https://storage.googleapis.com/${
        process.env.REACT_APP_GCP_BUCKET_NAME || "ytmthelper-inspire26-pub"
      }/${objectName}`;

      updateVideoMetadata(index, 'thumbnail_url', publicUrl);
      console.log("Thumbnail uploaded successfully:", publicUrl);
    } catch (error) {
      console.error("Error uploading thumbnail:", error);
      removeThumbnail(index);
    } finally {
      updateVideoMetadata(index, 'isUploadingThumbnail', false);
    }
  };

  const removeThumbnail = (index) => {
    updateVideoMetadata(index, 'thumbnailFile', null);
    updateVideoMetadata(index, 'thumbnailPreview', null);
    updateVideoMetadata(index, 'thumbnail_url', '');
    if (fileInputRefs.current[index]) {
      fileInputRefs.current[index].value = "";
    }
  };

  const addTag = (index) => {
    const metadata = videoMetadataList[index];
    if (metadata.newTag.trim() && !metadata.tags.includes(metadata.newTag.trim())) {
      updateVideoMetadata(index, 'tags', [...metadata.tags, metadata.newTag.trim()]);
      updateVideoMetadata(index, 'newTag', '');
    }
  };

  const removeTag = (index, tagToRemove) => {
    const metadata = videoMetadataList[index];
    updateVideoMetadata(index, 'tags', metadata.tags.filter(tag => tag !== tagToRemove));
  };

  const addChapter = (index) => {
    const metadata = videoMetadataList[index];
    if (metadata.newChapter.title.trim() && metadata.newChapter.timestamp.trim()) {
      updateVideoMetadata(index, 'video_chapters', [...metadata.video_chapters, { ...metadata.newChapter }]);
      updateVideoMetadata(index, 'newChapter', { title: "", timestamp: "" });
    }
  };

  const removeChapter = (index, chapterIndex) => {
    const metadata = videoMetadataList[index];
    updateVideoMetadata(index, 'video_chapters', metadata.video_chapters.filter((_, i) => i !== chapterIndex));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all videos have required fields
    for (const metadata of videoMetadataList) {
      if (!metadata.title.trim() || !metadata.description.trim()) {
        alert(`Video ${metadata.revisionNumber}: Title and Description are required`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const metadataMap = {};
      
      for (const metadata of videoMetadataList) {
        const data = {
          title: metadata.title,
          description: metadata.description,
          tags: metadata.tags,
          thumbnail_url: metadata.thumbnail_url,
          category: metadata.category,
          language: metadata.language,
          privacy_status: metadata.privacy_status,
          age_restriction: metadata.age_restriction,
          made_for_kids: metadata.made_for_kids,
          recording_details: {
            location_description: metadata.recording_details.location_description,
            recording_date: metadata.recording_details.recording_date,
          },
          license: metadata.license,
          video_chapters: metadata.video_chapters.filter(
            chapter => chapter.title.trim() !== "" && chapter.timestamp.trim() !== ""
          ),
        };
        
        metadataMap[metadata.revisionId] = data;
      }

      await onSubmit(metadataMap);
      onClose();
    } catch (error) {
      console.error("Failed to save video metadata:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Video Metadata ({videoMetadataList.length} videos)
            </h2>
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
          {/* Video Metadata List */}
          {videoMetadataList.map((metadata, index) => (
            <div key={metadata.revisionId} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Video Header */}
              <div 
                className="bg-gray-50 px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => setExpandedVideo(expandedVideo === index ? null : index)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Video className="h-5 w-5 text-blue-600" />
                    <div>
                      <h3 className="font-medium text-gray-900">
                        Revision #{metadata.revisionNumber}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {metadata.title || 'Untitled Video'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {metadata.title && metadata.description && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        Complete
                      </span>
                    )}
                    {expandedVideo === index ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Video Content */}
              {expandedVideo === index && (
                <div className="p-4 space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-900">Basic Information</h4>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Title *
                      </label>
                      <input
                        type="text"
                        value={metadata.title}
                        onChange={(e) => updateVideoMetadata(index, 'title', e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter video title..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description *
                      </label>
                      <textarea
                        value={metadata.description}
                        onChange={(e) => updateVideoMetadata(index, 'description', e.target.value)}
                        required
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter video description..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Category
                        </label>
                        <select
                          value={metadata.category}
                          onChange={(e) => updateVideoMetadata(index, 'category', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {categories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Language
                        </label>
                        <select
                          value={metadata.language}
                          onChange={(e) => updateVideoMetadata(index, 'language', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {languages.map((lang) => (
                            <option key={lang.code} value={lang.code}>
                              {lang.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Thumbnail Upload */}
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-900">Thumbnail</h4>
                    <div className="space-y-3">
                      {metadata.thumbnailPreview ? (
                        <div className="relative group">
                          <img
                            src={metadata.thumbnailPreview}
                            alt="Thumbnail preview"
                            className="w-full max-w-xs h-32 object-cover rounded-lg border border-gray-300"
                          />
                          <button
                            type="button"
                            onClick={() => removeThumbnail(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <Image className="mx-auto h-12 w-12 text-gray-400" />
                          <p className="mt-2 text-sm text-gray-600">Upload a thumbnail</p>
                          <p className="text-xs text-gray-500">JPEG, PNG, or WebP (max 5MB)</p>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => fileInputRefs.current[index]?.click()}
                          disabled={metadata.isUploadingThumbnail}
                          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {metadata.isUploadingThumbnail ? "Uploading..." : "Upload Image"}
                        </button>
                        <input
                          ref={(ref) => fileInputRefs.current[index] = ref}
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={(e) => handleThumbnailUpload(index, e.target.files[0])}
                          disabled={metadata.isUploadingThumbnail}
                          className="hidden"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-900">Tags</h4>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={metadata.newTag}
                        onChange={(e) => updateVideoMetadata(index, 'newTag', e.target.value)}
                        placeholder="Add a tag and press Enter"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag(index))}
                      />
                      <button
                        type="button"
                        onClick={() => addTag(index)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    {metadata.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {metadata.tags.map((tag, tagIndex) => (
                          <span
                            key={tagIndex}
                            className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => removeTag(index, tag)}
                              className="hover:text-blue-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Privacy and Settings */}
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-900">Privacy & Settings</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Privacy Status
                      </label>
                      <select
                        value={metadata.privacy_status}
                        onChange={(e) => updateVideoMetadata(index, 'privacy_status', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                          checked={metadata.made_for_kids}
                          onChange={(e) => updateVideoMetadata(index, 'made_for_kids', e.target.checked)}
                          className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Made for kids</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={metadata.age_restriction}
                          onChange={(e) => updateVideoMetadata(index, 'age_restriction', e.target.checked)}
                          className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Age restriction (18+)</span>
                      </label>
                    </div>
                  </div>

                  {/* Recording Details */}
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-900">Recording Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Location Description
                        </label>
                        <input
                          type="text"
                          value={metadata.recording_details.location_description}
                          onChange={(e) => updateVideoMetadata(index, 'recording_details.location_description', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Rome, Italy"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Recording Date
                        </label>
                        <input
                          type="date"
                          value={metadata.recording_details.recording_date}
                          onChange={(e) => updateVideoMetadata(index, 'recording_details.recording_date', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Video Chapters */}
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-900">Video Chapters</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={metadata.newChapter.title}
                        onChange={(e) => updateVideoMetadata(index, 'newChapter', { ...metadata.newChapter, title: e.target.value })}
                        placeholder="Chapter title..."
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={metadata.newChapter.timestamp}
                          onChange={(e) => updateVideoMetadata(index, 'newChapter', { ...metadata.newChapter, timestamp: e.target.value })}
                          placeholder="00:00"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => addChapter(index)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {metadata.video_chapters.map((chapter, chapterIndex) => (
                        <div
                          key={chapterIndex}
                          className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md"
                        >
                          <span className="text-sm font-medium">
                            <strong>{chapter.timestamp}</strong> - {chapter.title}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeChapter(index, chapterIndex)}
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
                    <h4 className="text-md font-medium text-gray-900">Additional Settings</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        License
                      </label>
                      <select
                        value={metadata.license}
                        onChange={(e) => updateVideoMetadata(index, 'license', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="YouTube Standard License">YouTube Standard License</option>
                        <option value="Creative Commons">Creative Commons</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Form Actions */}
          <div className="flex space-x-3 pt-6 border-t sticky bottom-0 bg-white z-10 py-4">
            <button
              type="submit"
              disabled={isSubmitting || !hasChanges}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? "Saving..." : hasChanges ? "Save All Metadata" : "No Changes"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isRequired && !hasChanges}
              className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRequired && !hasChanges ? "Metadata Required" : "Cancel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MultiVideoMetadataModal;