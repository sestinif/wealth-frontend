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
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#8B85A8' }}>Loading...</div>;
  }
  return isAuthenticated ? children : <Navigate to="/login" />;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!getToken());
  const [setupRequired, setSetupRequired] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const result = await api.checkSetupRequired();
        setSetupRequired(result.required);
      } catch (error) {
        console.error('Setup check failed:', error);
      } finally {
        setIsLoading(false);
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
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#8B85A8' }}>Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/setup" element={setupRequired ? <SetupPage onComplete={handleSetupComplete} /> : <Navigate to="/login" />} />
        <Route path="/login" element={!isAuthenticated ? <LoginPage onLogin={handleLogin} /> : <Navigate to="/dashboard" />} />
        
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
              <Dashboard onLogout={handleLogout} />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/diary" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
              <Diary onLogout={handleLogout} />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/reports" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
              <Reports onLogout={handleLogout} />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/charts" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
              <Charts onLogout={handleLogout} />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
              <Settings onLogout={handleLogout} />
            </ProtectedRoute>
          } 
        />
        
        <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : (setupRequired ? "/setup" : "/login")} />} />
      </Routes>
    </BrowserRouter>
  );
}
