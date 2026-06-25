/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect } from 'react';
import { authService } from '../api/auth';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('current_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }
    authService.getProfile()
      .then((profile) => {
        setUser(profile);
        localStorage.setItem('current_user', JSON.stringify(profile));
      })
      .catch(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('current_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (usernameOrEmail, password) => {
    const data = await authService.login(usernameOrEmail, password);
    localStorage.setItem('access_token', data.access_token);
    const profile = await authService.getProfile();
    localStorage.setItem('current_user', JSON.stringify(profile));
    setUser(profile);
    return profile;
  };

  const register = async (username, email, password, fullName) => {
    return await authService.register(username, email, password, fullName);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('current_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}