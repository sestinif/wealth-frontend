import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getToken, setToken, removeToken, api } from './api.js';
import { ToastProvider } from './components/Toast';
import CommandPalette from './components/CommandPalette';
import BrandMark from './components/BrandMark';
import QuickBuyFAB from './components/QuickBuyFAB';
import LoginPage from './pages/LoginPage';
import SetupPage from './pages/SetupPage';
import Dashboard from './pages/Dashboard';
import Diary from './pages/Diary';
import AddMovement from './pages/AddMovement';
import Reports from './pages/Reports';
import Charts from './pages/Charts';
import Calculator from './pages/Calculator';
import Settings from './pages/Settings';

function ProtectedRoute({ children, isAuthenticated, isLoading }) {
  if (isLoading) return <LoadingScreen />;
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function LoadingScreen({ message = "Loading..." }) {
  return (
    <div className="loading-screen">
      <div className="loading-logo"><BrandMark size={40} /></div>
      <div className="loading-text">{message}</div>
    </div>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!getToken());
  const [setupRequired, setSetupRequired] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [backendError, setBackendError] = useState(false);

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 5;
    const checkSetup = async () => {
      try {
        const result = await api.checkSetupRequired();
        setSetupRequired(result.required);
        setIsLoading(false);
      } catch (error) {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkSetup, 3000);
        } else {
          setBackendError(true);
          setIsLoading(false);
        }
      }
    };
    checkSetup();
  }, []);

  const handleLogin = (token, username) => { setToken(token); setIsAuthenticated(true); };
  const handleSetupComplete = () => { setSetupRequired(false); };

  if (isLoading) return <LoadingScreen message="Connecting to server..." />;

  if (backendError) {
    return (
      <div className="loading-screen">
        <div className="loading-logo"><BrandMark size={40} /></div>
        <div className="loading-error">Backend unreachable</div>
        <button className="btn btn--primary" onClick={() => { setIsLoading(true); setBackendError(false); window.location.reload(); }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <ToastProvider>
        {isAuthenticated && <CommandPalette />}
        {isAuthenticated && <QuickBuyFAB />}
        <Routes>
          <Route path="/setup" element={setupRequired ? <SetupPage onComplete={handleSetupComplete} /> : <Navigate to="/login" />} />
          <Route path="/login" element={!isAuthenticated ? <LoginPage onLogin={handleLogin} /> : <Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<ProtectedRoute isAuthenticated={isAuthenticated} isLoading={false}><Dashboard /></ProtectedRoute>} />
          <Route path="/add" element={<ProtectedRoute isAuthenticated={isAuthenticated} isLoading={false}><AddMovement /></ProtectedRoute>} />
          <Route path="/diary" element={<ProtectedRoute isAuthenticated={isAuthenticated} isLoading={false}><Diary /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute isAuthenticated={isAuthenticated} isLoading={false}><Reports /></ProtectedRoute>} />
          <Route path="/charts" element={<ProtectedRoute isAuthenticated={isAuthenticated} isLoading={false}><Charts /></ProtectedRoute>} />
          <Route path="/dca" element={<ProtectedRoute isAuthenticated={isAuthenticated} isLoading={false}><Calculator /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute isAuthenticated={isAuthenticated} isLoading={false}><Settings /></ProtectedRoute>} />
          <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : (setupRequired ? "/setup" : "/login")} />} />
          <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : (setupRequired ? "/setup" : "/login")} />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}
