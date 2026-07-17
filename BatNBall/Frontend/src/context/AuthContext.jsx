import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [role, setRole] = useState(() => localStorage.getItem('role') || null);

  // Set default auth headers whenever token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  }, [token]);

  const login = async (phone_number, password) => {
    try {
      const response = await axios.post('http://localhost:5000/api/v1/auth/login', {
        phone_number,
        password
      });

      const { token: userToken, role: userRole, user: userData } = response.data;

      setToken(userToken);
      setRole(userRole);
      setUser(userData);

      localStorage.setItem('role', userRole);
      localStorage.setItem('user', JSON.stringify(userData));

      return { success: true, role: userRole };
    } catch (error) {
      const msg = error.response?.data?.error || 'Login failed. Please check credentials.';
      throw new Error(msg);
    }
  };

  const logout = () => {
    setToken(null);
    setRole(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
  };

  const changePassword = async (current_password, new_password, confirm_new_password) => {
    try {
      const response = await axios.put('http://localhost:5000/api/v1/users/change-password', {
        current_password,
        new_password,
        confirm_new_password
      });
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.error || 'Failed to change password.';
      throw new Error(msg);
    }
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ token, user, role, login, logout, changePassword, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
