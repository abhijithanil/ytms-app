import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const MfaSetup = () => {
  const [qrCode, setQrCode] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = location.state || {};

  useEffect(() => {
    if (!userId) {
      toast.error('User ID not found. Please sign up or accept the invite again.');
      navigate('/signup');
      return;
    }
    fetchMfaSetup();
  }, [userId, navigate]);

  const fetchMfaSetup = async () => {
    try {
      const response = await api.post('/auth/mfa-setup', { userId });
      setQrCode(response.data.qrCodeImageUri); // Corrected key
      setIsLoading(false);
    } catch (error) {
      toast.error('Failed to start MFA setup. Please try again.');
      navigate('/login');
    }
  };

  const handleOtpChange = (e) => {
    setOtp(e.target.value);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setIsVerifying(true);
    try {
      await api.post('/auth/mfa-verify', { userId, token: otp });
      toast.success('MFA enabled successfully!');
      navigate('/login');
    } catch (error) {
      toast.error('Invalid OTP. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSkip = () => {
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Shield className="h-12 w-12 text-primary-600 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900">Set Up Multi-Factor Authentication</h2>
          <p className="mt-2 text-sm text-gray-600">
            Scan the QR code with your authenticator app (e.g., Google Authenticator, Authy).
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-center mb-6">
            {qrCode ? (
                <img src={qrCode} alt="MFA QR Code" />
            ) : (
                <div className="w-48 h-48 bg-gray-200 animate-pulse rounded-lg"></div>
            )}
          </div>

          <form onSubmit={handleVerify} className="space-y-6">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                id="otp"
                name="otp"
                type="text"
                value={otp}
                onChange={handleOtpChange}
                className="input-field"
                placeholder="Enter the 6-digit code"
                required
                maxLength="6"
              />
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={handleSkip}
                className="btn-secondary flex-1"
                disabled={isVerifying}
              >
                Skip for Now
              </button>
              <button
                type="submit"
                className="btn-primary flex-1"
                disabled={isVerifying || !otp}
              >
                {isVerifying ? 'Verifying...' : 'Verify & Complete'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MfaSetup;
