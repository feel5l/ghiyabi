import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole: UserRole;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">جارٍ التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!role) {
    // Authenticated but no role (e.g. a deactivated teacher). Sign out
    // immediately and bounce to the login screen with a clear message.
    void supabase.auth.signOut();
    return <Navigate to="/login" replace />;
  }

  if (role !== requiredRole) {
    return <Navigate to={role === 'admin' ? '/admin' : '/teacher'} replace />;
  }

  return <>{children}</>;
}
