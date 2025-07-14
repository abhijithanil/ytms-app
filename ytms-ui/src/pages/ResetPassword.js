import React, { useState } from 'react';
import { Video, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const ResetPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // This is a placeholder for the actual API call
      // You would typically call an API endpoint like:
      // await authAPI.requestPasswordReset(email);
      console.log(`Password reset requested for: ${email}`);
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      setIsSubmitted(true);
      toast.success('If an account with that email exists, a reset link has been sent.');
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error('Failed to send reset link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl shadow-lg">
              <Video className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Reset Your Password
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email to receive a reset link
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {isSubmitted ? (
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-800">Check your inbox</h3>
              <p className="mt-2 text-gray-600">A password reset link has been sent to <strong>{email}</strong> if it's associated with an account.</p>
              <button onClick={navigateToLogin} className="mt-6 w-full btn-primary">
                Back to Login
              </button>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  <Mail className="inline-block h-4 w-4 mr-1" />
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary flex justify-center py-3 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Sending link...</span>
                    </div>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>
            Remember your password?{' '}
            <button
              onClick={navigateToLogin}
              className="font-medium text-primary-600 hover:text-primary-500 underline bg-transparent border-none cursor-pointer"
            >
              Log in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;