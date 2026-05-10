import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api';
import { connectSocket, disconnectSocket } from '../socket';
import { getOrCreateKeyPair } from '../crypto';


const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState(false);
  const [adminUser, setAdminUser] = useState(null);

  useEffect(() => {
    // Restore session from localStorage
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const storedImpersonating = localStorage.getItem('impersonating') === 'true';
    const storedAdminUser = localStorage.getItem('adminUser');

    if (token && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setImpersonating(storedImpersonating);
        if (storedAdminUser) {
          setAdminUser(JSON.parse(storedAdminUser));
        }
        connectSocket(token);
      } catch {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const setupEncryption = useCallback(async (userData, token) => {
    try {
      const kp = await getOrCreateKeyPair(userData.id);
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await api.put('/users/me/public-key', { publicKey: kp.publicKey }, config);
      console.log('✓ Public key saved — E2E encryption ready');
    } catch (err) {
      console.error('Encryption setup failed:', err.response?.data || err.message);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token, user: userData } = response.data;

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.removeItem('impersonating');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');

    setUser(userData);
    setImpersonating(false);
    setAdminUser(null);
    connectSocket(token);
    await setupEncryption(userData, token);

    return userData;
  }, [setupEncryption]);

  const register = useCallback(async (username, email, password, team) => {
    const response = await api.post('/auth/register', { username, email, password, team });
    const { token, user: userData } = response.data;

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));

    setUser(userData);
    setImpersonating(false);
    connectSocket(token);
    await setupEncryption(userData, token);

    return userData;
  }, [setupEncryption]);

  const logout = useCallback(() => {
    disconnectSocket();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('impersonating');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setUser(null);
    setImpersonating(false);
    setAdminUser(null);
  }, []);

  const impersonate = useCallback(async (targetUserId) => {
    // Save current admin session before impersonating
    const currentToken = localStorage.getItem('token');
    const currentUser = localStorage.getItem('user');

    const response = await api.post(`/auth/impersonate/${targetUserId}`);
    const { token, user: targetUser } = response.data;

    // Store admin session for later restore
    localStorage.setItem('adminToken', currentToken);
    localStorage.setItem('adminUser', currentUser);

    // Switch to impersonated user
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(targetUser));
    localStorage.setItem('impersonating', 'true');

    setAdminUser(JSON.parse(currentUser));
    setUser(targetUser);
    setImpersonating(true);

    // Reconnect socket with new token
    connectSocket(token);

    return targetUser;
  }, []);

  const exitImpersonation = useCallback(() => {
    const adminToken = localStorage.getItem('adminToken');
    const storedAdminUser = localStorage.getItem('adminUser');

    if (!adminToken || !storedAdminUser) {
      logout();
      return;
    }

    const parsedAdminUser = JSON.parse(storedAdminUser);

    localStorage.setItem('token', adminToken);
    localStorage.setItem('user', storedAdminUser);
    localStorage.removeItem('impersonating');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');

    setUser(parsedAdminUser);
    setImpersonating(false);
    setAdminUser(null);

    connectSocket(adminToken);
  }, [logout]);

  const updateUser = useCallback((data) => {
    setUser((prev) => {
      const updated = { ...prev, ...data };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const value = {
    user,
    loading,
    impersonating,
    adminUser,
    login,
    register,
    logout,
    impersonate,
    exitImpersonation,
    updateUser,
    isAdmin: user?.role === 'admin' && !impersonating
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
