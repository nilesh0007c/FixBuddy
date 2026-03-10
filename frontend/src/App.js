// frontend/src/App.js
import React, { Suspense, lazy } from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import store from './redux/store';
import { useAuth } from './context/AuthContext';

import Navbar from './components/ui/Navbar';
import ProtectedRoute from './components/ui/ProtectedRoute';
import NotFound from './components/pages/NotFound';

import HomePage from './components/pages/HomePage';
import LoginPage from './components/pages/LoginPage';
import RegisterPage from './components/pages/RegisterPage';
import AboutPage from './components/pages/AboutPage';
import ServicesPage from './components/pages/ServicesPage';
import ProviderProfilePage from './components/provider/ProviderProfilePage';

import UserDashboard from './components/user/UserDashboard';
import ProviderDashboard from './components/provider/ProviderDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import PendingVerification from './components/admin/PendingVerification';
import ProviderRegister from './components/provider/ProviderRegister';
import ForgetPass from './components/pages/ForgotPasswordPage';
import ChatbotWidget from './components/chatbot/ChatbotWidget';
import UserComplaintPage from './components/user/UserComplaintPage';
import ProviderComplaintPage from './components/provider/Providercomplaintpage ';
import AdminComplaintPanel from './components/admin/AdminComplaintPanel';

/* ── Global styles ── */
import './App.css';

/* ──────────────────────────────────────────────
   Lazy-loaded pages
────────────────────────────────────────────── */
const ChatPage      = lazy(() => import('./components/chat/ChatPage'));
const NegotiatePage = lazy(() => import('./components/bargaining/NegotiatePage'));

/* ──────────────────────────────────────────────
   Dashboard auto-redirect based on role
────────────────────────────────────────────── */
const DashboardRedirect = () => {
  const { user } = useAuth();
  if (!user)                  return <Navigate to="/login" replace />;
  if (user.role === 'admin')    return <Navigate to="/dashboard/admin" replace />;
  if (user.role === 'provider') return <Navigate to="/dashboard/provider" replace />;
  return <Navigate to="/dashboard/user" replace />;
};

/* ──────────────────────────────────────────────
   Suspense fallback spinner
────────────────────────────────────────────── */
const PageLoader = () => (
  <div className="page-loading">
    <div className="spinner" />
    Loading...
  </div>
);

/* ──────────────────────────────────────────────
   App
────────────────────────────────────────────── */
function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Navbar />

        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* ── Public ── */}
            <Route path="/"              element={<HomePage />} />
            <Route path="/services"      element={<ServicesPage />} />
            <Route path="/about"         element={<AboutPage />} />
            <Route path="/login"         element={<LoginPage />} />
            <Route path="/register"      element={<RegisterPage />} />
            <Route path="/forgetpassword" element={<ForgetPass />} />
            <Route path="/providers/:id" element={<ProviderProfilePage />} />

            {/* ── Dashboard redirect ── */}
            <Route
              path="/dashboard"
              element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>}
            />

            {/* ── User ── */}
            <Route
              path="/dashboard/user"
              element={<ProtectedRoute roles={['user']}><UserDashboard /></ProtectedRoute>}
            />
            <Route
              path="/complaints"
              element={<ProtectedRoute roles={['user']}><UserComplaintPage /></ProtectedRoute>}
            />

            {/* ── Provider ── */}
            <Route
              path="/dashboard/provider"
              element={<ProtectedRoute roles={['provider']}><ProviderDashboard /></ProtectedRoute>}
            />
            <Route
              path="/provider/register"
              element={<ProtectedRoute roles={['provider']}><ProviderRegister /></ProtectedRoute>}
            />
            <Route
              path="/provider/complaints"
              element={<ProtectedRoute roles={['provider']}><ProviderComplaintPage /></ProtectedRoute>}
            />

            {/* ── Admin ── */}
            <Route
              path="/dashboard/admin"
              element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>}
            />
            <Route
              path="/admin/verification"
              element={<ProtectedRoute roles={['admin']}><PendingVerification /></ProtectedRoute>}
            />
            <Route
              path="/admin/complaint"
              element={<ProtectedRoute roles={['admin']}><AdminComplaintPanel /></ProtectedRoute>}
            />

            {/* ── Chat ── */}
            <Route
              path="/chat"
              element={
                <ProtectedRoute roles={['user', 'provider', 'admin']}>
                  <ChatPage />
                </ProtectedRoute>
              }
            />

            {/* ── Negotiate ── */}
            <Route
              path="/negotiate/:bookingId"
              element={
                <ProtectedRoute roles={['user', 'provider']}>
                  <NegotiatePage />
                </ProtectedRoute>
              }
            />

            {/* Legacy route */}
            <Route
              path="/negotiation/:id"
              element={
                <ProtectedRoute roles={['user', 'provider']}>
                  <Navigate to="/dashboard" replace />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>

        <ChatbotWidget />
      </BrowserRouter>
    </Provider>
  );
}

export default App;