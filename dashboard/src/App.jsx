import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ExamProvider } from './context/ExamContext';

import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import CreateExamPage from './pages/admin/CreateExamPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';
import AdminStudentsPage from './pages/admin/AdminStudentsPage';
import AdminExamsPage from './pages/admin/AdminExamsPage';
import StudentWaitingRoom from './pages/student/StudentWaitingRoom';
import ExamRoomPage from './pages/student/ExamRoomPage';
import ExamSubmittedPage from './pages/student/ExamSubmittedPage';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRole = null }) => {
  const { auth } = useAuth();
  
  // Loading state handling if auth isn't initialized yet
  if (auth === undefined) return null; 

  if (!auth.isAuthenticated) return <Navigate to="/" replace />;
  if (allowedRole && auth.role !== allowedRole) return <Navigate to="/" replace />;
  return children;
};

function AppRouter() {
  return (
    <div className="bg-[#BDD8E9] min-h-screen text-[#001D39] selection:bg-blue-500/30 font-sans">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          
          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>
          } />
          <Route path="/admin/create-exam" element={
            <ProtectedRoute allowedRole="admin"><CreateExamPage /></ProtectedRoute>
          } />
          <Route path="/admin/reports" element={
            <ProtectedRoute allowedRole="admin"><AdminReportsPage /></ProtectedRoute>
          } />
          <Route path="/admin/students" element={
            <ProtectedRoute allowedRole="admin"><AdminStudentsPage /></ProtectedRoute>
          } />
          <Route path="/admin/exams" element={
            <ProtectedRoute allowedRole="admin"><AdminExamsPage /></ProtectedRoute>
          } />

          {/* Student Routes */}
          <Route path="/exam/waiting" element={
            <ProtectedRoute allowedRole="student"><StudentWaitingRoom /></ProtectedRoute>
          } />
          <Route path="/exam/room" element={
            <ProtectedRoute allowedRole="student"><ExamRoomPage /></ProtectedRoute>
          } />
          <Route path="/exam/submitted" element={
            <ProtectedRoute allowedRole="student"><ExamSubmittedPage /></ProtectedRoute>
          } />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ExamProvider>
        <AppRouter />
      </ExamProvider>
    </AuthProvider>
  );
}
