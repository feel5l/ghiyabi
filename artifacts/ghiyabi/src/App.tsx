import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import TeacherDashboard from './pages/TeacherDashboard';
import SessionAttendance from './pages/SessionAttendance';
import AdminDashboard from './pages/AdminDashboard';
import Students from './pages/Students';
import Classes from './pages/Classes';
import AdminSessions from './pages/AdminSessions';
import NotFound from './pages/not-found';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './hooks/useAuth';
import { supabaseConfigError } from './lib/supabase';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function RootRedirect() {
  const { user, role, loading, authError } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (authError || !role) return <Navigate to="/login" replace />;
  if (role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/teacher" replace />;
}

function ConfigurationError() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-destructive/30 bg-card p-6 text-center shadow-lg">
        <h1 className="text-2xl font-bold text-destructive mb-3">إعدادات التطبيق غير مكتملة</h1>
        <p className="text-sm leading-7 text-muted-foreground">
          {supabaseConfigError}
        </p>
        <p className="text-xs leading-6 text-muted-foreground mt-4">
          انسخ ملف <span dir="ltr" className="font-mono">.env.example</span> إلى{' '}
          <span dir="ltr" className="font-mono">.env</span> ثم أعد تشغيل التطبيق.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');

  if (supabaseConfigError) {
    return <ConfigurationError />;
  }

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

        <Route path="*" element={<NotFound />} />
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
