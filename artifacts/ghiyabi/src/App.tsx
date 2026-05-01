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
import { AuthProvider, useAuth } from './hooks/useAuth';
import { isSupabaseConfigured } from './lib/supabase';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ConfigMissingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <div role="alert" data-testid="supabase-config-missing" className="w-full max-w-lg bg-card border border-card-border rounded-2xl shadow-lg p-6 space-y-4">
        <h1 className="text-2xl font-extrabold text-primary">إعدادات غير مكتملة</h1>
        <p className="text-foreground">
          لم يتم العثور على إعدادات Supabase. يرجى إضافة المتغيرات التالية إلى ملف
          <code className="mx-1 px-1 rounded bg-muted">.env</code>
          ثم إعادة تشغيل التطبيق:
        </p>
        <pre className="bg-muted rounded-lg p-3 text-sm overflow-x-auto" dir="ltr">{`VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>`}</pre>
        <p className="text-xs text-muted-foreground">
          يمكنك الحصول على هذه القيم من لوحة Supabase &rsaquo; Settings &rsaquo; API.
        </p>
      </div>
    </div>
  );
}

function RootRedirect() {
  const { user, role, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!role) return <LoadingScreen />;
  if (role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/teacher" replace />;
}

export default function App() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');

  if (!isSupabaseConfigured) {
    return <ConfigMissingScreen />;
  }

  return (
    <AuthProvider>
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
    </AuthProvider>
  );
}
