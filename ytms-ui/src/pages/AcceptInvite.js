
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Mail, Shield, Check, X, AlertCircle, User, UserSquare, Lock, Eye, EyeOff, Video } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const AcceptInvite = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [step, setStep] = useState('details'); // 'details' or 'register'
  const [inviteData, setInviteData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // State for the registration form
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const fetchInviteData = async () => {
      try {
        setIsLoading(true);
        const response = await authAPI.getInviteDetails(token);
        setInviteData(response.data);
      } catch (err) {
        const errorMessage = err.response?.data?.message || 'Invalid or expired invitation link.';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };
    if (token) {
      fetchInviteData();
    }
  }, [token]);

  const handleStartRegistration = () => {
    setStep('register');
    // Pre-fill form if data is available from invite (optional)
    if (inviteData) {
        setFormData(prev => ({
            ...prev,
            firstName: inviteData.firstName || '',
            lastName: inviteData.lastName || ''
        }));
    }
  };

  const handleDeclineInvite = () => {
    authAPI.declineInvite(token)
    toast.success('Invitation declined');
    navigate('/login');
  };

  // --- Registration Form Logic ---
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (formErrors[name] || formErrors.general) {
      setFormErrors(prev => ({ ...prev, [name]: '', general: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.firstName) newErrors.firstName = 'First name is required.';
    if (!formData.lastName) newErrors.lastName = 'Last name is required.';
    if (!formData.username) newErrors.username = 'Username is required.';
    if (!formData.password) newErrors.password = 'Password is required.';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters.';
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsRegistering(true);
    try {
      await authAPI.acceptInvite(token, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: formData.username,
        password: formData.password,
      });
      toast.success('Your account has been created! Please log in.');
      navigate('/login');
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to create account.';
      setFormErrors({ general: errorMessage });
      toast.error(errorMessage);
    } finally {
      setIsRegistering(false);
    }
  };

  // --- Render Logic ---
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invitation Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link to="/login" className="btn-primary w-full">Go to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl shadow-lg">
            <Video className="w-8 h-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            {step === 'details' ? "You're Invited!" : "Complete Your Account"}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {step === 'details' 
              ? `You've been invited to join the team as a ${inviteData?.userRole?.toLowerCase()}.`
              : `Create your account to accept the invitation for ${inviteData?.email}.`}
          </p>
        </div>

        {step === 'details' && (
          <div className="bg-white rounded-xl shadow-lg p-8 animate-fadeIn">
             {inviteData && (
              <div className="bg-gray-50 rounded-lg p-6 mb-6 space-y-4">
                <h3 className="font-semibold text-gray-900 mb-3">Invitation Details</h3>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    Email:
                  </span>
                  <span className="text-sm text-gray-900">{inviteData.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 flex items-center">
                    <Shield className="h-4 w-4 mr-2" />
                    Role:
                  </span>
                  <span className="text-sm text-gray-900 bg-primary-100 text-primary-800 px-2 py-1 rounded-full">
                    {inviteData.userRole}
                  </span>
                </div>
              </div>
            )}
            <div className="flex space-x-4">
              <button onClick={handleDeclineInvite} className="btn-secondary flex-1">
                <X className="h-4 w-4 mr-2" /> Decline
              </button>
              <button onClick={handleStartRegistration} className="btn-primary flex-1">
                <Check className="h-4 w-4 mr-2" /> Accept Invitation
              </button>
            </div>
          </div>
        )}

        {step === 'register' && (
          <div className="bg-white rounded-2xl shadow-xl p-8 animate-fadeIn">
            <form className="space-y-6" onSubmit={handleCompleteRegistration}>
              {formErrors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                  <p className="text-red-600 text-sm">{formErrors.general}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2"><UserSquare className="inline-block h-4 w-4 mr-1" />First Name</label>
                  <input id="firstName" name="firstName" type="text" required value={formData.firstName} onChange={handleFormChange} className={`input-field ${formErrors.firstName ? 'border-red-500' : ''}`} placeholder="First Name" />
                  {formErrors.firstName && <p className="text-red-500 text-xs mt-1">{formErrors.firstName}</p>}
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2"><UserSquare className="inline-block h-4 w-4 mr-1" />Last Name</label>
                  <input id="lastName" name="lastName" type="text" required value={formData.lastName} onChange={handleFormChange} className={`input-field ${formErrors.lastName ? 'border-red-500' : ''}`} placeholder="Last Name" />
                  {formErrors.lastName && <p className="text-red-500 text-xs mt-1">{formErrors.lastName}</p>}
                </div>
              </div>
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2"><User className="inline-block h-4 w-4 mr-1" />Username</label>
                <input id="username" name="username" type="text" required value={formData.username} onChange={handleFormChange} className={`input-field ${formErrors.username ? 'border-red-500' : ''}`} placeholder="Choose a username" />
                {formErrors.username && <p className="text-red-500 text-xs mt-1">{formErrors.username}</p>}
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2"><Lock className="inline-block h-4 w-4 mr-1" />Password</label>
                <div className="relative">
                  <input id="password" name="password" type={showPassword ? 'text' : 'password'} required value={formData.password} onChange={handleFormChange} className={`input-field pr-10 ${formErrors.password ? 'border-red-500' : ''}`} placeholder="Create a password"/>
                  <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                  </button>
                </div>
                {formErrors.password && <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>}
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2"><Lock className="inline-block h-4 w-4 mr-1" />Confirm Password</label>
                <div className="relative">
                  <input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} required value={formData.confirmPassword} onChange={handleFormChange} className={`input-field pr-10 ${formErrors.confirmPassword ? 'border-red-500' : ''}`} placeholder="Confirm your password" />
                  <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                  </button>
                </div>
                {formErrors.confirmPassword && <p className="text-red-500 text-xs mt-1">{formErrors.confirmPassword}</p>}
              </div>
              <div>
                <button type="submit" disabled={isRegistering} className="w-full btn-primary flex justify-center py-3 text-base font-medium">
                  {isRegistering ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : 'Create Account & Join'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default AcceptInvite;
