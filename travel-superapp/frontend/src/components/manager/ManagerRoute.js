import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../ui/LoadingSpinner';

const MANAGER_ROLES = ['host', 'property_manager', 'admin'];

export default function ManagerRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner fullPage />;
  if (!user) return <Navigate to="/login" replace />;
  if (!MANAGER_ROLES.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}
