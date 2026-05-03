import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import TeacherDashboard from './pages/TeacherDashboard';
import SessionAttendance from './pages/SessionAttendance';
import AdminDashboard from './pages/AdminDashboard';
import Students from './pages/Students';
import Classes from './pages/Classes';
import AdminSessions from './pages/AdminSessions';
import AdminAccount from './pages/AdminAccount';
import AdminTeachers from './pages/AdminTeachers';
import AdminSchedule from './pages/AdminSchedule';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './hooks/useAuth';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function RootRedirect() {
  const { user, role, teacherPhone, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (role === 'teacher' && teacherPhone) return <Navigate to="/teacher" replace />;
  if (role === 'admin' && user) return <Navigate to="/admin" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');

  return (
    <BrowserRouter basename={base}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RootRedirect />} />

        {/* Teacher routes */}
        <Route path="/teacher" element={
          <ProtectedRoute requiredRole="teacher">
            <TeacherDashboard />
          </ProtectedRoute>
        } />
        <Route path="/teacher/session/:id" element={
          <ProtectedRoute requiredRole="teacher">
            <SessionAttendance />
          </ProtectedRoute>
        } />

        {/* Admin routes */}
        <Route path="/admin" element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/students" element={
          <ProtectedRoute requiredRole="admin">
            <Students />
          </ProtectedRoute>
        } />
        <Route path="/admin/classes" element={
          <ProtectedRoute requiredRole="admin">
            <Classes />
          </ProtectedRoute>
        } />
        <Route path="/admin/sessions" element={
          <ProtectedRoute requiredRole="admin">
            <AdminSessions />
          </ProtectedRoute>
        } />
        <Route path="/admin/account" element={
          <ProtectedRoute requiredRole="admin">
            <AdminAccount />
          </ProtectedRoute>
        } />
        <Route path="/admin/teachers" element={
          <ProtectedRoute requiredRole="admin">
            <AdminTeachers />
          </ProtectedRoute>
        } />
        <Route path="/admin/schedule" element={
          <ProtectedRoute requiredRole="admin">
            <AdminSchedule />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <Toaster
        position="top-center"
        toastOptions={{
          style: { fontFamily: "'Cairo', sans-serif", direction: 'rtl' },
          success: { duration: 2000 },
          error: { duration: 4000 },
        }}
      />
    </BrowserRouter>
  );
}
