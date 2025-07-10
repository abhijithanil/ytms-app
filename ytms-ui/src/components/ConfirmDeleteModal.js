import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, taskName, isDeleting }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex items-start">
          <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
            <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
          </div>
          <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Delete Task
            </h3>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                Are you sure you want to permanently delete the task{' '}
                <strong className="text-gray-900">"{taskName}"</strong>?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                This will delete all associated revisions and comments. This action cannot be undone.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                Deleting...
              </>
            ) : (
              'Delete Task'
            )}
          </button>
          <button
            type="button"
            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;