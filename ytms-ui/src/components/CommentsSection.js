import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageCircle, 
  Send, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  Check, 
  X 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const CommentsSection = ({
  comments,
  newComment,
  setNewComment,
  user,
  onCommentSubmit,
  onEditComment,
  onDeleteComment,
  onSaveEdit,
  onCancelEdit,
  editingCommentId,
  editingCommentText,
  setEditingCommentText,
  deletingCommentId
}) => {
  const [commentMenuOpen, setCommentMenuOpen] = useState(null);
  const commentMenuRefs = useRef({});

  useEffect(() => {
    const handleClickOutside = (event) => {
      Object.keys(commentMenuRefs.current).forEach((commentId) => {
        if (
          commentMenuRefs.current[commentId] &&
          !commentMenuRefs.current[commentId].contains(event.target)
        ) {
          setCommentMenuOpen(null);
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const canEditOrDeleteComment = (comment) => {
    return user.role === 'ADMIN' || comment.author.id === user.id;
  };

  const handleEditClick = (comment) => {
    onEditComment(comment);
    setCommentMenuOpen(null);
  };

  const handleDeleteClick = (commentId) => {
    onDeleteComment(commentId);
    setCommentMenuOpen(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Comments</h3>

      {/* Add Comment Form */}
      <form onSubmit={onCommentSubmit} className="mb-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 input-field text-sm lg:text-base"
          />
          <button
            type="submit"
            disabled={!newComment.trim()}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm lg:text-base flex items-center justify-center"
          >
            <Send className="h-4 w-4 mr-2 sm:mr-0" />
            <span className="sm:hidden">Send</span>
          </button>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="flex space-x-3">
            {/* Avatar */}
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-sm font-medium text-primary-600 flex-shrink-0">
              {comment.author.username.charAt(0).toUpperCase()}
            </div>

            {/* Comment Content */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                  <span className="font-medium text-gray-900 text-sm lg:text-base">
                    {comment.author.username}
                  </span>
                  <span className="text-xs lg:text-sm text-gray-500">
                    {formatDistanceToNow(new Date(comment.createdAt), {
                      addSuffix: true,
                    })}
                    {comment.updatedAt !== comment.createdAt && (
                      <span className="ml-1 text-xs text-gray-400">
                        (edited)
                      </span>
                    )}
                  </span>
                </div>

                {/* Comment Menu */}
                {canEditOrDeleteComment(comment) && (
                  <div
                    className="relative flex-shrink-0"
                    ref={(el) => (commentMenuRefs.current[comment.id] = el)}
                  >
                    <button
                      onClick={() =>
                        setCommentMenuOpen(
                          commentMenuOpen === comment.id ? null : comment.id
                        )
                      }
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                      <MoreVertical className="h-4 w-4 text-gray-400" />
                    </button>

                    {commentMenuOpen === comment.id && (
                      <div className="absolute right-0 top-6 mt-1 w-32 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                        <div className="py-1">
                          <button
                            onClick={() => handleEditClick(comment)}
                            className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <Edit3 className="h-3 w-3 mr-2" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick(comment.id)}
                            disabled={deletingCommentId === comment.id}
                            className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="h-3 w-3 mr-2" />
                            {deletingCommentId === comment.id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Comment Text or Edit Form */}
              {editingCommentId === comment.id ? (
                <div className="mt-2 space-y-2">
                  <input
                    type="text"
                    value={editingCommentText}
                    onChange={(e) => setEditingCommentText(e.target.value)}
                    className="w-full input-field text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onSaveEdit(comment.id);
                      } else if (e.key === 'Escape') {
                        onCancelEdit();
                      }
                    }}
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onSaveEdit(comment.id)}
                      disabled={!editingCommentText.trim()}
                      className="btn-primary text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Save
                    </button>
                    <button
                      onClick={onCancelEdit}
                      className="btn-secondary text-xs flex items-center"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-700 mt-1 break-words text-sm lg:text-base">
                  {comment.content}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {comments.length === 0 && (
        <div className="text-center py-8">
          <MessageCircle className="h-8 lg:h-12 w-8 lg:w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-sm lg:text-base">No comments yet</p>
          <p className="text-xs lg:text-sm text-gray-400 mt-1">
            Start the discussion by adding a comment
          </p>
        </div>
      )}
    </div>
  );
};

export default CommentsSection;