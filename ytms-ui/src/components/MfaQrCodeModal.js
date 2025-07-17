import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

const MfaQrCodeModal = ({ isOpen, onClose, qrCodeImageUri }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  if (!isOpen) return null;

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  // Reset loading state when qrCodeImageUri changes
  React.useEffect(() => {
    if (qrCodeImageUri) {
      setImageLoading(true);
      setImageError(false);
    }
  }, [qrCodeImageUri]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md text-center">
        <div className="flex justify-end">
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>
        <h3 className="text-2xl font-semibold text-gray-900 mt-2">
          Enable Two-Factor Authentication
        </h3>
        <p className="mt-2 text-gray-600">
          Scan the image below with your authenticator app (e.g., Google Authenticator, Authy).
        </p>
        
        <div className="my-6">
          {imageLoading && qrCodeImageUri && (
            <div className="w-48 h-48 mx-auto bg-gray-100 flex items-center justify-center border-4 border-white shadow-lg">
              <span className="text-gray-500">Loading QR Code...</span>
            </div>
          )}
          
          {!qrCodeImageUri && (
            <div className="w-48 h-48 mx-auto bg-gray-100 flex items-center justify-center border-4 border-white shadow-lg">
              <span className="text-gray-500">Generating QR Code...</span>
            </div>
          )}
          
          {imageError && (
            <div className="w-48 h-48 mx-auto bg-red-50 flex items-center justify-center border-4 border-red-200 shadow-lg">
              <span className="text-red-500 text-sm">Failed to load QR code</span>
            </div>
          )}
          
          {qrCodeImageUri && (
            <img 
              src={qrCodeImageUri} 
              alt="MFA QR Code" 
              className={`mx-auto border-4 border-white shadow-lg ${imageLoading || imageError ? 'hidden' : ''}`}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          )}
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 text-left">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                After scanning, your login will require a verification code from your app.
              </p>
            </div>
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="btn-primary w-full mt-6"
        >
          Done
        </button>
      </div>
    </div>
  );
};

export default MfaQrCodeModal;