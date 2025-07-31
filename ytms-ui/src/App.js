import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { authAPI } from "./services/api";

import Chat from './pages/Chat'; // Enhanced Chat page
import Layout from "./components/Layout/Layout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import InitialAdminSignup from "./pages/InitialAdminSignup";
import ResetPassword from "./pages/ResetPassword";
import AcceptInvite from "./pages/AcceptInvite";
import Dashboard from "./pages/Dashboard";
import TaskBoard from "./pages/TaskBoard";
import TaskDetails from "./pages/TaskDetails";
import UploadVideo from "./pages/UploadVideo";
import Settings from "./pages/Settings";
import Team from "./pages/Team";
import MfaSetup from "./pages/MfaSetup";
import "./App.css";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return !user ? children : <Navigate to="/dashboard" />;
}

function InviteRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return children;
}

// Main App Content Component
function AppContent() {
  const [initializing, setInitializing] = useState(true);
  const [usersExist, setUsersExist] = useState(true);
  const [checkingUsers, setCheckingUsers] = useState(true);
  const { user, loading } = useAuth();

  useEffect(() => {
    const checkIfUsersExist = async () => {
      try {
        setCheckingUsers(true);
        console.log("Checking if users exist...");
        
        const response = await authAPI.usersExist();
        console.log("Users exist response:", response);
        
        const exists = response.usersExist || response.exists || false;
        setUsersExist(exists);
        
        console.log("Users exist:", exists);
      } catch (error) {
        console.error('Error checking if users exist:', error);
        setUsersExist(true);
      } finally {
        setCheckingUsers(false);
        setInitializing(false);
      }
    };

    checkIfUsersExist();
  }, []);

  if (initializing || checkingUsers || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Loading YTManager...</p>
        </div>
      </div>
    );
  }

  if (!usersExist) {
    return (
      <div className="App">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#363636",
              color: "#fff",
            },
            success: {
              duration: 3000,
              theme: {
                primary: "green",
                secondary: "black",
              },
            },
          }}
        />
        <InitialAdminSignup onAdminCreated={() => {
          setUsersExist(true);
        }} />
      </div>
    );
  }

  return (
    <div className="App">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#363636",
            color: "#fff",
          },
          success: {
            duration: 3000,
            theme: {
              primary: "green",
              secondary: "black",
            },
          },
        }}
      />

      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
        <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
        
        {/* MFA Setup Route */}
        <Route path="/mfa-setup" element={<MfaSetup />} />

        {/* Invite route */}
        <Route path="/invite/:token" element={<InviteRoute><AcceptInvite /></InviteRoute>} />

        {/* Protected routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><Layout><TaskBoard /></Layout></ProtectedRoute>} />
        <Route path="/tasks/:id" element={<ProtectedRoute><Layout><TaskDetails /></Layout></ProtectedRoute>} />
        <Route path="/upload" element={<ProtectedRoute><Layout><UploadVideo /></Layout></ProtectedRoute>} />
        <Route path="/team" element={<ProtectedRoute><Layout><Team /></Layout></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
        
        {/* UPDATED: Chat route with Layout */}
        <Route path="/chat" element={<ProtectedRoute><Layout><Chat /></Layout></ProtectedRoute>} />

        {/* Default route */}
        <Route path="/" element={<Navigate to="/dashboard" />} />
        
        {/* Catch-all route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;