import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";

import Layout from "./components/Layout/Layout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ResetPassword from "./pages/ResetPassword";
import AcceptInvite from "./pages/AcceptInvite";
import Dashboard from "./pages/Dashboard";
import TaskBoard from "./pages/TaskBoard";
import TaskDetails from "./pages/TaskDetails";
import UploadVideo from "./pages/UploadVideo";
import Settings from "./pages/Settings";
import Team from "./pages/Team";
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

  console.log('InviteRoute - Loading:', loading, 'User:', user);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Allow both logged-in and logged-out users to access invite links
  console.log('InviteRoute - Rendering children');
  return children;
}

function App() {
  return (
    <AuthProvider>
      <Router>
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
            {/* Public routes that are only accessible when not logged in */}
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
            <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
            
            {/* Invite route accessible by both logged-in and logged-out users */}
            <Route path="/invite/:token" element={<InviteRoute><AcceptInvite /></InviteRoute>} />

            {/* Protected routes that require authentication */}
            <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
            <Route path="/tasks" element={<ProtectedRoute><Layout><TaskBoard /></Layout></ProtectedRoute>} />
            <Route path="/tasks/:id" element={<ProtectedRoute><Layout><TaskDetails /></Layout></ProtectedRoute>} />
            <Route path="/upload" element={<ProtectedRoute><Layout><UploadVideo /></Layout></ProtectedRoute>} />
            <Route path="/team" element={<ProtectedRoute><Layout><Team /></Layout></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />

            {/* Default route redirects to dashboard, which will then redirect to login if not authenticated */}
            <Route path="/" element={<Navigate to="/dashboard" />} />
            
            {/* A catch-all route to handle invalid URLs */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;