import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import TeacherDashboard from './pages/TeacherDashboard';
import SessionAttendance from './pages/SessionAttendance';
import AdminDashboard from './pages/AdminDashboard';
import Students from './pages/Students';
import Classes from './pages/Classes';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './hooks/useAuth';

function RootRedirect() {
  const { user, role, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/teacher" replace />;
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
