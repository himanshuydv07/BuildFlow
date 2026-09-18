import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi } from '../lib/resources';
import { setAccessToken, setUnauthorizedHandler } from '../lib/apiClient';
import { connectSocket, disconnectSocket } from '../lib/socket';
import api from '../lib/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    disconnectSocket();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    (async () => {
      try {
        const { data } = await api.post('/auth/refresh');
        setAccessToken(data.data.accessToken);
        const me = await authApi.me();
        setUser(me.data.data.user);
        connectSocket(data.data.accessToken);
      } catch {
        clearSession();
      } finally {
        setLoading(false);
      }
    })();
  }, [clearSession]);

  const login = async (email, password) => {
    const { data } = await authApi.login({ email, password });
    setAccessToken(data.data.accessToken);
    setUser(data.data.user);
    connectSocket(data.data.accessToken);
    return data.data.user;
  };

  const register = async (name, email, password) => {
    const { data } = await authApi.register({ name, email, password });
    setAccessToken(data.data.accessToken);
    setUser(data.data.user);
    connectSocket(data.data.accessToken);
    return data.data.user;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      clearSession();
    }
  };

  const deleteAccount = async (password) => {
    // Let the caller catch and display the error (e.g. "you still own
    // active projects") — only clear the session once deletion
    // actually succeeded server-side.
    await authApi.deleteAccount(password);
    clearSession();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, deleteAccount, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}