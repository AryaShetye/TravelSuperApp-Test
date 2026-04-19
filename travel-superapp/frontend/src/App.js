import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import LoadingSpinner from './components/ui/LoadingSpinner';
import ManagerRoute from './components/manager/ManagerRoute';
import DriverRoute from './components/driver/DriverRoute';
import AgentRoute from './components/agent/AgentRoute';
import AdminRoute from './components/admin/AdminRoute';

// Lazy-loaded pages
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Properties = lazy(() => import('./pages/Properties'));
const PropertyDetail = lazy(() => import('./pages/PropertyDetail'));
const Booking = lazy(() => import('./pages/Booking'));
const BookingConfirmation = lazy(() => import('./pages/BookingConfirmation'));
const MyBookings = lazy(() => import('./pages/MyBookings'));
const Itinerary = lazy(() => import('./pages/Itinerary'));
const Profile = lazy(() => import('./pages/Profile'));
const Features = lazy(() => import('./pages/Features'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Transport pages
const Transport = lazy(() => import('./pages/Transport'));
const MyTransport = lazy(() => import('./pages/MyTransport'));
const Flights = lazy(() => import('./pages/Flights'));

// Package pages
const Packages = lazy(() => import('./pages/Packages'));
const PackageDetail = lazy(() => import('./pages/PackageDetail'));
const MyPackages = lazy(() => import('./pages/MyPackages'));

// Manager (Host) pages
const ManagerDashboard    = lazy(() => import('./pages/manager/ManagerDashboard'));
const ManagerProperties   = lazy(() => import('./pages/manager/ManagerProperties'));
const ManagerPropertyForm = lazy(() => import('./pages/manager/ManagerPropertyForm'));
const ManagerBookings     = lazy(() => import('./pages/manager/ManagerBookings'));
const ManagerAvailability = lazy(() => import('./pages/manager/ManagerAvailability'));

// Driver pages
const DriverDashboard = lazy(() => import('./pages/driver/DriverDashboard'));
const DriverTrips     = lazy(() => import('./pages/driver/DriverTrips'));
const DriverRequests  = lazy(() => import('./pages/driver/DriverRequests'));

// Agent pages
const AgentDashboard    = lazy(() => import('./pages/agent/AgentDashboard'));
const AgentPackages     = lazy(() => import('./pages/agent/AgentPackages'));
const AgentPackageForm  = lazy(() => import('./pages/agent/AgentPackageForm'));
const AgentBookings     = lazy(() => import('./pages/agent/AgentBookings'));

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));

// Payment history
const PaymentHistory = lazy(() => import('./pages/PaymentHistory'));

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner fullPage />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// Public-only route (redirect if logged in)
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner fullPage />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <div className="app-wrapper">
      <Navbar />
      <main id="main-content" className="main-content">
        <Suspense fallback={<LoadingSpinner fullPage />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/properties" element={<Properties />} />
            <Route path="/properties/:id" element={<PropertyDetail />} />
            <Route path="/packages" element={<Packages />} />
            <Route path="/packages/:id" element={<PackageDetail />} />
            <Route path="/features" element={<Features />} />

            {/* Auth routes */}
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

            {/* Protected traveler routes */}
            <Route path="/book/:propertyId" element={<ProtectedRoute><Booking /></ProtectedRoute>} />
            <Route path="/booking/confirmation/:bookingId" element={<ProtectedRoute><BookingConfirmation /></ProtectedRoute>} />
            <Route path="/my-bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
            <Route path="/itinerary/:bookingId" element={<ProtectedRoute><Itinerary /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

            {/* Transport routes */}
            <Route path="/transport" element={<Transport />} />
            <Route path="/my-transport" element={<ProtectedRoute><MyTransport /></ProtectedRoute>} />
            <Route path="/flights" element={<Flights />} />

            {/* Package routes */}
            <Route path="/my-packages" element={<ProtectedRoute><MyPackages /></ProtectedRoute>} />

            {/* Host (Manager) routes */}
            <Route path="/manager/dashboard"              element={<ManagerRoute><ManagerDashboard /></ManagerRoute>} />
            <Route path="/manager/properties"             element={<ManagerRoute><ManagerProperties /></ManagerRoute>} />
            <Route path="/manager/properties/new"         element={<ManagerRoute><ManagerPropertyForm /></ManagerRoute>} />
            <Route path="/manager/properties/:id/edit"    element={<ManagerRoute><ManagerPropertyForm /></ManagerRoute>} />
            <Route path="/manager/bookings"               element={<ManagerRoute><ManagerBookings /></ManagerRoute>} />
            <Route path="/manager/availability"           element={<ManagerRoute><ManagerAvailability /></ManagerRoute>} />

            {/* Driver routes */}
            <Route path="/driver/dashboard" element={<DriverRoute><DriverDashboard /></DriverRoute>} />
            <Route path="/driver/trips"     element={<DriverRoute><DriverTrips /></DriverRoute>} />
            <Route path="/driver/requests"  element={<DriverRoute><DriverRequests /></DriverRoute>} />

            {/* Agent routes */}
            <Route path="/agent/dashboard"          element={<AgentRoute><AgentDashboard /></AgentRoute>} />
            <Route path="/agent/packages"           element={<AgentRoute><AgentPackages /></AgentRoute>} />
            <Route path="/agent/packages/new"       element={<AgentRoute><AgentPackageForm /></AgentRoute>} />
            <Route path="/agent/packages/:id/edit"  element={<AgentRoute><AgentPackageForm /></AgentRoute>} />
            <Route path="/agent/bookings"           element={<AgentRoute><AgentBookings /></AgentRoute>} />

            {/* Admin routes */}
            <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

            {/* Payment history */}
            <Route path="/payments" element={<ProtectedRoute><PaymentHistory /></ProtectedRoute>} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { fontFamily: 'Inter, sans-serif', fontSize: '14px' },
            success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
