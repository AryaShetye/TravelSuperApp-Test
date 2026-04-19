import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * Custom hook to access auth context
 * Usage: const { user, login, logout } = useAuth();
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
