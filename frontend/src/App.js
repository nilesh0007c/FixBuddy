// src/App.js
import React, { Suspense, lazy } from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import store from './redux/store';
import { useAuth } from './context/AuthContext';

import Navbar         from './components/ui/Navbar';
import ProtectedRoute from './components/ui/ProtectedRoute';
import NotFound       from './components/pages/NotFound';

import HomePage       from './components/pages/HomePage';
import LoginPage      from './components/pages/LoginPage';
import RegisterPage   from './components/pages/RegisterPage';
import AboutPage      from './components/pages/AboutPage';
import ServicesPage   from './components/pages/ServicesPage';
import ForgetPass     from './components/pages/ForgotPasswordPage';
import ChatbotWidget  from './components/chatbot/ChatbotWidget';

import UserDashboard        from './components/user/UserDashboard';
import UserComplaintPage    from './components/user/UserComplaintPage';

import ProviderDashboard     from './components/provider/ProviderDashboard';
import ProviderRegister      from './components/provider/ProviderRegister';
import ProviderComplaintPage from './components/provider/Providercomplaintpage ';

// ProviderProfilePage  → private, own profile, edit mode
// PublicProviderPage   → public, view any provider by :id, has booking form
import ProviderProfilePage from './components/provider/ProviderProfilePage';
import PublicProviderPage  from './components/provider/PublicProviderPage';

import AdminDashboard      from './components/admin/AdminDashboard';
import PendingVerification from './components/admin/PendingVerification';
import AdminComplaintPanel from './components/admin/AdminComplaintPanel';

import './App.css';

const ChatPage      = lazy(() => import('./components/chat/ChatPage'));
const NegotiatePage = lazy(() => import('./components/bargaining/NegotiatePage'));

const DashboardRedirect = () => {
  const { user } = useAuth();
  if (!user)                    return <Navigate to="/login"              replace />;
  if (user.role === 'admin')    return <Navigate to="/dashboard/admin"   replace />;
  if (user.role === 'provider') return <Navigate to="/dashboard/provider" replace />;
  return                               <Navigate to="/dashboard/user"    replace />;
};

const PageLoader = () => (
  <div className="page-loading"><div className="spinner" />Loading…</div>
);

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Navbar />
        <Suspense fallback={<PageLoader />}>
          <Routes>

            {/* ── Public ── */}
            <Route path="/"               element={<HomePage />} />
            <Route path="/services"       element={<ServicesPage />} />
            <Route path="/about"          element={<AboutPage />} />
            <Route path="/login"          element={<LoginPage />} />
            <Route path="/register"       element={<RegisterPage />} />
            <Route path="/forgetpassword" element={<ForgetPass />} />

            {/* Public provider page — view any provider + book a service */}
            <Route path="/providers/:id"  element={<PublicProviderPage />} />

            {/* ── Dashboard redirect ── */}
            <Route path="/dashboard"
              element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>}
            />

            {/* ── User ── */}
            <Route path="/dashboard/user"
              element={<ProtectedRoute roles={['user']}><UserDashboard /></ProtectedRoute>}
            />
            <Route path="/complaints"
              element={<ProtectedRoute roles={['user']}><UserComplaintPage /></ProtectedRoute>}
            />

            {/* ── Provider ── */}
            <Route path="/dashboard/provider"
              element={<ProtectedRoute roles={['provider']}><ProviderDashboard /></ProtectedRoute>}
            />
            <Route path="/provider/register"
              element={<ProtectedRoute roles={['provider']}><ProviderRegister /></ProtectedRoute>}
            />
            <Route path="/provider/complaints"
              element={<ProtectedRoute roles={['provider']}><ProviderComplaintPage /></ProtectedRoute>}
            />
            {/* Private provider profile — own profile, edit mode */}
            <Route path="/provider/profile"
              element={<ProtectedRoute roles={['provider']}><ProviderProfilePage /></ProtectedRoute>}
            />

            {/* ── Admin ── */}
            <Route path="/dashboard/admin"
              element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>}
            />
            <Route path="/admin/verification"
              element={<ProtectedRoute roles={['admin']}><PendingVerification /></ProtectedRoute>}
            />
            <Route path="/admin/complaint"
              element={<ProtectedRoute roles={['admin']}><AdminComplaintPanel /></ProtectedRoute>}
            />

            {/* ── Chat ── */}
            <Route path="/chat"
              element={
                <ProtectedRoute roles={['user', 'provider', 'admin']}>
                  <ChatPage />
                </ProtectedRoute>
              }
            />

            {/* ── Negotiate ── */}
            <Route path="/negotiate/:bookingId"
              element={
                <ProtectedRoute roles={['user', 'provider']}>
                  <NegotiatePage />
                </ProtectedRoute>
              }
            />
            <Route path="/negotiation/:id"
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