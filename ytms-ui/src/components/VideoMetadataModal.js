import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Save,
  Plus,
  Trash2,
  AlertCircle,
  Upload,
  Image,
} from "lucide-react";
import { storageAPI } from "../services/api";

const VideoMetadataModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isRequired = false,
  pendingStatus,
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    tags: [],
    thumbnail_url: "",
    category: "Entertainment",
    language: "en",
    privacy_status: "public",
    age_restriction: false,
    made_for_kids: false,
    recording_details: {
      location_description: "",
      recording_date: "",
    },
    license: "YouTube Standard License",
    video_chapters: [],
  });

  const [newTag, setNewTag] = useState("");
  const [newChapter, setNewChapter] = useState({ title: "", timestamp: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalData, setOriginalData] = useState(null);
  const fileInputRef = useRef(null);

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

  // Helper function to deep compare objects
  const deepEqual = (obj1, obj2) => {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  };

  // Check if form data has changed
  useEffect(() => {
    if (originalData) {
      const isChanged = !deepEqual(formData, originalData);
      setHasChanges(isChanged);
    }
  }, [formData, originalData]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        const data = {
          title: initialData.title ? initialData.title : "",
          description: initialData.description ? initialData.description : "",
          tags: initialData.tags ? initialData.tags : [],
          thumbnail_url: initialData.thumbnail_url
            ? initialData.thumbnail_url
            : "",
          category: initialData.category ? initialData.category : "",
          language: initialData.language ? initialData.language : "",
          privacy_status: initialData.privacy_status
            ? initialData.privacy_status
            : "public",
          age_restriction: initialData.age_restriction
            ? initialData.age_restriction
            : false,
          made_for_kids: initialData.made_for_kids
            ? initialData.made_for_kids
            : false,
          recording_details: {
            location_description:
              initialData?.recording_details?.location_description ?? "",
            recording_date:
              initialData?.recording_details?.recording_date ?? "",
          },
          license: initialData.license
            ? initialData.license
            : "YouTube Standard License",
          video_chapters: initialData.video_chapters ? initialData.video_chapters : [],
         
        };
        setFormData(data);
        setOriginalData(JSON.parse(JSON.stringify(data))); // Deep copy
        if (initialData.thumbnail_url) {
          setThumbnailPreview(initialData.thumbnail_url);
        }
      } else {
        // Reset to default values
        const defaultData = {
          title: "",
          description: "",
          tags: [],
          thumbnail_url: "",
          category: "Entertainment",
          language: "en",
          privacy_status: "public",
          age_restriction: false,
          made_for_kids: false,
          recording_details: {
            location_description: "",
            recording_date: "",
          },
          license: "YouTube Standard License",
          video_chapters: [],
        };
        setFormData(defaultData);
        setOriginalData(null);
        setThumbnailFile(null);
        setThumbnailPreview(null);
      }
      setHasChanges(false);
    }
  }, [isOpen, initialData]);

  const handleThumbnailUpload = async (file) => {
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

    setIsUploadingThumbnail(true);
    const previewUrl = URL.createObjectURL(file);
    setThumbnailPreview(previewUrl);
    setThumbnailFile(file);

    try {
      const timestamp = Date.now();
      const extension = file.name.split(".").pop();
      const uniqueFileName = `thumbnail_${timestamp}.${extension}`;
      const response = await storageAPI.generateSignedUrl(
        uniqueFileName,
        "thumbnails",
        file.type
      );
      const { signedUrl, objectName, uniqueFilename } = response.data;

      const init = await fetch(signedUrl, {
        method: "POST",
        headers: {
          "x-goog-resumable": "start",
          "Content-Type": file.type,
        },
      });
      if (!init.ok) {
        const text = await init.text();
        throw new Error(
          `Failed to start resumable upload: ${init.status} ${init.statusText}\n${text}`
        );
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

      setFormData((prev) => ({ ...prev, thumbnail_url: publicUrl }));
      setHasChanges(true); // Mark as changed when thumbnail is uploaded
      console.log("Thumbnail uploaded successfully:", publicUrl);
    } catch (error) {
      console.error("Error uploading thumbnail:", error);
      removeThumbnail(); // Revert preview on failure
    } finally {
      setIsUploadingThumbnail(false);
    }
  };

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleThumbnailUpload(file);
    }
  };

  const removeThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setFormData((prev) => ({ ...prev, thumbnail_url: "" }));
    setHasChanges(true); // Mark as changed when thumbnail is removed
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.description.trim()) {
      alert("Title and Description are required");
      return;
    }

    var tags = [];
    if (formData.tags.length > 0) {
      formData.tags.forEach((tag) => {
        tags.push(tag);
      });
    }

    var videoChapters = {};
    if (formData.video_chapters.length > 0) {
      formData.video_chapters.forEach((chapter) => {
        console.log(chapter);
      });
    }

    formData.video_chapters.filter(
      (chapter) =>
        chapter.title.trim() !== "" && chapter.timestamp.trim() !== ""
    );

    setIsSubmitting(true);
    try {
      const data = {
        title: formData.title,
        description: formData.description,
        tags: tags,
        thumbnail_url: formData.thumbnail_url,
        category: formData.category,
        language: formData.language,
        privacy_status: formData.privacy_status,
        age_restriction: formData.age_restriction,
        made_for_kids: formData.made_for_kids,
        recording_details: {
          location_description: formData.recording_details.location_description,
          recording_date: formData.recording_details.recording_date,
        },
        license: formData.license,
        video_chapters: formData.video_chapters.filter(
          (chapter) =>
            chapter.title.trim() !== "" && chapter.timestamp.trim() !== ""
        ),
      };

      console.log("Manually created data object:", data);

      await onSubmit(data);
      onClose();
    } catch (error) {
      console.error("Failed to save video metadata:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === "checkbox" ? checked : value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const addChapter = () => {
    if (newChapter.title.trim() && newChapter.timestamp.trim()) {
      setFormData((prev) => ({
        ...prev,
        video_chapters: [...prev.video_chapters, { ...newChapter }],
      }));
      setNewChapter({ title: "", timestamp: "" });
    }
  };

  const removeChapter = (index) => {
    setFormData((prev) => ({
      ...prev,
      video_chapters: prev.video_chapters.filter((_, i) => i !== index),
    }));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Video Metadata
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
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-md font-medium text-gray-900">
              Basic Information
            </h3>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
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
                  name="language"
                  value={formData.language}
                  onChange={handleChange}
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
            <h3 className="text-md font-medium text-gray-900">Thumbnail</h3>
            <div className="space-y-3">
              {thumbnailPreview ? (
                <div className="relative group">
                  <img
                    src={thumbnailPreview}
                    alt="Thumbnail preview"
                    className="w-full max-w-xs h-32 object-cover rounded-lg border border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={removeThumbnail}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Image className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    Upload a thumbnail
                  </p>
                  <p className="text-xs text-gray-500">
                    JPEG, PNG, or WebP (max 5MB)
                  </p>
                </div>
              )}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={triggerFileInput}
                  disabled={isUploadingThumbnail}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploadingThumbnail ? "Uploading..." : "Upload Image"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleThumbnailChange}
                  disabled={isUploadingThumbnail}
                  className="hidden"
                />
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
                placeholder="Add a tag and press Enter"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addTag())
                }
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
                  className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-blue-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Privacy and Settings */}
          <div className="space-y-4">
            <h3 className="text-md font-medium text-gray-900">
              Privacy & Settings
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Privacy Status
              </label>
              <select
                name="privacy_status"
                value={formData.privacy_status}
                onChange={handleChange}
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
                  name="made_for_kids"
                  checked={formData.made_for_kids}
                  onChange={handleChange}
                  className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Made for kids</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="age_restriction"
                  checked={formData.age_restriction}
                  onChange={handleChange}
                  className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  Age restriction (18+)
                </span>
              </label>
            </div>
          </div>

          {/* Recording Details */}
          <div className="space-y-4">
            <h3 className="text-md font-medium text-gray-900">
              Recording Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location Description
                </label>
                <input
                  type="text"
                  name="recording_details.location_description"
                  value={formData.recording_details.location_description}
                  onChange={handleChange}
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
                  name="recording_details.recording_date"
                  value={formData.recording_details.recording_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Video Chapters */}
          <div className="space-y-4">
            <h3 className="text-md font-medium text-gray-900">
              Video Chapters
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                type="text"
                value={newChapter.title}
                onChange={(e) =>
                  setNewChapter((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Chapter title..."
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newChapter.timestamp}
                  onChange={(e) =>
                    setNewChapter((prev) => ({
                      ...prev,
                      timestamp: e.target.value,
                    }))
                  }
                  placeholder="00:00"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <div
                  key={index}
                  className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md"
                >
                  <span className="text-sm font-medium">
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
            <h3 className="text-md font-medium text-gray-900">
              Additional Settings
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                License
              </label>
              <select
                name="license"
                value={formData.license}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="YouTube Standard License">
                  YouTube Standard License
                </option>
                <option value="Creative Commons">Creative Commons</option>
              </select>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex space-x-3 pt-6 border-t sticky bottom-0 bg-white z-10 py-4">
            <button
              type="submit"
              disabled={
                isSubmitting ||
                isUploadingThumbnail ||
                (!hasChanges && initialData)
              }
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting
                ? "Saving..."
                : hasChanges || !initialData
                ? "Save Metadata"
                : "No Changes"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={
                (isRequired && !initialData) || (!hasChanges && initialData)
              }
              className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRequired && !initialData ? "Metadata Required" : "Cancel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VideoMetadataModal;
