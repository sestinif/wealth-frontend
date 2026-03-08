import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getToken, setToken, removeToken, api } from './api.js';
import LoginPage from './pages/LoginPage';
import SetupPage from './pages/SetupPage';
import Dashboard from './pages/Dashboard';
import Diary from './pages/Diary';
import Reports from './pages/Reports';
import Charts from './pages/Charts';
import Settings from './pages/Settings';

function ProtectedRoute({ children, isAuthenticated, isLoading }) {
  if (isLoading) {
    return <LoadingScreen />;
  }
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function LoadingScreen({ message = "CARICAMENTO..." }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#0D0B21', gap: '20px'
    }}>
      <div style={{
        width: '48px', height: '48px',
        background: 'linear-gradient(135deg, #8B5CF6, #C026D3)',
        borderRadius: '12px', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: '1.5rem', fontWeight: '800', color: '#FFF'
      }}>W</div>
      <div style={{ color: '#8B85A8', fontSize: '0.75rem', letterSpacing: '2px' }}>
        {message}
      </div>
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
          // Backend sleeping, retry without reloading page
          setTimeout(checkSetup, 3000);
        } else {
          setBackendError(true);
          setIsLoading(false);
        }
      }
    };

    checkSetup();
  }, []);

  const handleLogin = (token, username) => {
    setToken(token);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    removeToken();
    setIsAuthenticated(false);
  };

  const handleSetupComplete = () => {
    setSetupRequired(false);
  };

  if (isLoading) {
    return <LoadingScreen message="CONNESSIONE AL SERVER..." />;
  }

  if (backendError) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#0D0B21', gap: '16px'
      }}>
        <div style={{
          width: '48px', height: '48px',
          background: 'linear-gradient(135deg, #8B5CF6, #C026D3)',
          borderRadius: '12px', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: '1.5rem', fontWeight: '800', color: '#FFF'
        }}>W</div>
        <div style={{ color: '#FF5252', fontSize: '0.85rem' }}>BACKEND NON RAGGIUNGIBILE</div>
        <button
          onClick={() => { setIsLoading(true); setBackendError(false); window.location.reload(); }}
          style={{
            background: 'linear-gradient(135deg, #8B5CF6, #C026D3)',
            border: 'none', borderRadius: '8px', color: '#FFF',
            padding: '10px 24px', cursor: 'pointer', fontWeight: '600',
            fontSize: '0.82rem', letterSpacing: '0.04em'
          }}
        >RIPROVA</button>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/setup" element={
          setupRequired
            ? <SetupPage onComplete={handleSetupComplete} />
            : <Navigate to="/login" />
        } />
        <Route path="/login" element={
          !isAuthenticated
            ? <LoginPage onLogin={handleLogin} />
            : <Navigate to="/dashboard" />
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={false}>
            <Dashboard onLogout={handleLogout} />
          </ProtectedRoute>
        } />
        <Route path="/diary" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={false}>
            <Diary onLogout={handleLogout} />
          </ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={false}>
            <Reports onLogout={handleLogout} />
          </ProtectedRoute>
        } />
        <Route path="/charts" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={false}>
            <Charts onLogout={handleLogout} />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={false}>
            <Settings onLogout={handleLogout} />
          </ProtectedRoute>
        } />
        <Route path="/" element={
          <Navigate to={isAuthenticated ? "/dashboard" : (setupRequired ? "/setup" : "/login")} />
        } />
        <Route path="*" element={
          <Navigate to={isAuthenticated ? "/dashboard" : (setupRequired ? "/setup" : "/login")} />
        } />
      </Routes>
    </BrowserRouter>
  );
}
