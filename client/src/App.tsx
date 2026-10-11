import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './layouts/DashboardLayout';

// Auth Pages
import { Login } from './pages/auth/Login';
import { AdminLogin } from './pages/auth/AdminLogin';
import { Register } from './pages/auth/Register';
import { ForgotPassword } from './pages/auth/ForgotPassword';

// Researcher & Clinician Workflows
import { Dashboard } from './pages/researcher/Dashboard';
import { NewAnalysis } from './pages/researcher/NewAnalysis';
import { PredictionResult } from './pages/researcher/PredictionResult';
import { Explainability } from './pages/researcher/Explainability';
import { PredictionDetails } from './pages/researcher/PredictionDetails';
import { PredictionHistory } from './pages/researcher/PredictionHistory';
import { ClinicalReview } from './pages/clinician/ClinicalReview';
import { ClinicianDashboard } from './pages/clinician/ClinicianDashboard';
import { CaseManagement } from './pages/cases/CaseManagement';
import { Reports } from './pages/researcher/Reports';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { UserManagement } from './pages/admin/UserManagement';
import { RoleManagement } from './pages/admin/RoleManagement';
import { ModelManagement } from './pages/admin/ModelManagement';
import { ModelPerformance } from './pages/admin/ModelPerformance';
import { DatasetManagement } from './pages/admin/DatasetManagement';
import { Analytics } from './pages/admin/Analytics';
import { AuditLogs } from './pages/admin/AuditLogs';
import { Profile } from './pages/profile/Profile';
import { Settings } from './pages/admin/Settings';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <BrowserRouter>
            <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected Application Routes */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/analyze" element={<NewAnalysis />} />
            <Route path="/prediction/:id" element={<PredictionResult />} />
            <Route path="/explanation" element={<Explainability />} />
            <Route path="/explanation/:id" element={<Explainability />} />
            <Route path="/explainability" element={<Explainability />} />
            <Route path="/explainability/:id" element={<Explainability />} />
            <Route path="/analysis/:id" element={<PredictionDetails />} />
            <Route path="/cases" element={<CaseManagement />} />
            <Route path="/history" element={<PredictionHistory />} />
            <Route path="/reports" element={<Reports />} />

            {/* Clinician Review & Dashboard Routes */}
            <Route
              path="/clinician/dashboard"
              element={
                <ProtectedRoute allowedRoles={['Clinician', 'Admin']}>
                  <ClinicianDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reviews"
              element={
                <ProtectedRoute allowedRoles={['Clinician', 'Admin']}>
                  <ClinicalReview />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/roles"
              element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <RoleManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/models"
              element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <ModelManagement />
                </ProtectedRoute>
              }
            />
            <Route path="/admin/performance" element={<ModelPerformance />} />
            <Route
              path="/admin/datasets"
              element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <DatasetManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <Analytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/audit-logs"
              element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <AuditLogs />
                </ProtectedRoute>
              }
            />

            {/* Common Profile & Settings */}
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  </ThemeProvider>
  );
};

export default App;
