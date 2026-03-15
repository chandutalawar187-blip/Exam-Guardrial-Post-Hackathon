// dashboard/src/context/AuthContext.jsx
import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(() => {
    const saved = localStorage.getItem('cognivigil_auth');
    return saved ? JSON.parse(saved) : {
      role: null, userId: null, token: null, isAuthenticated: false
    };
  });

  const login = (role, userId, token) => {
    const newState = { role, userId, token, isAuthenticated: true };
    setAuth(newState);
    localStorage.setItem('cognivigil_auth', JSON.stringify(newState));
  };

  const logout = () => {
    setAuth({ role: null, userId: null, token: null, isAuthenticated: false });
    localStorage.removeItem('cognivigil_auth');
  };

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
