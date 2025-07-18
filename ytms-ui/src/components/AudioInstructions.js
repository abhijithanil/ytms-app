

import React from 'react';
import {
  Mic,
  Play,
  Pause,
  Square,
  RotateCcw,
  Save,
  Volume2,
  Trash2,
  Upload
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const AudioInstructions = ({
  audioInstructions,
  user,
  task,
  showUploadAudio,
  setShowUploadAudio,
  newAudioDescription,
  setNewAudioDescription,
  playingAudio,
  isRecording,
  isPaused,
  recordingTime,
  currentAudioBlob,
  onAudioUpload,
  onPlayAudio,
  onAudioDelete,
  onStartRecording,
  onStopRecording,
  onTogglePauseResume,
  onResetRecording,
  canAddAudioInstruction,
  isMobile = false
}) => {
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  const content = (
    <div className={isMobile ? "p-4" : ""}>
      {!isMobile && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
          <h3 className="text-lg font-semibold text-gray-900">
            Audio Instructions
          </h3>

          {canAddAudioInstruction() && (
            <button
              onClick={() => setShowUploadAudio(!showUploadAudio)}
              className="btn-primary text-sm flex items-center justify-center space-x-2 w-full sm:w-auto"
            >
              <Mic className="h-4 w-4" />
              <span>Add Audio</span>
            </button>
          )}
        </div>
      )}

      {/* Add Audio button for mobile */}
      {isMobile && canAddAudioInstruction() && (
        <div className="mb-4">
          <button
            onClick={() => setShowUploadAudio(!showUploadAudio)}
            className="btn-primary text-sm flex items-center justify-center space-x-2 w-full"
          >
            <Mic className="h-4 w-4" />
            <span>Add Audio</span>
          </button>
        </div>
      )}

      {/* Upload Audio Form */}
      {showUploadAudio && (
        <form
          onSubmit={onAudioUpload}
          className="mb-4 p-4 bg-gray-50 rounded-lg"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                <Mic className="inline h-4 w-4 mr-1" />
                Record Audio Instruction *
              </label>

              <div className="border border-gray-200 rounded-xl p-4 space-y-4">
                {!isRecording && !currentAudioBlob && (
                  <button
                    type="button"
                    onClick={onStartRecording}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                  >
                    <Mic className="h-5 w-5" />
                    <span>Start Recording</span>
                  </button>
                )}

                {(isRecording || currentAudioBlob) && (
                  <div className="bg-blue-50 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {isRecording && (
                          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-red-500 animate-pulse">
                            <Mic className="h-4 w-4 text-white" />
                          </div>
                        )}
                        <span className="font-mono text-base lg:text-lg text-gray-700">
                          {formatTime(recordingTime)}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {isRecording && (
                          <>
                            <button
                              type="button"
                              onClick={onTogglePauseResume}
                              className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-100"
                            >
                              {isPaused ? (
                                <Play className="h-5 w-5 text-gray-700" />
                              ) : (
                                <Pause className="h-5 w-5 text-gray-700" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={onStopRecording}
                              className="p-2 bg-red-500 text-white rounded-full shadow-sm hover:bg-red-600"
                            >
                              <Square className="h-5 w-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {currentAudioBlob && (
                      <div className="space-y-3">
                        <audio
                          src={URL.createObjectURL(currentAudioBlob)}
                          controls
                          className="w-full"
                        />
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={onResetRecording}
                            className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                          >
                            <RotateCcw className="h-4 w-4" />
                            <span>Record Again</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <input
                type="text"
                value={newAudioDescription}
                onChange={(e) => setNewAudioDescription(e.target.value)}
                className="input-field w-full text-sm"
                placeholder="Brief description of the instruction..."
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="submit"
                className="btn-primary text-sm flex items-center justify-center flex-1"
                disabled={!currentAudioBlob}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Audio Instruction
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUploadAudio(false);
                  onResetRecording();
                  setNewAudioDescription("");
                }}
                className="btn-secondary text-sm flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Audio Instructions List */}
      {audioInstructions.length > 0 ? (
        <div className="space-y-3">
          {audioInstructions.map((audio) => (
            <div key={audio.id} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <button
                    onClick={() => onPlayAudio(audio.id)}
                    className={`p-2 rounded-full transition-colors flex-shrink-0 ${
                      playingAudio === audio.id
                        ? "bg-red-100 hover:bg-red-200"
                        : "bg-blue-100 hover:bg-blue-200"
                    }`}
                  >
                    {playingAudio === audio.id ? (
                      <Pause className="h-4 w-4 text-red-600" />
                    ) : (
                      <Play className="h-4 w-4 text-blue-600" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {audio.audioFilename}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(audio.createdAt), {
                        addSuffix: true,
                      })}
                      {" by "} {audio.uploadedBy.username}
                    </p>
                  </div>
                </div>
                
                {(user.role === 'ADMIN' || audio.uploadedBy.id === user.id) && (
                  <button
                    onClick={() => onAudioDelete(audio.id)}
                    className="p-1 hover:bg-red-100 rounded transition-colors flex-shrink-0"
                    title="Delete Audio Instruction"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </button>
                )}
              </div>

              {audio.description && (
                <p className="text-sm text-gray-600 mt-2 italic break-words">
                  "{audio.description}"
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Volume2 className="h-8 lg:h-12 w-8 lg:w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-sm lg:text-base">No audio instructions</p>
          {canAddAudioInstruction() && (
            <button
              onClick={() => setShowUploadAudio(true)}
              className="btn-primary mt-4 text-sm"
            >
              Add First Audio Instruction
            </button>
          )}
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return content;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
      {content}
    </div>
  );
};

export default AudioInstructions;
