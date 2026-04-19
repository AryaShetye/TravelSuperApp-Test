import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../ui/LoadingSpinner';

export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner fullPage />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}
